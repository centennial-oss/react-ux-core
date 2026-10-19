import type { ChartConfiguration } from 'chart.js';
import { useMemo } from 'react';
import { useCategorySeries } from './categoryData';
import { ChartFrame, type ChartFrameOptions } from './ChartFrame';
import { baseOptions, categoryScale, tooltipOptions, valueScale } from './chartOptions';
import { withAlpha, type ChartColor } from './colors';
import { formatValue } from './format';
import type { ValueAxisOptions } from './valueAxis';
import { useChart, type SeriesVisibilityOptions } from './useChart';
import { FunnelPlot, type CategoryFunnelProps } from './Funnel';
import { RadarPlot, type CategoryRadarProps } from './Radar';
import { WaterfallPlot, type CategoryWaterfallProps } from './Waterfall';

export interface CategorySeries {
  id: string;
  label: string;
  /** Defaults to the next palette colour. */
  color?: ChartColor;
  /** One value per category, in the same order (`null` for none). */
  data: readonly (number | null)[];
}

/** CategoryChart's props for bars and donuts. */
export interface CategoryBarChartProps extends ChartFrameOptions, SeriesVisibilityOptions {
  /** The category labels. */
  categories: readonly string[];
  series: readonly CategorySeries[];
  /** `donut` shows the first series' share per category. */
  type: 'bar' | 'horizontalBar' | 'stackedBar' | 'donut';
  /** The values' unit ("kWh"). */
  unit?: string;
  /**
   * The value axis's range and title (the x-axis for horizontal bars, the y-axis otherwise), such as
   * `{ min: 0, max: 100 }` for percentages. Donuts have no value axis and ignore it.
   */
  valueAxis?: ValueAxisOptions;
}

/**
 * Bars, donuts, radars and polar areas (`type` and `series`), or a waterfall or funnel (`type: 'waterfall'` or
 * `type: 'funnel'`, and `steps`).
 */
export type CategoryChartProps =
  CategoryBarChartProps | CategoryRadarProps | CategoryWaterfallProps | CategoryFunnelProps;

/**
 * A chart of values by category: bars (vertical, horizontal or stacked), a donut, a radar, a polar area, a
 * waterfall or a funnel. The legend shows, hides and highlights series (categories, for a donut or polar area); it
 * has a title, a generated summary, "View as table", PNG and CSV export, and full screen.
 */
export function CategoryChart(props: CategoryChartProps) {
  switch (props.type) {
    case 'waterfall':
      return <WaterfallPlot {...props} />;
    case 'funnel':
      return <FunnelPlot {...props} />;
    case 'radar':
    case 'polarArea':
      return <RadarPlot {...props} />;
    default:
      return <CategoryBars {...props} />;
  }
}

function CategoryBars({
  categories,
  series,
  type,
  unit,
  valueAxis: valueAxisOptions,
  hiddenSeries,
  defaultHiddenSeries,
  onHiddenSeriesChange,
  highlightedSeries,
  onHighlightedSeriesChange,
  ...frame
}: CategoryBarChartProps) {
  const isDonut = type === 'donut';
  const {
    palette,
    isReducedMotion,
    locale,
    isNarrow,
    hidden,
    isDimmed,
    legendItems,
    singleData,
    frameProps,
  } = useCategorySeries({
    categories,
    series,
    isSingle: isDonut,
    unit,
    axisTitle: isDonut ? undefined : valueAxisOptions?.title,
    visibility: {
      hiddenSeries,
      defaultHiddenSeries,
      onHiddenSeriesChange,
      highlightedSeries,
      onHighlightedSeriesChange,
    },
  });

  const config = useMemo((): ChartConfiguration<'bar' | 'doughnut'> => {
    const dim = (id: string, color: string, alpha = 1) =>
      withAlpha(color, isDimmed(id) ? 0.25 : alpha);
    if (isDonut) {
      return {
        type: 'doughnut',
        data: {
          labels: [...categories],
          datasets: [
            {
              label: series[0]?.label ?? '',
              data: singleData,
              backgroundColor: legendItems.map((item) => dim(item.id, item.color)),
              borderColor: palette.surface,
              borderWidth: 2,
            },
          ],
        },
        options: {
          ...baseOptions(isReducedMotion, {
            tooltip: tooltipOptions<'doughnut'>(palette, {
              label: (item) => `${item.label}: ${formatValue(item.parsed, locale, unit)}`,
            }),
          }),
          cutout: '60%',
        },
      };
    }
    const isHorizontal = type === 'horizontalBar';
    const isStacked = type === 'stackedBar';
    const valueAxis = {
      ...valueScale(palette, {
        maxTicksLimit: isNarrow ? 4 : 7,
        format: (value) => formatValue(value, locale, unit),
        axis: valueAxisOptions,
      }),
      stacked: isStacked,
    };
    const categoryAxis = {
      ...categoryScale(palette, { color: palette.mutedText, autoSkip: true }),
      stacked: isStacked,
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
        ...baseOptions(isReducedMotion, {
          tooltip: tooltipOptions<'bar'>(palette, {
            label: (item) => {
              const value = isHorizontal ? item.parsed.x : item.parsed.y;
              return `${item.dataset.label ?? ''}: ${value === null ? '—' : formatValue(value, locale, unit)}`;
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
    isDonut,
    type,
    categories,
    series,
    singleData,
    hidden,
    isDimmed,
    legendItems,
    palette,
    isReducedMotion,
    isNarrow,
    locale,
    unit,
    valueAxisOptions,
  ]);

  const { canvasRef, chart } = useChart(config);

  return <ChartFrame {...frame} {...frameProps} chart={chart} canvasRef={canvasRef} />;
}
