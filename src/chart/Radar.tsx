// CategoryChart's radar and polar area charts. A radar draws each series as a filled shape over one spoke per
// category, for comparing profiles (a product's scores against a competitor's); each series has its own point shape
// as well as colour. A polar area shows the first series as wedges of equal angle whose radius is the value, coloured
// per category like a donut. Both share the bars' summary and table.

import {
  Chart,
  PolarAreaController,
  RadarController,
  RadialLinearScale,
  type ChartConfiguration,
} from 'chart.js';
import { useMemo } from 'react';
import { useCategorySeries } from './categoryData';
import type { CategoryBarChartProps } from './CategoryChart';
import { ChartFrame } from './ChartFrame';
import { baseOptions, tooltipOptions } from './chartOptions';
import { POINT_STYLES, withAlpha } from './colors';
import { formatValue } from './format';
import { useChart } from './useChart';
import { valueAxisBounds } from './valueAxis';

/** CategoryChart's props for `type: 'radar'` and `type: 'polarArea'`. */
export interface CategoryRadarProps extends Omit<CategoryBarChartProps, 'type' | 'valueAxis'> {
  /** `radar` draws every series over one spoke per category; `polarArea` shows the first series as wedges. */
  type: 'radar' | 'polarArea';
  /**
   * The radial axis's range, such as `{ min: 0, max: 5 }` for scores. Its title isn't drawn, but it's read in the
   * summary. Defaults to starting at zero.
   */
  valueAxis?: CategoryBarChartProps['valueAxis'];
}

let isRadialRegistered = false;

/** Registers the radial pieces (once), here rather than in setup.ts so other charts don't bundle them. */
function ensureRadialRegistered() {
  if (!isRadialRegistered) {
    isRadialRegistered = true;
    Chart.register(RadarController, PolarAreaController, RadialLinearScale);
  }
}

/** A radar or polar area chart: CategoryChart with `type: 'radar'` or `type: 'polarArea'`. */
export function RadarPlot({
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
}: CategoryRadarProps) {
  ensureRadialRegistered();
  const isPolar = type === 'polarArea';
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
    isSingle: isPolar,
    unit,
    axisTitle: valueAxisOptions?.title,
    tableSeries: isPolar ? series.slice(0, 1) : series,
    visibility: {
      hiddenSeries,
      defaultHiddenSeries,
      onHiddenSeriesChange,
      highlightedSeries,
      onHighlightedSeriesChange,
    },
  });

  const config = useMemo((): ChartConfiguration<'radar' | 'polarArea'> => {
    const radial = {
      beginAtZero: true,
      ...valueAxisBounds(valueAxisOptions),
      angleLines: { color: palette.grid },
      grid: { color: palette.grid },
      pointLabels: {
        display: true,
        centerPointLabels: isPolar,
        color: palette.text,
        font: { size: isNarrow ? 11 : 12 },
      },
      ticks: {
        color: palette.mutedText,
        backdropColor: palette.surface,
        maxTicksLimit: isNarrow ? 4 : 6,
        callback: (value: number | string) => formatValue(Number(value), locale, unit),
      },
    };
    if (isPolar) {
      return {
        type: 'polarArea',
        data: {
          labels: [...categories],
          datasets: [
            {
              label: series[0]?.label ?? '',
              data: singleData,
              backgroundColor: legendItems.map((item) =>
                withAlpha(item.color, isDimmed(item.id) ? 0.15 : 0.7),
              ),
              borderColor: palette.surface,
              borderWidth: 2,
            },
          ],
        },
        options: {
          ...baseOptions(isReducedMotion, {
            tooltip: tooltipOptions<'polarArea'>(palette, {
              label: (item) => `${item.label}: ${formatValue(item.parsed.r, locale, unit)}`,
            }),
          }),
          // Room for the centred category labels, which Chart.js doesn't fit inside the canvas.
          layout: { padding: 16 },
          scales: { r: radial },
        },
      };
    }
    return {
      type: 'radar',
      data: {
        labels: [...categories],
        datasets: series.map((entry, index) => {
          const color = palette.series(entry.color, index);
          const dimmed = isDimmed(entry.id);
          return {
            label: entry.label,
            data: [...entry.data],
            hidden: hidden.has(entry.id),
            borderColor: withAlpha(color, dimmed ? 0.25 : 1),
            backgroundColor: withAlpha(color, dimmed ? 0.04 : 0.15),
            pointBackgroundColor: withAlpha(color, dimmed ? 0.25 : 1),
            pointBorderColor: palette.surface,
            pointStyle: POINT_STYLES[index % POINT_STYLES.length],
            pointRadius: 3.5,
            pointHoverRadius: 5,
            borderWidth: 2,
            fill: true,
            spanGaps: true,
          };
        }),
      },
      options: {
        ...baseOptions(isReducedMotion, {
          tooltip: tooltipOptions<'radar'>(palette, {
            label: (item) =>
              `${item.dataset.label ?? ''}: ${formatValue(item.parsed.r, locale, unit)}`,
          }),
        }),
        interaction: { mode: 'index', intersect: false },
        scales: { r: radial },
      },
    };
  }, [
    isPolar,
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
