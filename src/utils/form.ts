import { BigNumber } from 'bignumber.js';
import { combineLatest, Observable, of } from 'rxjs';
import { takeWhileInclusive } from 'rxjs-take-while-inclusive';
import { catchError, first, flatMap, map, startWith, switchMap } from 'rxjs/operators';
import { Balances, DustLimits } from '../balances/balances';
import { Calls, Calls$, ReadCalls, ReadCalls$ } from '../blockchain/calls/calls';
import { TxState, TxStatus } from '../blockchain/transactions';
import { User } from '../blockchain/user';
import { amountFromWei } from '../blockchain/utils';
import { TradeWithStatus } from '../exchange/myTrades/openTrades';
import { Offer, OfferType, Orderbook } from '../exchange/orderbook/orderbook';

export enum FormStage {
  idle = 'idle',
  blocked = 'blocked'
}

export enum ProgressStage {
  waitingForApproval = 'waitingForApproval',
  waitingForConfirmation = 'waitingForConfirmation',
  fiasco = 'fiasco',
  done = 'done',
  canceled = 'canceled'
}

export enum FormChangeKind {
  kindChange = 'kind',
  priceFieldChange = 'price',
  amountFieldChange = 'amount',
  setMaxChange = 'setMax',
  gasPriceChange = 'gasPrice',
  etherPriceUSDChange = 'etherPriceUSDChange',
  sellAllowanceChange = 'sellAllowance',
  buyAllowanceChange = 'buyAllowance',
  formStageChange = 'stage',
  formResetChange = 'reset',
  orderbookChange = 'orderbook',
  balancesChange = 'balancesChange',
  dustLimitChange = 'dustLimitChange',
  userChange = 'userChange',
  matchTypeChange = 'matchType',
  pickOfferChange = 'pickOffer',
  progress = 'progress',
  etherBalanceChange = 'etherBalanceChange',
  ordersChange = 'ordersChange'
}

export enum OfferMatchType {
  limitOrder = 'limitOrder',
  direct = 'direct',
}

export interface StageChange {
  kind: FormChangeKind.formStageChange;
  stage: FormStage;
}

export function formStageChange(stage: FormStage): StageChange {
  return { stage, kind: FormChangeKind.formStageChange };
}

export interface PriceFieldChange {
  kind: FormChangeKind.priceFieldChange;
  value?: BigNumber;
}

export interface AmountFieldChange {
  kind: FormChangeKind.amountFieldChange;
  value?: BigNumber;
}

export interface SetMaxChange {
  kind: FormChangeKind.setMaxChange;
}

export interface KindChange {
  kind: FormChangeKind.kindChange;
  newKind: OfferType;
}

export interface MatchTypeChange {
  kind: FormChangeKind.matchTypeChange;
  matchType: OfferMatchType;
}

export interface PickOfferChange {
  kind: FormChangeKind.pickOfferChange;
  offer: Offer;
}

export interface FormResetChange {
  kind: FormChangeKind.formResetChange;
}

export interface GasPriceChange {
  kind: FormChangeKind.gasPriceChange;
  value: BigNumber;
}

export interface EtherPriceUSDChange {
  kind: FormChangeKind.etherPriceUSDChange;
  value: BigNumber;
}

export interface AllowanceChange {
  kind: FormChangeKind.buyAllowanceChange | FormChangeKind.sellAllowanceChange;
  allowance: boolean;
}

export interface OrderbookChange {
  kind: FormChangeKind.orderbookChange;
  orderbook: Orderbook;
}

export interface BalancesChange {
  kind: FormChangeKind.balancesChange;
  balances: Balances;
}

export interface DustLimitChange {
  kind: FormChangeKind.dustLimitChange;
  dustLimitBase: BigNumber;
  dustLimitQuote: BigNumber;
}

export interface UserChange {
  kind: FormChangeKind.userChange;
  user: User;
}

export interface ProgressChange {
  kind: FormChangeKind.progress;
  progress?: ProgressStage;
}

export interface EtherBalanceChange {
  kind: FormChangeKind.etherBalanceChange;
  etherBalance: BigNumber;
}

export interface OrdersChange {
  kind: FormChangeKind.ordersChange;
  orders: TradeWithStatus[];
}

export function progressChange(progress?: ProgressStage): ProgressChange {
  return { progress, kind: FormChangeKind.progress };
}

export function toEtherBalanceChange(etherBalance$: Observable<BigNumber>) {
  return etherBalance$.pipe(
    map(etherBalance => ({
      etherBalance,
      kind: FormChangeKind.etherBalanceChange,
    }))
  );
}

export function toGasPriceChange(gasPrice$: Observable<BigNumber>): Observable<GasPriceChange> {
  return gasPrice$.pipe(
    map(gasPrice => ({
      kind: FormChangeKind.gasPriceChange,
      value: gasPrice
    } as GasPriceChange))
  );
}

export function toEtherPriceUSDChange(etherPriceUSD$: Observable<BigNumber>):
  Observable<EtherPriceUSDChange> {
  return etherPriceUSD$.pipe(
    map(value => ({
      value,
      kind: FormChangeKind.etherPriceUSDChange,
    } as EtherPriceUSDChange))
  );
}

export function toAllowanceChange$(
  kind: FormChangeKind.buyAllowanceChange | FormChangeKind.sellAllowanceChange,
  token: string,
  theAllowance$: (token: string) => Observable<boolean>): Observable<AllowanceChange> {
  return theAllowance$(token).pipe(
    map((allowance: boolean) => ({ kind, allowance } as AllowanceChange))
  );
}

export function toOrderbookChange$(orderbook$: Observable<Orderbook>): Observable<OrderbookChange> {
  return orderbook$.pipe(
    map(orderbook => ({
      orderbook,
      kind: FormChangeKind.orderbookChange,
    } as OrderbookChange))
  );
}

export function toDustLimitChange$(
  dustLimits$: Observable<DustLimits>,
  base: string,
  quote: string
):
  Observable<DustLimitChange> {
  return dustLimits$.pipe(
    map(dustLimits => ({
      kind: FormChangeKind.dustLimitChange,
      dustLimitBase: dustLimits[base] || new BigNumber(0),
      dustLimitQuote: dustLimits[quote] || new BigNumber(0),
    } as DustLimitChange)
    ));
}

export function toBalancesChange(balances$: Observable<Balances>) {
  return balances$.pipe(
    map(balances => ({
      balances,
      kind: FormChangeKind.balancesChange
    } as BalancesChange))
  );
}

export function toUserChange(user$: Observable<User>) {
  return user$.pipe(
    map(user => ({
      user,
      kind: FormChangeKind.userChange
    } as UserChange))
  );
}

export function toOrdersChange(
  orders$: Observable<TradeWithStatus[]>
) {
  return orders$.pipe(
    map(orders => ({ orders, kind: FormChangeKind.ordersChange }))
  );
}

type TransationStateToX<X> =
  (transactionState$: Observable<TxState>) => Observable<X>;

export function transactionToX<X>(
  startWithX: X,
  waitingForConfirmationX: X,
  fiascoX: X,
  successHandler?: () => Observable<X>): TransationStateToX<X> {

  return (transactionState$: Observable<TxState>) =>
    transactionState$.pipe(
      takeWhileInclusive((txState: TxState) =>
        txState.status === TxStatus.Success && txState.confirmations === 0 ||
        txState.status !== TxStatus.Success
      ),
      flatMap((txState: TxState): Observable<X> => {
        switch (txState.status) {
          case TxStatus.CancelledByTheUser:
          case TxStatus.Failure:
          case TxStatus.Error:
            return of(fiascoX);
          case TxStatus.Propagating:
          case TxStatus.WaitingForConfirmation:
            return of(waitingForConfirmationX);
          case TxStatus.Success:
            return successHandler ? successHandler() : of();
          default:
            return of();
        }
      }),
      startWith(startWithX)
    );
}

export enum GasEstimationStatus {
  unset = 'unset',
  calculating = 'calculating',
  calculated = 'calculated',
  error = 'error',
  unknown = 'unknown',
}

export interface HasGasEstimationEthUsd {
  gasEstimation?: number;
  gasEstimationEth?: BigNumber;
  gasEstimationUsd?: BigNumber;
}

export interface HasGasEstimation extends HasGasEstimationEthUsd {
  gasPrice?: BigNumber;
  etherPriceUsd?: BigNumber;
  gasEstimationStatus: GasEstimationStatus;
  error?: any;
}

export function doGasEstimation<S extends HasGasEstimation>(
  calls$: Calls$,
  readCalls$: ReadCalls$ | undefined,
  state: S,
  call: (
    calls: Calls,
    readCalls: ReadCalls | undefined,
    state: S
  ) => Observable<number> | undefined,
): Observable<S>;

export function doGasEstimation<S extends HasGasEstimation>(
  calls$: Calls$,
  readCalls$: ReadCalls$,
  state: S,
  call: (calls: Calls, readCalls: ReadCalls, state: S) => Observable<number> | undefined,
): Observable<S>;

export function doGasEstimation<S extends HasGasEstimation>(
  calls$: Calls$ | undefined,
  readCalls$: ReadCalls$,
  state: S,
  call: (
    calls: Calls | undefined,
    readCalls: ReadCalls,
    state: S
  ) => Observable<number> | undefined,
): Observable<S>;

export function doGasEstimation<S extends HasGasEstimation>(
  calls$: Calls$ | undefined,
  readCalls$: ReadCalls$ | undefined,
  state: S,
  call:
    (
      (
        calls: Calls | undefined,
        readCalls: ReadCalls | undefined,
        state: S) => Observable<number> | undefined
      ) |
    (
      (
        calls: Calls,
        readCalls: ReadCalls,
        state: S
      ) => Observable<number> | undefined),
): Observable<S> {
  return combineLatest(calls$ || of(undefined), readCalls$ || of(undefined)).pipe(
    first(),
    switchMap(([calls, readCalls]) => {
      if (state.gasEstimationStatus !== GasEstimationStatus.unset) {
        return of(state);
      }

      const {
        // @ts-ignore
        gasEstimationEth,
        // @ts-ignore
        gasEstimationUsd,
        ...stateWithoutGasEstimation
      } = state as object;

      const gasCall = call(calls, readCalls, state);
      const gasPrice = state.gasPrice;
      const etherPriceUsd = state.etherPriceUsd;

      if (!gasPrice || !etherPriceUsd || !gasCall) {
        return of({
          ...(stateWithoutGasEstimation as object),
          gasEstimationStatus: GasEstimationStatus.unset,
        } as S);
      }

      return gasCall.pipe(
        map((gasEstimation: number) => {
          const gasCost = amountFromWei((gasPrice).times(gasEstimation), 'ETH');
          return {
            ...(state as object),
            gasEstimation,
            gasEstimationStatus: GasEstimationStatus.calculated,
            gasEstimationEth: gasCost,
            gasEstimationUsd: gasCost.times(etherPriceUsd),
          };
        })
      );
    }),
    catchError((error) => {
      console.warn('Error while estimating gas:', error);
      return of({
        ...(state as object),
        error,
        gasEstimationStatus: GasEstimationStatus.error,
      });
    }),
    startWith({
      ...(state as object),
      gasEstimationStatus: GasEstimationStatus.calculating } as S)
  );
}

export function calculateTotal(
  amount: BigNumber | undefined,
  orders: Offer[]
): BigNumber | undefined {
  if (!amount) return undefined;
  let base = amount;
  let quote = new BigNumber(0);
  for (const offer of orders) {
    if (base.lte(new BigNumber(0))) {
      break;
    }
    if (base.gte(offer.baseAmount)) {
      quote = quote.plus(offer.quoteAmount);
      base = base.minus(offer.baseAmount);
    } else {
      quote = quote.plus(
        offer.quoteAmount.times(base).dividedBy(offer.baseAmount)
      );
      base = new BigNumber(0);
    }
  }
  return !base.isZero() ? undefined : quote;
}
