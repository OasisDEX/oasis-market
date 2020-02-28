import { cypressVisitWithWeb3, multiply } from '../utils/index';

import { Balance } from '../pages/Balance';
import { Order } from '../pages/Order';
import { Orderbook, OrderType } from '../pages/Orderbook';
import { Tab } from '../pages/Tab';
import { Trades } from '../pages/Trades';
import { WalletConnection } from '../pages/WalletConnection';

describe('Buy Order', () => {

  beforeEach(() => {
    cypressVisitWithWeb3();
    WalletConnection.connect();
    WalletConnection.isConnected();
  });

  it('should place a new order', () => {
    const price = '280';
    const amount = '1';

    const orders = Orderbook.list(OrderType.BUY);
    orders.countIs(3);

    new Order()
      .buy()
      .limit()
      .amount(amount)
      .atPrice(price)
      .total(multiply(amount, price))
      .place();

    orders.countIs(4);
    const lastOrder = orders.first();

    lastOrder.price().contains(new RegExp(`${price}...`));
    lastOrder.amount().contains(new RegExp(`${amount}...`));
    lastOrder.total().contains(/280../);
  });

  it('should place a new order which is not the best one', () => {
    const price = '270';
    const amount = '1.5';

    const orders = Orderbook.list(OrderType.BUY);
    orders.countIs(3);

    new Order()
      .buy()
      .limit()
      .amount(amount)
      .atPrice(price)
      .total(multiply(amount, price))
      .place();

    orders.countIs(4);
    const lastOrder = orders.number(3);

    lastOrder.price().contains(new RegExp(`${price}...`));
    lastOrder.amount().contains(new RegExp(`${amount}...`));
    lastOrder.total().contains(/405.../);
  });

  it('should fill first sell order', () => {
    const price = '301';
    const amount = '4.5';

    const sellOrders = Orderbook.list(OrderType.SELL);
    sellOrders.countIs(4);

    const buyOrders = Orderbook.list(OrderType.BUY);
    buyOrders.countIs(3);

    new Order()
      .buy()
      .limit()
      .amount(amount)
      .atPrice(price)
      .total(/1,354\.5000.../)
      .place();

    sellOrders.countIs(3);
    buyOrders.countIs(3);

    Tab.balances();

    Balance.of('DAI').shouldBe('7,815.5000');
  });

  it('should fill first buy order and place a new sell order with remainings', () => {
    const price = '301';
    const amount = '4.7';

    const buyOrders = Orderbook.list(OrderType.BUY);
    buyOrders.countIs(3);

    const sellOrders = Orderbook.list(OrderType.SELL);
    sellOrders.countIs(4);

    new Order()
      .buy()
      .limit()
      .amount(amount)
      .atPrice(price)
      .total(/1,414\.7000.../)
      .place();

    buyOrders.countIs(4);
    sellOrders.countIs(3);

    const lastOrder = buyOrders.first();

    lastOrder.price().contains(new RegExp(`${price}...`));
    lastOrder.amount().contains('0.19999');
    lastOrder.total().contains('60.1999');
  });

  it('should fill first sell order completely and second sell order partially', () => {
    const price = '302';
    const amount = '4.7';

    const buyOrders = Orderbook.list(OrderType.BUY);
    buyOrders.countIs(3);

    const sellOrders = Orderbook.list(OrderType.SELL);
    sellOrders.countIs(4);

    new Order()
      .buy()
      .limit()
      .amount(amount)
      .atPrice(price)
      .total(/1,419\.4000.../)
      .place();

    buyOrders.countIs(3);
    sellOrders.countIs(3);

    const lastOrder = sellOrders.last();
    lastOrder.price().contains('302');
    lastOrder.amount().contains('0.8');
    lastOrder.total().contains('241.60');
  });

  it('should be displayed in my trades panel', () => {
    const price = '280';
    const amount = '1';

    Trades.countIs(2);

    new Order()
      .buy()
      .limit()
      .amount(amount)
      .atPrice(price)
      .total(multiply(amount, price))
      .place();

    Trades.countIs(3);
    Orderbook.list(OrderType.BUY).countIs(4);

    const trade = Trades.first();
    trade.type().contains('buy');
    trade.price().contains(price);
    trade.amount().contains(amount);
    trade.total().contains('280');
  });

  it('should cancel a placed order', () => {
    const price = '280';
    const amount = '1';

    Trades.countIs(2);

    new Order()
      .buy()
      .limit()
      .amount(amount)
      .atPrice(price)
      .total(multiply(amount, price))
      .place();

    Trades.countIs(3);
    const trade = Trades.first();
    trade.cancel();

    Trades.countIs(2);
  });
});
