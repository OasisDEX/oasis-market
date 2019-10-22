import { BigNumber } from 'bignumber.js';
import { curry } from 'lodash';
import { combineLatest, Observable, of, Subject, throwError } from 'rxjs';
import { first, map, startWith, switchMap } from 'rxjs/operators';
import { Allowances } from '../../balances/balances';
import { Calls, Calls$ } from '../../blockchain/calls/calls';
import { getTxHash, TxState, TxStatus } from '../../blockchain/transactions';
import { Offer, Orderbook } from '../orderbook/orderbook';
import { TradingPair } from '../tradingPair/tradingPair';
import { inductor } from './inductor';

enum ExchangeMigrationTxKind {
  cancel = 'cancel',
  createProxy = 'createProxy',
  sai2dai = 'sai2dai'
}

interface CancelOperation {
  kind: ExchangeMigrationTxKind.cancel;
  offer: Offer;
}

interface CreateProxyOperation {
  kind: ExchangeMigrationTxKind.createProxy;
}

interface SAI2DAIOperation {
  kind: ExchangeMigrationTxKind.sai2dai;
  amount: BigNumber;
}

type ExchangeMigrationOperation = CancelOperation | CreateProxyOperation | SAI2DAIOperation;

type ExchangeMigrationOperationInProgress = ({
  txStatus: TxStatus;
  txHash?: string;
}) & ExchangeMigrationOperation;

export enum ExchangeMigrationStatus {
  initializing = 'initializing',
  ready = 'ready',
  inProgress = 'inProgress',
  fiasco = 'fiasco',
  done = 'done'
}

interface ExchangeMigrationReadyState {
  status: ExchangeMigrationStatus.ready;
  pending: ExchangeMigrationOperation[];
  start: VoidFunction;
}

interface ExchangeMigrationInProgressState {
  status: ExchangeMigrationStatus.inProgress;
  pending: ExchangeMigrationOperation[];
  current: ExchangeMigrationOperationInProgress;
  done: ExchangeMigrationOperationInProgress[];
}

type ExchangeMigrationState = {
  status: ExchangeMigrationStatus.initializing
} |
  ExchangeMigrationReadyState
| ExchangeMigrationInProgressState
| {
  status: ExchangeMigrationStatus.done | ExchangeMigrationStatus.fiasco;
  done: ExchangeMigrationOperationInProgress[];
};

function offerOf(account: string) {
  return (o: Offer) => o.ownerId === account;
}

function openSAIOrders$(
  initializedAccount$: Observable<string>,
  loadOrderbook: (tp: TradingPair) => Observable<Orderbook>,
) {
  // TODO: iterate over all SAI markets!?
  return  combineLatest(
    initializedAccount$,
    loadOrderbook({ base: 'WETH', quote: 'SAI' }),
  ).pipe(
    map(([account, orderbook]) =>
      orderbook.buy.filter(offerOf(account))
        .concat(
          orderbook.sell.filter(offerOf(account)))
    )
  );
}

function allowance$(allowances$: Observable<Allowances>, token: string) {
  return allowances$.pipe(
    map(allowances => allowances[token])
  );
}

export function createExchangeMigration$(
  initializedAccount$: Observable<string>,
  loadOrderbook: (tp: TradingPair) => Observable<Orderbook>,
  saiBalance$: Observable<BigNumber>,
  allowances$: Observable<Allowances>,
  proxyAddress$: Observable<string | undefined>,
  calls$: Calls$
): Observable<ExchangeMigrationState> {

  const orders$ = openSAIOrders$(initializedAccount$, loadOrderbook);
  const saiAllowance$ = allowance$(allowances$, 'SAI');
  const daiAllowance$ = allowance$(allowances$, 'DAI');

  return combineLatest(
    initializedAccount$,
    orders$,
    saiBalance$,
    saiAllowance$,
    daiAllowance$,
    proxyAddress$,
    calls$
  ).pipe(
    first(),
    // @ts-ignore
    switchMap(args => initialize(proxyAddress$, ...args)),
    startWith({
      status: ExchangeMigrationStatus.initializing
    })
  );
}

function startTransaction(
  proxyAddress$: Observable<string | undefined>,
  calls: Calls,
  o: ExchangeMigrationOperation
): Observable<TxState> {
  switch (o.kind) {
    case ExchangeMigrationTxKind.cancel:
      return calls.cancelOffer2({
        offerId: o.offer.offerId,
        type: o.offer.type,
        amount: o.offer.baseAmount,
        token: o.offer.baseToken,
      });
    case ExchangeMigrationTxKind.createProxy:
      return calls.setupProxy({});
    case ExchangeMigrationTxKind.sai2dai:
      return proxyAddress$.pipe(
        first(),
        switchMap(proxyAddress => {
          if (!proxyAddress) {
            return throwError('No proxy');
          }
          return calls.swapSaiToDai({
            proxyAddress,
            amount: o.amount
          });
        })
      );
    // default:
    //   return throwError(`Can't handle operation: ${o.kind}`);
  }
}

function start(
  proxyAddress$: Observable<string | undefined>,
  calls: Calls,
  current: ExchangeMigrationOperation,
  pending: ExchangeMigrationOperation[],
  done: ExchangeMigrationOperationInProgress[]
): Observable<ExchangeMigrationState> {
  return startTransaction(proxyAddress$, calls, current).pipe(
    map((tx: TxState) => ({
      pending,
      done,
      current: { ...current, txStatus: tx.status, txHash: getTxHash(tx) },
      status: ExchangeMigrationStatus.inProgress
    } as ExchangeMigrationState))
  );
}

function next(
  proxyAddress$: Observable<string | undefined>,
  calls: Calls,
  state: ExchangeMigrationState
): Observable<ExchangeMigrationState> | undefined {
  if (state.status === ExchangeMigrationStatus.ready) {
    const [current, ...pending] = state.pending;
    return start(proxyAddress$, calls, current, pending, []);
  }

  if (state.status === ExchangeMigrationStatus.inProgress) {
    if (state.current.txStatus === TxStatus.Success) {
      const [current, ...pending] = state.pending;
      const done = [...state.done, state.current];
      return start(proxyAddress$, calls, current, pending, done);
    }

    return of({
      done: [...state.done, state.current],
      status: ExchangeMigrationStatus.fiasco
    } as ExchangeMigrationState);
  }

  return undefined;
}

function initialize(
  proxyAddress$: Observable<string | undefined>,
  initializedAccount: string,
  orders: Offer[],
  saiBalance: BigNumber,
  saiAllowance: boolean,
  daiAllowance: boolean,
  proxyAddress: string | undefined,
  calls: Calls
): Observable<ExchangeMigrationState> {

  const cancelOperations: CancelOperation[] = orders.map(
    offer => ({
      offer,
      kind: ExchangeMigrationTxKind.cancel
    } as CancelOperation)
  );

  const proxyOperations: CreateProxyOperation[] = proxyAddress ? [] : [
    { kind: ExchangeMigrationTxKind.createProxy }
  ];

  const operations: ExchangeMigrationOperation[] = [
    ...cancelOperations,
    ...proxyOperations,
    { kind: ExchangeMigrationTxKind.sai2dai, amount: saiBalance }
  ];

  const state = new Subject();

  const initial: ExchangeMigrationState = {
    pending: operations,
    start: () => {
      inductor(
        initial,
        curry(next)(proxyAddress$, calls),
      ).subscribe(state);
    },
    status: ExchangeMigrationStatus.ready,
  };

  return state.pipe(
    startWith(initial)
  );
}
