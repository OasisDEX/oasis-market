import { BigNumber } from 'bignumber.js';
import { curry } from 'lodash';
import { BehaviorSubject, combineLatest, noop, Observable, of } from 'rxjs';
import { filter, first, map, switchMap } from 'rxjs/operators';
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
  sai2dai = 'sai2dai',
  dai2sai = 'dai2sai'
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

export interface SAI2DAIOperation {
  kind: ExchangeMigrationTxKind.sai2dai;
  amount: BigNumber;
}

export interface DAI2SAIOperation {
  kind: ExchangeMigrationTxKind.dai2sai;
  amount: BigNumber;
}

type ExchangeMigrationOperation =
  CancelOperation |
  CreateProxyOperation |
  SAI2DAIOperation |
  DAI2SAIOperation |
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
  orders: TradeWithStatus[];
  status: ExchangeMigrationStatus.done;
  done: ExchangeMigrationOperationInProgress[];
  restart: VoidFunction;
}

interface ExchangeMigrationFiascoState {
  orders: TradeWithStatus[];
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
      if (state.status === ExchangeMigrationStatus.done) {
        state$.next({ status: ExchangeMigrationStatus.initializing });
      }
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
          return calls.swapSaiToDai({
            proxyAddress: proxyAddress!,
            amount: o.amount
          });
        })
      );
    case ExchangeMigrationTxKind.dai2sai:
      return proxyAddress$.pipe(
        first(),
        filter(proxyAddress => !!proxyAddress),
        switchMap(proxyAddress => {
          return calls.swapDaiToSai({
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
        ...state,
        done: [],
        status: ExchangeMigrationStatus.done,
        restart: () => {
          state$.next({ status: ExchangeMigrationStatus.initializing });
        }
      } as ExchangeMigrationState);
    }
    const [current, ...pending] = state.pending;
    return start(proxyAddress$, calls, current, pending, []).pipe(
      map((newState) => ({
        ...state,
        ...newState
      } as ExchangeMigrationState))
    );
  }

  if (state.status === ExchangeMigrationStatus.inProgress) {
    if (
      state.current.txStatus === TxStatus.Success &&
      state.pending.length > 0
    ) {
      const [current, ...pending] = state.pending;
      const done = [...state.done, state.current];
      return start(proxyAddress$, calls, current, pending, done).pipe(
        map((newState) => ({
          ...state,
          ...newState
        } as ExchangeMigrationState))
      );
    }

    if (
      state.current.txStatus === TxStatus.Success &&
      state.pending.length === 0
    ) {
      return of({
        ...state,
        done: [...state.done, state.current],
        status: ExchangeMigrationStatus.done,
        restart: () => {
          state$.next({ status: ExchangeMigrationStatus.initializing });
        }
      } as ExchangeMigrationState);
    }

    const fiasco = {
      ...state,
      pending: [...state.pending, state.current],
      current: {} as ExchangeMigrationOperationInProgress,
      done: state.done,
      status: ExchangeMigrationStatus.fiasco,
      restart: () => {
        state$.next({ status: ExchangeMigrationStatus.initializing });
      }
    } as ExchangeMigrationState;

    return of(fiasco);
  }

  return undefined;
}

export function createSAI2DAIOps$(
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
    map(([saiBalance, saiAllowance, proxyAddress]) => {

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
    }),
  );
}

export function createDAI2SAIOps$(
  daiBalance$: Observable<BigNumber>,
  allowances$: Observable<Allowances>,
  proxyAddress$: Observable<string | undefined>,
): Observable<ExchangeMigrationOperation[]> {

  const daiAllowance$ = allowance$(allowances$, 'DAI');

  return combineLatest(
    daiBalance$,
    daiAllowance$,
    proxyAddress$,
  ).pipe(
    map(([daiBalance, daiAllowance, proxyAddress]) => {

      if (daiBalance.eq(zero)) {
        return [];
      }

      const proxyOps: CreateProxyOperation[] = proxyAddress ? [] : [
        { kind: ExchangeMigrationTxKind.createProxy },
      ];

      const daiAllowanceOps: Allowance4ProxyOperation[] = daiAllowance ? [] : [
        { kind: ExchangeMigrationTxKind.allowance4Proxy, token: 'DAI' }
      ];

      const dai2DaiOps: DAI2SAIOperation[] = daiBalance.gt(zero) ? [
        { kind: ExchangeMigrationTxKind.dai2sai, amount: daiBalance }
      ] : [];

      return [
        ...proxyOps,
        ...daiAllowanceOps,
        ...dai2DaiOps
      ];
    }),
  );
}
