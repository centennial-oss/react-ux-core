// Each chart's English defaults, split out of `defaultChartPlotMessages` (plotMessages.ts) so a chart's bundle
// carries only its own strings: it merges them with `useChartMessages(scatterStrings)`.

import type { ChartPlotMessages } from './plotMessages';

/** One chart's strings: the ChartPlotMessages whose names start with `P` ("scatter"). */
export type PlotStrings<P extends string> = Pick<
  ChartPlotMessages,
  Extract<keyof ChartPlotMessages, `${P}${string}`>
>;

/** LatencyChart's strings. */
export const latencyStrings: PlotStrings<'latency'> = {
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
};

/** CandlestickChart's strings. */
export const candleStrings: PlotStrings<'candle'> = {
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
};

/** CategoryChart's waterfall's strings. */
export const waterfallStrings: PlotStrings<'waterfall'> = {
  waterfallStep: 'Step',
  waterfallChange: 'Change',
  waterfallRunningTotal: 'Running total',
  waterfallTotalAfter: ({ total }) => `Running total ${total}`,
  waterfallSummary: ({ start, end, change }) =>
    `Starts at ${start} and ends at ${end} (${change}).`,
  waterfallLargestIncrease: ({ label, value }) => `Largest increase: ${label}, ${value}.`,
  waterfallLargestDecrease: ({ label, value }) => `Largest decrease: ${label}, ${value}.`,
};

/** CategoryChart's funnel's strings. */
export const funnelStrings: PlotStrings<'funnel'> = {
  funnelShares: ({ ofFirst, ofPrevious }) =>
    `${ofFirst} of the first step, ${ofPrevious} of the previous`,
  funnelSummary: ({ count, first, last, share }) =>
    `${String(count)} steps, from ${first} to ${last} (${share} of the first step).`,
  funnelLargestDrop: ({ from, to, share }) =>
    `Largest drop: from ${from} to ${to}, where ${share} continue.`,
  funnelStep: 'Step',
  funnelValue: 'Value',
  funnelOfFirst: 'Of first step',
  funnelOfPrevious: 'Of previous step',
};

/** Treemap's strings. */
export const treemapStrings: PlotStrings<'treemap'> = {
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

/** ScatterChart's strings. */
export const scatterStrings: PlotStrings<'scatter'> = {
  scatterX: 'X',
  scatterY: 'Y',
  scatterSize: 'Size',
  scatterPoint: 'Point',
  scatterSummary: ({ points, series }) =>
    `${points === 1 ? '1 point' : `${String(points)} points`} in ${series === 1 ? '1 series' : `${String(series)} series`}.`,
  scatterSeriesRange: ({ label, xName, xMin, xMax, yName, yMin, yMax }) =>
    `${label}: ${xName} from ${xMin} to ${xMax}, ${yName} from ${yMin} to ${yMax}.`,
  scatterCorrelation: ({ r, value }) => {
    const size = Math.abs(r);
    if (size < 0.1) {
      return `No clear correlation (r = ${value}).`;
    }
    const strength = size >= 0.7 ? 'Strong' : size >= 0.4 ? 'Moderate' : 'Weak';
    return `${strength} ${r > 0 ? 'positive' : 'negative'} correlation (r = ${value}).`;
  },
};

/** BoxPlotChart's strings. */
export const boxStrings: PlotStrings<'box'> = {
  boxMin: 'Minimum',
  boxLowerQuartile: 'Lower quartile',
  boxMedian: 'Median',
  boxUpperQuartile: 'Upper quartile',
  boxMax: 'Maximum',
  boxMean: 'Mean',
  boxOutliers: 'Outliers',
  boxMedianHighLow: ({ label, high, highValue, low, lowValue }) =>
    `${label}: highest median ${high} (${highValue}), lowest median ${low} (${lowValue}).`,
  boxSummaryOne: ({ label, median, min, max }) =>
    `${label}: median ${median}, from ${min} to ${max}.`,
};

/** SankeyChart's strings. */
export const sankeyStrings: PlotStrings<'sankey'> = {
  sankeyFlow: ({ source, target, value }) => `${source} to ${target}: ${value}`,
  sankeyNode: ({ label, value }) => `${label}: ${value}`,
  sankeySummary: ({ nodes, flows, total }) =>
    `${String(nodes)} nodes and ${flows === 1 ? '1 flow' : `${String(flows)} flows`}, ${total} in all.`,
  sankeyLargest: ({ source, target, value }) => `Largest flow: ${source} to ${target}, ${value}.`,
  sankeySource: 'From',
  sankeyTarget: 'To',
  sankeyValue: 'Value',
  sankeyShare: 'Share of source',
};

/** BulletChart's strings. */
export const bulletStrings: PlotStrings<'bullet'> = {
  bulletTarget: ({ target }) => `target ${target}`,
  bulletValue: ({ value, target, range }) =>
    [
      value,
      ...(target === undefined ? [] : [`target ${target}`]),
      ...(range === undefined ? [] : [range]),
    ].join(', '),
};
