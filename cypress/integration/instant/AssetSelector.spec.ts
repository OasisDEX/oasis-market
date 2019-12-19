import { Tab } from '../../pages/Tab';
import { instantForm, Trade, TradingSide } from '../../pages/Trade';
import { WalletConnection } from '../../pages/WalletConnection';
import { cypressVisitWithWeb3 } from '../../utils';

describe('Selecting an asset', () => {

  beforeEach(() => {
    cypressVisitWithWeb3();
    WalletConnection.connect();
    WalletConnection.isConnected();
    Tab.instant();
    instantForm();
  });

  context('for pay token', () => {
    const defaultTokens = () => {
      const trade = new Trade();
      trade.sell('ETH');
      trade.buy('DAI');

      trade.expectPayToken('ETH');
      trade.expectReceiveToken('DAI');
    };

    beforeEach(() => {
      defaultTokens();
    });

    it('should replace only the deposit token', () => {
      const payIn = 'WETH';
      const receiveIn = 'DAI';

      const trade = new Trade();
      trade.sell(payIn);

      trade.expectPayToken(payIn);
      trade.expectReceiveToken(receiveIn);
    });

    // tslint:disable-next-line:max-line-length
    it('should not be able to select receive token that do not form a market with the deposit one', () => {
      // change from BAT because we introduced WETH markets so BAT/WETH or BAT/ETH is available
      const token = 'USDC';

      Trade.openAssetSelectorFor(TradingSide.BUY);

      Trade.expectAssetLocked(token);
    });

    it('should not be able to select current receive token',  () => {
      const token = 'DAI';

      Trade.openAssetSelectorFor(TradingSide.SELL);

      Trade.expectAssetLocked(token);
    });

    it('should not be able to swap token if paying with SAI', () => {
      const payIn = 'SAI';
      const receiveIn = 'ETH';

      Trade.swapTokens();

      const trade = new Trade();
      trade.sell(payIn);
      trade.buy(receiveIn);

      trade.expectPayToken(payIn);
      trade.expectReceiveToken(receiveIn);

      Trade.shouldHaveSwapDisabled();
    });
  });

  context('for receive token', () => {
    const defaultTokens = () => {
      const trade = new Trade();
      // This assume that initial state was
      // ETH - DEPOSIT TOKEN
      // DAI - RECEIVE TOKEN
      Trade.swapTokens();

      trade.expectPayToken('DAI');
      trade.expectReceiveToken('ETH');
    };

    beforeEach(() => {
      defaultTokens();
    });

    it('should replace only the receive token', () => {
      const payWith = 'DAI';
      const receiveIn = 'REP';

      const trade = new Trade();
      trade.buy(receiveIn);

      trade.expectPayToken(payWith);
      trade.expectReceiveToken(receiveIn);
    });

    // tslint:disable-next-line:max-line-length
    it('should not be able to select deposit token that do not form a market with the receive one ', () => {
      const token = 'BAT';

      const trade = new Trade();
      trade.buy('ZRX');

      Trade.openAssetSelectorFor(TradingSide.SELL);
      Trade.expectAssetLocked(token);
    });

    it('should not be able to select current deposit token', () => {
      const token = 'DAI';

      Trade.openAssetSelectorFor(TradingSide.BUY);

      Trade.expectAssetLocked(token);
    });

    it('should not be able to select SAI as receive token', () => {
      const payWith = 'REP';
      const receive = 'SAI';

      const trade = new Trade();
      trade.sell(payWith);

      Trade.openAssetSelectorFor(TradingSide.BUY);
      Trade.expectAssetLocked(receive);
    });
  });
});
