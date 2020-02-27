import {
  checkProxyAllowances,
  expectAllowanceStatusFor,
  setAllowanceOf
} from '../../pages/Allowance';
import {
  migrationBtnInHeader,
  MigrationWizardModal, swapBtnInAccount
} from '../../pages/Migration';
import * as Proxy from '../../pages/Proxy';
import { Tab } from '../../pages/Tab';
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

  context('order cancellation', () => {
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

    it('should update the amount of SAI that need to be migrated', () => {
      const wizard = MigrationWizardModal
        .openFrom(migrationBtnInHeader);

      let cancellation = wizard.cancelOrders();
      cancellation.cancel();
      cancellation.hasOrdersLeft(3);
      cancellation.back();

      wizard.amountToMigrateIs('520.0000 SAI');

      cancellation = wizard.cancelOrders();
      cancellation.cancel();
      cancellation.hasOrdersLeft(2);
      cancellation.back();

      wizard.amountToMigrateIs('800.0000 SAI');

      cancellation = wizard.cancelOrders();
      cancellation.cancel();
      cancellation.hasOrdersLeft(1);
      cancellation.back();

      wizard.amountToMigrateIs('900.0000 SAI');

      cancellation = wizard.cancelOrders();
      cancellation.cancel();
      cancellation.hasOrdersLeft(0);

      wizard.amountToMigrateIs('1,000.0000 SAI');
      wizard.hasNoOrdersToCancel();
    });
  });

  context('migration', () => {
    it('should have input field populated with amount equal to the balance', () => {
      const wizard = MigrationWizardModal
        .openFrom(migrationBtnInHeader);

      wizard.amountInTheInputIs('220.0000');
    });

    // tslint:disable-next-line:max-line-length
    it('should display an error if the user tries to enter a value bigger than his balance', () => {
      const wizard = MigrationWizardModal
        .openFrom(migrationBtnInHeader);

      wizard.amountToMigrateIs('220.0000');
      wizard.typeAmount('260.0000');
      wizard.shouldHaveAnError('You don\'t have enough funds');
    });

    it('should migrate amount specified from the user', () => {
      const amount = '20.0000';
      const token = 'SAI';
      const balanceAfterMigration = '200.0000';
      const wizard = MigrationWizardModal
        .openFrom(migrationBtnInHeader);

      wizard.migrate(amount)
        .shouldCreateProxy()
        .shouldSetAllowanceTo(token)
        .shouldMigrate(amount, token);

      wizard.amountToMigrateIs(balanceAfterMigration);
    });

    it('should set allowance and migrate if user has proxy', () => {
      const amount = '20.0000';
      const token = 'SAI';
      const balanceAfterMigration = '200.0000';

      Tab.instant();
      Proxy.settings().click();
      Proxy.create();
      Proxy.hasStatus(Proxy.ProxyStatus.ENABLED);

      const wizard = MigrationWizardModal
        .openFrom(migrationBtnInHeader);

      wizard.migrate(amount)
        .shouldNotCreateProxy()
        .shouldSetAllowanceTo(token)
        .shouldMigrate(amount, token);

      wizard.amountToMigrateIs(balanceAfterMigration);
    });

    it('should display to the user that all SAI is migrated', () => {
      const amount = '20.0000';
      const token = 'SAI';
      const balanceAfterMigration = '0.0000';

      const wizard = MigrationWizardModal
        .openFrom(migrationBtnInHeader);

      wizard.migrate()
        .shouldCreateProxy()
        .shouldSetAllowanceTo(token)
        .shouldMigrate(amount, token);

      wizard.amountToMigrateIs(balanceAfterMigration);
      wizard.nothingToMigrate();
    });
  });

  context.skip('swapping', () => {
    beforeEach(() => {
      Tab.balances();
    });

    it('should not prompt the user to close his dai orders', () => {
      const wizard = MigrationWizardModal
        .openFrom(swapBtnInAccount);

      wizard.shouldContainOnlySwap();
    });

    it('should have input field populated with amount equal to the balance', () => {
      const wizard = MigrationWizardModal
        .openFrom(swapBtnInAccount);

      wizard.amountInTheInputIs('170.0000');
    });

    // tslint:disable-next-line:max-line-length
    it('should display an error if the user tries to enter a value bigger than his balance', () => {
      const wizard = MigrationWizardModal
        .openFrom(swapBtnInAccount);

      wizard.amountToMigrateIs('170.0000');
      wizard.typeAmount('220.0000');
      wizard.shouldHaveAnError('You don\'t have enough funds');
    });

    it('should swap amount specified from the user', () => {
      const amount = '20.0000';
      const token = 'DAI';
      const balanceAfterMigration = '150.0000';
      const wizard = MigrationWizardModal
        .openFrom(swapBtnInAccount);

      wizard.migrate(amount)
        .shouldCreateProxy()
        .shouldSetAllowanceTo(token)
        .shouldSwap(amount, token);

      wizard.amountToMigrateIs(balanceAfterMigration);
    });

    it('should set allowance and swap if user has proxy', () => {
      const amount = '20.0000';
      const token = 'DAI';
      const balanceAfterMigration = '150.0000';

      Tab.instant();
      Proxy.settings().click();
      Proxy.create();
      Proxy.hasStatus(Proxy.ProxyStatus.ENABLED);

      Tab.balances();

      const wizard = MigrationWizardModal
        .openFrom(swapBtnInAccount);

      wizard.migrate(amount)
        .shouldNotCreateProxy()
        .shouldSetAllowanceTo(token)
        .shouldSwap(amount, token);

      wizard.amountToMigrateIs(balanceAfterMigration);
    });

    it('should only swap if user has proxy and allowance', () => {
      const amount = '20.0000';
      const token = 'DAI';
      const balanceAfterMigration = '150.0000';

      Tab.instant();
      Proxy.settings().click();
      Proxy.create();
      Proxy.hasStatus(Proxy.ProxyStatus.ENABLED);

      checkProxyAllowances();
      setAllowanceOf(token);
      expectAllowanceStatusFor(token, 'true');

      Tab.balances();

      const wizard = MigrationWizardModal
        .openFrom(swapBtnInAccount);

      wizard.migrate(amount)
        .shouldNotCreateProxy()
        .shouldNotSetAllowance()
        .shouldSwap(amount, token);

      wizard.amountToMigrateIs(balanceAfterMigration);
    });

    it('should display to the user that all DAI is swapped', () => {
      const amount = '170.0000';
      const token = 'DAI';
      const balanceAfterMigration = '0.0000';

      const wizard = MigrationWizardModal
        .openFrom(swapBtnInAccount);

      wizard.migrate()
        .shouldCreateProxy()
        .shouldSetAllowanceTo(token)
        .shouldSwap(amount, token);

      wizard.amountToMigrateIs(balanceAfterMigration);
      wizard.nothingToMigrate();
    });
  });

  // tslint:disable-next-line:max-line-length
  it('should not display the progress if migration is ongoing by user closed modal but should update changes', () => {
    const token = 'SAI';
    const amount = '220.0000';
    const wizard = MigrationWizardModal
      .openFrom(migrationBtnInHeader);

    wizard.migrate();

    cy.wait(1000);

    wizard.close();

    MigrationWizardModal.openFrom(migrationBtnInHeader)
      .migrate()
      .shouldNotCreateProxy()
      .shouldSetAllowanceTo('SAI')
      .shouldMigrate(amount, token);

    wizard.nothingToMigrate();
  });
});
