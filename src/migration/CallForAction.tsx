import * as React from 'react';
import { Button } from '../utils/forms/Buttons';
import * as styles from './CallForAction.scss';

export interface CallForActionProps {
  title: string;
  description: string;
  data: any;
  btnLabel: string;
  btnAction: () => void;
}

export class CallForAction extends React.Component<CallForActionProps> {
  public render() {
    const { title, description, data, btnLabel, btnAction } = this.props;
    return (
      <div className={styles.container}>
        <h6 className={styles.title}>{title}</h6>
        <p className={styles.description}>
          {description}
        </p>
        <span className={styles.data}>{data}</span>
        <Button size="sm"
                color="primary"
                className={styles.actionBtn}
                onClick={btnAction}
        >
          {btnLabel}
        </Button>
      </div>
    );
  }
}