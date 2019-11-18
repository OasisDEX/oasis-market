import { BigNumber } from 'bignumber.js';
import { curry } from 'lodash';
import { combineLatest, Observable, of } from 'rxjs';
import { filter, first, map, startWith, switchMap } from 'rxjs/operators';
import { Allowances } from '../balances/balances';
import { Calls, Calls$ } from '../blockchain/calls/calls';
// import { CancelData } from '../blockchain/calls/offerMake';
import { getTxHash, TxState, TxStatus } from '../blockchain/transactions';
// import { TradeWithStatus } from '../exchange/myTrades/openTrades';
// import { Offer } from '../exchange/orderbook/orderbook';
import { inductor } from '../utils/inductor';
import { zero } from '../utils/zero';

export enum ExchangeMigrationTxKind {
  // cancel = 'cancel',
  createProxy = 'createProxy',
  allowance4Proxy = 'allowance4Proxy',
  sai2dai = 'sai2dai',
  dai2sai = 'dai2sai'
}

// interface CancelOperation {
//   kind: ExchangeMigrationTxKind.cancel;
//   offer: Offer;
// }

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
  // CancelOperation |
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

interface ExchangeMigrationInitialState {
  status: ExchangeMigrationStatus.initializing;
}

interface ExchangeMigrationReadyState {
  status: ExchangeMigrationStatus.ready;
  pending: ExchangeMigrationOperation[];
}

interface ExchangeMigrationInProgressState {
  status: ExchangeMigrationStatus.inProgress;
  pending: ExchangeMigrationOperation[];
  current: ExchangeMigrationOperationInProgress;
  done: ExchangeMigrationOperationInProgress[];
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
}

export type ExchangeMigrationState =
  | ExchangeMigrationInitialState
  | ExchangeMigrationReadyState
  | ExchangeMigrationInProgressState
  | ExchangeMigrationDoneState
  | ExchangeMigrationFiascoState;

function allowance$(allowances$: Observable<Allowances>, token: string) {
  return allowances$.pipe(
    map(allowances => allowances[token])
  );
}

function startTransaction(
  proxyAddress$: Observable<string | undefined>,
  calls: Calls,
  o: ExchangeMigrationOperation
): Observable<TxState> {
  switch (o.kind) {
    // case ExchangeMigrationTxKind.cancel:
    //   return calls.cancelOffer2({
    //     offerId: o.offer.offerId,
    //     type: o.offer.type,
    //     amount: o.offer.baseAmount,
    //     token: o.offer.baseToken,
    //   });
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
  state: ExchangeMigrationState
): Observable<ExchangeMigrationState> | undefined {

  if (state.status === ExchangeMigrationStatus.ready) {
    if (state.pending.length === 0) {
      return of({
        ...state,
        done: [],
        status: ExchangeMigrationStatus.done,
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
      } as ExchangeMigrationState);
    }

    const fiasco = {
      ...state,
      pending: [state.current, ...state.pending],
      current: {} as ExchangeMigrationOperationInProgress,
      done: state.done,
      status: ExchangeMigrationStatus.fiasco,
    } as ExchangeMigrationState;

    return of(fiasco);
  }

  return undefined;
}

export function createMigrationOps$(
  token: string,
  allowances$: Observable<Allowances>,
  proxyAddress$: Observable<string | undefined>,
  amount: BigNumber,
  ): Observable<ExchangeMigrationOperation[]> {

  const tokenAllowance$ = allowance$(allowances$, token);

  return combineLatest(
    tokenAllowance$,
    proxyAddress$,
  ).pipe(
    map(([allowance, proxyAddress]) => {

      if (amount.eq(zero)) {
        return [];
      }

      const proxyOps: CreateProxyOperation[] = proxyAddress ? [] : [
        { kind: ExchangeMigrationTxKind.createProxy },
      ];

      const saiAllowanceOps: Allowance4ProxyOperation[] = allowance ? [] : [
        { token, kind: ExchangeMigrationTxKind.allowance4Proxy, }
      ];

      const ops: ExchangeMigrationOperation[] = amount.gt(zero) ? [
        { amount,
          kind: token === 'SAI' ?
            ExchangeMigrationTxKind.sai2dai :
            ExchangeMigrationTxKind.dai2sai
        } as ExchangeMigrationOperation
      ] : [];

      return [
        ...proxyOps,
        ...saiAllowanceOps,
        ...ops
      ];
    }),
  );
}

export function createExchangeMigration$(
  proxyAddress$: Observable<string>,
  calls$: Calls$,
  operations$: Observable<ExchangeMigrationOperation[]>,
): Observable<ExchangeMigrationState> {
  return combineLatest(
    calls$,
    operations$,
  ).pipe(
    first(),
    switchMap(([calls, operations]) => {
      return inductor(
        {
          status: ExchangeMigrationStatus.ready,
          pending: operations
        },
        curry(next)(proxyAddress$, calls),
      );
    }),
    startWith({ status: ExchangeMigrationStatus.initializing } as ExchangeMigrationState)
  );
}
