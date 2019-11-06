import classnames from 'classnames';
import * as React from 'react';
import { Observable } from 'rxjs/internal/Observable';

import { BigNumber } from 'bignumber.js';
import * as mixpanel from 'mixpanel-browser';
import { filter, first, tap } from 'rxjs/operators';
import { theAppContext } from '../AppContext';
import { tokens } from '../blockchain/config';
import { TxState } from '../blockchain/transactions';
import { ExchangeMigrationStatus } from '../migration/migration';
import { Authorizable } from '../utils/authorizable';
import '../utils/Common.scss';
import { connect } from '../utils/connect';
import { FormatAmount } from '../utils/formatters/Formatters';
import { Button } from '../utils/forms/Buttons';
import { Slider } from '../utils/forms/Slider';
import { inject } from '../utils/inject';
import { Loadable, loadablifyLight } from '../utils/loadable';
import { Authorization } from '../utils/loadingIndicator/Authorization';
import { WithLoadingIndicator } from '../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps, ModalProps } from '../utils/modal';
import { Panel, PanelHeader } from '../utils/panel/Panel';
import { Table } from '../utils/table/Table';
import { Currency } from '../utils/text/Text';
import { zero } from '../utils/zero';
import { WrapUnwrapFormKind, WrapUnwrapFormState } from '../wrapUnwrap/wrapUnwrapForm';
import { WrapUnwrapFormView } from '../wrapUnwrap/WrapUnwrapFormView';
import * as styles from './AssetOverviewView.scss';
import { CombinedBalances } from './balances';

export interface AssetsOverviewActionProps  {
  wrapUnwrapForm$: (formKind: WrapUnwrapFormKind) => Observable<WrapUnwrapFormState>;
  approve: (token: string) => Observable<TxState>;
  disapprove: (token: string) => Observable<TxState>;
  swapSai: (amount: BigNumber) => any;
  swapDai: (amount: BigNumber) => any;
}

export type AssetsOverviewExtraProps =
  ModalOpenerProps & AssetsOverviewActionProps;

export class AssetOverviewView
  extends React.Component<Authorizable<Loadable<CombinedBalances>> & AssetsOverviewExtraProps>
{
  public render() {
    return (
      <Panel footerBordered={true} style={{ width: '100%' }}>
        <PanelHeader>Asset overview</PanelHeader>
        <Authorization authorizable={this.props} view="Balances">
          {loadable => <WithLoadingIndicator loadable={loadable}>
            {(combinedBalances) => (
              <AssetsOverviewViewInternal
                { ...{
                  ...combinedBalances,
                  ...this.props
                } }
              />
            )}
          </WithLoadingIndicator>}
        </Authorization>
      </Panel>
    );
  }
}

export class AssetsOverviewViewInternal
  extends React.Component<CombinedBalances & AssetsOverviewExtraProps>
{

  public render() {
    return (
      <Table className={styles.table} align="left">
        <thead>
        <tr>
          <th className="hide-lg" style={{ width: '20%' }}>Asset</th>
          <th style={{ width: '10%' }}>Symbol</th>
          <th style={{ width: '20%' }} className={styles.center}>Unlock</th>
          <th style={{ width: '15%' }} className={styles.center}/>
          <th style={{ width: '15%' }} className={styles.amount}>Wallet</th>
          <th className={classnames(styles.amount, 'hide-md')} style={{ width: '20%' }}>
            Value (USD)
          </th>
        </tr>
        </thead>
        <tbody>
        <tr data-test-id="ETH-overview">
          <td className="hide-lg">{tokens.ETH.name}</td>
          <td>
            <div className={styles.centeredAsset}>
              { tokens.ETH.icon }
              <Currency value="ETH"/>
            </div>
          </td>
          <td className={styles.center} >-</td>
          <td>
            <Button
              data-test-id="open-wrap-form"
              color="secondary"
              size="xs"
              className={styles.wrapUnwrapBtn}
              block={true}
              onClick={() => {
                mixpanel.track('btn-click', {
                  id: 'wrap-eth',
                  product: 'oasis-trade',
                  page: 'Account',
                  section: 'asset-overview'
                });
                this.wrap();
              }}
              disabled={this.props.etherBalance.eq(zero)}
            >
              Wrap
            </Button>
          </td>
          <td data-test-id={`ETH-balance`} className={styles.amount} data-vis-reg-mask={true}>
            <FormatAmount value={this.props.etherBalance} token="ETH" />
          </td>
          <td className={classnames(styles.amount, 'hide-md')} data-vis-reg-mask={true}>
            <FormatAmount value={this.props.etherValueInUsd} token="USD" fallback="N/A" />
          </td>
        </tr>

        { this.props.balances && this.props.balances.map(combinedBalance => (
          <tr data-test-id={`${combinedBalance.name}-overview`} key={combinedBalance.name}>
            <td className="hide-lg">{tokens[combinedBalance.name].name}</td>
            <td>
              <div className={styles.centeredAsset}>
                { tokens[combinedBalance.name].icon }
                <Currency value={combinedBalance.name} />
              </div>
            </td>
            <td className={styles.center}>
                <Slider blocked={!combinedBalance.allowance}
                        data-test-id="toggle-allowance"
                        disabled={combinedBalance.allowanceChangeInProgress}
                        inProgress={combinedBalance.allowanceChangeInProgress}
                        onClick={() => combinedBalance.allowance ?
                          this.props.disapprove(combinedBalance.name) :
                          this.props.approve(combinedBalance.name)
                        }
                />
            </td>
            <td>
              { combinedBalance.name === 'WETH' &&
              <Button
                data-test-id="open-unwrap-form"
                color="secondary"
                size="xs"
                className={styles.wrapUnwrapBtn}
                block={true}
                onClick={() => {
                  mixpanel.track('btn-click', {
                    id: 'unwrap-eth',
                    product: 'oasis-trade',
                    page: 'Account',
                    section: 'asset-overview'
                  });
                  this.unwrap();
                }}
                disabled={combinedBalance.balance.eq(zero)}
              >
                Unwrap
              </Button>
              }
              {
                combinedBalance.name === 'SAI' &&
                <theAppContext.Consumer>
                  {({ MigrationTxRx }) =>
                    // @ts-ignore
                    <MigrationTxRx label="Redeem DAI"
                                   className={styles.redeemBtn}
                    />
                  }
                </theAppContext.Consumer>
              }
              {
                combinedBalance.name === 'DAI' &&
                <theAppContext.Consumer>
                  {({ dai2SAIMigration$ }) =>
                    <Button
                      color="secondary"
                      size="xs"
                      className={styles.wrapUnwrapBtn}
                      block={true}
                      onClick={() => {
                        dai2SAIMigration$.pipe(
                          filter(s => s.status === ExchangeMigrationStatus.ready),
                          first(),
                          tap(s => s.status === ExchangeMigrationStatus.ready && s.start()),
                        ).subscribe(console.log);
                      }}
                      disabled={combinedBalance.balance.eq(zero)}
                    >
                      Redeem SAI
                    </Button>
                  }
                </theAppContext.Consumer>
              }
            </td>
            <td data-test-id={`${combinedBalance.name}-balance`}
                className={styles.amount}
                data-vis-reg-mask={true}
            >
              <FormatAmount value={combinedBalance.balance} token={combinedBalance.name} />
            </td>
            <td className={classnames(styles.amount, 'hide-md')} data-vis-reg-mask={true}>
              <FormatAmount value={combinedBalance.valueInUsd} token="USD" fallback="N/A"/>
            </td>
          </tr>
        ))}
        </tbody>
      </Table>
    );
  }

  private openWrapUnwrap(kind: WrapUnwrapFormKind) {
    this.props.open(
      connect(
        inject<Loadable<WrapUnwrapFormState> & ModalProps, { kind: WrapUnwrapFormKind}>(
          WrapUnwrapFormView, { kind }
        ),
        loadablifyLight(this.props.wrapUnwrapForm$(kind))
      )
    );
  }

  private wrap() {
    this.openWrapUnwrap(WrapUnwrapFormKind.wrap);
  }

  private unwrap() {
    this.openWrapUnwrap(WrapUnwrapFormKind.unwrap);
  }
}
