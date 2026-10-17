// English defaults of `/chart`'s strings for LatencyChart (FR-044), CandlestickChart (FR-052), CategoryChart's
// waterfall (FR-055) and Treemap (FR-056). They merge into `useChartMessages()`, so apps override them through
// `UIProvider`'s `messages` like any other chart string.

/** Strings for latency, candlestick, waterfall and treemap charts. */
export interface ChartPlotMessages {
  /** A percentile's legend label when the chart has several series ("Europe p95"). */
  latencyPercentileOf: (values: { label: string; percentile: string }) => string;
  /** The start of a latency chart's summary. */
  latencySummary: (values: { start: string; end: string }) => string;
  /** The objective's line label ("p95 objective 300 ms"). */
  latencyObjective: (values: { percentile: string; value: string }) => string;
  /** The objective in the summary, when it was met throughout. */
  latencyObjectiveMet: (values: { percentile: string; value: string }) => string;
  /** The objective in a summary over time, when it was breached. */
  latencyObjectiveBreached: (values: {
    percentile: string;
    value: string;
    count: number;
  }) => string;
  /** The objective in a histogram's summary, when the percentile is over it. */
  latencyObjectiveMissed: (values: { percentile: string; value: string; actual: string }) => string;
  /** A breach window's event label ("p95 over 300 ms"). */
  latencyBreach: (values: { percentile: string; value: string }) => string;
  /** A breach window's detail. */
  latencyBreachPeak: (values: { value: string }) => string;
  /** The start of a histogram's summary (the count already formatted). */
  latencyHistogramSummary: (values: { count: string; buckets: number }) => string;
  /** One percentile and its value ("p95 240 ms"), joined into a list. */
  latencyPercentileValue: (values: { percentile: string; value: string }) => string;
  /** The percentiles in a histogram's summary. */
  latencyPercentiles: (values: { list: string }) => string;
  /** A bucket's range ("100 to 250 ms"). */
  latencyBucket: (values: { from: string; to: string }) => string;
  /** The open-ended last bucket ("Over 10,000 ms"). */
  latencyBucketOpen: (values: { from: string }) => string;
  /** The histogram's value axis and count column. */
  latencyCount: string;
  /** The histogram's bucket column. */
  latencyBucketColumn: string;
  /** The histogram's share column. */
  latencyShare: string;
  /** The histogram's cumulative share column. */
  latencyCumulative: string;
  /** The histogram's column of the percentiles that fall in each bucket. */
  latencyPercentilesColumn: string;
  /** A bucket's count and share in the tooltip ("42 (3.1%)"). */
  latencyBucketCount: (values: { count: string; share: string }) => string;

  /** The price series' default name. */
  candlePrice: string;
  candleOpen: string;
  candleHigh: string;
  candleLow: string;
  candleClose: string;
  candleVolume: string;
  /** The change from the previous close, in the table and readout. */
  candleChange: string;
  /** Short labels in the crosshair readout. */
  candleOpenShort: string;
  candleHighShort: string;
  candleLowShort: string;
  candleCloseShort: string;
  candleVolumeShort: string;
  /** A candlestick chart's summary of the range. */
  candleSummary: (values: {
    label: string;
    start: string;
    end: string;
    open: string;
    close: string;
    change: string;
    high: string;
    highDate: string;
    low: string;
    lowDate: string;
  }) => string;

  /** The waterfall table's step column. */
  waterfallStep: string;
  /** The waterfall table's change column. */
  waterfallChange: string;
  /** The waterfall table's running total column. */
  waterfallRunningTotal: string;
  /** The running total in a waterfall step's tooltip. */
  waterfallTotalAfter: (values: { total: string }) => string;
  /** The start of a waterfall's summary. */
  waterfallSummary: (values: { start: string; end: string; change: string }) => string;
  waterfallLargestIncrease: (values: { label: string; value: string }) => string;
  waterfallLargestDecrease: (values: { label: string; value: string }) => string;

  /** A treemap rectangle's name ("Compute, 1,200 USD, 12%"). */
  treemapNode: (values: { label: string; value: string; share: string }) => string;
  /** A treemap rectangle's name with its colour value ("Compute, 1,200 USD, 12%, +8%"). */
  treemapNodeWithColor: (values: { name: string; colorValue: string }) => string;
  /** A treemap's summary of the level shown. */
  treemapSummary: (values: { label: string; count: number; total: string }) => string;
  /** The largest item at the level shown. */
  treemapLargest: (values: { label: string; value: string; share: string }) => string;
  /** The drill-down trail's accessible name. */
  treemapLevels: string;
  /** The treemap table's columns. */
  treemapItem: string;
  treemapValue: string;
  treemapShare: string;
  /** The treemap table's colour value column, when the chart has no `colorValueLabel`. */
  treemapColorValue: string;
}

export const defaultChartPlotMessages: ChartPlotMessages = {
  latencyPercentileOf: ({ label, percentile }) => `${label} ${percentile}`,
  latencySummary: ({ start, end }) => `Latency percentiles from ${start} to ${end}.`,
  latencyObjective: ({ percentile, value }) => `${percentile} objective ${value}`,
  latencyObjectiveMet: ({ percentile, value }) =>
    `Objective: ${percentile} at most ${value}, met throughout.`,
  latencyObjectiveBreached: ({ percentile, value, count }) =>
    `Objective: ${percentile} at most ${value}, breached ${count === 1 ? 'once' : `${String(count)} times`}.`,
  latencyObjectiveMissed: ({ percentile, value, actual }) =>
    `Objective: ${percentile} at most ${value}, missed: ${percentile} is ${actual}.`,
  latencyBreach: ({ percentile, value }) => `${percentile} over ${value}`,
  latencyBreachPeak: ({ value }) => `Peak ${value}.`,
  latencyHistogramSummary: ({ count, buckets }) =>
    `${count} observations in ${String(buckets)} buckets.`,
  latencyPercentileValue: ({ percentile, value }) => `${percentile} ${value}`,
  latencyPercentiles: ({ list }) => `Percentiles: ${list}.`,
  latencyBucket: ({ from, to }) => `${from} to ${to}`,
  latencyBucketOpen: ({ from }) => `Over ${from}`,
  latencyCount: 'Count',
  latencyBucketColumn: 'Bucket',
  latencyShare: 'Share',
  latencyCumulative: 'Cumulative',
  latencyPercentilesColumn: 'Percentiles',
  latencyBucketCount: ({ count, share }) => `${count} (${share})`,

  candlePrice: 'Price',
  candleOpen: 'Open',
  candleHigh: 'High',
  candleLow: 'Low',
  candleClose: 'Close',
  candleVolume: 'Volume',
  candleChange: 'Change',
  candleOpenShort: 'O',
  candleHighShort: 'H',
  candleLowShort: 'L',
  candleCloseShort: 'C',
  candleVolumeShort: 'Vol',
  candleSummary: ({ label, start, end, open, close, change, high, highDate, low, lowDate }) =>
    `${label} from ${start} to ${end}: opened at ${open} and closed at ${close} (${change}). High ${high} on ${highDate}, low ${low} on ${lowDate}.`,

  waterfallStep: 'Step',
  waterfallChange: 'Change',
  waterfallRunningTotal: 'Running total',
  waterfallTotalAfter: ({ total }) => `Running total ${total}`,
  waterfallSummary: ({ start, end, change }) =>
    `Starts at ${start} and ends at ${end} (${change}).`,
  waterfallLargestIncrease: ({ label, value }) => `Largest increase: ${label}, ${value}.`,
  waterfallLargestDecrease: ({ label, value }) => `Largest decrease: ${label}, ${value}.`,

  treemapNode: ({ label, value, share }) => `${label}, ${value}, ${share}`,
  treemapNodeWithColor: ({ name, colorValue }) => `${name}, ${colorValue}`,
  treemapSummary: ({ label, count, total }) =>
    `${label}: ${count === 1 ? '1 item' : `${String(count)} items`}, ${total} in all.`,
  treemapLargest: ({ label, value, share }) => `Largest: ${label}, ${value} (${share}).`,
  treemapLevels: 'Levels',
  treemapItem: 'Item',
  treemapValue: 'Value',
  treemapShare: 'Share',
  treemapColorValue: 'Color value',
};
