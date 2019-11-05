import { BigNumber } from 'bignumber.js';
import { curry } from 'lodash';
import { BehaviorSubject, combineLatest, noop, Observable, of } from 'rxjs';
import {filter, first, map, startWith, switchMap, tap} from 'rxjs/operators';
import { Allowances } from '../balances/balances';
import { Calls, Calls$ } from '../blockchain/calls/calls';
import { CancelData } from '../blockchain/calls/offerMake';
import { getTxHash, TxState, TxStatus } from '../blockchain/transactions';
import { TradeWithStatus } from '../exchange/myTrades/openTrades';
import { Offer } from '../exchange/orderbook/orderbook';
import { inductor } from '../utils/inductor';
import { zero } from '../utils/zero';

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
  cancelOffer: (cancelData: CancelData) => any;
  status: ExchangeMigrationStatus.ready;
  pending: ExchangeMigrationOperation[];
  orders: TradeWithStatus[];
  start: VoidFunction;
}

interface ExchangeMigrationInProgressState {
  cancelOffer: (cancelData: CancelData) => any;
  orders: TradeWithStatus[];
  status: ExchangeMigrationStatus.inProgress;
  pending: ExchangeMigrationOperation[];
  current: ExchangeMigrationOperationInProgress;
  done: ExchangeMigrationOperationInProgress[];
}

interface ExchangeMigrationInitializingState {
  status: ExchangeMigrationStatus.initializing;
}

interface ExchangeMigrationDoneState {
  status: ExchangeMigrationStatus.done;
  done: ExchangeMigrationOperationInProgress[];
}

interface ExchangeMigrationFiascoState {
  status: ExchangeMigrationStatus.fiasco;
  pending: ExchangeMigrationOperation[];
  current: ExchangeMigrationOperationInProgress;
  done: ExchangeMigrationOperationInProgress[];
  restart: VoidFunction;
}

export type ExchangeMigrationState =
  ExchangeMigrationInitializingState
  | ExchangeMigrationReadyState
  | ExchangeMigrationInProgressState
  | ExchangeMigrationDoneState
  | ExchangeMigrationFiascoState;

function allowance$(allowances$: Observable<Allowances>, token: string) {
  return allowances$.pipe(
    map(allowances => allowances[token])
  );
}

export function createExchangeMigration$(
  proxyAddress$: Observable<string>,
  calls$: Calls$,
  operations$: Observable<ExchangeMigrationOperation[]>,
  orders$: Observable<TradeWithStatus[]>
): Observable<ExchangeMigrationState> {

  const state$ = new BehaviorSubject<ExchangeMigrationState>({
    status: ExchangeMigrationStatus.initializing,
    cancelOffer: () => false,
  } as ExchangeMigrationInitializingState);

  return combineLatest(
    calls$,
    operations$,
    orders$,
    state$
  ).pipe(
    map(([calls, operations, orders, state]) => {
      if (state.status === ExchangeMigrationStatus.initializing) {
        const ready = {
          orders,
          pending: operations,
          cancelOffer: (cancelData: CancelData) =>
            calls.cancelOffer2(cancelData).subscribe(noop),
          start: () => {
            inductor(
              ready,
              curry(next)(proxyAddress$, calls, state$),
            ).subscribe(s => state$.next(s));
          },
          status: ExchangeMigrationStatus.ready,
        } as ExchangeMigrationState;
        return ready;
      }
      return state;
    }),
    startWith()
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
  state$: BehaviorSubject<ExchangeMigrationState>,
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

    const fiasco = {
      pending: state.pending,
      current: state.current,
      done: state.done,
      status: ExchangeMigrationStatus.fiasco,
      restart: () => {
        state$.next({ status: ExchangeMigrationStatus.initializing });
        // const { txStatus, txHash, ...current } = state.current;
        // inductor(
        //   {
        //     orders: state.orders,
        //     pending: [current, ...state.pending],
        //     cancelOffer: state.cancelOffer,
        //     status: ExchangeMigrationStatus.ready,
        //     start: () => { return; },
        //   },
        //   curry(next)(proxyAddress$, calls, state$),
        // ).subscribe(s => state$.next(s));
      }
    } as ExchangeMigrationState;

    return of(fiasco);
  }

  return undefined;
}

export function createExchangeMigrationOps$(
  saiBalance$: Observable<BigNumber>,
  allowances$: Observable<Allowances>,
  proxyAddress$: Observable<string | undefined>,
): Observable<ExchangeMigrationOperation[]> {

  const saiAllowance$ = allowance$(allowances$, 'SAI');

  return combineLatest(
    saiBalance$,
    saiAllowance$,
    proxyAddress$,
  ).pipe(
    // @ts-ignore
    map(args => exchangeMigrationOps(...args)),
  );
}

function exchangeMigrationOps(
  saiBalance: BigNumber,
  saiAllowance: boolean,
  proxyAddress: string | undefined,
): ExchangeMigrationOperation[] {

  if (saiBalance.eq(zero)) {
    return [];
  }

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
    ...proxyOps,
    ...saiAllowanceOps,
    ...sai2DaiOps
  ];
}
