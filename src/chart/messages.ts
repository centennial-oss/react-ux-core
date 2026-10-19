// English defaults of the chart entry point's strings (see `Messages` in provider/messages.ts).
import type { CommonMessages } from '../provider/coreStrings';
import { useMemo } from 'react';
import { useEntryMessages } from '../provider/context';
import type { ChartMessages } from '../provider/messages';
import { defaultChartAnnotationMessages, type ChartAnnotationMessages } from './annotationMessages';

export const defaultChartMessages: ChartMessages = {
  viewAsTable: 'View as table',
  viewAsChart: 'View as chart',
  exportPng: 'Image (PNG)',
  exportCsv: 'Data (CSV)',
  fullScreen: 'Full screen',
  exitFullScreen: 'Exit full screen',
  resetZoom: 'Reset zoom',
  rotateForWiderChart: 'Turn your phone sideways for a wider chart.',
  chartSeries: 'Series',
  time: 'Time',
  category: 'Category',
  timeSeriesSummary: ({ count, start, end }) =>
    `${count === 1 ? '1 series' : `${count} series`} from ${start} to ${end}.`,
  seriesRange: ({ label, min, max, latest }) =>
    `${label}: from ${min} to ${max}, latest ${latest}.`,
  categorySummary: ({ count }) => (count === 1 ? '1 category.' : `${count} categories.`),
  valueAxisTitle: ({ title }) => `Axis: ${title}.`,
  heatmapCell: ({ row, column, value }) => `${row}, ${column}, ${value}`,
  heatmapSummary: ({ rows, columns }) => `${rows} rows by ${columns} columns.`,
  heatmapLowest: ({ cell }) => `Lowest: ${cell}.`,
  heatmapHighest: ({ cell }) => `Highest: ${cell}.`,
  heatmapScale: 'Scale',
  calendarDay: ({ date, value }) => `${date}, ${value}`,
  calendarNoActivity: 'No activity yet',
  heatmapMidpoint: ({ value }) => `Midpoint: ${value}`,
  heatmapScrollHint: 'Scroll sideways for more',
  categoryHighLow: ({ label, high, highValue, low, lowValue }) =>
    `${label}: highest ${high} (${highValue}), lowest ${low} (${lowValue}).`,
  gaugeNormal: 'Normal',
  gaugeWarning: 'Warning',
  gaugeDanger: 'Critical',
  gaugeValue: ({ value, status }) => `${value}, ${status}`,
};

/**
 * The strings every `/chart` component reads: the core strings and `/chart`'s shared ones. A chart's own strings
 * (`ChartPlotMessages`, such as `scatterStrings`) come on top, from `useChartMessages(scatterStrings)`.
 */
export type ChartStrings = CommonMessages & ChartMessages & ChartAnnotationMessages;

/** The shared `/chart` defaults, made once so the merged strings stay memoised. */
const defaults: ChartMessages & ChartAnnotationMessages = {
  ...defaultChartMessages,
  ...defaultChartAnnotationMessages,
};

/**
 * `/chart`'s strings, plus a chart's own defaults (`own`, a module constant such as `scatterStrings`), with the app's
 * overrides from `UIProvider`.
 */
export function useChartMessages(): ChartStrings;
export function useChartMessages<T extends object>(own: T): ChartStrings & T;
export function useChartMessages(own?: object): ChartStrings {
  const merged = useMemo(() => (own ? { ...defaults, ...own } : defaults), [own]);
  return useEntryMessages(merged);
}
