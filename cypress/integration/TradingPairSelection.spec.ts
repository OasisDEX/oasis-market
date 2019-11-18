import { Allowance, ALLOWANCE_STATE } from '../pages/Allowance';
import { Order } from '../pages/Order';
import { Orderbook, OrderType } from '../pages/Orderbook';
import { Tab } from '../pages/Tab';
import { TradingPair, TradingPairDropdown, TradingPairInfo } from '../pages/TradingPairDropdown';
import { WalletConnection } from '../pages/WalletConnection';
import { cypressVisitWithWeb3, multiply, tid } from '../utils';
import { makeScreenshots } from '../utils/makeScreenshots';

describe('Trading pair dropdown', () => {
  const quote = 'DAI';

  // TODO: Figure out a way to import files from ./src
  // Right now there is compilation error when test suits are ran
  // It looks like proper webpack-preprocessor configuration but it's not working for some reason
  const tradingPairs = [
    { base: 'WETH', quote: 'DAI' },
    { base: 'REP', quote: 'DAI' },
    { base: 'ZRX', quote: 'DAI' },
    { base: 'BAT', quote: 'DAI' }
  ] as TradingPair[];

  beforeEach(() => {
    cypressVisitWithWeb3();
    WalletConnection.connect();
    WalletConnection.isConnected();
    Tab.market();
  });

  it('should display available markets', () => {
    TradingPairDropdown.expand();

    cy.wait(1000);
    makeScreenshots('trading-pair-picker-open');

    TradingPairDropdown.hasMarkets(tradingPairs);
  });

  it.skip('should display price for a given trading pair in the dropdown', () => {
    const base = 'BAT';
    TradingPairDropdown.expand();

    cy.get(tid(`${base}-${quote}`, tid('price'))).contains('225');
  });

  it('should select different market', () => {
    TradingPairDropdown.expectActivePAir({ quote, base: 'WETH' });
    const base = 'BAT';

    TradingPairDropdown.select({ base, quote });

    TradingPairDropdown.expectActivePAir({ base, quote });
  });

  it('should display balances for selected pair', () => {
    const base = 'REP';
    selectPair(base, quote);

    cy.get(tid('create-order-widget', tid('base-balance'))).contains('1,000.00000 REP');
    cy.get(tid('create-order-widget', tid('quote-balance'))).contains('170.0000 DAI');
  });

  it.skip('should display last price and weekly volume for the newly selected pair', () => {
    // there are two tx and depending on which one went through first
    // the price might be either 300.00 or 300.10
    TradingPairInfo.lastPrice().contains(/300.../);
    TradingPairInfo.dailyVolume().contains('600.10');

    const base = 'REP';

    selectPair(base, quote);

    TradingPairInfo.lastPrice().contains('100.00');
    TradingPairInfo.dailyVolume().contains('200.00');
  });

  it('should display orders in the order book for selected pair', () => {
    const base = 'REP';

    selectPair(base, quote);

    Orderbook.waitToLoad(base, quote);

    const buyOrders = Orderbook.list(OrderType.BUY);
    buyOrders.countIs(3);
    buyOrders.first().amount().should('have.text', '1.00000');
    buyOrders.first().price().should('have.text', '110.0000');
    buyOrders.first().total().should('have.text', '110.0000');

    const sellOrders = Orderbook.list(OrderType.SELL);
    sellOrders.countIs(1);
    sellOrders.first().amount().should('have.text', '1.00000');
    sellOrders.first().price().should('have.text', '150.0000');
    sellOrders.first().total().should('have.text', '150.0000');
  });

  it('should place new buy order for selected pair', () => {
    const base = 'ZRX';

    selectPair(base, quote);

    let sellOrders = Orderbook.list(OrderType.SELL);

    sellOrders.countIs(1);
    sellOrders.first().amount().should('have.text', '1.00000');
    sellOrders.first().price().should('have.text', '140.0000');
    sellOrders.first().total().should('have.text', '140.0000');

    let buyOrders = Orderbook.list(OrderType.BUY);
    buyOrders.countIs(0);

    const amount = '2';
    const price = '70';

    new Order()
      .buy()
      .limit()
      .amount(amount)
      .atPrice(price)
      .total(multiply(amount, price))
      .place();

    sellOrders = Orderbook.list(OrderType.SELL);
    sellOrders.countIs(1);

    buyOrders = Orderbook.list(OrderType.BUY);
    buyOrders.countIs(1);
    buyOrders.first().amount().should('have.text', '2.00000');
    buyOrders.first().price().should('have.text', '70.0000');
    buyOrders.first().total().should('have.text', '140.0000');
  });

  it('should place new sell order for selected pair', () => {
    const base = 'REP';

    setAllowance(base);

    selectPair(base, quote);

    let sellOrders = Orderbook.list(OrderType.SELL);

    sellOrders.countIs(1);
    sellOrders.first().amount().contains('1.00000');
    sellOrders.first().price().should('have.text', '150.0000');
    sellOrders.first().total().should('have.text', '150.0000');

    const amount = '2';
    const price = '160';

    new Order()
      .sell()
      .limit()
      .amount(amount)
      .atPrice(price)
      .total(multiply(amount, price))
      .place();

    sellOrders = Orderbook.list(OrderType.SELL);
    sellOrders.countIs(2);
    sellOrders.first().amount().should('have.text', '2.00000');
    sellOrders.first().price().should('have.text', '160.0000');
    sellOrders.first().total().should('have.text', '320.0000');
  });
});

const setAllowance = (token: string) => {
  Tab.balances();

  const allowance = Allowance.of(token);
  allowance.toggle();
  allowance.shouldBe(ALLOWANCE_STATE.ENABLED);

  Tab.market();
};

const selectPair = (base: string, quote: string) => {
  TradingPairDropdown.select({ base, quote });
  // It needs time to load the orderbook for the newly selected pair
  // otherwise it selects rows for previous orderbook.
  cy.wait(2000);
};
