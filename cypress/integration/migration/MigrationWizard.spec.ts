import { migrationBtnInHeader, MigrationWizardModal } from '../../pages/Migration';
import { WalletConnection } from '../../pages/WalletConnection';
import { cypressVisitWithWeb3 } from '../../utils';
// No point of testing when the user is neither connected nor doesn't have a provider
// Supposedly there is no way you get to this step in those case.
describe('Migration Wizard', () => {
  beforeEach(() => {
    cypressVisitWithWeb3();
    WalletConnection.connect();
    WalletConnection.isConnected();
  });

  context.skip('order cancellation', () => {
    it('should display all open orders in the SAI market', () => {
      MigrationWizardModal
        .openFrom(migrationBtnInHeader)
        .ordersToCancelIs(4);
    });

    it('should display available balance to upgrade', () => {
      MigrationWizardModal
        .openFrom(migrationBtnInHeader)
        .amountToMigrateIs('220.0000 SAI');
    });

    it('should allow the user to view the list with open orders', () => {
      const wizard = MigrationWizardModal
        .openFrom(migrationBtnInHeader);

      wizard.ordersToCancelIs(4);
      const cancellation = wizard.cancelOrders();
      cancellation.hasOrdersLeft(4);
    });

    it('should allow the user to cancel an open order', () => {
      const wizard = MigrationWizardModal
        .openFrom(migrationBtnInHeader);

      wizard.ordersToCancelIs(4);
      const cancellation = wizard.cancelOrders();

      cancellation.cancel();
      cancellation.hasOrdersLeft(3);
      cancellation.back();

      wizard.ordersToCancelIs(3);
    });

    it('should display initial wizard view when user cancel all of his orders', () => {
      const wizard = MigrationWizardModal
        .openFrom(migrationBtnInHeader);

      wizard.ordersToCancelIs(4);
      const cancellation = wizard.cancelOrders();

      cancellation.cancel();
      cancellation.cancel();
      cancellation.cancel();
      cancellation.cancel();

      cancellation.hasOrdersLeft(0);

      wizard.hasNoOrdersToCancel();
    });
  });

  context('migration', () => {
    it.skip('should have input field populated with amount equal to the balance', () => {
      const wizard = MigrationWizardModal
        .openFrom(migrationBtnInHeader);

      wizard.amountInTheInputIs('220.0000');
    });

    it('should migrate amount specified from the user',  () => {
      const wizard = MigrationWizardModal
        .openFrom(migrationBtnInHeader);

      wizard.migrate('20.0000');
      wizard.amountToMigrateIs('200.0000');
    });
  });
});
