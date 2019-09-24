import { BigNumber } from 'bignumber.js';
import classnames from 'classnames';
import * as React from 'react';
import { default as MaskedInput } from 'react-text-mask';
import * as styles from './BigNumberInput.scss';

export class BigNumberInput extends React.Component<any> {
  private lastValue?: string;

  public changed = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.lastValue = e.target.value;
    if (e.target.value !== '0._') {
      this.props.onChange(e);
    }
  }

  public render() {
    const currentValue: string | undefined = this.props.value;
    let value: string | undefined;
    if (
      this.lastValue &&
      currentValue &&
      new BigNumber(this.lastValue.replace(/\,/g, '')).eq(
        new BigNumber(currentValue.replace(/\,/g, ''))
      )
    ) {
      value = this.lastValue;
    } else {
      value = currentValue;
    }

    const allowOnlyOneDot = (v: string, { rawValue }: { rawValue: string }) =>
      rawValue.match(/\..*\./) ? false : v;

    const pipe = [
      allowOnlyOneDot,
      ...this.props.pipe ? [this.props.pipe] : [],
    ].reduce(composePipes, (v: any) => v);

    return (
      // @ts-ignore
      <MaskedInput
        {...this.props}
        className={classnames(styles.inputBase, this.props.className)}
        onChange={this.changed}
        value={value}
        guide={false}
        pipe={pipe}
      />
    );
  }
}

type Pipe = (v: string, config: any) => string | false;
export const composePipes = (p1: Pipe, p2: Pipe) => (v: string, config: any) => {
  const tmp = p1(v, config);
  return tmp === false ? tmp : p2(tmp, config);
};

export const lessThanOrEqual = (max: BigNumber): Pipe => (value: string) => {
  if (!value) {
    return value;
  }
  return new BigNumber(value.replace(/,/g, '')).lte(max) ? value : false;
};
