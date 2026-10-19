/** PriceTicker's and TickerTape's strings. Numbers arrive already formatted. */
export interface PriceTickerMessages {
  /** The change against the reference, such as "1.20 (0.85%)". The direction is said separately. */
  priceTickerChange: (params: { amount: string; percent: string }) => string;
  /** Marks a value whose feed has stopped updating. */
  priceTickerStale: string;
  /** When a stale value last updated, such as "Last update 14:05:09". */
  priceTickerUpdatedAt: (params: { time: string }) => string;
  /** Announced when the value moves past `announceThreshold`, such as "Viewers 12,480, Up 310 (2.5%)". */
  priceTickerAnnouncement: (params: { label: string; value: string; change: string }) => string;
  /** The name of TickerTape's toggle that stops the scrolling. */
  tickerTapePause: string;
}

export const defaultPriceTickerMessages: PriceTickerMessages = {
  priceTickerChange: ({ amount, percent }) => `${amount} (${percent})`,
  priceTickerStale: 'Stale',
  priceTickerUpdatedAt: ({ time }) => `Last update ${time}`,
  priceTickerAnnouncement: ({ label, value, change }) =>
    change === '' ? `${label} ${value}` : `${label} ${value}, ${change}`,
  tickerTapePause: 'Pause scrolling',
};
