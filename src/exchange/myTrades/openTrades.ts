import { find } from 'lodash';
import { combineLatest, Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import { BigNumber } from 'bignumber.js';
import { Error } from 'tslint/lib/error';
import { TxMetaKind } from '../../blockchain/calls/txMeta';
import { tradingPairs } from '../../blockchain/config';
import {
  TxState,
  TxStatus
} from '../../blockchain/transactions';
import { Omit } from '../../utils/omit';
import { Offer, OfferType, Orderbook } from '../orderbook/orderbook';
import { compareTrades, Trade, TradeRole } from '../trades';
import { TradingPair } from '../tradingPair/tradingPair';

export enum TradeStatus {
  beingCancelled = 'beingCancelled',
  beingCreated = 'beingCreated'
}

export type TradeWithStatus = Trade & {
  status?: TradeStatus
};

function txnInProgress(txn: TxState): boolean {
  return ![TxStatus.CancelledByTheUser, TxStatus.Error, TxStatus.Failure].includes(txn.status);
}

function txnMetaOfKind(metaKind: TxMetaKind): (txn: TxState) => boolean {
  return (txn: TxState) => txn.meta.kind === metaKind;
}

function txnEarlierThan(txn: TxState, blockNumber: number) {
  if (txn.status === TxStatus.Success || txn.status === TxStatus.Failure) {
    return txn.blockNumber > blockNumber;
  }

  return true;
}

function txnPerOrderbook(txn: TxState, pair?: TradingPair) {
  const { buyToken, sellToken } = txn.meta.args;

  if (!pair) {
    return txn;
  }

  return (buyToken === pair.quote || buyToken === pair.base)
    && (sellToken === pair.base || sellToken === pair.quote);
}

function isBeingCancelled(offer: Offer, transactions: TxState[]): boolean {
  return !!find(transactions, (t: TxState) =>
    t.meta.kind === TxMetaKind.cancel &&
    t.meta.args.offerId.eq(offer.offerId) &&
    txnInProgress(t)
  );
}

function txnToTrade(txn: TxState): TradeWithStatus {

  if (txn.meta.kind !== TxMetaKind.offerMake) {
    throw new Error('Should not get here!');
  }

  const baseAmount = txn.meta.args.baseAmount ||
    (txn.meta.args.kind === OfferType.buy ? txn.meta.args.buyAmount : txn.meta.args.sellAmount);
  const baseToken = txn.meta.args.baseToken ||
    (txn.meta.args.kind === OfferType.buy ? txn.meta.args.buyToken : txn.meta.args.sellToken);
  const quoteAmount = txn.meta.args.quoteAmount ||
    (txn.meta.args.kind === OfferType.sell ? txn.meta.args.buyAmount : txn.meta.args.sellAmount);
  const quoteToken = txn.meta.args.quoteToken ||
    (txn.meta.args.kind === OfferType.sell ? txn.meta.args.buyToken : txn.meta.args.sellToken);

  return {
    baseAmount,
    baseToken,
    quoteAmount,
    quoteToken,
    status: TradeStatus.beingCreated,
    offerId: new BigNumber(-1),
    act: txn.meta.args.kind,
    kind: txn.meta.args.kind,
    role: 'maker' as TradeRole,
    price: quoteAmount.div(baseAmount),
    block: -1,
    time: new Date(),
    ownerId: 1
  } as TradeWithStatus;
}

function offerToTrade(tnxs: TxState[]): (offer: Offer) => TradeWithStatus {
  return offer => ({
    status: isBeingCancelled(offer, tnxs) ? TradeStatus.beingCancelled : undefined,
    offerId: offer.offerId,
    act: offer.type,
    kind: offer.type,
    role: 'maker' as TradeRole,
    baseAmount: offer.baseAmount,
    baseToken: offer.baseToken,
    quoteAmount: offer.quoteAmount,
    quoteToken: offer.quoteToken,
    price: offer.price,
    block: -1,
    time: offer.timestamp
  });
}

export function createMyOpenTrades$(
  orderbook$: Observable<Omit<Orderbook, 'tradingPair'>>,
  account$: Observable<string | undefined>,
  transactions$: Observable<TxState[]>,
  // the usage with memoizeTradingPair just killed my enthusiasm to figure out how to remove it
  tradingPair?: TradingPair,
): Observable<TradeWithStatus[]> {
  return combineLatest(orderbook$, account$, transactions$).pipe(
    map(([orderbook, account, txns]) => {
      const myOffer = (o: Offer) => o.ownerId === account;
      console.log(tradingPair);
      return txns
        .filter(txn =>
          txnPerOrderbook(txn, tradingPair) &&
          txnMetaOfKind(TxMetaKind.offerMake)(txn) &&
          txnInProgress(txn) &&
          txnEarlierThan(txn, orderbook.blockNumber))
        .map(txnToTrade)
        .concat(
          orderbook.buy.filter(myOffer)
            .concat(orderbook.sell.filter(myOffer))
            .map(offerToTrade(txns))
        )
        .sort(compareTrades);
    }),
    shareReplay(1),
  );
}

export function aggregateMyOpenTradesFor$(
  market: 'SAI' | 'DAI' | 'WETH',
  account$: Observable<string | undefined>,
  txns$: Observable<TxState[]>,
  loadOrderbook: (pair: TradingPair) => Observable<Orderbook>
) {
  const aggregatedOrderbook = combineLatest(...tradingPairs
    .filter(pair => pair.quote === market)
    .map(pair => loadOrderbook(pair))
  )
    .pipe(
      map((orderbooks) => {
        const orderbook = {
          buy: [] as Offer[],
          sell: [] as Offer[],
          blockNumber: 0,
        };

        return orderbooks.reduce(
          (aggregate, currentOrderbook) => {
            aggregate.buy = [...aggregate.buy, ...currentOrderbook.buy];
            aggregate.sell = [...aggregate.sell, ...currentOrderbook.sell];
            // the blockNumber is the same for all of them
            aggregate.blockNumber = currentOrderbook.blockNumber;
            return aggregate;
          },
          orderbook
        );
      }));

  return createMyOpenTrades$(aggregatedOrderbook, account$, txns$);
}
