import { BigNumber } from 'bignumber.js';
import { isEmpty, uniqBy, unzip } from 'lodash';
import { bindNodeCallback, combineLatest, Observable, of, zip } from 'rxjs';
import { expand, map, reduce, retryWhen, scan, shareReplay, switchMap } from 'rxjs/operators';
import { NetworkConfig } from '../../blockchain/config';
import { amountFromWei } from '../../blockchain/utils';
import { TradingPair } from '../tradingPair/tradingPair';

export enum OfferType {
  buy = 'buy',
  sell = 'sell',
}

export interface Offer {
  offerId: BigNumber;
  baseAmount: BigNumber;
  baseToken: string;
  quoteAmount: BigNumber;
  quoteToken: string;
  price: BigNumber;
  ownerId: string;
  timestamp: Date;
  type: OfferType;
}

export interface Orderbook {
  tradingPair: TradingPair;
  blockNumber: number;
  sell: Offer[];
  spread?: BigNumber;
  spreadPercentage?: BigNumber;
  buy: Offer[];
}

class InconsistentLoadingError extends Error {
}

function parseOffers(sellToken: string, buyToken: string, type: OfferType, firstPage: boolean) {
  return (data: any[][]): { lastOfferId: BigNumber, offers: Offer[] } => {
    if (!firstPage && data[0][0].isZero()) {
      throw new InconsistentLoadingError('empty orderbook page loaded');
    }
    return {
      lastOfferId: data[0][data[0].length - 1] as BigNumber,
      offers: unzip(data)
        .filter(([id]) => !(id as BigNumber).eq(0))
        .map(([offerId, sellAmt, buyAmt, ownerId, timestamp]) => {
          const sellAmount = amountFromWei(sellAmt as BigNumber, sellToken);
          const buyAmount = amountFromWei(buyAmt as BigNumber, buyToken);
          return {
            ...type === 'sell' ?
              {
                price: buyAmount.div(sellAmount),
                baseAmount: sellAmount,
                baseToken: sellToken,
                quoteAmount: buyAmount,
                quoteToken: buyToken,
              } :
              {
                price: sellAmount.div(buyAmount),
                baseAmount: buyAmount,
                baseToken: buyToken,
                quoteAmount: sellAmount,
                quoteToken: sellToken,
              }, ...{
                type,
                offerId: offerId as BigNumber,
                ownerId: ownerId as string,
                timestamp: new Date(1000 * (timestamp as BigNumber).toNumber())
              }
          } as Offer;
        })
    };
  };
}

type GetOffersFirst = (
  address: string, sellToken: string, buyToken: string,
  callback: (err: any, r: any) => any
) => any;

type GetOffersNext = (
  address: string, lastOfferId: string,
  callback: (err: any, r: any) => any
) => any;

function loadOffersAllAtOnce(
  context: NetworkConfig,
  sellToken: string,
  buyToken: string,
  type: OfferType
): Observable<Offer[]> {
  return bindNodeCallback(
    context.otcSupportMethods.contract.getOffers as GetOffersFirst
  )(
    context.otc.address,
    context.tokens[sellToken].address,
    context.tokens[buyToken].address
  ).pipe(
    map(parseOffers(sellToken, buyToken, type, true)),
    expand(({ lastOfferId }) => lastOfferId.isZero() ?
      of() :
      bindNodeCallback(
        context.otcSupportMethods.contract.getOffers['address,uint256'] as GetOffersNext
      )(
        context.otc.address,
        lastOfferId.toString(),
      ).pipe(
        map(parseOffers(sellToken, buyToken, type, false)),
      )
    ),
    retryWhen((errors) => errors.pipe(
      switchMap((e) => {
        if (e instanceof InconsistentLoadingError) {
          console.log(e.message);
          return errors;
        }
        throw e;
      }),
    )),
    reduce<{ offers: Offer[] }, Offer[]>((result, { offers }) => result.concat(offers), []),
    map(offers => uniqBy(offers, ({ offerId }) => offerId.toString())),
  );
}

export function loadOrderbook$(
  context$: Observable<NetworkConfig>,
  onEveryBlock$: Observable<number>,
  tradingPair: TradingPair
): Observable<Orderbook> {
  return combineLatest(context$, onEveryBlock$).pipe(
    switchMap(([context, blockNumber]) =>
      zip(
        loadOffersAllAtOnce(context, tradingPair.quote, tradingPair.base, OfferType.buy),
        loadOffersAllAtOnce(context, tradingPair.base, tradingPair.quote, OfferType.sell)
      ).pipe(
        map(hideDusts),
        map(([buy, sell]) => ({
          blockNumber,
          buy,
          sell
        })),
      )
    ),
    scan(
      ({ buy: prevBuy, sell: prevSell }, current) => ({ prevBuy, prevSell, ...current }),
      {
        blockNumber: 0,
        buy: [], sell: [],
        prevBuy: [] as Offer[], prevSell: [] as Offer[]
      }
    ),
    map(({ blockNumber, buy, sell, prevBuy, prevSell }) => ({
      blockNumber,
      buy: buy.length > 0 || buy.length === 0 && prevBuy.length === 0 ? buy : prevBuy,
      sell: sell.length > 0 || sell.length === 0 && prevSell.length === 0 ? sell : prevSell,
    })),
    map(({ blockNumber, buy, sell }) => {
      // console.log('corrected orderbook length for block:', blockNumber, buy.length, sell.length);

      return addSpread({
        tradingPair,
        blockNumber,
        buy,
        sell
      });
    }),
    shareReplay(1),
  );
}

export function addSpread({ buy, sell, ...rest }: Orderbook) {
  if (!isEmpty(sell) && !isEmpty(buy)) {
    const spread =  sell[0].price.minus(buy[0].price);
    const midPrice = sell[0].price.plus(buy[0].price).div(2);
    const spreadPercentage =  spread.div(midPrice);
    return {
      buy,
      sell,
      ...rest,
      spread,
      spreadPercentage
    };
  }
  return {
    buy,
    sell,
    ...rest,
  };
}

const DUST_ORDER_THRESHOLD = '0.000000000001'; // 10^15

function isDustOrder(o: Offer): boolean {
  return o.quoteAmount.lt(DUST_ORDER_THRESHOLD) || o.baseAmount.lt(DUST_ORDER_THRESHOLD);
}

function hideDusts(dusts: Offer[][]): Offer[][] {
  return dusts.map(offers => offers.filter((o) => !isDustOrder(o)));
}
