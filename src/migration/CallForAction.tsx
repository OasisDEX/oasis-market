import * as React from 'react';
import { Button } from '../utils/forms/Buttons';
import * as styles from './CallForAction.scss';

export interface CallForActionProps {
  title: string;
  description: string;
  data: string | React.ReactChild;
  btnLabel: string | React.ReactChild;
  btnAction: () => void;
  btnDisabled?: boolean;
  tid?: string;
}

export class CallForAction extends React.Component<CallForActionProps> {
  public render() {
    const {
      title,
      description,
      data,
      children,
      btnLabel,
      btnDisabled,
      btnAction,
      tid
    } = this.props;
    return (
      <div className={styles.container} data-test-id={tid}>
        <h6 className={styles.title}>{title}</h6>
        <p className={styles.description}>
          {description}
        </p>
        <span className={styles.data} data-test-id="cfa-data">
          {data}
        </span>
        {children}
        <Button size="sm"
                color="primary"
                data-test-id="cfa-btn"
                className={styles.actionBtn}
                disabled={btnDisabled}
                onClick={btnAction}
        >
          {btnLabel}
        </Button>
      </div>
    );
  }
}
