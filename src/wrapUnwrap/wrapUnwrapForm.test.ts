import { BigNumber }from 'bignumber.js';
import { Observable, of, throwError } from 'rxjs';
import { shareReplay } from 'rxjs/internal/operators';

import { setupFakeWeb3ForTesting } from '../blockchain/web3';
setupFakeWeb3ForTesting();

import { Calls$ } from '../blockchain/calls/calls';
import { FormChangeKind } from '../utils/form';
import { unpack } from '../utils/testHelpers';
import {
  createWrapUnwrapForm$,
    MessageKind,
    WrapUnwrapFormKind,
    WrapUnwrapFormState
} from './wrapUnwrapForm';

const defaultCalls = {
  wrapEstimateGas: () => of(100),
  unwrapEstimateGas: () => of(100),
} as any;

const gasPrice$ = of(new BigNumber(0.01));
const etherPriceUSD$ = of(new BigNumber(1));
const ethBalance$ = of(new BigNumber(1000));
const wethBalance$ = of(new BigNumber(1000));
const calls$ = of(defaultCalls) as Calls$;
const wrap = WrapUnwrapFormKind.wrap;
const unwrap = WrapUnwrapFormKind.unwrap;

describe('Wrapping' , () => {
  let controller:Observable<WrapUnwrapFormState>;

  beforeEach(() => {
    controller =
        createWrapUnwrapForm$(
          gasPrice$,
          etherPriceUSD$,
          ethBalance$,
          wethBalance$,
          calls$,
          wrap
        ).pipe(shareReplay(1));
  });

  test('initial state', () => {
    expect(unpack(controller)).toMatchSnapshot();
  });

  test('happy path', () => {
    const { change } = unpack(controller);
    change({ kind:FormChangeKind.amountFieldChange , value: new BigNumber(100) });

    expect(unpack(controller).readyToProceed).toBeTruthy();
  });

  test('not enough balance', () => {
    const { change } = unpack(controller);
    change({ kind:FormChangeKind.amountFieldChange , value: new BigNumber(1001) });

    expect(unpack(controller).readyToProceed).toBeFalsy();
    expect(unpack(controller).messages.length).toBe(1);
    expect(unpack(controller).messages[0])
      .toEqual({ kind: MessageKind.insufficientAmount, token: 'ETH' });
  });

  test('negative amount', () => {
    const { change } = unpack(controller);
    change({ kind:FormChangeKind.amountFieldChange , value: new BigNumber(-1) });

    expect(unpack(controller).readyToProceed).toBeFalsy();
    expect(unpack(controller).messages.length).toBe(1);
    expect(unpack(controller).messages[0]).toEqual({ kind: MessageKind.dustAmount });
  });

  test('zero amount', () => {
    const { change } = unpack(controller);
    change({ kind:FormChangeKind.amountFieldChange , value: new BigNumber(-1) });

    expect(unpack(controller).readyToProceed).toBeFalsy();
    expect(unpack(controller).messages.length).toBe(1);
    expect(unpack(controller).messages[0]).toEqual({ kind: MessageKind.dustAmount });
  });

  test('failed estimation', () => {
    const callsCopy = of({ ...defaultCalls, wrapEstimateGas: () =>
        throwError(new Error('Kurcze'))}) as Calls$;
    controller = createWrapUnwrapForm$(
        gasPrice$,
        etherPriceUSD$,
        ethBalance$,
        wethBalance$,
        callsCopy,
        wrap
    ).pipe(shareReplay(1));

    const { change } = unpack(controller);
    change({ kind:FormChangeKind.amountFieldChange , value: new BigNumber(1) });

    expect(unpack(controller).readyToProceed).toBeFalsy();
  });
});

describe('Unwrapping', () => {
  let controller: Observable<WrapUnwrapFormState>;

  beforeEach(() => {
    controller =
        createWrapUnwrapForm$(
            gasPrice$,
            etherPriceUSD$,
            ethBalance$,
            wethBalance$,
            calls$,
            unwrap
        ).pipe(shareReplay(1));
  });

  test('initial state', () => {
    expect(unpack(controller)).toMatchSnapshot();
  });

  test('happy path', () => {
    const { change } = unpack(controller);
    change({ kind:FormChangeKind.amountFieldChange , value: new BigNumber(100) });

    expect(unpack(controller).readyToProceed).toBeTruthy();
  });

  test('not enough balance', () => {
    const { change } = unpack(controller);
    change({ kind:FormChangeKind.amountFieldChange , value: new BigNumber(1001) });

    expect(unpack(controller).readyToProceed).toBeFalsy();
    expect(unpack(controller).messages.length).toBe(1);
    expect(unpack(controller).messages[0])
      .toEqual({ kind: MessageKind.insufficientAmount, token: 'WETH' });
  });

  test('negative amount', () => {
    const { change } = unpack(controller);
    change({ kind:FormChangeKind.amountFieldChange , value: new BigNumber(-1) });

    expect(unpack(controller).readyToProceed).toBeFalsy();
    expect(unpack(controller).messages.length).toBe(1);
    expect(unpack(controller).messages[0]).toEqual({ kind: MessageKind.dustAmount });
  });

  test('zero amount', () => {
    const { change } = unpack(controller);
    change({ kind:FormChangeKind.amountFieldChange , value: new BigNumber(-1) });

    expect(unpack(controller).readyToProceed).toBeFalsy();
    expect(unpack(controller).messages.length).toBe(1);
    expect(unpack(controller).messages[0]).toEqual({ kind: MessageKind.dustAmount });
  });

  test('failed estimation', () => {
    const callsCopy = of({ ...defaultCalls, unwrapEstimateGas: () =>
            throwError(new Error('Kurcze'))}) as Calls$;
    controller = createWrapUnwrapForm$(
            gasPrice$,
            etherPriceUSD$,
            ethBalance$,
            wethBalance$,
            callsCopy,
            unwrap
        ).pipe(shareReplay(1));

    const { change } = unpack(controller);
    change({ kind:FormChangeKind.amountFieldChange , value: new BigNumber(1) });

    expect(unpack(controller).readyToProceed).toBeFalsy();
  });
});
