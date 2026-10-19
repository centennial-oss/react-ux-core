// BoxPlotChart: how values spread within each category, such as response times per region or test scores per class.
// Each box runs from the lower to the upper quartile with a line at the median, whiskers reach the furthest values
// within 1.5 times the box's height, and values beyond them show as hollow dots. Groups take raw values (summarised
// here) or summaries worked out elsewhere (`histogramBoxStats` turns LatencyChart's buckets into one). The boxes are
// Chart.js floating bars, so hovering, tooltips and series work as for bars; a plugin draws the whiskers, medians,
// means and outliers.

import type { Chart, ChartConfiguration, ChartType, Plugin } from 'chart.js';
import { useMemo } from 'react';
import { useLocale } from 'react-aria-components';
import { useIsPhone } from '../utils/useMediaQuery';
import { boxPlotStats, type BoxPlotStats } from './boxPlot';
import { ChartFrame, type ChartFrameOptions, type ChartTable } from './ChartFrame';
import { baseOptions, categoryScale, tooltipOptions, valueScale } from './chartOptions';
import { seriesLegend, withAlpha, type ChartColor } from './colors';
import { formatValue } from './format';
import { useChartMessages } from './messages';
import { boxStrings } from './plotStrings';
import { numberColumn, withUnit } from './tableColumns';
import { useChart, useChartLook, useSeriesVisibility } from './useChart';
import type { ValueAxisOptions } from './valueAxis';

export interface BoxPlotSeries {
  id: string;
  label: string;
  /** Defaults to the next palette colour. */
  color?: ChartColor;
  /**
   * One group per category, in the same order: raw values (summarised with `boxPlotStats`), a summary, or `null` for
   * none.
   */
  data: readonly (readonly number[] | BoxPlotStats | null)[];
}

export interface BoxPlotChartProps extends ChartFrameOptions {
  /** The category labels. */
  categories: readonly string[];
  series: readonly BoxPlotSeries[];
  /** The values' unit ("ms"). */
  unit?: string;
  /** The value axis's range and title. It always stretches to show the whiskers and outliers. */
  valueAxis?: ValueAxisOptions;
  /** `horizontal` runs the categories down the page. Defaults to `vertical`. */
  orientation?: 'vertical' | 'horizontal';
}

/** Options for the box plot plugin, keyed under `plugins.boxPlot`. */
interface BoxPlotOptions {
  /** Each dataset's summaries, by category. */
  stats: readonly (readonly (BoxPlotStats | undefined)[])[];
  colors: readonly string[];
  isHorizontal: boolean;
  medianColor: string;
}

declare module 'chart.js' {
  // The type parameter must match Chart.js's declaration to merge with it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    boxPlot?: BoxPlotOptions;
  }
}

function toStats(group: readonly number[] | BoxPlotStats | null | undefined) {
  if (group === null || group === undefined) {
    return undefined;
  }
  return Array.isArray(group) ? boxPlotStats(group) : (group as BoxPlotStats);
}

interface BarGeometry {
  x: number;
  y: number;
  base: number;
  width: number;
  height: number;
}

/** Draws each box's whiskers, median, mean and outliers over the floating bars. */
const boxPlotPlugin: Plugin<ChartType, BoxPlotOptions> = {
  id: 'boxPlot',
  afterDatasetsDraw(chart: Chart, _args, options: BoxPlotOptions | undefined) {
    if (!Array.isArray(options?.stats)) {
      return;
    }
    const valueScale = chart.scales[options.isHorizontal ? 'x' : 'y'];
    if (!valueScale) {
      return;
    }
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      chartArea.left,
      chartArea.top,
      chartArea.right - chartArea.left,
      chartArea.bottom - chartArea.top,
    );
    ctx.clip();
    const all: BoxPlotOptions['stats'] = options.stats;
    all.forEach((groups, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (!chart.isDatasetVisible(datasetIndex)) {
        return;
      }
      const color = options.colors[datasetIndex] ?? '#888888';
      meta.data.forEach((element, index) => {
        const stats: BoxPlotStats | undefined = groups[index];
        if (!stats) {
          return;
        }
        const bar = element.getProps(['x', 'y', 'base', 'width', 'height'], true) as BarGeometry;
        // The box's centre and half its thickness across the category axis.
        const centre = options.isHorizontal ? bar.y : bar.x;
        const half = (options.isHorizontal ? bar.height : bar.width) / 2;
        const at = (value: number) => valueScale.getPixelForValue(value);
        const line = (from: number, to: number, across: number, spread: number) => {
          ctx.beginPath();
          if (options.isHorizontal) {
            ctx.moveTo(from, across - spread);
            ctx.lineTo(to, across + spread);
          } else {
            ctx.moveTo(across - spread, from);
            ctx.lineTo(across + spread, to);
          }
          ctx.stroke();
        };
        const segment = (from: number, to: number) => {
          ctx.beginPath();
          if (options.isHorizontal) {
            ctx.moveTo(from, centre);
            ctx.lineTo(to, centre);
          } else {
            ctx.moveTo(centre, from);
            ctx.lineTo(centre, to);
          }
          ctx.stroke();
        };
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        // Whiskers, with caps half the box's width.
        segment(at(stats.q1), at(stats.min));
        segment(at(stats.q3), at(stats.max));
        line(at(stats.min), at(stats.min), centre, half / 2);
        line(at(stats.max), at(stats.max), centre, half / 2);
        // The median, across the whole box.
        ctx.strokeStyle = options.medianColor;
        ctx.lineWidth = 2.5;
        line(at(stats.median), at(stats.median), centre, half);
        // The mean as a small diamond.
        if (stats.mean !== undefined && Number.isFinite(stats.mean)) {
          const px = at(stats.mean);
          const [x, y] = options.isHorizontal ? [px, centre] : [centre, px];
          ctx.fillStyle = options.medianColor;
          ctx.beginPath();
          ctx.moveTo(x, y - 4);
          ctx.lineTo(x + 4, y);
          ctx.lineTo(x, y + 4);
          ctx.lineTo(x - 4, y);
          ctx.closePath();
          ctx.fill();
        }
        // Outliers as hollow dots.
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        for (const outlier of stats.outliers ?? []) {
          const px = at(outlier);
          const [x, y] = options.isHorizontal ? [px, centre] : [centre, px];
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    });
    ctx.restore();
  },
};

/**
 * A box plot: the spread of values in each category, in one or more series side by side. The legend shows, hides
 * and highlights series; it has a title, a generated summary (each series' highest and lowest median), "View as
 * table" with the five numbers, PNG and CSV export, and full screen.
 */
export function BoxPlotChart({
  categories,
  series,
  unit,
  valueAxis: valueAxisOptions,
  orientation = 'vertical',
  ...frame
}: BoxPlotChartProps) {
  const messages = useChartMessages(boxStrings);
  const { locale } = useLocale();
  const { palette, isReducedMotion } = useChartLook();
  const isNarrow = useIsPhone();
  const { hidden, isDimmed, legendProps } = useSeriesVisibility();
  const isHorizontal = orientation === 'horizontal';

  const stats = useMemo(
    () => series.map((entry) => categories.map((_, index) => toStats(entry.data[index]))),
    [series, categories],
  );
  const isEmpty = stats.every((groups) => groups.every((group) => group === undefined));
  const legendItems = useMemo(() => seriesLegend(series, palette), [series, palette]);

  const config = useMemo((): ChartConfiguration<'bar'> => {
    const extremes = stats.flatMap((groups) =>
      groups.flatMap((group) => (group ? [group.min, group.max, ...(group.outliers ?? [])] : [])),
    );
    const colors = legendItems.map((item) => withAlpha(item.color, isDimmed(item.id) ? 0.25 : 1));
    const valueAxis = valueScale(palette, {
      maxTicksLimit: isNarrow ? 4 : 7,
      format: (value) => formatValue(value, locale, unit),
      axis: { ...valueAxisOptions, shouldIncludeReferences: true },
      references: extremes,
    });
    const categoryAxis = categoryScale(palette);
    const describe = (group: BoxPlotStats) => [
      `${messages.boxMax}: ${formatValue(group.max, locale, unit)}`,
      `${messages.boxUpperQuartile}: ${formatValue(group.q3, locale, unit)}`,
      `${messages.boxMedian}: ${formatValue(group.median, locale, unit)}`,
      `${messages.boxLowerQuartile}: ${formatValue(group.q1, locale, unit)}`,
      `${messages.boxMin}: ${formatValue(group.min, locale, unit)}`,
      ...(group.mean === undefined
        ? []
        : [`${messages.boxMean}: ${formatValue(group.mean, locale, unit)}`]),
      ...(group.outliers && group.outliers.length > 0
        ? [`${messages.boxOutliers}: ${formatValue(group.outliers.length, locale)}`]
        : []),
    ];
    return {
      type: 'bar',
      plugins: [boxPlotPlugin],
      data: {
        labels: [...categories],
        datasets: series.map((entry, index) => {
          const color = colors[index] ?? '#888888';
          return {
            label: entry.label,
            data: (stats[index] ?? []).map((group) =>
              group ? ([group.q1, group.q3] as [number, number]) : null,
            ),
            hidden: hidden.has(entry.id),
            backgroundColor: withAlpha(
              legendItems[index]?.color ?? color,
              isDimmed(entry.id) ? 0.08 : 0.3,
            ),
            borderColor: color,
            borderWidth: 1.5,
            borderSkipped: false,
            minBarLength: 2,
            maxBarThickness: 56,
            categoryPercentage: 0.7,
            barPercentage: 0.85,
          };
        }),
      },
      options: {
        ...baseOptions(isReducedMotion, {
          boxPlot: {
            stats,
            colors,
            isHorizontal,
            medianColor: palette.text,
          },
          tooltip: tooltipOptions<'bar'>(palette, {
            label: (item) => {
              const group = stats[item.datasetIndex]?.[item.dataIndex];
              return group ? [item.dataset.label ?? '', ...describe(group)] : '';
            },
          }),
        }),
        indexAxis: isHorizontal ? 'y' : 'x',
        interaction: { mode: 'index', intersect: false },
        scales: isHorizontal
          ? { x: valueAxis, y: categoryAxis }
          : { x: categoryAxis, y: valueAxis },
      },
    };
  }, [
    stats,
    series,
    categories,
    legendItems,
    hidden,
    isDimmed,
    palette,
    isHorizontal,
    isNarrow,
    isReducedMotion,
    locale,
    unit,
    valueAxisOptions,
    messages,
  ]);

  const { canvasRef, chart } = useChart(config);

  const summary = useMemo(() => {
    const parts = [messages.categorySummary({ count: categories.length })];
    series.forEach((entry, seriesIndex) => {
      const groups = stats[seriesIndex] ?? [];
      let high = -1;
      let low = -1;
      groups.forEach((group, index) => {
        if (!group) {
          return;
        }
        if (high < 0 || group.median > (groups[high]?.median ?? 0)) {
          high = index;
        }
        if (low < 0 || group.median < (groups[low]?.median ?? 0)) {
          low = index;
        }
      });
      const highest = groups[high];
      const lowest = groups[low];
      if (!highest || !lowest) {
        return;
      }
      parts.push(
        high === low
          ? messages.boxSummaryOne({
              label: entry.label,
              median: formatValue(highest.median, locale, unit),
              min: formatValue(highest.min, locale, unit),
              max: formatValue(highest.max, locale, unit),
            })
          : messages.boxMedianHighLow({
              label: entry.label,
              high: categories[high] ?? '',
              highValue: formatValue(highest.median, locale, unit),
              low: categories[low] ?? '',
              lowValue: formatValue(lowest.median, locale, unit),
            }),
      );
    });
    if (valueAxisOptions?.title !== undefined) {
      parts.push(messages.valueAxisTitle({ title: valueAxisOptions.title }));
    }
    return parts.join(' ');
  }, [messages, categories, series, stats, locale, unit, valueAxisOptions]);

  const table = (): ChartTable => {
    const number = (value: number) => formatValue(value, locale);
    const hasMean = stats.some((groups) => groups.some((group) => group?.mean !== undefined));
    const hasOutliers = stats.some((groups) =>
      groups.some((group) => group?.outliers !== undefined),
    );
    const valueColumn = (id: keyof BoxPlotStats, header: string, isMobile = false) =>
      numberColumn(id, withUnit(header, unit), number, { isSortable: true, mobile: isMobile });
    const columns = [
      {
        id: 'category',
        header: messages.category,
        isRowHeader: true,
        isSortable: true,
        value: (row: Record<string, unknown>) => row.category,
      },
      ...(series.length > 1
        ? [
            {
              id: 'series',
              header: messages.chartSeries,
              isSortable: true,
              mobile: true,
              value: (row: Record<string, unknown>) => row.series,
            },
          ]
        : []),
      valueColumn('min', messages.boxMin),
      valueColumn('q1', messages.boxLowerQuartile),
      valueColumn('median', messages.boxMedian, true),
      valueColumn('q3', messages.boxUpperQuartile),
      valueColumn('max', messages.boxMax),
      ...(hasMean ? [valueColumn('mean', messages.boxMean)] : []),
      ...(hasOutliers
        ? [numberColumn('outliers', messages.boxOutliers, number, { isSortable: true })]
        : []),
    ];
    const rows = categories.flatMap((category, index) =>
      series.flatMap((entry, seriesIndex) => {
        const group = stats[seriesIndex]?.[index];
        return group
          ? [
              {
                __key: `${category}:${entry.id}`,
                category,
                series: entry.label,
                min: group.min,
                q1: group.q1,
                median: group.median,
                q3: group.q3,
                max: group.max,
                mean: group.mean ?? null,
                outliers: group.outliers?.length ?? null,
              },
            ]
          : [];
      }),
    );
    return { columns, rows };
  };

  return (
    <ChartFrame
      {...frame}
      summary={summary}
      isEmpty={isEmpty}
      {...legendProps(legendItems)}
      table={table}
      chart={chart}
      canvasRef={canvasRef}
    />
  );
}
