// ScatterChart: points on two numeric axes (neither of them time), such as weight against height, or cost against
// latency per service. Points with a `size` make it a bubble chart, with areas in proportion to the size. Each series
// has its own point shape as well as colour, so colour isn't the only signal. The summary gives each series' ranges
// and how strongly x and y move together; the table lists every point.

import { BubbleController, Chart, type ChartConfiguration } from 'chart.js';
import { useMemo } from 'react';
import { useLocale } from 'react-aria-components';
import type { DataTableColumn } from '../table/types';
import { useIsPhone } from '../utils/useMediaQuery';
import { numberFormat } from '../utils/intl';
import { ChartFrame, type ChartFrameOptions, type ChartTable } from './ChartFrame';
import { baseOptions, tooltipOptions, valueScale, zoomOptions } from './chartOptions';
import { POINT_STYLES, seriesLegend, withAlpha, type ChartColor } from './colors';
import { extent, formatValue } from './format';
import { useChartMessages } from './messages';
import { scatterStrings } from './plotStrings';
import { numberColumn, withUnit } from './tableColumns';
import { useChart, useChartLook, useChartZoom, useSeriesVisibility } from './useChart';
import { logTickLabel, type ValueAxisOptions } from './valueAxis';

/** A point on a scatter or bubble chart. */
export interface ScatterPoint {
  x: number;
  y: number;
  /** Makes the chart a bubble chart: the bubble's area is in proportion to it. */
  size?: number;
  /** Names the point in the tooltip and the table ("Lisbon"). */
  label?: string;
}

export interface ScatterSeries {
  id: string;
  label: string;
  /** Defaults to the next palette colour. */
  color?: ChartColor;
  data: readonly ScatterPoint[];
}

/** A scatter chart axis: its range and title, the values' unit and a linear or logarithmic scale. */
export interface ScatterAxisOptions extends ValueAxisOptions {
  /** The values' unit ("kg"). */
  unit?: string;
  /** Defaults to `linear`. A logarithmic axis ignores values at or below zero. */
  scale?: 'linear' | 'log';
}

export interface ScatterChartProps extends ChartFrameOptions {
  series: readonly ScatterSeries[];
  /** The horizontal axis. Its `title` names the x values in tooltips, the summary and the table. */
  xAxis?: ScatterAxisOptions;
  /** The vertical axis. Its `title` names the y values in tooltips, the summary and the table. */
  yAxis?: ScatterAxisOptions;
  /** Names the bubbles' size ("Population"), in tooltips and the table. */
  sizeLabel?: string;
  /** The sizes' unit. */
  sizeUnit?: string;
  /** Allows zooming (pinch and pan on touch, Ctrl+wheel or drag with a mouse). Defaults to true. */
  isZoomable?: boolean;
}

let isBubbleRegistered = false;

/** Registers the bubble controller (once), here rather than in setup.ts so other charts don't bundle it. */
function ensureBubbleRegistered() {
  if (!isBubbleRegistered) {
    isBubbleRegistered = true;
    Chart.register(BubbleController);
  }
}

/** The Pearson correlation of the points' x and y, or `undefined` for fewer than three points or no spread. */
export function correlation(points: readonly Pick<ScatterPoint, 'x' | 'y'>[]): number | undefined {
  const finite = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (finite.length < 3) {
    return undefined;
  }
  const meanX = finite.reduce((sum, point) => sum + point.x, 0) / finite.length;
  const meanY = finite.reduce((sum, point) => sum + point.y, 0) / finite.length;
  let xy = 0;
  let xx = 0;
  let yy = 0;
  for (const point of finite) {
    xy += (point.x - meanX) * (point.y - meanY);
    xx += (point.x - meanX) ** 2;
    yy += (point.y - meanY) ** 2;
  }
  return xx === 0 || yy === 0 ? undefined : xy / Math.sqrt(xx * yy);
}

/** A bubble's radius in pixels: its area in proportion to `size`, between `min` and `max`. */
export function bubbleRadius(size: number, largest: number, min: number, max: number): number {
  if (!(largest > 0) || !(size > 0)) {
    return min;
  }
  return min + (max - min) * Math.sqrt(Math.min(size, largest) / largest);
}

/**
 * A scatter or bubble chart: points on two numeric axes, in one or more series. The legend shows, hides and
 * highlights series; it has a title, a generated summary (ranges and correlation), "View as table", PNG and CSV
 * export, zoom and full screen.
 */
export function ScatterChart({
  series,
  xAxis,
  yAxis,
  sizeLabel,
  sizeUnit,
  isZoomable = true,
  ...frame
}: ScatterChartProps) {
  ensureBubbleRegistered();
  const messages = useChartMessages(scatterStrings);
  const { locale } = useLocale();
  const { palette, isReducedMotion } = useChartLook();
  const isNarrow = useIsPhone();
  const { hidden, isDimmed: isOtherHighlighted, legendProps } = useSeriesVisibility();
  const zoom = useChartZoom();

  const isBubble = series.some((entry) => entry.data.some((point) => point.size !== undefined));
  const xName = xAxis?.title ?? messages.scatterX;
  const yName = yAxis?.title ?? messages.scatterY;
  const sizeName = sizeLabel ?? messages.scatterSize;
  const isEmpty = series.every((entry) => entry.data.length === 0);

  const legendItems = useMemo(() => seriesLegend(series, palette), [series, palette]);

  const config = useMemo((): ChartConfiguration<'scatter' | 'bubble'> => {
    const largest = Math.max(
      0,
      extent(series.flatMap((entry) => entry.data.map((point) => point.size ?? 0)))?.[1] ?? 0,
    );
    const maxRadius = isNarrow ? 16 : 26;
    const axis = (options: ScatterAxisOptions | undefined, isVertical: boolean) => {
      const isLog = options?.scale === 'log';
      return {
        ...valueScale(palette, {
          maxTicksLimit: isNarrow ? 4 : isVertical ? 7 : 8,
          format: logTickLabel(isLog, (value) => formatValue(value, locale, options?.unit)),
          axis: options,
          isLog,
        }),
        // Room past the outermost bubbles.
        grace: isBubble && !isLog ? '6%' : 0,
      };
    };
    return {
      type: isBubble ? 'bubble' : 'scatter',
      data: {
        datasets: series.map((entry, index) => {
          const color = palette.series(entry.color, index);
          const isDimmed = isOtherHighlighted(entry.id);
          return {
            label: entry.label,
            data: entry.data.map((point) => ({
              x: point.x,
              y: point.y,
              r: isBubble ? bubbleRadius(point.size ?? 0, largest, 3, maxRadius) : 4,
            })),
            hidden: hidden.has(entry.id),
            pointStyle: POINT_STYLES[index % POINT_STYLES.length],
            backgroundColor: withAlpha(color, isDimmed ? 0.12 : isBubble ? 0.45 : 0.75),
            borderColor: withAlpha(color, isDimmed ? 0.25 : 1),
            borderWidth: 1.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            hoverRadius: 2,
          };
        }),
      },
      options: {
        ...baseOptions(isReducedMotion, {
          tooltip: tooltipOptions<'scatter' | 'bubble'>(palette, {
            title: (items) => {
              const item = items[0];
              if (!item) {
                return '';
              }
              const point = series[item.datasetIndex]?.data[item.dataIndex];
              return point?.label ?? item.dataset.label ?? '';
            },
            label: (item) => {
              const entry = series[item.datasetIndex];
              const point = entry?.data[item.dataIndex];
              if (!entry || !point) {
                return '';
              }
              return [
                ...(point.label === undefined || series.length < 2 ? [] : [entry.label]),
                `${xName}: ${formatValue(point.x, locale, xAxis?.unit)}`,
                `${yName}: ${formatValue(point.y, locale, yAxis?.unit)}`,
                ...(point.size === undefined
                  ? []
                  : [`${sizeName}: ${formatValue(point.size, locale, sizeUnit)}`]),
              ];
            },
          }),
          zoom: zoomOptions({
            control: zoom.control,
            palette,
            mode: 'xy',
            isZoomable,
            hasDrag: true,
            // Zooming never goes past the axes' hard bounds; Reset zoom returns to the configured range.
            limits: {
              x: { min: xAxis?.min ?? 'original', max: xAxis?.max ?? 'original' },
              y: { min: yAxis?.min ?? 'original', max: yAxis?.max ?? 'original' },
            },
          }),
        }),
        // Points at the plot's edges need room for their radius. Chart.js measures points' sizes when it lays out
        // (unlike lines' widths; see baseOptions), so its auto padding is steady here.
        layout: { autoPadding: true },
        interaction: { mode: 'nearest', intersect: false, axis: 'xy' },
        scales: { x: axis(xAxis, false), y: axis(yAxis, true) },
      },
    };
  }, [
    series,
    isBubble,
    hidden,
    isOtherHighlighted,
    palette,
    isReducedMotion,
    isNarrow,
    zoom.control,
    isZoomable,
    locale,
    xAxis,
    yAxis,
    xName,
    yName,
    sizeName,
    sizeUnit,
  ]);

  const { canvasRef, chart } = useChart(config);

  const summary = useMemo(() => {
    const count = series.reduce((sum, entry) => sum + entry.data.length, 0);
    const parts = [messages.scatterSummary({ points: count, series: series.length })];
    for (const entry of series) {
      const xs = extent(entry.data.map((point) => point.x));
      const ys = extent(entry.data.map((point) => point.y));
      if (!xs || !ys) {
        continue;
      }
      parts.push(
        messages.scatterSeriesRange({
          label: entry.label,
          xName,
          xMin: formatValue(xs[0], locale, xAxis?.unit),
          xMax: formatValue(xs[1], locale, xAxis?.unit),
          yName,
          yMin: formatValue(ys[0], locale, yAxis?.unit),
          yMax: formatValue(ys[1], locale, yAxis?.unit),
        }),
      );
      const r = correlation(entry.data);
      if (r !== undefined) {
        parts.push(
          messages.scatterCorrelation({
            r,
            value: numberFormat(locale, { maximumFractionDigits: 2 }).format(r),
          }),
        );
      }
    }
    return parts.join(' ');
  }, [messages, series, locale, xAxis, yAxis, xName, yName]);

  const table = (): ChartTable => {
    const hasLabels = series.some((entry) => entry.data.some((point) => point.label !== undefined));
    const hasSeries = series.length > 1 || !hasLabels;
    const number = (id: string, header: string) =>
      numberColumn(id, header, (value) => formatValue(value, locale), {
        isSortable: true,
        mobile: true,
      });
    const columns: DataTableColumn<Record<string, unknown>>[] = [
      ...(hasSeries
        ? [
            {
              id: 'series',
              header: messages.chartSeries,
              isRowHeader: !hasLabels,
              isSortable: true,
              value: (row: Record<string, unknown>) => row.series,
            },
          ]
        : []),
      ...(hasLabels
        ? [
            {
              id: 'label',
              header: messages.scatterPoint,
              isRowHeader: true,
              isSortable: true,
              value: (row: Record<string, unknown>) => row.label,
            },
          ]
        : []),
      number('x', withUnit(xName, xAxis?.unit)),
      number('y', withUnit(yName, yAxis?.unit)),
      ...(isBubble ? [number('size', withUnit(sizeName, sizeUnit))] : []),
    ];
    const rows = series.flatMap((entry) =>
      entry.data.map((point, index) => ({
        __key: `${entry.id}:${String(index)}`,
        series: entry.label,
        label: point.label ?? '',
        x: point.x,
        y: point.y,
        size: point.size ?? null,
      })),
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
      zoom={zoom}
      canvasRef={canvasRef}
    />
  );
}
