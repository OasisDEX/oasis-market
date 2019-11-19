import * as classnames from 'classnames';
import * as React from 'react';
import * as ReactModal from 'react-modal';
import { Observable } from 'rxjs';
import { Button, CloseButton } from '../utils/forms/Buttons';
import { Loadable } from '../utils/loadable';
import { LoadingIndicator, WithLoadingIndicator } from '../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps, ModalProps } from '../utils/modal';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '../utils/panel/Panel';
import { TopRightCorner } from '../utils/panel/TopRightCorner';

import { ExchangeMigrationStatus, ExchangeMigrationTxKind } from './migration';

import { BigNumber } from 'bignumber.js';
import * as mixpanel from 'mixpanel-browser';
import { default as MediaQuery } from 'react-responsive';
import { createNumberMask } from 'text-mask-addons/dist/textMaskAddons';
import { getToken, isDAIEnabled } from '../blockchain/config';
import { TradeStatus, TradeWithStatus } from '../exchange/myTrades/openTrades';
import accountSvg from '../icons/account.svg';
import doneSvg from '../icons/done.svg';
import tickSvg from '../icons/tick.svg';
import { TradeData } from '../instant/details/TradeData';
import { TxStatusRow } from '../instant/details/TxStatusRow';
import { ProgressReport, Report } from '../instant/progress/ProgressReport';
import { BigNumberInput } from '../utils/bigNumberInput/BigNumberInput';
import { connect } from '../utils/connect';
import { AmountFieldChange, FormChangeKind } from '../utils/form';
import { formatAmount } from '../utils/formatters/format';
import { Money } from '../utils/formatters/Formatters';
import { ErrorMessage } from '../utils/forms/ErrorMessage';
import { InputGroup, InputGroupAddon } from '../utils/forms/InputGroup';
import { SvgImage } from '../utils/icons/utils';
import { Scrollbar } from '../utils/Scrollbar/Scrollbar';
import { RowClickable, Table } from '../utils/table/Table';
import { SellBuySpan } from '../utils/text/Text';
import { WarningTooltipType } from '../utils/tooltip/Tooltip';
import { zero } from '../utils/zero';
import { CallForAction } from './CallForAction';
import * as styles from './Migration.scss';
import { Message, MessageKind, MigrationFormKind, MigrationFormState } from './migrationForm';

export type MigrationButtonProps = Loadable<MigrationFormState> & {
  label: string;
  migration$: Observable<MigrationFormState>;
  className?: string;
  tid?: string;
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

const messageContent = (msg: Message) => {
  switch (msg.kind) {
    case MessageKind.amount2Big:
      return <span> You don't have enough funds</span>;
    default:
      return <></>;
  }
};

// tslint:enable

export class MigrationButton extends React.Component<MigrationButtonProps & ModalOpenerProps> {
  public render() {
    return <WithLoadingIndicator loadable={this.props}
                                 className={styles.loadingIndicator}
    >
      {
        (migrationState) => {
          const visible =
            isDAIEnabled() &&
            migrationState.kind === MigrationFormKind.sai2dai &&
            (migrationState.balance.gt(zero) || migrationState.orders.length > 0) ||
            migrationState.kind === MigrationFormKind.dai2sai &&
            migrationState.balance.gt(zero);

          const { tid, className, label } = this.props;

          return visible ? (
              <Button size="md"
                      className={classnames(styles.redeemBtn, className)}
                      data-test-id={tid}
                      onClick={
                        () => {
                          this.setup();
                          mixpanel.track('btn-click', {
                            id: 'initiate-sai-dai-migration',
                            product: 'oasis-trade',
                            page: 'Sitewide',
                            section: 'sitewide',
                          });
                        }
                      }
              >
                {label}
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
      connect<MigrationFormState, ModalProps>(MigrationModal, migration$);
    this.props.open(MigrationModalRxTx);
  }
}

enum MigrationViews {
  initial = 'initial',
  cancelOrders = 'cancelOrders',
  migration = 'migration',
}

export class MigrationModal extends React.Component<MigrationFormState & ModalProps,
  { view: MigrationViews }> {

  public constructor(props: any) {
    super(props);
    this.state = {
      view: MigrationViews.initial
    };
  }

  public render() {
    const view = (() => {
      switch (this.state.view) {
        case MigrationViews.cancelOrders:
          return !this.props.orders.length
            ? this.initialView()
            : this.cancelOrders();
        default:
          if (this.props.progress
            && this.props.progress.status !== ExchangeMigrationStatus.done) {
            return this.migration();
          }
          return this.initialView();
      }
    })();

    return <ReactModal
      ariaHideApp={false}
      isOpen={true}
      className={styles.modal}
      overlayClassName={styles.modalOverlay}
      closeTimeoutMS={250}
    >
      <section data-test-id="migration-wizard"
               className={styles.modalChild}
      >
        {view}
      </section>
    </ReactModal>;
  }

  private initialView = () => {
    const { fromToken } = this.props;
    return (
      <Panel footerBordered={true} className={styles.panel}>
        <PanelHeader bordered={true} className={styles.panelHeader}>
          <span data-test-id="panel-header">
            {fromToken === 'SAI'
              ? 'Multi-Collateral Dai Upgrade'
              : 'Single-Collateral Sai Swap'
            }
          </span>
          <TopRightCorner className={styles.closeBtn}>
            <CloseButton data-test-id="close-button"
                         theme="danger"
                         onClick={this.close}/>
          </TopRightCorner>
        </PanelHeader>
        <PanelBody paddingVertical={true} className={styles.panelBody}>
          {fromToken === 'SAI' && this.callToCancelOrders()}
          {this.callToRedeem()}
        </PanelBody>
      </Panel>
    );
  }

  private cancelOrders = () => {
    const { orders } = this.props;
    return <Panel className={styles.panel}>
      <PanelHeader bordered={true} className={styles.panelHeader}>
        Cancel Pending Orders
        <TopRightCorner className={styles.closeBtn}>
          <CloseButton data-test-id="close-button"
                       theme="danger"
                       onClick={this.close}/>
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
            `Cancel your ${orders.length} Open ${orders.length === 1 ? 'Order' : 'Orders'} before upgrading your Single-Collateral Sai`
          }
        </div>
        <div className={styles.ordersPlaceholder}>
          <Table align="left" className={styles.orders}>
            <thead>
            <tr>
              <th className={classnames('hide-md', styles.market)}>Market</th>
              <th className={styles.type}>Type</th>
              <th className={styles.price}>Price</th>
              <th className={styles.amount}>Amount</th>
              <th className={styles.total}>Total</th>
              <th className={styles.action}>Action</th>
            </tr>
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
                    <td className={classnames('hide-md', styles.market)}>
                      {order.baseToken}/{order.quoteToken}
                    </td>
                    <td className={styles.type}>
                      <SellBuySpan type={order.act}>{order.act}</SellBuySpan>
                    </td>
                    <td className={styles.price}>
                      {formatAmount(order.price, order.quoteToken)} SAI
                    </td>
                    <td className={styles.amount}>
                      {formatAmount(order.baseAmount, order.baseToken)} {order.baseToken}
                    </td>
                    <td className={styles.total}>
                      {formatAmount(order.quoteAmount, order.quoteToken)} SAI
                    </td>
                    <td className={styles.action}>
                      {
                        order.status === TradeStatus.beingCancelled
                          ? <LoadingIndicator className={styles.orderCancellationIndicator}
                                              inline={true}
                          />
                          : <MediaQuery maxWidth={480}>
                            {
                              (matches) => {
                                if (matches) {
                                  return (
                                    <CloseButton theme="danger"
                                                 data-test-id="cancel"
                                                 onClick={
                                                   () => this.cancel(order)
                                                 }
                                    />
                                  );
                                }

                                return (
                                  <Button size="sm"
                                          data-test-id="cancel"
                                          color="secondaryOutlined"
                                          onClick={
                                            () => this.cancel(order)
                                          }
                                  >
                                    Cancel
                                  </Button>
                                );
                              }
                            }
                          </MediaQuery>

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
                data-test-id="back"
                className={styles.backBtn}
                onClick={() => this.setState({ view: MigrationViews.initial })}
        >
          Back
        </Button>
      </PanelFooter>
    </Panel>;
  }

  private migration = () => {

    const { fromToken, amount, progress, change } = this.props;
    const formattedAmount = formatAmount(amount || new BigNumber(0), fromToken);

    if (!progress) {
      throw new Error('Should not get here!');
    }

    // TODO: Extract duplicated parts ( the panel + close button )
    return <Panel className={styles.panel} data-test-id="migration">
      <PanelHeader bordered={true} className={styles.panelHeader}>
        {
          fromToken === 'SAI'
            ? 'Multi-Collateral Dai Upgrade'
            : 'Single-Collateral Sai Swap'
        }
        <TopRightCorner className={styles.closeBtn}>
          <CloseButton data-test-id="close-button"
                       theme="danger"
                       onClick={this.close}/>
        </TopRightCorner>
      </PanelHeader>
      <PanelBody paddingVertical={true}
                 className={
                   classnames(styles.panelBody, styles.process)
                 }
      >
        <div className={styles.description}>
          {
            fromToken === 'SAI'
              // tslint:disable-next-line:max-line-length
              ? `Upgrade ${formattedAmount} SAI (Single-Collateral Dai) to ${formattedAmount} DAI (Multi-Collateral Dai)`

              // tslint:disable-next-line:max-line-length
              : `Swap ${formattedAmount} DAI (Multi-Collateral Dai) for ${formattedAmount} SAI (Single-Collateral Dai)`
          }
        </div>

        {
          progress.status === ExchangeMigrationStatus.initializing
          && <LoadingIndicator className={styles.processLoadingIndicator} inline={true}/>
        }
        {
          progress.status === ExchangeMigrationStatus.ready
          && progress.pending.map((operation) => {
            return this.txRow(operation);
          })
        }
        {
          (progress.status === ExchangeMigrationStatus.inProgress ||
            progress.status === ExchangeMigrationStatus.fiasco)
          && progress.done.map((operation) => {
            return this.txRow(operation);
          })
        }

        {
          (progress.status === ExchangeMigrationStatus.inProgress ||
            progress.status === ExchangeMigrationStatus.fiasco)
          && this.txRow(progress.current)
        }

        {
          (progress.status === ExchangeMigrationStatus.inProgress ||
            progress.status === ExchangeMigrationStatus.fiasco)
          && progress.pending.map((operation) => {
            return this.txRow(operation);
          })
        }

        {
          progress.status === ExchangeMigrationStatus.done
          && amount && amount.eq(new BigNumber(0))
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
                data-test-id="back"
                className={styles.backBtn}
                disabled={
                  progress && (
                    progress.status !== ExchangeMigrationStatus.done &&
                    progress.status !== ExchangeMigrationStatus.fiasco
                  )
                }
                onClick={() => change({ kind: FormChangeKind.progress })}
        >
          Back
        </Button>
      </PanelFooter>
    </Panel>;
  }

  private callToCancelOrders = () => {
    const ordersCount = this.props.orders.length;
    return (
      <CallForAction title="Cancel Open Orders"
                     description={
                       `Cancel all your Open Orders before
                              upgrading your Single-Collateral Sai to Dai`
                     }
                     data={`${ordersCount} Open ${ordersCount === 1 ? 'Order' : 'Orders'}`}
                     btnLabel={
                       ordersCount
                         ? 'Cancel Orders'
                         : <SvgImage data-test-id="step-completed" image={tickSvg}/>
                     }
                     btnDisabled={!ordersCount}
                     btnAction={() => {
                       this.setState({ view: MigrationViews.cancelOrders });
                       mixpanel.track('btn-click', {
                         id: 'cancel-offers',
                         product: 'oasis-trade',
                         page: 'Sitewide',
                         section: 'sai-dai-migration',
                       });
                     }}
                     tid="cfa-cancel-orders"
      />
    );
  }

  private callToRedeem = () => {
    const { fromToken, amount, balance, readyToProceed, proceed, messages } = this.props;
    return (
      <CallForAction title={
        fromToken === 'SAI'
          ? 'Upgrade your Single-Collateral Sai'
          : 'Swap your Multi-Collateral Dai'
      }
                     description={
                       fromToken === 'SAI'
                         ? `Upgrade your Single-Collateral Sai to Multi-Collateral Dai`
                         : `Swap your Multi-Collateral Dai for Single-Collateral Sai`
                     }
                     data={
                       <>
                         <Money value={balance} token={fromToken}/>
                         {` to ${fromToken === 'SAI' ? 'upgrade' : 'swap'}`}
                       </>
                     }
                     btnLabel={
                       balance.eq(zero) &&
                       <SvgImage image={tickSvg} data-test-id="step-completed"/> ||
                       `${fromToken === 'SAI' ? 'Upgrade' : 'Swap'} ${fromToken}`
                     }
                     btnDisabled={!readyToProceed}
                     btnAction={() => {
                       this.setState({ view: MigrationViews.initial });
                       proceed(this.props);
                       mixpanel.track('btn-click', {
                         id: `${fromToken === 'SAI' ? 'upgrade' : 'swap'}-${fromToken}`,
                         product: 'oasis-trade',
                         page: 'Sitewide',
                         section: 'sai-dai-migration',
                       });
                     }}
                     tid="cfa-upgrade-balance"
      >
        <div className={styles.amountInputGroup}>
          <InputGroup hasError={(messages || []).length > 0}>
            <InputGroupAddon className={styles.amountInputAddon}>
              Amount
            </InputGroupAddon>
            <div className={styles.amountInputTail}>
              <BigNumberInput
                data-test-id="type-amount"
                // ref={(el: any) =>
                //   this.amountInput = (el && ReactDOM.findDOMNode(el) as HTMLElement) || undefined
                // }
                type="text"
                className={styles.amountInput}
                mask={createNumberMask({
                  allowDecimal: true,
                  decimalLimit: 5,
                  prefix: ''
                })}
                onChange={this.handleAmountChange}
                value={
                  (amount || null) &&
                  formatAmount(amount as BigNumber, fromToken)
                }
                guide={true}
                placeholder={'0'}
              />
              <InputGroupAddon
                // onClick={this.handleAmountFocus}
                className={styles.amountInputAddon}
              >
                {fromToken}
              </InputGroupAddon>
            </div>
          </InputGroup>
          <ErrorMessage messages={messages.map(messageContent)}
                        data-test-id="error-message"
          />
        </div>
      </CallForAction>
    );
  }

  private handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    this.props.change({
      kind: FormChangeKind.amountFieldChange,
      value: value === '' ? null : new BigNumber(value)
    } as AmountFieldChange);
  }

  private txRow = (operation: any) => {
    const status = {
      ...operation,
      etherscanURI: this.props.etherscan && this.props.etherscan.url
    } as Report;

    switch (operation.kind) {
      case ExchangeMigrationTxKind.createProxy:
        return (
          <div key={operation.kind} className={styles.txRow} data-test-id="tx-row">
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
          <div key={operation.kind} className={styles.txRow} data-test-id="tx-row">
            <TxStatusRow icon={<SvgImage image={doneSvg}/>}
                         label={
                           <TradeData
                             data-test-id="set-allowance"
                             theme="reversed"
                             label={
                               this.props.kind === MigrationFormKind.sai2dai
                                 ? 'Unlock SAI'
                                 : 'Unlock DAI'
                             }
                             tooltip={allowanceTooltip}
                           />
                         }
                         status={<ProgressReport report={status}/>}
            />
          </div>
        );
      case ExchangeMigrationTxKind.sai2dai:
        return (
          <div key={operation.kind} className={styles.txRow} data-test-id="tx-row">
            <TxStatusRow icon={getToken('SAI').iconColor}
                         label={
                           <TradeData
                             data-test-id="upgrade"
                             theme="reversed"
                             label="Upgrade"
                             value={`${operation.amount.toFormat(getToken('SAI').digits)} SAI`}
                           />}
                         status={<ProgressReport report={status}/>}
            />
          </div>
        );
      case ExchangeMigrationTxKind.dai2sai:
        return (
          <div key={operation.kind} className={styles.txRow} data-test-id="tx-row">
            <TxStatusRow icon={getToken('DAI').iconColor}
                         label={
                           <TradeData
                             data-test-id="upgrade"
                             theme="reversed"
                             label="Swap"
                             value={`${operation.amount.toFormat(getToken('DAI').digits)} DAI`}
                           />}
                         status={<ProgressReport report={status}/>}
            />
          </div>
        );
      default:
        return <></>;
    }
  }

  private close = () => {
    this.props.close();
  }

  private cancel = (order: TradeWithStatus) => {
    this.props.cancelOffer({
      offerId: order.offerId,
      type: order.act,
      amount: order.baseAmount,
      token: order.baseToken
    });

    mixpanel.track('btn-click', {
      id: 'cancel-single-offer',
      product: 'oasis-trade',
      page: 'Sitewide',
      section: 'sai-dai-migration',
    });
  }
}
