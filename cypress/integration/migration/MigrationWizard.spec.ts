import {
  checkProxyAllowances,
  expectAllowanceStatusFor,
  setAllowanceOf
} from '../../pages/Allowance';
import {
  migrationBtnInHeader,
  migrationBtnInMarket,
  MigrationWizardModal
} from '../../pages/Migration';
import * as Proxy from '../../pages/Proxy';
import { Tab } from '../../pages/Tab';
import { Trades } from '../../pages/Trades';
import { TradingPairDropdown } from '../../pages/TradingPairDropdown';
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

    it('should only migrate if user has proxy and allowance', () => {
      const amount = '20.0000';
      const token = 'SAI';
      const balanceAfterMigration = '200.0000';

      Tab.instant();
      Proxy.settings().click();
      Proxy.create();
      Proxy.hasStatus(Proxy.ProxyStatus.ENABLED);

      checkProxyAllowances();
      setAllowanceOf('SAI');
      expectAllowanceStatusFor('SAI', 'true');

      const wizard = MigrationWizardModal
        .openFrom(migrationBtnInHeader);

      wizard.migrate(amount)
        .shouldNotCreateProxy()
        .shouldNotSetAllowance()
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

  context('external changes', () => {
    it(`should update open orders count and the amount of SAI that needs to be migrated
    when user cancels an order from my trades widget under market tab`,
       () => {
         Tab.market();
         TradingPairDropdown.select({ base: 'WETH', quote: 'SAI' });

         MigrationWizardModal
          .openFrom(migrationBtnInMarket)
          .ordersToCancelIs(4)
          .amountToMigrateIs('220')
          .close();

         Trades.first().cancel();

         MigrationWizardModal
          .openFrom(migrationBtnInMarket)
          .ordersToCancelIs(3)
          .amountToMigrateIs('520');
       });
  });
});
