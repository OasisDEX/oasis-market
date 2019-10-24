import * as React from 'react';
import * as ReactModal from 'react-modal';
import { Observable } from 'rxjs';
import { connect } from '../utils/connect';
import { Button } from '../utils/forms/Buttons';
import { Loadable } from '../utils/loadable';
import { WithLoadingIndicator } from '../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps, ModalProps } from '../utils/modal';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '../utils/panel/Panel';
// import { MTAccountState } from '../state/mtAccount';
import { ExchangeMigrationState, ExchangeMigrationStatus, ExchangeMigrationTxKind } from './migration';
// import { MTSetupFormState, MTSetupProgressState } from './mtSetupForm';
import * as styles from './Migration.scss';

export type MigrationButtonProps = Loadable<ExchangeMigrationState> & {
  migration$: Observable<ExchangeMigrationState>
};

const MigrationOpsDescription = {
  [ExchangeMigrationTxKind.cancel]: 'Cancelling orders',
  [ExchangeMigrationTxKind.createProxy]: 'Create Proxy',
  [ExchangeMigrationTxKind.allowance4Proxy]: 'Setting Allowance',
  [ExchangeMigrationTxKind.sai2dai]: 'Migrating Sai To Dai',
}

export class MigrationButton extends React.Component<MigrationButtonProps & ModalOpenerProps> {
  public render() {
    return <WithLoadingIndicator loadable={this.props}>
      {
        (migrationState: any) => {
          console.log(migrationState.pending);
          return migrationState.pending && migrationState.pending.length
            ? (
              <Button size="md"
                      color="danger"
                      disabled={
                        migrationState.status !== ExchangeMigrationStatus.ready
                      }
                      onClick={() => this.setup()}
              >
                Migrate
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

const OpRowStyle = {
  display: 'flex',
  justifyContent: 'space-between'
}

export class MigrationModal extends React.Component<ExchangeMigrationState & ModalProps> {
  public render() {
    return (
      <ReactModal
        ariaHideApp={false}
        isOpen={true}
        className={styles.modal}
        overlayClassName={styles.modalOverlay}
        closeTimeoutMS={250}
      >
        <Panel className={styles.modalChild}>
          <PanelHeader bordered={true}>Migration Process</PanelHeader>
          <PanelBody paddingVertical={true}>
            {
              this.props.status === ExchangeMigrationStatus.ready
              && this.props.pending.map(
                (step) => (
                  <div style={OpRowStyle}>
                    <span>
                      {
                        MigrationOpsDescription[step.kind]
                      }
                    </span>
                    <span>
                      Pending ...
                    </span>
                  </div>
                )
              )
            }
            {
              this.props.status === ExchangeMigrationStatus.inProgress
              && this.props.done.map(
                (step) => (
                  <div style={OpRowStyle}>
                    <span>
                      {
                        MigrationOpsDescription[step.kind]
                      }
                    </span>
                    <span>
                      {
                        step.txStatus
                      }
                    </span>
                  </div>
                )
              )
            }
            {
              this.props.status === ExchangeMigrationStatus.inProgress
              && <div style={OpRowStyle}>
                    <span>
                      {
                        MigrationOpsDescription[this.props.current.kind]
                      }
                    </span>
                <span>
                      {
                        this.props.current.txStatus
                      }
                    </span>
              </div>
            }
            {
              this.props.status === ExchangeMigrationStatus.inProgress
              && this.props.pending.map(
                (step) => (
                  <div style={OpRowStyle}>
                    <span>
                      {
                        MigrationOpsDescription[step.kind]
                      }
                    </span>
                    <span>
                      Pending ...
                    </span>
                  </div>
                )
              )
            }
            {
              this.props.status === ExchangeMigrationStatus.fiasco &&
              (
                <div>
                  Migration Progress Was Interrupted !
                </div>
              )
            }
            {
              this.props.status === ExchangeMigrationStatus.done &&
              (
                <div>
                  Migration Completed Successfully !
                </div>
              )
            }
            <pre>
            {/*{JSON.stringify(this.props, null, 2)}*/}
          </pre>
          </PanelBody>
          <PanelFooter className={styles.modalButtonsPlaceholder}>
            <Button size="md"
                    color="dangerOutlined"
                    block={true}
                    onClick={this.props.close}
            >
              Close
            </Button>
            {
              this.props.status === ExchangeMigrationStatus.ready &&
              <Button size="md"
                      color="primary"
                      block={true}
                      disabled={
                        this.props.status !== ExchangeMigrationStatus.ready
                      }
                      onClick={
                        this.props.start
                      }
              >
                Start
              </Button>
            }
          </PanelFooter>
        </Panel>
      </ReactModal>
    );
  }
}
