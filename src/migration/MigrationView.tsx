import * as React from 'react';
import * as ReactModal from 'react-modal';
import { Observable } from 'rxjs';
import { connect } from '../utils/connect';
import { Button, CloseButton } from '../utils/forms/Buttons';
import { Loadable } from '../utils/loadable';
import { WithLoadingIndicator } from '../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps, ModalProps } from '../utils/modal';
import { Panel, PanelBody, PanelHeader } from '../utils/panel/Panel';
import { TopRightCorner } from '../utils/panel/TopRightCorner';

import {
  ExchangeMigrationState,
  ExchangeMigrationStatus,
  ExchangeMigrationTxKind
} from './migration';

import { BigNumber } from 'bignumber.js';
import { Offer } from '../exchange/orderbook/orderbook';
import * as styles from './Migration.scss';

export type MigrationButtonProps = Loadable<ExchangeMigrationState> & {
  migration$: Observable<ExchangeMigrationState>
};

const MigrationOpsDescription = {
  [ExchangeMigrationTxKind.cancel]: 'Cancelling orders',
  [ExchangeMigrationTxKind.createProxy]: 'Create Proxy',
  [ExchangeMigrationTxKind.allowance4Proxy]: 'Setting Allowance',
  [ExchangeMigrationTxKind.sai2dai]: 'Migrating Sai To Dai',
};

interface CallForActionProps {
  title: string;
  description: string;
  data: any;
  btnLabel: string;
  btnAction: () => void;
}

class CallForAction extends React.Component<CallForActionProps> {
  public render() {
    const { title, description, data, btnLabel, btnAction } = this.props;
    return (
      <div className={styles.process}>
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

export class MigrationButton extends React.Component<MigrationButtonProps & ModalOpenerProps> {
  public render() {
    return <WithLoadingIndicator loadable={this.props}>
      {
        (migrationState: any) => {
          return migrationState.pending && migrationState.pending.length
            ? (
              <Button size="md"
                      className={styles.redeemBtn}
                      disabled={
                        migrationState.status !== ExchangeMigrationStatus.ready
                      }
                      onClick={() => this.setup()}
              >
                Redeem Dai
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

export class MigrationModal extends React.Component<ExchangeMigrationState & ModalProps> {
  public render() {
    const orders: Offer[] = this.props.status === ExchangeMigrationStatus.ready
      ? this.props.pending
        .filter((op) => op.kind === ExchangeMigrationTxKind.cancel)
        .map((op) => (op as { offer: Offer }).offer)
      : [];

    let amount = new BigNumber(0);
    if (this.props.status === ExchangeMigrationStatus.ready) {
      const pendingMigration = this.props.pending
        .find((op) => op.kind === ExchangeMigrationTxKind.sai2dai) as { amount: BigNumber };
      if (pendingMigration) {
        amount = new BigNumber(pendingMigration.amount);
      }
    }

    return (
      <ReactModal
        ariaHideApp={false}
        isOpen={true}
        className={styles.modal}
        overlayClassName={styles.modalOverlay}
        closeTimeoutMS={250}
      >
        <Panel footerBordered={true} className={styles.modalChild}>
          <PanelHeader bordered={true} className={styles.panelHeader}>
            Oasis Multi Collateral Dai Migration
            <TopRightCorner>
              <CloseButton theme="danger" onClick={this.props.close}/>
            </TopRightCorner>
          </PanelHeader>
          <PanelBody paddingVertical={true} className={styles.panelBody}>
            {this.callToCancelOrders(orders.length)}
            {this.callToRedeemDai(amount)}
          </PanelBody>
        </Panel>
      </ReactModal>
    );
  }

  private callToCancelOrders = (ordersCount: number) => (
    <CallForAction title="Cancel Resting Orders"
                   description={
                     `Cancel all your Resting Orders before
                              redeeming your Multi Collateral Dai (DAI)`
                   }
                   data={`${ordersCount} Available Orders`}
                   btnLabel="Cancel Orders"
                   btnAction={() => false}
    />
  )

  private callToRedeemDai = (amountToRedeem: BigNumber) => (
    <CallForAction title="Multi Collateral Dai Redeemer"
                   description={
                     `Redeem your Single Collateral Dai (SAI) for
                              Multi Collateral Dai (DAI)`
                   }
                   data={`${amountToRedeem.valueOf()} DAI to redeem`}
                   btnLabel="Redeem Dai"
                   btnAction={() => false}
    />
  )
}
