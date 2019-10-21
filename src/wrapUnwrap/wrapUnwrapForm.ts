import { BigNumber } from 'bignumber.js';
import { curry } from 'ramda';
import { merge, Observable, of, Subject } from 'rxjs';
import { first, map, scan, switchMap, takeUntil } from 'rxjs/operators';
import { Calls, Calls$ } from '../blockchain/calls/calls';
import {
  InstantFormChangeKind,
  ProxyChange
} from '../instant/instantForm';
import { combineAndMerge } from '../utils/combineAndMerge';
import {
  AmountFieldChange, doGasEstimation,
  EtherPriceUSDChange, FormChangeKind,
  GasEstimationStatus, GasPriceChange,
  HasGasEstimation, progressChange, ProgressChange,
  ProgressStage, toEtherPriceUSDChange, toGasPriceChange, transactionToX,
} from '../utils/form';
import { firstOfOrTrue } from '../utils/operators';
import { zero } from '../utils/zero';

export enum MessageKind {
  insufficientAmount = 'insufficientAmount',
  dustAmount = 'dustAmount',
}

export type Message = {
  kind: MessageKind.insufficientAmount,
  token: string,
} | {
  kind: MessageKind.dustAmount,
};

export enum WrapUnwrapFormKind {
  wrap = 'wrap',
  unwrap = 'unwrap',
  wrapSai = 'wrapSai',
  unwrapSai = 'unwrapSai'
}

enum BalanceChangeKind {
  ethBalanceChange = 'ethBalanceChange',
  wethBalanceChange = 'wethBalanceChange',
  saiBalanceChange = 'saiBalanceChange',
  daiBalanceChange = 'daiBalanceChange'
}

export type ManualChange = AmountFieldChange;

type EnvironmentChange =
  GasPriceChange |
  ProxyChange |
  EtherPriceUSDChange |
  { kind: BalanceChangeKind, balance: BigNumber };

type WrapUnwrapFormChange = ManualChange | EnvironmentChange | ProgressChange;

export interface WrapUnwrapFormState extends HasGasEstimation {
  readyToProceed?: boolean;
  kind: WrapUnwrapFormKind;
  proxyAddress: string;
  ethBalance: BigNumber;
  wethBalance: BigNumber;
  saiBalance: BigNumber;
  daiBalance: BigNumber;
  messages: Message[];
  amount?: BigNumber;
  progress?: ProgressStage;
  change: (change: ManualChange) => void;
  proceed: (state: WrapUnwrapFormState) => void;
  cancel: () => void;
}

function applyChange(
  state: WrapUnwrapFormState,
  change: WrapUnwrapFormChange
): WrapUnwrapFormState {
  switch (change.kind) {
    case FormChangeKind.gasPriceChange:
      return { ...state,
        gasPrice: change.value,
        gasEstimationStatus: GasEstimationStatus.unset };
    case FormChangeKind.etherPriceUSDChange:
      return { ...state,
        etherPriceUsd: change.value,
        gasEstimationStatus: GasEstimationStatus.unset };
    case BalanceChangeKind.ethBalanceChange:
      return { ...state,
        ethBalance: change.balance,
        gasEstimationStatus: GasEstimationStatus.unset };
    case BalanceChangeKind.wethBalanceChange:
      return { ...state,
        wethBalance: change.balance,
        gasEstimationStatus: GasEstimationStatus.unset };
    case BalanceChangeKind.saiBalanceChange:
      return { ...state,
        saiBalance: change.balance,
        gasEstimationStatus: GasEstimationStatus.unset };
    case BalanceChangeKind.daiBalanceChange:
      return { ...state,
        daiBalance: change.balance,
        gasEstimationStatus: GasEstimationStatus.unset };
    case FormChangeKind.amountFieldChange:
      return { ...state,
        amount: change.value,
        gasEstimationStatus: GasEstimationStatus.unset };
    case FormChangeKind.progress:
      return { ...state, progress: change.progress };
    case InstantFormChangeKind.proxyChange:
      console.log(change.value);

      return { ...state, proxyAddress: change.value ? change.value : '' };
    //   const _exhaustiveCheck: never = change; // tslint:disable-line
  }
  return state;
}

function validate(state: WrapUnwrapFormState) {
  const messages: Message[] = [];

  const balance = ((kind: WrapUnwrapFormKind) => {
    switch (kind){
      case WrapUnwrapFormKind.wrap:
        return state.ethBalance;
      case WrapUnwrapFormKind.unwrap:
        return state.wethBalance;
      case WrapUnwrapFormKind.wrapSai:
        return state.saiBalance;
      case WrapUnwrapFormKind.unwrapSai:
        return state.daiBalance;
    }
  })(state.kind);

  const insufficientTest = state.amount && (() => {
    switch (state.kind){
      case WrapUnwrapFormKind.wrap:
        return state.amount && state.amount.gte;
      default:
        return state.amount && state.amount.gt;
    }
  })().bind(state.amount);

  if (state.amount && state.amount.lte(zero)) {
    messages.push({
      kind: MessageKind.dustAmount
    });
  }
  if (balance && insufficientTest && insufficientTest(balance)) {
    messages.push({
      kind: MessageKind.insufficientAmount,
      token: ((kind: WrapUnwrapFormKind) => {
        switch (kind) {
          case WrapUnwrapFormKind.wrap: return 'ETH';
          case WrapUnwrapFormKind.unwrap: return 'WETH';
          case WrapUnwrapFormKind.wrapSai: return 'SAI';
          case WrapUnwrapFormKind.unwrapSai: return 'DAI';
        }
      })(state.kind)
    });
  }
  return {
    ...state,
    messages,
  };
}

function estimateGasPrice(
  calls$: Calls$, state: WrapUnwrapFormState
): Observable<WrapUnwrapFormState> {
  return doGasEstimation(calls$, undefined, state, (calls: Calls) => {

    if (!state.amount || !state.gasPrice || !state.proxyAddress) {
      console.log(state.proxyAddress);

      return undefined;
    }

    const call:any = ((kind: WrapUnwrapFormKind) => {
      switch (kind){
        case WrapUnwrapFormKind.wrap: return calls.wrapEstimateGas;
        case WrapUnwrapFormKind.unwrap: return calls.unwrapEstimateGas;
        case WrapUnwrapFormKind.wrapSai: return calls.swapSaiToDaiEstimateGas;
        case WrapUnwrapFormKind.unwrapSai: return  calls.swapDaiToSaiEstimateGas;
      }
    })(state.kind);

    const args: any = (
      state.kind === WrapUnwrapFormKind.wrapSai
      || state.kind === WrapUnwrapFormKind.unwrapSai
    )
      ? { proxyAddress: state.proxyAddress, amount: state.amount, gasPrice: state.gasPrice }
      : { amount: state.amount, gasPrice: state.gasPrice };
    return call(args);
  });
}

function checkIfIsReadyToProceed(state: WrapUnwrapFormState) {
  const readyToProceed = state.amount &&
    state.messages.length === 0 &&
    state.gasEstimationStatus === GasEstimationStatus.calculated;
  return {
    ...state,
    readyToProceed,
  };
}

function prepareProceed(calls$: Calls$): [
  (state: WrapUnwrapFormState) => void,
  () => void, Observable<ProgressChange>
  ] {

  const proceedChange$ = new Subject<ProgressChange>();

  const cancel$ = new Subject<void>();

  function proceed(state: WrapUnwrapFormState) {

    const amount = state.amount;
    const gasPrice = state.gasPrice;
    const gas = state.gasEstimation;
    const proxyAddress = state.proxyAddress;

    if (!amount || !gasPrice || !gas) {
      return;
    }

    const changes$: Observable<ProgressChange> = merge(
      cancel$.pipe(
        map(() => progressChange(ProgressStage.canceled))
      ),
      calls$.pipe(
        first(),
        switchMap((calls): Observable<ProgressChange> => {
          const call:any = ((kind: WrapUnwrapFormKind) => {
            switch (kind) {
              case WrapUnwrapFormKind.wrap: return calls.wrap;
              case WrapUnwrapFormKind.unwrap: return calls.unwrap;
              case WrapUnwrapFormKind.wrapSai: return calls.swapSaiToDai;
              case WrapUnwrapFormKind.unwrapSai: return calls.swapDaiToSai;
            }
          })(state.kind);
          return call({ proxyAddress, amount, gasPrice, gas })
          .pipe(
            transactionToX(
              progressChange(ProgressStage.waitingForApproval),
              progressChange(ProgressStage.waitingForConfirmation),
              progressChange(ProgressStage.fiasco),
              () => of(progressChange(ProgressStage.done))
            ),
            takeUntil(cancel$)
          );
        }),
      ),
    );

    changes$.subscribe((change: ProgressChange) => proceedChange$.next(change));

    return changes$;
  }

  return [
    proceed,
    cancel$.next.bind(cancel$),
    proceedChange$,
  ];
}

function freezeIfInProgress(
  previous: WrapUnwrapFormState,
  state: WrapUnwrapFormState
): WrapUnwrapFormState {
  if (state.progress) {
    return {
      ...previous,
      progress: state.progress,
    };
  }
  return state;
}

export function createWrapUnwrapForm$(
  gasPrice$: Observable<BigNumber>,
  etherPriceUSD$: Observable<BigNumber>,
  ethBalance$: Observable<BigNumber>,
  wethBalance$: Observable<BigNumber>,
  saiBalance$: Observable<BigNumber>,
  daiBalance$: Observable<BigNumber>,
  proxyAddress$: Observable<string>,
  calls$: Calls$,
  kind: WrapUnwrapFormKind,
): Observable<WrapUnwrapFormState> {

  const manualChange$ = new Subject<ManualChange>();
  const resetChange$ = new Subject<ProgressChange>();

  const ethBalanceChange$ = ethBalance$.pipe(
    map(balance => ({
      balance,
      kind: BalanceChangeKind.ethBalanceChange
    })
  ));

  const wethBalanceChange$ = wethBalance$.pipe(
    map(balance => ({
      balance,
      kind: BalanceChangeKind.wethBalanceChange
    })
  ));

  const saiBalanceChange$ = saiBalance$.pipe(
    map(balance => ({
      balance,
      kind: BalanceChangeKind.saiBalanceChange
    })
  ));

  const daiBalanceChange$ = daiBalance$.pipe(
    map(balance => ({
      balance,
      kind: BalanceChangeKind.daiBalanceChange
    })
  ));

  const proxyAddressChange$ = proxyAddress$.pipe(
      map(address => ({
        kind: InstantFormChangeKind.proxyChange,
        value: address,
      })
    )
  );

  const environmentChange$ = combineAndMerge(
    toGasPriceChange(gasPrice$),
    toEtherPriceUSDChange(etherPriceUSD$),
    proxyAddressChange$,
    ethBalanceChange$,
    wethBalanceChange$,
    saiBalanceChange$,
    daiBalanceChange$,
  );

  const [proceed, cancel, proceedProgressChange$] = prepareProceed(calls$);

  const change = manualChange$.next.bind(manualChange$);

  const initialState = {
    kind,
    change,
    proceed,
    cancel,
    ethBalance: zero,
    wethBalance: zero,
    saiBalance: zero,
    daiBalance: zero,
    proxyAddress: '',
    messages: [],
    gasEstimationStatus: GasEstimationStatus.unset,

  };

  return merge(
    manualChange$,
    environmentChange$,
    resetChange$,
    proceedProgressChange$
  ).pipe(
  scan(applyChange, initialState),
  map(validate),
  switchMap(curry(estimateGasPrice)(calls$)),
  map(checkIfIsReadyToProceed),
  scan(freezeIfInProgress),
  firstOfOrTrue(s => s.gasEstimationStatus === GasEstimationStatus.calculating)
  );
}
