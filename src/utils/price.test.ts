import { BigNumber } from 'bignumber.js';
import { formatPrice, formatPriceInstant } from './formatters/format';
import { calculateTradePrice } from './price';

test('(BUYING) DAI should be used as quote if both tokens are DAI and ETH', () => {
  const sell = new BigNumber(20);
  const buy = new BigNumber(5);
  const sellToken = 'ETH';
  const buyToken = 'DAI';

  const { price, quotation } = calculateTradePrice(sellToken, sell, buyToken, buy);

  expect(price).toEqual(new BigNumber(0.25));
  expect(quotation).toEqual('ETH/DAI');
});

test('(SELLING) DAI should be used as quote if both tokens are DAI and ETH', () => {
  const sell = new BigNumber(20);
  const buy = new BigNumber(5);
  const sellToken = 'DAI';
  const buyToken = 'ETH';

  const { price, quotation } = calculateTradePrice(sellToken, sell, buyToken, buy);

  expect(price).toEqual(new BigNumber(4));
  expect(quotation).toEqual('ETH/DAI');
});

test('(BUYING) ETH should be used as quote if DAI is not presented', () => {
  const sell = new BigNumber(20);
  const buy = new BigNumber(5);
  const sellToken = 'MKR';
  const buyToken = 'ETH';

  const { price, quotation } = calculateTradePrice(sellToken, sell, buyToken, buy);

  expect(price).toEqual(new BigNumber(0.25));
  expect(quotation).toEqual('MKR/ETH');
});

test('(SELLING) ETH should be used as quote if DAI is not presented', () => {
  const sell = new BigNumber(20);
  const buy = new BigNumber(5);
  const sellToken = 'ETH';
  const buyToken = 'MKR';

  const { price, quotation } = calculateTradePrice(sellToken, sell, buyToken, buy);

  expect(price).toEqual(new BigNumber(4));
  expect(quotation).toEqual('MKR/ETH');
});

test('using formatter that rounds up to 2 digits', () => {
  const sell = new BigNumber(19.1010);
  const buy = new BigNumber(4);
  const sellToken = 'DAI';
  const buyToken = 'ETH';

  const { price, quotation } = calculateTradePrice(
    sellToken,
    sell,
    buyToken,
    buy,
    formatPriceInstant
  );

  expect(price).toEqual(new BigNumber(4.78));
  expect(quotation).toEqual('ETH/DAI');
});

test('using formatter that rounds up to 4 digits', () => {
  const sell = new BigNumber(19.1010);
  const buy = new BigNumber(4);
  const sellToken = 'DAI';
  const buyToken = 'ETH';

  const { price, quotation } = calculateTradePrice(sellToken, sell, buyToken, buy, formatPrice);

  expect(price).toEqual(new BigNumber(4.7753));
  expect(quotation).toEqual('ETH/DAI');
});
