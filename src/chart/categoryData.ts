// The state, summary and table that CategoryChart's bars, donuts, radars and polar areas share.

import { useMemo } from 'react';
import { useLocale } from 'react-aria-components';
import { useIsPhone } from '../utils/useMediaQuery';
import type { CategorySeries } from './CategoryChart';
import type { ChartTable } from './ChartFrame';
import { seriesLegend } from './colors';
import { formatValue } from './format';
import { useChartMessages, type ChartStrings } from './messages';
import { numberColumn, withUnit } from './tableColumns';
import { useChartLook, useSeriesVisibility, type SeriesVisibilityOptions } from './useChart';

/**
 * A category chart's look and legend state, and its ChartFrame props (summary, table and legend). With `isSingle`
 * (a donut or polar area) the chart shows the first series, and its legend is the categories.
 */
export function useCategorySeries({
  categories,
  series,
  isSingle,
  unit,
  axisTitle,
  tableSeries = series,
  visibility,
}: {
  categories: readonly string[];
  series: readonly CategorySeries[];
  isSingle: boolean;
  unit: string | undefined;
  /** The value axis's title, read in the summary. */
  axisTitle: string | undefined;
  /** The series the table lists. Defaults to all of them. */
  tableSeries?: readonly CategorySeries[];
  /** Hidden and highlighted series controlled by the app. */
  visibility?: SeriesVisibilityOptions;
}) {
  const messages = useChartMessages();
  const { locale } = useLocale();
  const look = useChartLook();
  const isNarrow = useIsPhone();
  const { hidden, isDimmed, legendProps } = useSeriesVisibility(visibility);
  const { palette } = look;
  const first = series[0];

  const legendItems = useMemo(
    () =>
      isSingle
        ? categories.map((category, index) => ({
            id: category,
            label: category,
            color: palette.series(undefined, index),
          }))
        : seriesLegend(series, palette),
    [isSingle, categories, series, palette],
  );
  // The first series' value per category, with hidden categories at zero.
  const singleData = useMemo(
    () =>
      categories.map((category, index) => (hidden.has(category) ? 0 : (first?.data[index] ?? 0))),
    [categories, first, hidden],
  );
  const summary = useMemo(
    () => categorySummary(categories, series, { isSingle, unit, axisTitle }, messages, locale),
    [messages, categories, series, isSingle, locale, unit, axisTitle],
  );

  return {
    ...look,
    locale,
    isNarrow,
    hidden,
    isDimmed,
    legendItems,
    singleData,
    frameProps: {
      summary,
      isEmpty: series.every((entry) => entry.data.every((value) => value === null)),
      table: () => categoryTable(categories, tableSeries, unit, messages, locale),
      ...legendProps(legendItems),
    },
  };
}

/**
 * The category count, then each series' highest and lowest category (only the first series when `isSingle`, as a
 * donut or polar area shows), then the value axis's title when it has one.
 */
export function categorySummary(
  categories: readonly string[],
  series: readonly CategorySeries[],
  options: { isSingle: boolean; unit?: string; axisTitle?: string },
  messages: ChartStrings,
  locale: string,
): string {
  const { isSingle, unit, axisTitle } = options;
  const parts = [messages.categorySummary({ count: categories.length })];
  for (const entry of isSingle ? series.slice(0, 1) : series) {
    let high = -1;
    let low = -1;
    entry.data.forEach((value, index) => {
      if (value === null) {
        return;
      }
      if (high < 0 || value > (entry.data[high] ?? 0)) {
        high = index;
      }
      if (low < 0 || value < (entry.data[low] ?? 0)) {
        low = index;
      }
    });
    if (high >= 0 && low >= 0) {
      parts.push(
        messages.categoryHighLow({
          label: entry.label,
          high: categories[high] ?? '',
          highValue: formatValue(entry.data[high] ?? 0, locale, unit),
          low: categories[low] ?? '',
          lowValue: formatValue(entry.data[low] ?? 0, locale, unit),
        }),
      );
    }
  }
  if (axisTitle !== undefined) {
    parts.push(messages.valueAxisTitle({ title: axisTitle }));
  }
  return parts.join(' ');
}

/** One row per category and one column per series. */
export function categoryTable(
  categories: readonly string[],
  series: readonly CategorySeries[],
  unit: string | undefined,
  messages: ChartStrings,
  locale: string,
): ChartTable {
  const rows = categories.map((category, index) => {
    const row: Record<string, unknown> = { __key: category, category };
    for (const entry of series) {
      row[entry.id] = entry.data[index] ?? null;
    }
    return row;
  });
  const columns = [
    {
      id: 'category',
      header: messages.category,
      isRowHeader: true,
      isSortable: true,
      value: (row: Record<string, unknown>) => row.category,
    },
    ...series.map((entry) =>
      numberColumn(entry.id, withUnit(entry.label, unit), (value) => formatValue(value, locale), {
        isSortable: true,
        mobile: true,
      }),
    ),
  ];
  return { columns, rows };
}
