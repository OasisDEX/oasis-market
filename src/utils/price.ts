import { BigNumber } from 'bignumber.js';
import { eth2weth } from '../blockchain/calls/instant';

export function daiOrSAI(token: string) {
  return token === 'SAI' || token === 'DAI';
}

export const calculateTradePrice = (
  sellToken: string,
  sellAmount: BigNumber,
  buyToken: string,
  buyAmount: BigNumber,
  formatter ?: (amount: BigNumber, token:string) => string
) => {
  return (
    daiOrSAI(sellToken) || (eth2weth(sellToken) === 'WETH' && !daiOrSAI(buyToken))
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
    daiOrSAI(sellToken) || (eth2weth(sellToken) === 'WETH' && !daiOrSAI(buyToken))
  )
    ? `${buyToken}/${sellToken}`
    : `${sellToken}/${buyToken}`;
};
