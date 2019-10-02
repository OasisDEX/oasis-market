import { BigNumber } from 'bignumber.js';
import { formatPrice } from './formatters/format';

export const calculateTradePrice = (
  sellToken: string,
  sellAmount: BigNumber,
  buyToken: string,
  buyAmount: BigNumber,
  formatter ?: (amount: BigNumber, token:string) => string
) => {
  return (
    sellToken.toLowerCase() === 'dai'
    || (sellToken.toLowerCase() === 'eth' && buyToken.toLowerCase() !== 'dai')
  )
    ?
  {
    price: new BigNumber(formatter
      ? formatter(sellAmount.div(buyAmount), sellToken)
      : formatPrice(sellAmount.div(buyAmount), sellToken)),
    quotation: `${buyToken}/${sellToken}`
  }
    :
  {
    price: new BigNumber(formatter
        ? formatter(buyAmount.div(sellAmount), buyToken)
        : formatPrice(buyAmount.div(sellAmount), buyToken)),
    quotation: `${sellToken}/${buyToken}`
  };
};

export const getQuote = (sellToken: string, buyToken: string) => {
  return (
    sellToken.toLowerCase() === 'dai'
    || (sellToken.toLowerCase() === 'eth' && buyToken.toLowerCase() !== 'dai')
  )
    ? `${buyToken}/${sellToken}`
    : `${sellToken}/${buyToken}`;
};
