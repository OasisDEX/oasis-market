import classnames from 'classnames';
import * as React from 'react';

import closeSvg from '../../icons/close.svg';
import { SvgImage } from '../icons/utils';
import * as styles from './Buttons.scss';

export type ButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement> &
  {
    color?: 'primary'
      | 'secondary'
      | 'danger'
      | 'primaryOutlined'
      | 'secondaryOutlined'
      | 'dangerOutlined'
      | 'greyOutlined'
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'unsized' | 'full',
    block?: boolean,
    dataTestId?: string
  };

export const Button = (props: ButtonProps) => {
  const { children, className, color, size, block, ...btnProps } = props;
  return (
    <button
      className={classnames(styles.button,
                            styles[color || 'greyOutlined'],
                            className, {
                              [styles.block]: block !== undefined && block,
                              [styles[size || 'unsized']]: size !== undefined && size
                            }
      )}
      {...btnProps}
    >
      {children}
    </button>
  );
};

type ButtonGroupProps =
  React.HTMLAttributes<HTMLDivElement> &
  {
    className?: any,
    children: any,
  };
export const ButtonGroup = (props: ButtonGroupProps) => {
  const { children, className, ...btnGroupProps } = props;
  return (
    <div
      className={classnames(styles.buttonGroup, className)}
      {...btnGroupProps}
    >
      {children}
    </div>);
};

export const Buttons = ({ onClick, className, children, ...props }:
                          { onClick: any, className?: string } | any) => (
  <button
    onClick={onClick}
    className={classnames({ [styles.actionButton]: true, [className]: className })}
    {...props}>
    {children}
  </button>
);

export const CloseButton = (props: any) => {
  const { className, theme, ...otherProps } = props;

  switch (theme) {
    case 'danger':
      return (
        <Button
          color="dangerOutlined"
          className={classnames(
            styles.closeButton,
            className)
          }
          {...otherProps}
        >
          <SvgImage image={closeSvg}/>
        </Button>
      );
    default:
      return (
        <Button
          color="secondaryOutlined"
          className={classnames(
            styles.button,
            styles.closeButton,
            className)}
          {...otherProps}
        >
          <SvgImage image={closeSvg}/>
        </Button>
      );
  }

};
