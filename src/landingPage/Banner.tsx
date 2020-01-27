import * as classnames from 'classnames';
import * as React from 'react';
import { Button } from '../utils/forms/Buttons';
import * as styles from './Banner.scss';

interface BannerProps {
  buttonLabel?: string | React.ReactNode;
  content: string | React.ReactNode;
  continue?: () => any;
  theme: 'success' | 'danger' | 'warning';
}

export class Banner extends React.Component<BannerProps> {
  public render() {
    const { content, continue: onContinue, buttonLabel, theme } = this.props;

    return (
      <section className={styles.section}>
        <div className={classnames(styles.panel, styles[theme])}>
          <div>
            {content}
          </div>
          {
            buttonLabel && (
              <Button data-test-id="banner-btn"
                      size="xs"
                      className={styles.btn}
                      onClick={onContinue}>
                {buttonLabel}
              </Button>
            )}
        </div>
      </section>
    );
  }
}
