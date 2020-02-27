import {
  migrationBtnInHeader,
  migrationBtnInMarket, MigrationWizardModal,
  swapBtnInAccount, ViewHeaders
} from '../../pages/Migration';
import { Tab } from '../../pages/Tab';
import { TradingPairDropdown } from '../../pages/TradingPairDropdown';
import { WalletConnection } from '../../pages/WalletConnection';
import { cypressVisitWithoutProvider, cypressVisitWithWeb3 } from '../../utils';
import { makeScreenshots } from '../../utils/makeScreenshots';

describe('Upgrade button', () => {

  context('for user with no provider', () => {
    beforeEach(() => {
      cypressVisitWithoutProvider();
    });

    it('in the header should not be visible', () => {
      migrationBtnInHeader().should('not.exist');
    });
  });

  context('for user with a provider but not connected', () => {
    beforeEach(() => {
      cypressVisitWithWeb3();
    });

    it('in the header should not be visible', () => {
      migrationBtnInHeader().should('not.exist');
      makeScreenshots('missing-update-btn-button-header', ['macbook-15']);
    });
  });

  context('for user with a provider and connected', () => {
    beforeEach(() => {
      cypressVisitWithWeb3();
      WalletConnection.connect();
      WalletConnection.isConnected();
    });

    it('in the header should display Migration Wizard when clicked', () => {
      MigrationWizardModal
        .openFrom(migrationBtnInHeader)
        .headerIs(ViewHeaders.updateSai);
      makeScreenshots('migration-wizard');
    });

    it.skip('to swap back in the account page should display Swap Wizard when clicked', () => {
      Tab.balances();
      MigrationWizardModal
        .openFrom(swapBtnInAccount)
        .headerIs(ViewHeaders.swapDai);
    });

    // tslint:disable-next-line:max-line-length
    it('should not be visible when all orders are cancelled and there is no SAI to migrate', () => {
      const wizard = MigrationWizardModal
        .openFrom(migrationBtnInHeader);

      wizard.ordersToCancelIs(4);
      const cancellation = wizard.cancelOrders();
      cancellation.cancel();
      cancellation.cancel();
      cancellation.cancel();
      cancellation.cancel();

      wizard.ordersToCancelIs(0);

      wizard.amountToMigrateIs('1,000.0000');

      const migration = wizard.migrate('1000');
      migration.shouldCreateProxy()
        .shouldSetAllowanceTo('SAI')
        .shouldMigrate('1,000.0000', 'SAI');

      wizard.amountToMigrateIs('0');

      wizard.close();

      migrationBtnInHeader().should('not.exist');
    });
  });
});
