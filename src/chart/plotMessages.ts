// English defaults of `/chart`'s strings for LatencyChart (FR-044), CandlestickChart (FR-052), CategoryChart's
// waterfall (FR-055) and funnel, Treemap (FR-056), ScatterChart, BoxPlotChart, SankeyChart and BulletChart. Each chart
// merges its own into `useChartMessages()`, so apps override them through `UIProvider`'s `messages` like any other
// chart string.

import {
  boxStrings,
  bulletStrings,
  candleStrings,
  funnelStrings,
  latencyStrings,
  sankeyStrings,
  scatterStrings,
  treemapStrings,
  waterfallStrings,
} from './plotStrings';

/** Strings for latency, candlestick, waterfall, treemap, scatter, funnel, box plot, Sankey and bullet charts. */
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

  /** A scatter chart's x and y values' names, when its axes have no `title`. */
  scatterX: string;
  scatterY: string;
  /** A bubble's size's name, when the chart has no `sizeLabel`. */
  scatterSize: string;
  /** The scatter table's column of point labels. */
  scatterPoint: string;
  /** The start of a scatter chart's summary. */
  scatterSummary: (values: { points: number; series: number }) => string;
  /** A series' ranges in a scatter chart's summary. */
  scatterSeriesRange: (values: {
    label: string;
    xName: string;
    xMin: string;
    xMax: string;
    yName: string;
    yMin: string;
    yMax: string;
  }) => string;
  /** How strongly a series' x and y move together (`r` from -1 to 1, and formatted). */
  scatterCorrelation: (values: { r: number; value: string }) => string;

  /** A funnel step's shares in its tooltip. */
  funnelShares: (values: { ofFirst: string; ofPrevious: string }) => string;
  /** The start of a funnel's summary. */
  funnelSummary: (values: { count: number; first: string; last: string; share: string }) => string;
  /** The step that keeps the smallest share of the one before it. */
  funnelLargestDrop: (values: { from: string; to: string; share: string }) => string;
  /** The funnel table's columns. */
  funnelStep: string;
  funnelValue: string;
  funnelOfFirst: string;
  funnelOfPrevious: string;

  /** A box plot's five numbers, mean and outlier count, in tooltips and the table. */
  boxMin: string;
  boxLowerQuartile: string;
  boxMedian: string;
  boxUpperQuartile: string;
  boxMax: string;
  boxMean: string;
  boxOutliers: string;
  /** A series' highest and lowest median in a box plot's summary. */
  boxMedianHighLow: (values: {
    label: string;
    high: string;
    highValue: string;
    low: string;
    lowValue: string;
  }) => string;
  /** A series' only box in a box plot's summary. */
  boxSummaryOne: (values: { label: string; median: string; min: string; max: string }) => string;

  /** A Sankey flow in its tooltip ("Coal to Electricity: 120 TWh"). */
  sankeyFlow: (values: { source: string; target: string; value: string }) => string;
  /** A Sankey node in its tooltip. */
  sankeyNode: (values: { label: string; value: string }) => string;
  /** The start of a Sankey chart's summary. */
  sankeySummary: (values: { nodes: number; flows: number; total: string }) => string;
  sankeyLargest: (values: { source: string; target: string; value: string }) => string;
  /** The Sankey table's columns. */
  sankeySource: string;
  sankeyTarget: string;
  sankeyValue: string;
  /** The share of the source's outflow. */
  sankeyShare: string;

  /** The target beside a bullet chart's value ("target 80 kW"). */
  bulletTarget: (values: { target: string }) => string;
  /** A bullet chart's meter text: the value, then the target and range when it has them. */
  bulletValue: (values: { value: string; target?: string; range?: string }) => string;
}

export const defaultChartPlotMessages: ChartPlotMessages = {
  ...latencyStrings,
  ...candleStrings,
  ...waterfallStrings,
  ...funnelStrings,
  ...treemapStrings,
  ...scatterStrings,
  ...boxStrings,
  ...sankeyStrings,
  ...bulletStrings,
};
