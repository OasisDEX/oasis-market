import * as React from 'react';
import * as ReactModal from 'react-modal';
import { Observable } from 'rxjs';
import { connect } from '../utils/connect';
import { FormStage, GasEstimationStatus, ProgressStage } from '../utils/form';
import { Button } from '../utils/forms/Buttons';
import { GasCost } from '../utils/gasCost/GasCost';
import { BorderBox, Hr } from '../utils/layout/LayoutHelpers';
import { Loadable } from '../utils/loadable';
import { WithLoadingIndicator } from '../utils/loadingIndicator/LoadingIndicator';
import { ModalOpenerProps, ModalProps } from '../utils/modal';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '../utils/panel/Panel';
import { Muted } from '../utils/text/Text';
import { TransactionStateDescription } from '../utils/text/TransactionStateDescription';
// import { MTAccountState } from '../state/mtAccount';
import { ExchangeMigrationState, ExchangeMigrationStatus } from './migration';
// import { MTSetupFormState, MTSetupProgressState } from './mtSetupForm';
// import * as styles from './mtSetupFormView.scss';

export type MigrationButtonProps = Loadable<ExchangeMigrationState> & {
  migration$: Observable<ExchangeMigrationState>
};

export class MigrationButton extends React.Component<MigrationButtonProps> {
  public render() {
    return <WithLoadingIndicator loadable={this.props}>
      {
        (migrationState: any) => {
          console.log(migrationState);
          return (
            <Button size="md"
                    color="danger"
                    disabled={
                      migrationState.status !== ExchangeMigrationStatus.ready
                    }
                    onClick={() => this.setup()}
            >
              Migrate
            </Button>
          );
        }
      }
    </WithLoadingIndicator>;
  }

  private setup() {
    // const migration$ = this.props.migration();
    // const MigrationModalRxTx =
    //   connect<ExchangeMigrationState, ModalProps>(MigrationModal, migration$);
    // this.props.open(MigrationModalRxTx);
  }
}

// export class MigrationModal extends React.Component<ExchangeMigrationState & ModalProps> {
//   public render() {
//     return (
//       <ReactModal
//         ariaHideApp={false}
//         isOpen={true}
//         className={styles.modal}
//         overlayClassName={styles.modalOverlay}
//         closeTimeoutMS={250}
//       >
//       <Panel style={{ width: '360px', height: '411px' }} className={styles.modalChild}>
//         <PanelHeader bordered={true}>Proxy setup</PanelHeader>
//         <PanelBody paddingVertical={true}
//                    style={{ height: '287px' }}>
//
//           <pre>
//             {JSON.stringify(this.props, null, 2)}
//           </pre>
//           <BorderBox className={styles.checklistBox}>
//             <Hr color="dark" className={styles.hrSmallMargin} />
//           </BorderBox>
//         </PanelBody>
//         <PanelFooter>
//           { this.props.status === ExchangeMigrationStatus.ready &&
//             <Button size="md" block={true} onClick={this.props.start} >Start</Button>
//           }
//         </PanelFooter>
//       </Panel>
//       </ReactModal>
//     );
//   }
// }
