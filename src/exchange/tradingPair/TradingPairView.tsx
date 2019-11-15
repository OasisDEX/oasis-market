import { BigNumber } from 'bignumber.js';
import classnames from 'classnames';
import * as mixpanel from 'mixpanel-browser';
import * as React from 'react';
import { NavLink } from 'react-router-dom';

import { getToken, tradingPairs } from '../../blockchain/config';
import {
  FormatAmount, FormatPercent, FormatPrice, FormatQuoteToken
} from '../../utils/formatters/Formatters';
import { Loadable } from '../../utils/loadable';
import { WithLoadingIndicatorInline } from '../../utils/loadingIndicator/LoadingIndicator';
import { ServerUnreachableInline } from '../../utils/loadingIndicator/ServerUnreachable';
import { Scrollbar } from '../../utils/Scrollbar/Scrollbar';
import { BoundarySpan, InfoLabel } from '../../utils/text/Text';
import { MarketsDetails } from '../exchange';
import { TradingPair, tradingPairResolver, TradingPairsProps } from './tradingPair';
import * as styles from './TradingPairView.scss';

interface PairInfoVP {
  value: any;
  label: string;
  dataTestId ?: string;
}

interface TradingPairViewState {
  showMenu: boolean;
}

export class TradingPairView extends React.Component<TradingPairsProps, TradingPairViewState> {

  public static PairVP({ pair, parentMatch, marketsDetailsLoadable, clickHandler }: {
    pair: TradingPair,
    parentMatch?: string,
    marketsDetailsLoadable: Loadable<MarketsDetails>,
    clickHandler: () => void,
  }) {

    const pathname = `${parentMatch}/${pair.base}/${pair.quote}`;

    return (
      <li data-test-id={`${pair.base}-${pair.quote}`} className={styles.dropdownItem}>
        <NavLink
          exact={true}
          to={{ pathname, state: { pair } }}
          activeClassName={styles.active}
          className={classnames(styles.dropdownItemLink, styles.pairView)}
          onClick={() => {
            clickHandler();
            mixpanel.track('btn-click', {
              pair: `${pair.base}${pair.quote}`,
              id: 'change-asset-pair',
              product: 'oasis-trade',
              page: 'Market',
              section: 'asset-picker',
            });
          }}
        >
          <TradingPairView.PairView {...{ pair, marketsDetailsLoadable }} />
        </NavLink>
      </li>
    );
  }

  public static PairView({ pair, marketsDetailsLoadable }: {
    pair: TradingPair,
    marketsDetailsLoadable: Loadable<MarketsDetails>,
  }) {
    const { base, quote } = pair;
    return (
      <>
        <div className={styles.iconBase}>{getToken(base).icon}</div>
        <div data-test-id="base" className={styles.tokenBase}>{base}</div>
        <div data-test-id="quote" className={styles.tokenQuote}>
          <FormatQuoteToken token={quote}/>
        </div>
        <WithLoadingIndicatorInline loadable={marketsDetailsLoadable}>
          {(marketsDetails) => {
            const { price, priceDiff } = marketsDetails[tradingPairResolver(pair)];
            return (<>
              <div data-test-id="price" className={styles.price}>
                <span className={styles.iconQuote}>{getToken(quote).icon}</span>
                {
                  price &&
                  <FormatPrice value={price} token={quote} dontGroup={true}/>
                  || <> - </>
                }
              </div>
              <div data-test-id="price-diff" className={styles.priceDiff}>{priceDiff &&
              <BoundarySpan value={priceDiff}>
                <FormatPercent  value={priceDiff} plus={true}/>
              </BoundarySpan>
              || <> - </>
              }</div>
            </>);
          }}
        </WithLoadingIndicatorInline>
      </>
    );
  }

  public static ActivePairView({ base, quote }: any) {
    return (
      <div  data-test-id="active-pair" className={styles.activePairView}>
        <div className={styles.activePairViewIcon}>{getToken(base).iconCircle}</div>
        <span data-test-id="base" className={styles.activePairViewTokenBase}>{base}</span>
        <span data-test-id="quote" className={styles.activePairViewTokenQuote}>
          <FormatQuoteToken token={quote} />
        </span>
        <span className={styles.dropdownIcon}/>
      </div>
    );
  }

  public static YesterdayPriceVP(
    { yesterdayPriceChange }: { yesterdayPriceChange: BigNumber | undefined }
  ) {
    return !yesterdayPriceChange ? null : (
      <BoundarySpan value={yesterdayPriceChange}>
        <FormatPercent value={yesterdayPriceChange} plus={true} fallback=""/>
      </BoundarySpan>
    );
  }

  public static PairInfoVP({ value, label, dataTestId }: PairInfoVP) {
    return (
      <div className={styles.pairInfo}>
        <div data-test-id={dataTestId} className={styles.mobileWrapper}>
          <span data-test-id="value" className={styles.pairInfoValue}>{value}</span>
          <InfoLabel className={styles.pairInfoLabel}>{label}</InfoLabel>
        </div>
      </div>
    );
  }

  public constructor(props: TradingPairsProps) {
    super(props);
    this.state = {
      showMenu: false,
    };
  }

  public render() {
    const {
      parentMatch = '/',
      base,
      currentPrice,
      quote,
      weeklyVolume,
      yesterdayPriceChange
    } = this.props;
    const dropdownDisabled = tradingPairs.length <= 1;

    return (
      <>
        <div className={styles.dropdown}>
          <div tabIndex={dropdownDisabled ? undefined : -1}
               data-test-id="select-pair"
               onClick={dropdownDisabled ? undefined : this.showMenu}
               className={classnames(styles.dropdownBtn, {
                 [styles.dropdownBtnDisabled]: dropdownDisabled,
                 [styles.dropdownBtnActive]: this.state.showMenu
               })}>
            <TradingPairView.ActivePairView base={base} quote={quote}/>
          </div>
          {
            this.state.showMenu && (
              <div className={styles.dropdownListWrapper}>
                <ul className={styles.dropdownList}>
                  <Scrollbar autoHeight={true}>
                    {tradingPairs.map((pair, i) => (
                      <TradingPairView.PairVP
                        key={i}
                        parentMatch={parentMatch}
                        pair={pair}
                        marketsDetailsLoadable={this.props.marketsDetails}
                        clickHandler={this.closeMenuHandler}
                      />
                    ))}
                  </Scrollbar>
                </ul>
              </div>
            )
          }
        </div>
        <div className={styles.container} data-test-id="trading-pair-info">
          <TradingPairView.PairInfoVP dataTestId="last-price" label="Last price" value={
            <WithLoadingIndicatorInline
              error={<ServerUnreachableInline fallback="-"/>}
              loadable={currentPrice}
              className={styles.pairInfo}
            >
              {(currentPriceLoaded?: BigNumber) => (
                currentPriceLoaded ?
                  <FormatPrice value={currentPriceLoaded} token={quote}/> :
                  <span>?</span>
              )}
            </WithLoadingIndicatorInline>
          }/>
          <TradingPairView.PairInfoVP dataTestId="24h-price" label="24h price" value={
            <WithLoadingIndicatorInline
              error={<ServerUnreachableInline fallback="-"/>}
              loadable={yesterdayPriceChange}
              className={styles.pairInfo}
            >
              {(yesterdayPriceChangeLoaded?: BigNumber) => (
                yesterdayPriceChangeLoaded ?
                  <TradingPairView.YesterdayPriceVP
                    yesterdayPriceChange={yesterdayPriceChangeLoaded}
                  /> :
                  <span>?</span>
              )}
            </WithLoadingIndicatorInline>
          }/>
          <TradingPairView.PairInfoVP dataTestId="24h-volume" label="24h volume" value={
            <WithLoadingIndicatorInline
              loadable={weeklyVolume}
              className={styles.pairInfo}
              error={<ServerUnreachableInline fallback="-"/>}
            >
              {(weeklyVolumeLoaded: BigNumber) => (
                <FormatAmount value={weeklyVolumeLoaded} token={quote}/>
              )}
            </WithLoadingIndicatorInline>
          }/>
        </div>
      </>
    );
  }

  private showMenu = (event: any) => {
    event.preventDefault();

    this.setState({ showMenu: true }, () => {
      document.addEventListener('click', this.closeMenu);
    });

    if (this.props.setPairPickerOpen) {
      this.props.setPairPickerOpen(true);
    }
  }

  private closeMenu = (_event: any) => {
    if (_event.path.filter((p: any) => p.className === styles.dropdown).length === 0) {
      this.closeMenuHandler();
    }
  }

  private closeMenuHandler = () => {
    this.setState({ showMenu: false }, () => {
      document.removeEventListener('click', this.closeMenu);
    });

    if (this.props.setPairPickerOpen) {
      this.props.setPairPickerOpen(false);
    }
  }
}
