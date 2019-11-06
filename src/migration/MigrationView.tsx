import * as classnames from 'classnames';
import * as React from 'react';
import * as ReactModal from 'react-modal';
import { Observable } from 'rxjs';
import { connect } from '../utils/connect';
import { Button, CloseButton } from '../utils/forms/Buttons';
import { Loadable } from '../utils/loadable';
import { LoadingIndicator, WithLoadingIndicator } from '../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps, ModalProps } from '../utils/modal';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '../utils/panel/Panel';
import { TopRightCorner } from '../utils/panel/TopRightCorner';

import {
  ExchangeMigrationState,
  ExchangeMigrationStatus,
  ExchangeMigrationTxKind,
  SAI2DAIOperation
} from './migration';

import { BigNumber } from 'bignumber.js';
import { tokens } from '../blockchain/config';
import { TradeStatus, TradeWithStatus } from '../exchange/myTrades/openTrades';
import accountSvg from '../icons/account.svg';
import doneSvg from '../icons/done.svg';
import tickSvg from '../icons/tick.svg';
import { TradeData } from '../instant/details/TradeData';
import { TxStatusRow } from '../instant/details/TxStatusRow';
import { ProgressReport, Report } from '../instant/progress/ProgressReport';
import { formatAmount } from '../utils/formatters/format';
import { SvgImage } from '../utils/icons/utils';
import { Scrollbar } from '../utils/Scrollbar/Scrollbar';
import { RowClickable, Table } from '../utils/table/Table';
import { SellBuySpan } from '../utils/text/Text';
import { WarningTooltipType } from '../utils/tooltip/Tooltip';
import { CallForAction } from './CallForAction';
import * as styles from './Migration.scss';

export type MigrationButtonProps = Loadable<ExchangeMigrationState> & {
  label: string;
  migration$: Observable<ExchangeMigrationState>;
  className?: string;
};

// TODO: Probably extract all Tooltip Definitions in a separate file.

// tslint:disable
const proxyTooltip = {
  id: 'proxy-tooltip',
  text: 'Proxy is a supporting contract owned by you that groups different actions as one Ethereum transaction.',
  iconColor: 'grey'
} as WarningTooltipType;


const allowanceTooltip = {
  id: 'allowance-tooltip',
  text: 'Enabling token trading allows your Proxy to take tokens from you and trade them on the exchange.',
  iconColor: 'grey'
} as WarningTooltipType;

// tslint:enable

export class MigrationButton extends React.Component<MigrationButtonProps & ModalOpenerProps> {
  public render() {
    return <WithLoadingIndicator loadable={this.props}
                                 className={styles.loadingIndicator}
    >
      {
        (migrationState: any) => {
          return (migrationState.pending && migrationState.pending.length)
          || (migrationState.orders && migrationState.orders.length)
            ? (
              <Button size="md"
                      className={classnames(styles.redeemBtn, this.props.className)}
                      onClick={() => this.setup()}
              >
                {this.props.label}
              </Button>
            )
            : <></>;
        }
      }
    </WithLoadingIndicator>;
  }

  private setup() {
    const migration$ = this.props.migration$;
    const MigrationModalRxTx =
      connect<ExchangeMigrationState, ModalProps>(MigrationModal, migration$);
    this.props.open(MigrationModalRxTx);
  }
}

enum MigrationViews {
  initial = 'initial',
  cancelOrders = 'cancelOrders',
  migration = 'migration',
}

export class MigrationModal extends React.Component<ExchangeMigrationState & ModalProps,
  { view: MigrationViews }> {

  public constructor(props: any) {
    super(props);
    this.state = {
      view: MigrationViews.initial
    };
  }

  public render() {
    const orders: TradeWithStatus[] = (
      this.props.status === ExchangeMigrationStatus.ready
      || this.props.status === ExchangeMigrationStatus.inProgress
      || this.props.status === ExchangeMigrationStatus.fiasco
      || this.props.status === ExchangeMigrationStatus.done
    )
      ? this.props.orders
      : [];

    let amount: BigNumber = new BigNumber(0);

    if (
      this.props.status === ExchangeMigrationStatus.ready) {
      const pendingMigration = this.props.pending
        .find((op) => op && op.kind === ExchangeMigrationTxKind.sai2dai) as SAI2DAIOperation;

      if (pendingMigration) {
        amount = new BigNumber(pendingMigration.amount.toFormat(tokens.SAI.digits));
      }
    }

    if (this.props.status === ExchangeMigrationStatus.inProgress
      || this.props.status === ExchangeMigrationStatus.fiasco
    ) {
      const pendingMigration = this.props.pending
        .concat(this.props.current)
        .concat(this.props.done)
        .find((op) => op && op.kind === ExchangeMigrationTxKind.sai2dai) as SAI2DAIOperation;
      if (pendingMigration) {
        amount = new BigNumber(pendingMigration.amount.toFormat(tokens.SAI.digits));
      }
    }

    const view = (() => {
      switch (this.state.view) {
        case MigrationViews.cancelOrders:
          return !orders.length
            ? this.initialView(orders.length, amount)
            : this.cancelOrders(orders);
        case MigrationViews.migration:
          return this.migration(amount);
        default:
          return this.initialView(orders.length, amount);
      }
    })();

    return <ReactModal
      ariaHideApp={false}
      isOpen={true}
      className={styles.modal}
      overlayClassName={styles.modalOverlay}
      closeTimeoutMS={250}
    >
      {view}
    </ReactModal>;
  }

  private initialView = (ordersCount: number, amount: BigNumber) => {
    return (
      <Panel footerBordered={true} className={styles.modalChild}>
        <PanelHeader bordered={true} className={styles.panelHeader}>
          Multi-Collateral Dai Upgrade
          <TopRightCorner className={styles.closeBtn}>
            <CloseButton theme="danger" onClick={this.props.close}/>
          </TopRightCorner>
        </PanelHeader>
        <PanelBody paddingVertical={true} className={styles.panelBody}>
          {this.callToCancelOrders(ordersCount)}
          {this.callToRedeemDai(amount)}
        </PanelBody>
      </Panel>
    );
  }

  private cancelOrders = (orders: TradeWithStatus[]) => {
    return <Panel className={styles.modalChild}>
      <PanelHeader bordered={true} className={styles.panelHeader}>
        Cancel Pending Orders
        <TopRightCorner className={styles.closeBtn}>
          <CloseButton theme="danger" onClick={this.props.close}/>
        </TopRightCorner>
      </PanelHeader>
      <PanelBody paddingVertical={true}
                 className={
                   classnames(styles.panelBody, styles.process)
                 }
      >
        <div className={styles.description}>
          {
            // tslint:disable-next-line:max-line-length
            `Cancel your ${orders.length} Open Orders before upgrading your Single-Collateral Sai`
          }
        </div>
        <div className={styles.ordersPlaceholder}>
          <Table align="left" className={styles.orders}>
            <thead>
            <th>Market</th>
            <th>Type</th>
            <th>Price</th>
            <th>Amount</th>
            <th>Total</th>
            <th>Action</th>
            </thead>
          </Table>
        </div>
        <Scrollbar>
          <Table align="left" className={styles.orders}>
            <tbody>
            {
              orders.map((order: TradeWithStatus, index: number) => {
                return (
                  <RowClickable
                    data-test-id="my-trades"
                    key={index}
                    clickable={false}
                  >
                    <td>{order.baseToken}/{order.quoteToken}</td>
                    <td><SellBuySpan type={order.act}>{order.act}</SellBuySpan></td>
                    <td>{formatAmount(order.price, order.quoteToken)} SAI</td>
                    <td>{formatAmount(order.baseAmount, order.baseToken)} {order.baseToken}</td>
                    <td>{formatAmount(order.quoteAmount, order.quoteToken)} SAI</td>
                    <td>
                      {
                        order.status === TradeStatus.beingCancelled
                          ? <LoadingIndicator className={styles.orderCancellationIndicator}
                                              inline={true}
                          />
                          : (
                            <Button size="sm"
                                    color="secondaryOutlined"
                                    onClick={() => {
                                      if (this.props.status === ExchangeMigrationStatus.ready
                                        || this.props.status === ExchangeMigrationStatus.inProgress
                                      ) {
                                        this.props.cancelOffer({
                                          offerId: order.offerId,
                                          type: order.act,
                                          amount: order.baseAmount,
                                          token: order.baseToken
                                        });
                                      }
                                    }}
                            >
                              Cancel
                            </Button>
                          )
                      }
                    </td>
                  </RowClickable>
                );
              })
            }
            </tbody>
          </Table>
        </Scrollbar>
      </PanelBody>
      <PanelFooter bordered={true}
                   className={styles.panelFooter}
      >
        <Button size="sm"
                color="secondaryOutlined"
                className={styles.backBtn}
                onClick={() => this.setState({ view: MigrationViews.initial })}
        >
          Back
        </Button>
      </PanelFooter>
    </Panel>;
  }

  private migration = (amount: BigNumber) => {
    return <Panel className={styles.modalChild}>
      <PanelHeader bordered={true} className={styles.panelHeader}>
        Multi Collateral Dai Upgrade
        <TopRightCorner className={styles.closeBtn}>
          <CloseButton theme="danger" onClick={() => {
            this.props.close();
            if (this.props.status === ExchangeMigrationStatus.fiasco
              || this.props.status === ExchangeMigrationStatus.done) {
              this.props.restart();
            }
          }}/>
        </TopRightCorner>
      </PanelHeader>
      <PanelBody paddingVertical={true}
                 className={
                   classnames(styles.panelBody, styles.process)
                 }
      >
        <div className={styles.description}>
          {
            // tslint:disable-next-line:max-line-length
            `Upgrade ${amount.valueOf()} SAI (Single-Collateral Dai) to ${amount.valueOf()} DAI (Multi-Collateral Dai)`
          }
        </div>

        {
          this.props.status === ExchangeMigrationStatus.ready
          && this.props.pending.map((operation, index) => {
            return this.txRow(operation, index);
          })
        }
        {
          (this.props.status === ExchangeMigrationStatus.inProgress ||
            this.props.status === ExchangeMigrationStatus.fiasco)
          && this.props.done.map((operation) => {
            return this.txRow(operation);
          })
        }

        {
          (this.props.status === ExchangeMigrationStatus.inProgress ||
            this.props.status === ExchangeMigrationStatus.fiasco)
          && this.txRow(this.props.current)
        }

        {
          (this.props.status === ExchangeMigrationStatus.inProgress ||
            this.props.status === ExchangeMigrationStatus.fiasco)
          && this.props.pending.map((operation) => {
            return this.txRow(operation);
          })
        }

        {
          this.props.status === ExchangeMigrationStatus.done
          && amount.eq(new BigNumber(0))
          && this.setState({
            view: MigrationViews.initial
          })
        }

      </PanelBody>
      <PanelFooter bordered={true}
                   className={styles.panelFooter}
      >
        <Button size="sm"
                color="secondaryOutlined"
                className={styles.backBtn}
                onClick={() => this.setState({ view: MigrationViews.initial })}
        >
          Back
        </Button>

        {this.props.status === ExchangeMigrationStatus.ready && (
          <Button size="sm"
                  color="primary"
                  className={styles.migrateBtn}
                  onClick={() =>
                    this.props.status === ExchangeMigrationStatus.ready && this.props.start()
                  }
          >
            Migrate
          </Button>
        )
        }

        {this.props.status === ExchangeMigrationStatus.fiasco && (
          <Button size="sm"
                  color="primary"
                  className={styles.migrateBtn}
                  onClick={() =>
                    this.props.status === ExchangeMigrationStatus.fiasco && this.props.restart()
                  }
          >
            Restart
          </Button>)}

      </PanelFooter>
    </Panel>;
  }

  private callToCancelOrders = (ordersCount: number) => (
    <CallForAction title="Cancel Open Orders"
                   description={
                     `Cancel all your Open Orders before
                              upgrading your Single-Collateral Sai to Dai`
                   }
                   data={`${ordersCount} Open Orders`}
                   btnLabel={
                     ordersCount
                       ? 'Cancel Orders'
                       : <SvgImage image={tickSvg}/>
                   }
                   btnDisabled={!ordersCount}
                   btnAction={() => this.setState({ view: MigrationViews.cancelOrders })}
    />
  )

  private callToRedeemDai = (amountToRedeem: BigNumber) => (
    <CallForAction title="Upgrade your Single-Collateral Sai"
                   description={
                     `Upgrade your Single-Collateral Sai to
                              Multi-Collateral Dai`
                   }
                   data={`${amountToRedeem.valueOf()} SAI to upgrade`}
                   btnLabel={
                     amountToRedeem.gt(new BigNumber(0))
                       ? 'Upgrade Dai'
                       : <SvgImage image={tickSvg}/>
                   }
                   btnDisabled={amountToRedeem.lte(new BigNumber(0))}
                   btnAction={() => this.setState({ view: MigrationViews.migration })}
    />
  )

  private txRow = (operation: any, index?: number) => {
    const status = !operation.txStatus ? {
      txStatus: index === 0 ? 'Start Migration Process' : 'Waiting',
      txHash: '',
      etherscanURI: ''
    } : {
      ...operation
    } as Report;

    switch (operation.kind) {
      case ExchangeMigrationTxKind.createProxy:
        return (
          <div key={operation.kind} className={styles.txRow}>
            <TxStatusRow icon={<SvgImage image={accountSvg}/>}
                         label={
                           <TradeData
                             data-test-id="create-proxy"
                             theme="reversed"
                             label="Create Account"
                             tooltip={proxyTooltip}
                           />
                         }
                         status={<ProgressReport report={status}/>}
            />
          </div>
        );
      case ExchangeMigrationTxKind.allowance4Proxy:
        return (
          <div key={operation.kind} className={styles.txRow}>
            <TxStatusRow icon={<SvgImage image={doneSvg}/>}
                         label={
                           <TradeData
                             data-test-id="set-allowance"
                             theme="reversed"
                             label="Unlock SAI"
                             tooltip={allowanceTooltip}
                           />}
                         status={<ProgressReport report={status}/>}
            />
          </div>
        );
      case ExchangeMigrationTxKind.sai2dai:
        return (
          <div key={operation.kind} className={styles.txRow}>
            <TxStatusRow icon={tokens.SAI.iconColor}
                         label={
                           <TradeData
                             data-test-id="upgrade"
                             theme="reversed"
                             label="Upgrade"
                             value={`${operation.amount.toFormat(tokens.SAI.digits)} SAI`}
                           />}
                         status={<ProgressReport report={status}/>}
            />
          </div>
        );
      default:
        return <></>;
    }
  }
}
