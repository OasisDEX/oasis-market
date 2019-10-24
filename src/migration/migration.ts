import { BigNumber } from 'bignumber.js';
import { curry } from 'lodash';
import { combineLatest, Observable, of, Subject } from 'rxjs';
import { filter, first, map, startWith, switchMap, tap } from 'rxjs/operators';
import { Allowances } from '../balances/balances';
import { Calls, Calls$ } from '../blockchain/calls/calls';
import { getTxHash, TxState, TxStatus } from '../blockchain/transactions';
import { Offer, Orderbook } from '../exchange/orderbook/orderbook';
import { TradingPair } from '../exchange/tradingPair/tradingPair';
import { zero } from '../utils/zero';
import { inductor } from './inductor';

export enum ExchangeMigrationTxKind {
  cancel = 'cancel',
  createProxy = 'createProxy',
  allowance4Proxy = 'allowance4Proxy',
  sai2dai = 'sai2dai'
}

interface CancelOperation {
  kind: ExchangeMigrationTxKind.cancel;
  offer: Offer;
}

interface CreateProxyOperation {
  kind: ExchangeMigrationTxKind.createProxy;
}

interface Allowance4ProxyOperation {
  kind: ExchangeMigrationTxKind.allowance4Proxy;
  token: string;
}

interface SAI2DAIOperation {
  kind: ExchangeMigrationTxKind.sai2dai;
  amount: BigNumber;
}

type ExchangeMigrationOperation =
  CancelOperation |
  CreateProxyOperation |
  SAI2DAIOperation |
  Allowance4ProxyOperation;

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

interface ExchangeMigrationInitializingState {
  status: ExchangeMigrationStatus.initializing;
}

export type ExchangeMigrationState =
  ExchangeMigrationInitializingState
| ExchangeMigrationReadyState
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
  proxyAddress$: Observable<string>,
  calls$: Calls$,
  operations$: Observable<ExchangeMigrationOperation[]>,
): Observable<ExchangeMigrationState> {
  return combineLatest(
    calls$,
    operations$
  ).pipe(
    first(),
    switchMap(([calls, operations]) => {
      const state = new Subject<ExchangeMigrationState>();

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
    }),
    startWith({
      status: ExchangeMigrationStatus.initializing
    } as ExchangeMigrationInitializingState)
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
        filter(proxyAddress => !!proxyAddress),
        switchMap(proxyAddress => {
          // if (!proxyAddress) {
          //   return throwError('No proxy');
          // }
          return calls.swapSaiToDai({
            proxyAddress: proxyAddress!,
            amount: o.amount
          });
        })
      );
    case ExchangeMigrationTxKind.allowance4Proxy:
      return proxyAddress$.pipe(
        first(),
        filter(proxyAddress => !!proxyAddress),
        switchMap(proxyAddress => {
          // if (!proxyAddress) {
          //   return throwError('No proxy');
          // }
          return calls.approveProxy({
            proxyAddress: proxyAddress!,
            token: o.token
          });
        })
      );
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
    if (state.pending.length === 0) {
      return of({
        done: [],
        status: ExchangeMigrationStatus.done
      } as ExchangeMigrationState);
    }
    const [current, ...pending] = state.pending;
    return start(proxyAddress$, calls, current, pending, []);
  }

  if (state.status === ExchangeMigrationStatus.inProgress) {
    if (
      state.current.txStatus === TxStatus.Success &&
      state.pending.length > 0
    ) {
      const [current, ...pending] = state.pending;
      const done = [...state.done, state.current];
      return start(proxyAddress$, calls, current, pending, done);
    }

    if (
      state.current.txStatus === TxStatus.Success &&
      state.pending.length === 0
    ) {
      return of({
        done: [...state.done, state.current],
        status: ExchangeMigrationStatus.done
      } as ExchangeMigrationState);
    }

    return of({
      done: [...state.done, state.current],
      status: ExchangeMigrationStatus.fiasco
    } as ExchangeMigrationState);
  }

  return undefined;
}

export function createExchangeMigrationOps$(
  initializedAccount$: Observable<string>,
  loadOrderbook: (tp: TradingPair) => Observable<Orderbook>,
  saiBalance$: Observable<BigNumber>,
  allowances$: Observable<Allowances>,
  proxyAddress$: Observable<string | undefined>,
): Observable<ExchangeMigrationOperation[]> {

  const orders$ = openSAIOrders$(initializedAccount$, loadOrderbook);
  const saiAllowance$ = allowance$(allowances$, 'SAI');
  // const daiAllowance$ = allowance$(allowances$, 'DAI');

  return combineLatest(
    orders$,
    saiBalance$,
    saiAllowance$,
    // daiAllowance$,
    proxyAddress$,
  ).pipe(
    // @ts-ignore
    map(args => exchangeMigrationOps(...args)),
    first()
  );
}

function exchangeMigrationOps(
  orders: Offer[],
  saiBalance: BigNumber,
  saiAllowance: boolean,
  // _daiAllowance: boolean,
  proxyAddress: string | undefined,
): ExchangeMigrationOperation[] {

  if (saiBalance.eq(zero)) {
    return [];
  }

  const cancelOps: CancelOperation[] = orders.map(
    offer => ({
      offer,
      kind: ExchangeMigrationTxKind.cancel
    } as CancelOperation)
  );

  const proxyOps: CreateProxyOperation[] = proxyAddress ? [] : [
    { kind: ExchangeMigrationTxKind.createProxy },
  ];

  const saiAllowanceOps: Allowance4ProxyOperation[] = saiAllowance ? [] : [
    { kind: ExchangeMigrationTxKind.allowance4Proxy, token: 'SAI' }
  ];

  const sai2DaiOps: SAI2DAIOperation[] = saiBalance.gt(zero) ? [
    { kind: ExchangeMigrationTxKind.sai2dai, amount: saiBalance }
  ] : [];

  return [
    ...cancelOps,
    ...proxyOps,
    ...saiAllowanceOps,
    ...sai2DaiOps
  ];
}
