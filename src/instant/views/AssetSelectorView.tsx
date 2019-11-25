import { BigNumber } from 'bignumber.js';
import classnames from 'classnames';
import * as React from 'react';
import { eth2weth } from '../../blockchain/calls/instant';
import { tradingPairs, tradingTokens } from '../../blockchain/config';
import { Offer, OfferType } from '../../exchange/orderbook/orderbook';
import { CloseButton } from '../../utils/forms/Buttons';
import { marketsOf } from '../../utils/markets';
import * as panelStyling from '../../utils/panel/Panel.scss';
import { TopRightCorner } from '../../utils/panel/TopRightCorner';
import { Asset } from '../asset/Asset';
import * as instantStyles from '../Instant.scss';
import { InstantFormChangeKind, InstantFormState, ViewKind } from '../instantForm';
import * as styles from './AssetSelectorView.scss';

class AssetSelectorView extends React.Component<InstantFormState & { side: OfferType }> {
  public render() {
    const { balances, user } = this.props;
    return (
      <section className={classnames(instantStyles.panel, panelStyling.panel)}>
        <TopRightCorner>
          <CloseButton theme="danger"
                       onClick={this.hideAssets}
          />
        </TopRightCorner>
        <section className={styles.assetsContainer}>
          <div className={styles.assets}>
            <ul className={styles.list}>
              {
                tradingTokens.map((token, index) => {
                  const balance = user && user.account
                    ? balances ? balances[token] : new BigNumber(0)
                    : new BigNumber(0);

                  return (
                    <li data-test-id={token.toLowerCase()}
                        className={styles.listItem}
                        key={index}
                    >
                      <Asset currency={token}
                             balance={balance}
                             user={user}
                             isLocked={this.isLocked(token)}
                             onClick={() => this.selectAsset(token)}/>
                    </li>
                  );
                })
              }
            </ul>
          </div>
        </section>
      </section>
    );
  }

  private hideAssets = () => {
    this.props.change({
      kind: InstantFormChangeKind.viewChange,
      view: ViewKind.new
    });
  }

  private selectAsset = (asset: string) => {
    this.props.change({
      side: this.props.side,
      token: asset,
      kind: InstantFormChangeKind.tokenChange,
    });

    this.hideAssets();
  }

  private isLocked = (asset: string): boolean => {
    const { side, buyToken, sellToken } = this.props;

    console.log(side);

    const markets = side === OfferType.sell
      ? marketsOf(buyToken, tradingPairs)
      : marketsOf(sellToken, tradingPairs);

    if (side === OfferType.buy) {
      markets.delete('SAI');
    }

    /* A given asset is NOT locked when:
     * 1) is part of market
     * 2) is the opposing asset
     *    - clicking on the opposing type of asset
     *    allows the tokens to be swapped in the UI
     * 3) is the same token that is already selected
     * */

    return !markets.has(eth2weth(asset))
      && asset !== sellToken
      && asset !== eth2weth(sellToken)
      && asset !== buyToken
      && asset !== eth2weth(buyToken);
  }
}

export const SellAssetSelectorView: React.SFC<InstantFormState> = (props) => (
  <AssetSelectorView side={OfferType.sell} {...props}/>
);

export const BuyAssetSelectorView: React.SFC<InstantFormState> = (props) => (
  <AssetSelectorView side={OfferType.buy} {...props}/>
);
