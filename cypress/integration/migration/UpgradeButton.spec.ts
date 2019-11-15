import {
  click,
  migrationBtnInAccount,
  migrationBtnInHeader,
  migrationBtnInMarket, MigrationWizardModal,
  swapBtnInAccount, ViewHeaders
} from '../../pages/Migration';
import { Tab } from '../../pages/Tab';
import { TradingPairDropdown } from '../../pages/TradingPairDropdown';
import { WalletConnection } from '../../pages/WalletConnection';
import { cypressVisitWithoutProvider, cypressVisitWithWeb3, tid } from '../../utils';
import { makeScreenshots } from '../../utils/makeScreenshots';

const saiMarket = { base: 'WETH', quote: 'SAI' };

describe('Upgrade button', () => {

  context('for user with no provider', () => {
    beforeEach(() => {
      cypressVisitWithoutProvider();
    });

    it('in the header should not be visible', () => {
      migrationBtnInHeader().should('not.exist');
    });

    it('in the market new order form should not be visible', () => {
      TradingPairDropdown.select(saiMarket);
      migrationBtnInMarket().should('not.exist');
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

    it('in the market new order form should not be visible', () => {
      TradingPairDropdown.select(saiMarket);
      migrationBtnInMarket().should('not.exist');
      makeScreenshots('missing-update-btn-button-market', ['macbook-15']);
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

    it('in the account page should display Migration Wizard when clicked', () => {
      Tab.balances();
      MigrationWizardModal
        .openFrom(migrationBtnInAccount)
        .headerIs(ViewHeaders.updateSai);
    });

    it('to swap back in the account page should display Swap Wizard when clicked', () => {
      Tab.balances();
      MigrationWizardModal
        .openFrom(swapBtnInAccount)
        .headerIs(ViewHeaders.swapDai);
    });

    it('in the market page should display Migration Wizard when clicked', () => {
      TradingPairDropdown.select(saiMarket);
      MigrationWizardModal
        .openFrom(migrationBtnInMarket)
        .headerIs(ViewHeaders.updateSai);
    });
  });
});
