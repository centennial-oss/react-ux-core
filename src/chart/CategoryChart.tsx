import type { ChartConfiguration } from 'chart.js';
import { useMemo, useState } from 'react';
import { useLocale } from 'react-aria-components';

import { downloadCsv, toCsv } from '../table/csv';
import type { DataTableColumn } from '../table/types';
import { useMediaQuery } from '../utils/useMediaQuery';
import { ChartFrame, type ChartFrameOptions, type ChartTable } from './ChartFrame';
import { withAlpha, type ChartColor } from './colors';
import { formatValue } from './format';
import { downloadPng, useChart, useChartLook } from './useChart';
import { useChartMessages } from './messages';

export interface CategorySeries {
  id: string;
  label: string;
  /** Defaults to the next palette colour. */
  color?: ChartColor;
  /** One value per category, in the same order (`null` for none). */
  data: readonly (number | null)[];
}

export interface CategoryChartProps extends ChartFrameOptions {
  /** The category labels. */
  categories: readonly string[];
  series: readonly CategorySeries[];
  /** `donut` shows the first series' share per category. */
  type: 'bar' | 'horizontalBar' | 'stackedBar' | 'donut';
  /** The values' unit ("kWh"). */
  unit?: string;
}

/**
 * A chart of values by category: bars (vertical, horizontal or stacked) or a donut. The legend shows, hides and
 * highlights series (categories, for a donut); it has a title, a generated summary, "View as table", PNG and CSV
 * export, and full screen.
 */
export function CategoryChart({
  categories,
  series,
  type,
  unit,
  exportFileName,
  ...frame
}: CategoryChartProps) {
  const messages = useChartMessages();
  const { locale } = useLocale();
  const { palette, isReducedMotion } = useChartLook();
  const isNarrow = useMediaQuery('(max-width: 639.98px)');
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const isDonut = type === 'donut';
  const donutSeries = series[0];

  // A donut's legend is its categories; bars' legend is their series.
  const legendItems = useMemo(
    () =>
      isDonut
        ? categories.map((category, index) => ({
            id: category,
            label: category,
            color: palette.series(undefined, index),
          }))
        : series.map((entry, index) => ({
            id: entry.id,
            label: entry.label,
            color: palette.series(entry.color, index),
          })),
    [isDonut, categories, series, palette],
  );
  const isEmpty = series.every((entry) => entry.data.every((value) => value === null));

  const config = useMemo((): ChartConfiguration<'bar' | 'doughnut'> => {
    const dim = (id: string, color: string, alpha = 1) =>
      withAlpha(color, highlighted !== null && highlighted !== id ? 0.25 : alpha);
    if (isDonut) {
      return {
        type: 'doughnut',
        data: {
          labels: [...categories],
          datasets: [
            {
              label: donutSeries?.label ?? '',
              data: categories.map((category, index) =>
                hidden.has(category) ? 0 : (donutSeries?.data[index] ?? 0),
              ),
              backgroundColor: legendItems.map((item) => dim(item.id, item.color)),
              borderColor: palette.surface,
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: isReducedMotion ? false : { duration: 250 },
          cutout: '60%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              borderWidth: 1,
              titleColor: palette.text,
              bodyColor: palette.text,
              callbacks: {
                label: (item) => `${item.label}: ${formatValue(item.parsed, locale, unit)}`,
              },
            },
          },
        },
      };
    }
    const isHorizontal = type === 'horizontalBar';
    const isStacked = type === 'stackedBar';
    const valueAxis = {
      stacked: isStacked,
      grid: { color: palette.grid },
      border: { color: palette.grid },
      ticks: {
        color: palette.mutedText,
        maxTicksLimit: isNarrow ? 4 : 7,
        maxRotation: 0,
        callback: (value: number | string) => formatValue(Number(value), locale, unit),
      },
    };
    const categoryAxis = {
      stacked: isStacked,
      grid: { display: false },
      border: { color: palette.grid },
      ticks: { color: palette.mutedText, autoSkip: true },
    };
    return {
      type: 'bar',
      data: {
        labels: [...categories],
        datasets: series.map((entry, index) => {
          const color = palette.series(entry.color, index);
          return {
            label: entry.label,
            data: [...entry.data],
            hidden: hidden.has(entry.id),
            backgroundColor: dim(entry.id, color, 0.85),
            borderColor: dim(entry.id, color),
            borderWidth: 1,
            borderRadius: 3,
          };
        }),
      },
      options: {
        indexAxis: isHorizontal ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        animation: isReducedMotion ? false : { duration: 250 },
        interaction: { mode: 'index', intersect: false },
        scales: isHorizontal
          ? { x: valueAxis, y: categoryAxis }
          : { x: categoryAxis, y: valueAxis },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            borderWidth: 1,
            titleColor: palette.text,
            bodyColor: palette.text,
            callbacks: {
              label: (item) => {
                const value = isHorizontal ? item.parsed.x : item.parsed.y;
                return `${item.dataset.label ?? ''}: ${value === null ? '—' : formatValue(value, locale, unit)}`;
              },
            },
          },
        },
      },
    };
  }, [
    isDonut,
    type,
    categories,
    series,
    donutSeries,
    hidden,
    highlighted,
    legendItems,
    palette,
    isReducedMotion,
    isNarrow,
    locale,
    unit,
  ]);

  const { canvasRef, chart } = useChart(config);

  const summary = useMemo(() => {
    const parts = [messages.categorySummary({ count: categories.length })];
    for (const entry of isDonut ? series.slice(0, 1) : series) {
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
    return parts.join(' ');
  }, [messages, categories, series, isDonut, locale, unit]);

  const table = (): ChartTable => {
    const rows = categories.map((category, index) => {
      const row: Record<string, unknown> = { __key: category, category };
      for (const entry of series) {
        row[entry.id] = entry.data[index] ?? null;
      }
      return row;
    });
    const columns: DataTableColumn<Record<string, unknown>>[] = [
      {
        id: 'category',
        header: messages.category,
        isRowHeader: true,
        isSortable: true,
        value: (row) => row.category,
      },
      ...series.map((entry): DataTableColumn<Record<string, unknown>> => ({
        id: entry.id,
        header: unit ? `${entry.label} (${unit})` : entry.label,
        align: 'end',
        isSortable: true,
        mobile: true,
        value: (row) => row[entry.id],
        cell: ({ value }) => (typeof value === 'number' ? formatValue(value, locale) : ''),
      })),
    ];
    return { columns, rows };
  };

  return (
    <ChartFrame
      {...frame}
      exportFileName={exportFileName}
      summary={summary}
      isEmpty={isEmpty}
      legend={legendItems.map((item) => ({ ...item, isHidden: hidden.has(item.id) }))}
      onToggleSeries={(id) => {
        const next = new Set(hidden);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        setHidden(next);
      }}
      onHighlightSeries={setHighlighted}
      table={table}
      onExportPng={() => {
        downloadPng(chart, exportFileName ?? 'chart');
      }}
      onExportCsv={() => {
        const data = table();
        downloadCsv(toCsv(data.rows, data.columns), exportFileName ?? 'chart');
      }}
      canvasRef={canvasRef}
    />
  );
}
