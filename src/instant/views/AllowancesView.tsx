import * as React from 'react';
import { getToken, tradingTokens } from '../../blockchain/config';
import doneSvg from '../../icons/done.svg';
import { Button, CloseButton } from '../../utils/forms/Buttons';
import { SvgImage } from '../../utils/icons/utils';
import { LoadingIndicator } from '../../utils/loadingIndicator/LoadingIndicator';
import { TopRightCorner } from '../../utils/panel/TopRightCorner';
import {
  InstantFormChangeKind,
  InstantFormState,
  ViewKind
} from '../instantForm';
import { InstantFormWrapper } from '../InstantFormWrapper';
import * as styles from './AllowancesView.scss';

interface AssetProps {
  isAllowed: boolean;
  asset: any;
  inProgress?: boolean;
  onClick: () => void;
}

class AssetAllowance extends React.Component<AssetProps> {
  public render() {
    // @ts-ignore
    const { isAllowed, asset, inProgress, onClick } = this.props;

    return (
      <Button color="secondaryOutlined"
              disabled={inProgress}
              data-test-id={asset.symbol}
              className={styles.asset}
              onClick={onClick}
      >
        <span className={styles.tokenIcon}>{asset.iconColor}</span>
        <span>{asset.symbol}</span>
        <span className={styles.indicator}>
          {
            inProgress
              ? <LoadingIndicator inline={true}/>
              : <SvgImage data-test-id={'status'}
                          data-test-isallowed={isAllowed}
                          className={
                            isAllowed ? styles.isAllowed : styles.disabled
                          } image={doneSvg}
              />
          }
        </span>
      </Button>
    );
  }
}

export class AllowancesView extends React.Component<InstantFormState> {
  public render() {
    const { allowances, toggleAllowance, manualAllowancesProgress } = this.props;

    return (
      <InstantFormWrapper heading={'Unlock Token'}>
        <TopRightCorner>
          <CloseButton theme="danger"
                       data-test-id="close"
                       onClick={this.close}
          />
        </TopRightCorner>
        <div className={styles.assets}>
          {
            tradingTokens
              .filter(token => token !== 'ETH')
              .map(
                (token: any, index: number) => {
                  const progress = manualAllowancesProgress && manualAllowancesProgress[token];

                  return <AssetAllowance isAllowed={(allowances ? allowances[token] : false)}
                                         inProgress={progress && !progress.done}
                                         key={index}
                                         asset={getToken(token)}
                                         onClick={() => {
                                           toggleAllowance(token);
                                         }}
                  />;
                }
              )
          }

        </div>
      </InstantFormWrapper>

    );
  }

  private close = () => {
    this.props.change({
      kind: InstantFormChangeKind.viewChange,
      view: ViewKind.account
    });
  }
}
