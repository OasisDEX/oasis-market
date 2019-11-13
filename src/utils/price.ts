import { BigNumber } from 'bignumber.js';
import { eth2weth } from '../blockchain/calls/instant';
import { sai2dai } from '../instant/instantForm';

export const calculateTradePrice = (
  sellToken: string,
  sellAmount: BigNumber,
  buyToken: string,
  buyAmount: BigNumber,
  formatter ?: (amount: BigNumber, token:string) => string
) => {
  return (
    sai2dai(sellToken) === 'DAI'
    || (eth2weth(sellToken) === 'WETH' && sai2dai(buyToken) !== 'DAI')
  )
    ?
  {
    price: new BigNumber(formatter
      ? formatter(sellAmount.div(buyAmount), sellToken)
      : sellAmount.div(buyAmount)),
    quotation: `${buyToken}/${sellToken}`
  }
    :
  {
    price: new BigNumber(formatter
        ? formatter(buyAmount.div(sellAmount), buyToken)
        : buyAmount.div(sellAmount)),
    quotation: `${sellToken}/${buyToken}`
  };
};

export const getQuote = (sellToken: string, buyToken: string) => {
  return (
    sai2dai(sellToken) === 'DAI'
    || (eth2weth(sellToken) === 'WETH' && sai2dai(buyToken) !== 'DAI')
  )
    ? `${buyToken}/${sellToken}`
    : `${sellToken}/${buyToken}`;
};
