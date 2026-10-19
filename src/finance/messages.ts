// English defaults of the finance entry point's strings: OrderBook, DepthChart, TradeTicket and ProbabilityBar.
import type { CommonMessages } from '../provider/coreStrings';
import { useEntryMessages } from '../provider/context';

/** Strings for `/finance`. */
export interface FinanceMessages {
  // OrderBook
  /** The order book table's accessible name (its caption). */
  orderBookLabel: string;
  /** The price column's header; `currency` is the quote currency when the app gives one. */
  orderBookPrice: (params: { currency?: string }) => string;
  /** The size column's header. */
  orderBookSize: string;
  /** The cumulative size column's header. */
  orderBookTotal: string;
  /** Names an ask level for screen readers, and its button when levels can be pressed ("Ask 101.25"). */
  orderBookAskAt: (params: { price: string }) => string;
  /** Names a bid level for screen readers, and its button when levels can be pressed ("Bid 101.20"). */
  orderBookBidAt: (params: { price: string }) => string;
  /** The spread row's header. */
  orderBookSpread: string;
  /** The spread row's value: the spread and the mid price. */
  orderBookSpreadValue: (params: { spread: string; mid: string }) => string;
  /** Shown in place of the asks when there are none. */
  orderBookNoAsks: string;
  /** Shown in place of the bids when there are none. */
  orderBookNoBids: string;
  /** The price grouping (tick size) select's label. */
  orderBookGrouping: string;
  /** The button that reads the best prices aloud. */
  orderBookReadBest: string;
  /** What that button announces. Missing prices are given as `none` (see `orderBookNone`). */
  orderBookBestPrices: (params: { bid: string; ask: string; spread: string }) => string;
  /** A best price or spread that doesn't exist (an empty side). */
  orderBookNone: string;
  /** Marks a level that holds the user's own orders (also shown as a dot). */
  orderBookOwnOrder: string;
  /** Read after a size that just grew (shown as ▲). */
  orderBookSizeUp: string;
  /** Read after a size that just shrank (shown as ▼). */
  orderBookSizeDown: string;

  // DepthChart
  /** The button that switches the depth chart to a table and back. */
  depthChartViewAsTable: string;
  /** The bid side's summary. */
  depthChartBidsSummary: (params: {
    count: number;
    from: string;
    to: string;
    total: string;
  }) => string;
  /** The ask side's summary. */
  depthChartAsksSummary: (params: {
    count: number;
    from: string;
    to: string;
    total: string;
  }) => string;
  /** The mid price, in the summary and on the chart. */
  depthChartMid: (params: { price: string }) => string;
  /** The table view's side column header. */
  depthChartSide: string;
  /** The table view's cumulative size column header. */
  depthChartCumulative: string;
  /** A bid row's side in the table view. */
  depthChartBid: string;
  /** An ask row's side in the table view. */
  depthChartAsk: string;
  /** Labels the bid area on the chart. */
  depthChartBids: string;
  /** Labels the ask area on the chart. */
  depthChartAsks: string;

  // TradeTicket
  /** The ticket's accessible name, when the app doesn't give one. */
  tradeTicketLabel: string;
  /** The side radio group's label. */
  tradeSide: string;
  tradeBuy: string;
  tradeSell: string;
  /** A binary side with its price ("Yes 62¢" style; `price` is formatted money). */
  tradeSideWithPrice: (params: { side: string; price: string }) => string;
  /** The order type radio group's label. */
  tradeOrderType: string;
  tradeMarket: string;
  tradeLimit: string;
  /** The limit price field's label. */
  tradeLimitPrice: string;
  /** The amount-to-spend field's label. */
  tradeAmount: string;
  /** The quantity field's label (exchanges). */
  tradeQuantity: string;
  /** The quantity field's label (binary markets). */
  tradeShares: string;
  /** Switches the ticket to entering a quantity. */
  tradeEnterQuantity: string;
  /** Switches the ticket to entering an amount. */
  tradeEnterAmount: string;
  /** The best bid in the quote line. */
  tradeBestBid: string;
  /** The best ask in the quote line. */
  tradeBestAsk: string;
  /** The last traded price in the quote line. */
  tradeLast: string;
  /** The balance line's label. */
  tradeBalance: string;
  /** The estimate block's heading. */
  tradeEstimate: string;
  tradeAveragePrice: string;
  /** The estimated cost (buying). */
  tradeCost: string;
  /** The estimated proceeds (selling). */
  tradeProceeds: string;
  tradeFees: string;
  /** What a binary position pays if it's right. */
  tradePayout: string;
  /** The return if right, as a percentage. */
  tradeReturn: string;
  tradeSlippage: string;
  /** Announced (debounced) when the estimate changes. */
  tradeEstimateAnnouncement: (params: { quantity: string; cost: string }) => string;
  /** Announced after the estimate, for binary markets. */
  tradePayoutAnnouncement: (params: { payout: string; returnPct: string }) => string;
  /** The submit button, which opens the confirmation. */
  tradeReview: string;
  /** The confirmation's title. */
  tradeConfirmTitle: string;
  /** The confirmation's confirm button. */
  tradePlaceOrder: string;
  /** Shown in the confirmation of an order at or over `confirmThreshold`. */
  tradeLargeOrder: (params: { threshold: string }) => string;
  /** The limit price of a market order, in the confirmation. */
  tradeAtMarket: string;
  /** Shown when Review is pressed without an amount. */
  tradeAmountRequired: string;
  /** Shown when Review is pressed without a quantity. */
  tradeQuantityRequired: string;
  /** Shown when Review is pressed on a limit order without a price. */
  tradePriceRequired: string;

  // ProbabilityBar
  /** One side of the bar: its label and percentage ("Yes 62%"). */
  probabilityValue: (params: { label: string; percent: string }) => string;
}

export const defaultFinanceMessages: FinanceMessages = {
  orderBookLabel: 'Order book',
  orderBookPrice: ({ currency }) => (currency === undefined ? 'Price' : `Price (${currency})`),
  orderBookSize: 'Size',
  orderBookTotal: 'Total',
  orderBookAskAt: ({ price }) => `Ask ${price}`,
  orderBookBidAt: ({ price }) => `Bid ${price}`,
  orderBookSpread: 'Spread',
  orderBookSpreadValue: ({ spread, mid }) => `${spread} · Mid ${mid}`,
  orderBookNoAsks: 'No asks',
  orderBookNoBids: 'No bids',
  orderBookGrouping: 'Grouping',
  orderBookReadBest: 'Read best prices',
  orderBookBestPrices: ({ bid, ask, spread }) =>
    `Best bid ${bid}, best ask ${ask}, spread ${spread}.`,
  orderBookNone: 'none',
  orderBookOwnOrder: 'Your order',
  orderBookSizeUp: 'up',
  orderBookSizeDown: 'down',

  depthChartViewAsTable: 'View as table',
  depthChartBidsSummary: ({ count, from, to, total }) =>
    `Bids: ${count === 1 ? '1 level' : `${count} levels`} from ${from} to ${to}, ${total} in total.`,
  depthChartAsksSummary: ({ count, from, to, total }) =>
    `Asks: ${count === 1 ? '1 level' : `${count} levels`} from ${from} to ${to}, ${total} in total.`,
  depthChartMid: ({ price }) => `Mid ${price}`,
  depthChartSide: 'Side',
  depthChartCumulative: 'Cumulative size',
  depthChartBid: 'Bid',
  depthChartAsk: 'Ask',
  depthChartBids: 'Bids',
  depthChartAsks: 'Asks',

  tradeTicketLabel: 'Order ticket',
  tradeSide: 'Side',
  tradeBuy: 'Buy',
  tradeSell: 'Sell',
  tradeSideWithPrice: ({ side, price }) => `${side} ${price}`,
  tradeOrderType: 'Order type',
  tradeMarket: 'Market',
  tradeLimit: 'Limit',
  tradeLimitPrice: 'Limit price',
  tradeAmount: 'Amount',
  tradeQuantity: 'Quantity',
  tradeShares: 'Shares',
  tradeEnterQuantity: 'Enter a quantity instead',
  tradeEnterAmount: 'Enter an amount instead',
  tradeBestBid: 'Bid',
  tradeBestAsk: 'Ask',
  tradeLast: 'Last',
  tradeBalance: 'Available',
  tradeEstimate: 'Estimate',
  tradeAveragePrice: 'Average price',
  tradeCost: 'Cost',
  tradeProceeds: 'Proceeds',
  tradeFees: 'Fees',
  tradePayout: 'Payout if right',
  tradeReturn: 'Return',
  tradeSlippage: 'Slippage',
  tradeEstimateAnnouncement: ({ quantity, cost }) => `Estimate: ${quantity} for ${cost}.`,
  tradePayoutAnnouncement: ({ payout, returnPct }) =>
    `Pays ${payout} if right, a ${returnPct} return.`,
  tradeReview: 'Review order',
  tradeConfirmTitle: 'Confirm your order',
  tradePlaceOrder: 'Place order',
  tradeLargeOrder: ({ threshold }) => `This order is ${threshold} or more.`,
  tradeAtMarket: 'Market price',
  tradeAmountRequired: 'Enter an amount',
  tradeQuantityRequired: 'Enter a quantity',
  tradePriceRequired: 'Enter a limit price',

  probabilityValue: ({ label, percent }) => `${label} ${percent}`,
};

/** The strings `/finance` components read: the core strings and `/finance`'s own. */
export type FinanceStrings = CommonMessages & FinanceMessages;

/** `/finance`'s strings, with the app's overrides from `UIProvider`. */
export function useFinanceMessages(): FinanceStrings {
  return useEntryMessages(defaultFinanceMessages);
}
