import { BigNumber } from 'bignumber.js';
import { merge, Observable, Subject } from 'rxjs';
import { map, scan } from 'rxjs/operators';
import { TradeWithStatus } from '../exchange/myTrades/openTrades';
import { combineAndMerge } from '../utils/combineAndMerge';
import {
  AmountFieldChange,  FormChangeKind,
} from '../utils/form';
import { zero } from '../utils/zero';
import { ExchangeMigrationState } from './migration';

export enum MessageKind {
  amount2Big = 'amount2Big',
  // TODO: too small, dust
}

export interface Message {
  kind: MessageKind.amount2Big;
}

export enum MigrationFormKind {
  sai2dai = 'sai2dai',
  dai2sai = 'dai2sai',
}

enum BalanceChangeKind {
  saiBalanceChange = 'saiBalanceChange',
  daiBalanceChange = 'daiBalanceChange',
}

export type ManualChange = AmountFieldChange;

interface EnvironmentChange {
  kind: BalanceChangeKind;
  balance: BigNumber;
}

export interface ProgressChange {
  kind: FormChangeKind.progress;
  progress?: ExchangeMigrationState;
}

type MigrationFormChange = ManualChange | EnvironmentChange | ProgressChange;

export interface MigrationFormState {
  kind: MigrationFormKind;
  saiBalance: BigNumber;
  daiBalance: BigNumber;
  orders: TradeWithStatus[];
  amount?: BigNumber;
  messages: Message[];
  readyToProceed?: boolean;
  progress?: ExchangeMigrationState;
  change: (change: ManualChange) => void;
  proceed: (state: MigrationFormState) => void;
}

function applyChange(
  state: MigrationFormState,
  change: MigrationFormChange
): MigrationFormState {
  switch (change.kind) {
    case BalanceChangeKind.daiBalanceChange:
      return { ...state, daiBalance: change.balance };
    case BalanceChangeKind.saiBalanceChange:
      return { ...state, saiBalance: change.balance };
    case FormChangeKind.amountFieldChange:
      return { ...state, amount: change.value  };
    case FormChangeKind.progress:
      return { ...state, progress: change.progress };
    // TODO: orders
  }
  return state;
}

function validate(state: MigrationFormState) {
  const messages: Message[] = [];

  // TODO it should be neither to small nor to big

  return {
    ...state,
    messages,
  };
}

function checkIfIsReadyToProceed(state: MigrationFormState) {

  const readyToProceed = state.amount &&
    state.messages.length === 0;

  return {
    ...state,
    readyToProceed,
  };
}

function prepareProceed(
  migrateSAI2DAI$: (amount: BigNumber) => Observable<ExchangeMigrationState>,
  migrateDAI2SAI$: (amount: BigNumber) => Observable<ExchangeMigrationState>,
): [
  (state: MigrationFormState) => void, Observable<ProgressChange>
] {

  const proceedChange$ = new Subject<ProgressChange>();

  function proceed(state: MigrationFormState) {

    const amount = state.amount;

    if (!amount) {
      return;
    }

    const call$ = state.kind === MigrationFormKind.sai2dai ?
      migrateSAI2DAI$ : migrateDAI2SAI$;

    const changes$ = call$(amount).pipe(
      map(progress => (
        { progress, kind: FormChangeKind.progress } as ProgressChange
      ))
    );

    changes$.subscribe((change: ProgressChange) => proceedChange$.next(change));

    return changes$;
  }

  return [proceed, proceedChange$];
}

function freezeIfInProgress(
  previous: MigrationFormState,
  state: MigrationFormState
): MigrationFormState {
  if (state.progress) {
    return {
      ...previous,
      progress: state.progress,
    };
  }
  return state;
}

function toBalanceChange(
  balance$: Observable<BigNumber>,
  kind: BalanceChangeKind.saiBalanceChange | BalanceChangeKind.daiBalanceChange
) {
  return balance$.pipe(
    map(balance => ({ kind, balance }))
  );
}

export function createMigrationForm$(
  saiBalance$: Observable<BigNumber>,
  daiBalance$: Observable<BigNumber>,
  kind: MigrationFormKind,
  migrateSAI2DAI$: (amount: BigNumber) => Observable<ExchangeMigrationState>,
  migrateDAI2SAI$: (amount: BigNumber) => Observable<ExchangeMigrationState>,
): Observable<MigrationFormState> {

  const manualChange$ = new Subject<ManualChange>();

  const saiBalanceChange$ =
    toBalanceChange(saiBalance$, BalanceChangeKind.saiBalanceChange);

  const daiBalanceChange$ =
    toBalanceChange(daiBalance$, BalanceChangeKind.daiBalanceChange);

  const environmentChange$ = combineAndMerge(
    saiBalanceChange$,
    daiBalanceChange$,
  );

  const [proceed, proceedProgressChange$] =
    prepareProceed(migrateSAI2DAI$, migrateDAI2SAI$);

  const change = manualChange$.next.bind(manualChange$);

  const initialState = {
    kind,
    change,
    proceed,
    saiBalance: zero,
    daiBalance: zero,
    messages: [],
    orders: [],
  };

  return merge(
    manualChange$,
    environmentChange$,
    proceedProgressChange$
  ).pipe(
    scan(applyChange, initialState),
    map(validate),
    map(checkIfIsReadyToProceed),
    scan(freezeIfInProgress),
  );
}
