// English defaults of the chart entry point's strings (see `Messages` in provider/messages.ts).
import { useEntryMessages } from '../provider/context';
import type { CoreMessages, ChartMessages } from '../provider/messages';

export const defaultChartMessages: ChartMessages = {
  viewAsTable: 'View as table',
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
  heatmapMidpoint: ({ value }) => `Midpoint: ${value}`,
  heatmapScrollHint: 'Scroll sideways for more',
  categoryHighLow: ({ label, high, highValue, low, lowValue }) =>
    `${label}: highest ${high} (${highValue}), lowest ${low} (${lowValue}).`,
  gaugeNormal: 'Normal',
  gaugeWarning: 'Warning',
  gaugeDanger: 'Critical',
  gaugeValue: ({ value, status }) => `${value}, ${status}`,
};

/** The strings `/chart` components read: the core strings and `/chart`'s own. */
export type ChartStrings = CoreMessages & ChartMessages;

/** `/chart`'s strings, with the app's overrides from `UIProvider`. */
export function useChartMessages(): ChartStrings {
  return useEntryMessages(defaultChartMessages);
}
