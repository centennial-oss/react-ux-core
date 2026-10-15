import type { ChartConfiguration, ChartDataset, ScriptableLineSegmentContext } from 'chart.js';
import { useMemo, useState } from 'react';
import { useLocale } from 'react-aria-components';
import { useTimeZone } from '../provider/context';
import { useMediaQuery } from '../utils/useMediaQuery';
import { downloadCsv, toCsv } from '../table/csv';
import type { DataTableColumn } from '../table/types';
import { ChartFrame, type ChartFrameOptions, type ChartTable } from './ChartFrame';
import { withAlpha, type ChartColor } from './colors';
import { areaFill } from './fade';
import { describeTimeSeries } from './describe';
import { formatTime, formatValue, toTime } from './format';
import type { ChartBand, ChartThreshold } from './setup';
import { timeAxis } from './timeAxis';
import { downloadPng, useChart, useChartLook } from './useChart';
import { useChartMessages } from './messages';

/** One reading: a time and a value (`null` for a gap). */
export interface TimePoint {
  t: Date | number | string;
  v: number | null;
}

/** Part of a series drawn differently, such as a forecast or estimated readings. */
export interface SeriesSegment {
  from: Date | number | string;
  to: Date | number | string;
  /** `dashed` lines or `faded` colour. */
  style: 'dashed' | 'faded';
}

export interface TimeSeries {
  id: string;
  label: string;
  /** The values' unit, shown on the axis and in tooltips ("kWh"). */
  unit?: string;
  /** Defaults to `line`. */
  type?: 'line' | 'bar' | 'area' | 'scatter';
  /** Which value axis. Defaults to `left`. */
  axis?: 'left' | 'right';
  /** A palette slot or tone from the theme. Defaults to the next palette colour. */
  color?: ChartColor;
  /** A dash pattern for the line, such as `[6, 4]`. */
  dash?: readonly number[];
  /** Series with the same stack id stack (bars and areas). */
  stack?: string;
  /** An area's shade opacity, from 0 to 1. Defaults to 0.2. */
  shadeOpacity?: number;
  /**
   * Fades an area's shade toward the x-axis, from 0 (the shade's opacity all the way down, the default) to 100
   * (transparent at the axis). It only ever makes the shade more transparent.
   */
  fade?: number;
  data: readonly TimePoint[];
  segments?: readonly SeriesSegment[];
}

export interface TimeSeriesChartProps extends ChartFrameOptions {
  series: readonly TimeSeries[];
  /** IANA time zone for the axis, tooltips and table. Defaults to the provider's. */
  timeZone?: string;
  thresholds?: readonly ChartThreshold[];
  bands?: readonly ChartBand[];
  /**
   * Called with the range dragged across the chart (desktop) or zoomed to. The chart zooms to it; Reset zoom
   * returns. On touch screens, pinch and pan zoom instead (offer a TimeRangePicker for exact ranges).
   */
  onRangeSelect?: (start: Date, end: Date) => void;
  /** Allows zooming (pinch and pan on touch, Ctrl+wheel or drag with `onRangeSelect`). Defaults to true. */
  isZoomable?: boolean;
}

function inSegment(
  time: number,
  segments: readonly SeriesSegment[] | undefined,
  style: SeriesSegment['style'],
) {
  return (
    segments?.some(
      (segment) =>
        segment.style === style && time >= toTime(segment.from) && time <= toTime(segment.to),
    ) ?? false
  );
}

/**
 * A chart of values over time: line, bar, area and scatter series on one or two value axes, in a time zone. Hover
 * or tap shows every series at that time; the legend shows, hides and highlights series; thresholds, bands and
 * segments mark limits and estimates; drag (desktop) or pinch and pan (touch) zoom in. It has a title, a generated
 * text summary, "View as table", PNG and CSV export and full screen. It knows nothing about fetching data.
 */
export function TimeSeriesChart({
  series,
  timeZone: timeZoneProp,
  thresholds = [],
  bands = [],
  onRangeSelect,
  isZoomable = true,
  exportFileName,
  isLoading,
  error,
  ...frame
}: TimeSeriesChartProps) {
  const messages = useChartMessages();
  const { locale } = useLocale();
  const providerZone = useTimeZone();
  const timeZone = timeZoneProp ?? providerZone;
  const { palette, isReducedMotion } = useChartLook();
  const isCoarse = useMediaQuery('(pointer: coarse)');
  const isNarrow = useMediaQuery('(max-width: 639.98px)');
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [isZoomed, setZoomed] = useState(false);

  const colors = useMemo(
    () => new Map(series.map((entry, index) => [entry.id, palette.series(entry.color, index)])),
    [series, palette],
  );
  const units = useMemo(
    () => ({
      left: series.find((entry) => (entry.axis ?? 'left') === 'left')?.unit,
      right: series.find((entry) => entry.axis === 'right')?.unit,
    }),
    [series],
  );
  const hasRight = series.some((entry) => entry.axis === 'right');
  const isEmpty = series.every((entry) => entry.data.every((point) => point.v === null));

  const config = useMemo((): ChartConfiguration<'line' | 'bar' | 'scatter'> => {
    const datasets = series.map(
      (entry): ChartDataset<'line' | 'bar' | 'scatter', { x: number; y: number | null }[]> => {
        const base = colors.get(entry.id) ?? palette.series(undefined, 0);
        const isDimmed = highlighted !== null && highlighted !== entry.id;
        const color = isDimmed ? withAlpha(base, 0.25) : base;
        const type = entry.type ?? 'line';
        const shared = {
          label: entry.label,
          data: entry.data.map((point) => ({ x: toTime(point.t), y: point.v })),
          yAxisID: entry.axis === 'right' ? 'right' : 'left',
          hidden: hidden.has(entry.id),
          stack: entry.stack,
          borderColor: color,
        };
        if (type === 'bar') {
          return {
            ...shared,
            type: 'bar',
            backgroundColor: withAlpha(base, isDimmed ? 0.2 : 0.8),
          } as never;
        }
        if (type === 'scatter') {
          return { ...shared, type: 'scatter', backgroundColor: color, pointRadius: 3 } as never;
        }
        return {
          ...shared,
          type: 'line',
          fill: type === 'area' ? (entry.stack ? 'stack' : 'origin') : false,
          backgroundColor: areaFill(
            base,
            (entry.shadeOpacity ?? 0.2) * (isDimmed ? 0.4 : 1),
            entry.fade ?? 0,
            entry.data.map((point) => point.v),
            entry.axis === 'right' ? 'right' : 'left',
          ),
          borderWidth: 2,
          borderDash: entry.dash ? [...entry.dash] : undefined,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.2,
          spanGaps: false,
          segment: entry.segments
            ? {
                borderDash: (context: ScriptableLineSegmentContext) =>
                  inSegment(context.p0.parsed.x ?? 0, entry.segments, 'dashed')
                    ? [6, 4]
                    : undefined,
                borderColor: (context: ScriptableLineSegmentContext) =>
                  inSegment(context.p0.parsed.x ?? 0, entry.segments, 'faded')
                    ? withAlpha(base, 0.35)
                    : undefined,
              }
            : undefined,
        } as never;
      },
    );

    const axis = (position: 'left' | 'right', unit: string | undefined, isShown: boolean) => ({
      type: 'linear' as const,
      position,
      display: isShown,
      stacked: series.some(
        (entry) => entry.stack !== undefined && (entry.axis ?? 'left') === position,
      ),
      grid: { color: palette.grid, drawOnChartArea: position === 'left' },
      border: { color: palette.grid },
      ticks: {
        color: palette.mutedText,
        maxTicksLimit: isNarrow ? 5 : 7,
        callback: (value: number | string) => formatValue(Number(value), locale, unit),
      },
    });

    return {
      type: 'line',
      data: { datasets },
      options: {
        parsing: false,
        responsive: true,
        maintainAspectRatio: false,
        animation: isReducedMotion ? false : { duration: 250 },
        interaction: { mode: 'timeAll', intersect: false },
        color: palette.text,
        font: { family: palette.font.replace(/^\d+px /, '') },
        scales: {
          x: timeAxis({
            timeZone,
            locale,
            palette,
            isNarrow,
            times: datasets.flatMap((dataset) => dataset.data.map((point) => point.x)),
            barTimes: datasets.flatMap((dataset) =>
              dataset.type === 'bar' ? dataset.data.map((point) => point.x) : [],
            ),
          }),
          left: axis('left', units.left, true),
          right: axis('right', units.right, hasRight),
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            borderWidth: 1,
            titleColor: palette.text,
            bodyColor: palette.text,
            callbacks: {
              title: (items) =>
                items[0] ? formatTime(items[0].parsed.x ?? 0, locale, timeZone) : '',
              label: (item) => {
                const entry = series[item.datasetIndex];
                return `${entry?.label ?? ''}: ${item.parsed.y === null ? '—' : formatValue(item.parsed.y, locale, entry?.unit)}`;
              },
            },
          },
          crosshair: { color: palette.border },
          reference: {
            thresholds: thresholds.map((line) => ({
              value: line.value,
              label: line.label,
              scaleId: line.axis === 'right' ? 'right' : 'left',
              color: palette.tone(line.tone ?? 'danger'),
            })),
            bands: bands.map((band) => ({
              from: band.from,
              to: band.to,
              label: band.label,
              scaleId: band.axis === 'right' ? 'right' : 'left',
              color: withAlpha(palette.tone(band.tone ?? 'neutral'), 0.12),
            })),
            labelColor: palette.mutedText,
            font: palette.font,
          },
          zoom: {
            limits: { x: { minRange: 60_000 } },
            pan: { enabled: isZoomable && isCoarse, mode: 'x' },
            zoom: {
              mode: 'x',
              pinch: { enabled: isZoomable },
              wheel: { enabled: isZoomable, modifierKey: 'ctrl' },
              drag: {
                enabled: isZoomable && onRangeSelect !== undefined && !isCoarse,
                backgroundColor: withAlpha(palette.series('accent', 0), 0.15),
              },
              onZoomComplete: ({ chart }) => {
                setZoomed(chart.isZoomedOrPanned());
                const scale = chart.scales.x;
                if (onRangeSelect && scale && chart.isZoomedOrPanned()) {
                  onRangeSelect(new Date(scale.min), new Date(scale.max));
                }
              },
            },
          },
        },
      },
    };
  }, [
    series,
    colors,
    palette,
    highlighted,
    hidden,
    isReducedMotion,
    timeZone,
    locale,
    units,
    hasRight,
    isNarrow,
    isCoarse,
    isZoomable,
    onRangeSelect,
    thresholds,
    bands,
  ]);

  const { canvasRef, chart } = useChart(config);

  // A plain-language summary for screen readers: the time span and each series' range and latest value.
  const summary = useMemo(
    () => describeTimeSeries(series, messages, locale, timeZone),
    [series, messages, locale, timeZone],
  );

  const table = (): ChartTable => {
    const byTime = new Map<number, Record<string, unknown>>();
    for (const entry of series) {
      for (const point of entry.data) {
        const time = toTime(point.t);
        const row = byTime.get(time) ?? { __key: time, time };
        row[entry.id] = point.v;
        byTime.set(time, row);
      }
    }
    const columns: DataTableColumn<Record<string, unknown>>[] = [
      {
        id: 'time',
        header: messages.time,
        isRowHeader: true,
        isSortable: true,
        value: (row) => row.time,
        cell: ({ value }) => formatTime(Number(value), locale, timeZone),
        csv: (row) => new Date(Number(row.time)).toISOString(),
      },
      ...series.map((entry): DataTableColumn<Record<string, unknown>> => ({
        id: entry.id,
        header: entry.unit ? `${entry.label} (${entry.unit})` : entry.label,
        align: 'end',
        isSortable: true,
        value: (row) => row[entry.id],
        cell: ({ value }) => (typeof value === 'number' ? formatValue(value, locale) : ''),
        mobile: true,
      })),
    ];
    return { columns, rows: [...byTime.values()].sort((a, b) => Number(a.time) - Number(b.time)) };
  };

  return (
    <ChartFrame
      {...frame}
      isLoading={isLoading}
      error={error}
      exportFileName={exportFileName}
      summary={summary}
      isEmpty={isEmpty}
      legend={series.map((entry) => ({
        id: entry.id,
        label: entry.label,
        color: colors.get(entry.id) ?? palette.series(undefined, 0),
        isHidden: hidden.has(entry.id),
      }))}
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
      isZoomed={isZoomed}
      onResetZoom={() => {
        chart?.resetZoom();
        setZoomed(false);
      }}
      canvasRef={canvasRef}
    />
  );
}
