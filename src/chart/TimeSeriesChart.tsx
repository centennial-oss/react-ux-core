import type {
  Chart,
  ChartConfiguration,
  ChartDataset,
  ScriptableLineSegmentContext,
} from 'chart.js';
import { useEffect, useMemo, type ReactNode } from 'react';
import { useLocale } from 'react-aria-components';
import { useTimeZone } from '../provider/context';
import { useIsPhone } from '../utils/useMediaQuery';
import { toEpochMs } from '../utils/time';
import { useLatest } from '../utils/useLatest';
import { ChartFrame, type ChartFrameOptions, type ChartTable } from './ChartFrame';
import { baseOptions, themeText, tooltipOptions, valueScale, zoomOptions } from './chartOptions';
import { withAlpha, type ChartColor } from './colors';
import { areaFill } from './fade';
import { describeTimeSeries } from './describe';
import { useChartEvents, withEventRows, type ChartEvent } from './events';
import { formatPercent, formatSeriesValue, formatTime, formatValue } from './format';
import type { ChartBand, ChartThreshold } from './setup';
import { numberColumn, timeColumn, withUnit } from './tableColumns';
import { timeAxis } from './timeAxis';
import { logTickLabel, type ValueAxisOptions } from './valueAxis';
import {
  useChart,
  useChartLook,
  useChartZoom,
  useSeriesVisibility,
  type SeriesVisibilityOptions,
} from './useChart';
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
  /**
   * Series with the same stack id stack (bars and areas). `{ id, mode: 'percent' }` stacks them to 100%: each
   * series shows its share of the stack's total at each time, on a 0–100% axis.
   */
  stack?: string | TimeSeriesStack;
  /** `percent` shows values given from 0 to 100 as percentages ("62%"). Defaults to `number` (with `unit`). */
  format?: 'number' | 'percent';
  /** Draws the series faded, such as the losing outcomes after a market resolves. */
  isFaded?: boolean;
  /** Draws the series' line thicker, such as the winning outcome. */
  isEmphasized?: boolean;
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

/** A stack with a mode: `normal` adds the values up; `percent` stacks each time's values to 100%. */
export interface TimeSeriesStack {
  id: string;
  /** Defaults to `normal`. */
  mode?: 'normal' | 'percent';
}

export interface TimeSeriesChartProps extends ChartFrameOptions, SeriesVisibilityOptions {
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
  /**
   * The visible time window as [start, end] in epoch milliseconds, whatever the data covers (a dashboard's time range,
   * with data missing at the edges). A new window replaces any zoom. Defaults to the data's extent.
   */
  xRange?: readonly [number, number];
  /**
   * The value axes' ranges and titles. By default each axis fits its data and stretches to include its thresholds
   * and bands; `min`/`max` pin it, such as 0–100 for percentages.
   */
  axes?: { left?: ValueAxisOptions; right?: ValueAxisOptions };
  /** Events marked on the time axis: deploys, incidents, news, maintenance windows. */
  events?: readonly ChartEvent[];
  /** Called when an event's marker (or, in a cluster's popover, the event) is pressed. */
  onEventPress?: (event: ChartEvent) => void;
  /** Replaces the generated description of the series in the chart's summary (axis titles and events are kept). */
  summary?: string;
  /** Shows each series' latest value in the legend. Defaults to false. */
  hasLegendValues?: boolean;
}

/** A live chart's connection to the plot (LiveTimeSeries): its points are drawn in place of the series' data. */
export interface LiveBinding {
  /** The points drawn for a series, mutated in place by the live chart between updates. */
  points: (seriesId: string) => { x: number; y: number | null }[];
  /** The visible time window, or undefined before the first point. */
  window: () => readonly [number, number] | undefined;
  /** Called with the Chart.js instance when it's created and with null when it's destroyed. */
  onChart: (chart: Chart | null) => void;
}

interface TimeSeriesPlotProps extends TimeSeriesChartProps {
  live?: LiveBinding;
  /** More controls over the canvas, after the event markers. */
  overlay?: ReactNode;
  /** More toolbar controls. */
  actions?: ReactNode;
  /** Shades a line down to another series' line (by id), such as percentile bands (LatencyChart). */
  fillTo?: ReadonlyMap<string, string>;
  /** The left value axis's scale. Defaults to `linear`. */
  valueScale?: 'linear' | 'logarithmic';
}

function stackId(entry: TimeSeries): string | undefined {
  return typeof entry.stack === 'string' ? entry.stack : entry.stack?.id;
}

function isPercentStack(entry: TimeSeries): boolean {
  return typeof entry.stack === 'object' && entry.stack.mode === 'percent';
}

/**
 * Each percent-stacked series' values as shares of their stack's total at each time (0–100), counting only the
 * shown series, so hiding one re-spreads the others to 100%. Other series are left out.
 */
export function percentStackValues(
  series: readonly TimeSeries[],
  hidden: ReadonlySet<string> = new Set(),
): Map<string, (number | null)[]> {
  const totals = new Map<string, Map<number, number>>();
  for (const entry of series) {
    const id = stackId(entry);
    if (!isPercentStack(entry) || id === undefined || hidden.has(entry.id)) {
      continue;
    }
    const byTime = totals.get(id) ?? new Map<number, number>();
    for (const point of entry.data) {
      const time = toEpochMs(point.t);
      byTime.set(time, (byTime.get(time) ?? 0) + Math.max(0, point.v ?? 0));
    }
    totals.set(id, byTime);
  }
  const shares = new Map<string, (number | null)[]>();
  for (const entry of series) {
    const id = stackId(entry);
    if (!isPercentStack(entry) || id === undefined) {
      continue;
    }
    const byTime = totals.get(id);
    shares.set(
      entry.id,
      entry.data.map((point) => {
        if (point.v === null) {
          return null;
        }
        const total = byTime?.get(toEpochMs(point.t)) ?? 0;
        return total > 0 ? (Math.max(0, point.v) / total) * 100 : 0;
      }),
    );
  }
  return shares;
}

function inSegment(
  time: number,
  segments: readonly SeriesSegment[] | undefined,
  style: SeriesSegment['style'],
) {
  return (
    segments?.some(
      (segment) =>
        segment.style === style && time >= toEpochMs(segment.from) && time <= toEpochMs(segment.to),
    ) ?? false
  );
}

/**
 * A chart of values over time: line, bar, area and scatter series on one or two value axes, in a time zone. Hover
 * or tap shows every series at that time; the legend shows, hides and highlights series; thresholds, bands and
 * segments mark limits and estimates; drag (desktop) or pinch and pan (touch) zoom in. It has a title, a generated
 * text summary, "View as table", PNG and CSV export and full screen. It knows nothing about fetching data.
 */
export function TimeSeriesChart(props: TimeSeriesChartProps) {
  return <TimeSeriesPlot {...props} />;
}

const noEvents: readonly ChartEvent[] = [];

/** TimeSeriesChart, plus the live binding and overlay LiveTimeSeries uses. */
export function TimeSeriesPlot({
  series,
  timeZone: timeZoneProp,
  thresholds = [],
  bands = [],
  onRangeSelect,
  isZoomable = true,
  xRange,
  axes,
  events = noEvents,
  onEventPress,
  summary: summaryProp,
  hasLegendValues = false,
  live,
  overlay,
  actions,
  fillTo,
  valueScale: scale = 'linear',
  hiddenSeries,
  defaultHiddenSeries,
  onHiddenSeriesChange,
  highlightedSeries,
  onHighlightedSeriesChange,
  ...frame
}: TimeSeriesPlotProps) {
  const messages = useChartMessages();
  const { locale } = useLocale();
  const providerZone = useTimeZone();
  const timeZone = timeZoneProp ?? providerZone;
  const { palette, isReducedMotion } = useChartLook();
  const isNarrow = useIsPhone();
  const {
    hidden,
    isDimmed: isOtherHighlighted,
    legendProps,
  } = useSeriesVisibility({
    hiddenSeries,
    defaultHiddenSeries,
    onHiddenSeriesChange,
    highlightedSeries,
    onHighlightedSeriesChange,
  });
  const zoom = useChartZoom();
  const [xStart, xEnd] = xRange ?? [];

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
  const shares = useMemo(() => percentStackValues(series, hidden), [series, hidden]);
  const chartEvents = useChartEvents({
    events,
    palette,
    messages,
    locale,
    timeZone,
    onEventPress,
  });

  const config = useMemo((): ChartConfiguration<'line' | 'bar' | 'scatter'> => {
    const datasets = series.map(
      (entry): ChartDataset<'line' | 'bar' | 'scatter', { x: number; y: number | null }[]> => {
        const base = colors.get(entry.id) ?? palette.series(undefined, 0);
        const isDimmed = isOtherHighlighted(entry.id) || entry.isFaded === true;
        const color = isDimmed ? withAlpha(base, entry.isFaded ? 0.35 : 0.25) : base;
        const type = entry.type ?? 'line';
        const share = shares.get(entry.id);
        const fillTarget = fillTo?.get(entry.id);
        const fillIndex =
          fillTarget === undefined
            ? -1
            : series.findIndex((candidate) => candidate.id === fillTarget);
        const shared = {
          label: entry.label,
          data:
            live?.points(entry.id) ??
            entry.data.map((point, index) => ({
              x: toEpochMs(point.t),
              y: share ? (share[index] ?? null) : point.v,
            })),
          yAxisID: entry.axis === 'right' ? 'right' : 'left',
          hidden: hidden.has(entry.id),
          stack: stackId(entry),
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
          fill:
            fillIndex >= 0
              ? fillIndex
              : type === 'area'
                ? entry.stack
                  ? 'stack'
                  : 'origin'
                : false,
          backgroundColor: areaFill(
            base,
            (entry.shadeOpacity ?? 0.2) * (isDimmed ? 0.4 : 1),
            entry.fade ?? 0,
            share ?? entry.data.map((point) => point.v),
            entry.axis === 'right' ? 'right' : 'left',
          ),
          borderWidth: entry.isEmphasized ? 3 : 2,
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

    // Threshold values and band edges on an axis, which stretch it so they show.
    const references = (position: 'left' | 'right') => [
      ...thresholds.filter((line) => (line.axis ?? 'left') === position).map((line) => line.value),
      ...bands
        .filter((band) => (band.axis ?? 'left') === position)
        .flatMap((band) => [band.from, band.to]),
    ];
    const onAxis = (position: 'left' | 'right') =>
      series.filter((entry) => (entry.axis ?? 'left') === position);
    const axis = (position: 'left' | 'right', unit: string | undefined, isShown: boolean) => {
      // A percent stack's axis runs from 0 to 100% unless the app pins it otherwise.
      const isPercentAxis = onAxis(position).some(isPercentStack);
      const isPercentTicks = isPercentAxis || onAxis(position)[0]?.format === 'percent';
      const isLog = position === 'left' && scale === 'logarithmic';
      return {
        ...valueScale(palette, {
          maxTicksLimit: isNarrow ? 5 : 7,
          format: logTickLabel(isLog, (value) =>
            isPercentTicks ? formatPercent(value, locale) : formatValue(value, locale, unit),
          ),
          axis: isPercentAxis ? { min: 0, max: 100, ...axes?.[position] } : axes?.[position],
          references: references(position),
          isLog,
          grid: { drawOnChartArea: position === 'left' },
        }),
        position,
        display: isShown,
        stacked: onAxis(position).some((entry) => stackId(entry) !== undefined),
      };
    };

    const liveWindow = live?.window();
    const xAxis = timeAxis({
      timeZone,
      locale,
      palette,
      isNarrow,
      times: live ? [] : datasets.flatMap((dataset) => dataset.data.map((point) => point.x)),
      barTimes: live
        ? []
        : datasets.flatMap((dataset) =>
            dataset.type === 'bar' ? dataset.data.map((point) => point.x) : [],
          ),
    });

    return {
      type: 'line',
      data: { datasets },
      plugins: [chartEvents.plugin],
      options: {
        ...baseOptions(isReducedMotion, {
          tooltip: tooltipOptions<'line'>(palette, {
            title: (items) =>
              items[0] ? formatTime(items[0].parsed.x ?? 0, locale, timeZone) : '',
            label: (item) => {
              const entry = series[item.datasetIndex];
              const value =
                item.parsed.y === null
                  ? '—'
                  : entry && isPercentStack(entry)
                    ? formatPercent(item.parsed.y, locale)
                    : formatSeriesValue(item.parsed.y, locale, entry);
              return `${entry?.label ?? ''}: ${value}`;
            },
          }),
          crosshair: { color: palette.border },
          chartEvents: chartEvents.options,
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
          zoom: zoomOptions({
            control: zoom.control,
            palette,
            mode: 'x',
            isZoomable,
            hasDrag: onRangeSelect !== undefined,
            // Zooming never goes past the axes' hard bounds; Reset zoom returns to the configured range.
            limits: {
              x: { minRange: 60_000 },
              left: { min: axes?.left?.min ?? 'original', max: axes?.left?.max ?? 'original' },
              right: { min: axes?.right?.min ?? 'original', max: axes?.right?.max ?? 'original' },
            },
            onRangeSelect,
          }),
        }),
        parsing: false,
        interaction: { mode: 'timeAll', intersect: false },
        ...themeText(palette),
        scales: {
          x: liveWindow
            ? { ...xAxis, min: liveWindow[0], max: liveWindow[1] }
            : xStart !== undefined && xEnd !== undefined
              ? { ...xAxis, min: xStart, max: xEnd }
              : xAxis,
          left: axis('left', units.left, true),
          right: axis('right', units.right, hasRight),
        },
      },
    };
  }, [
    series,
    colors,
    palette,
    isOtherHighlighted,
    hidden,
    isReducedMotion,
    timeZone,
    locale,
    units,
    hasRight,
    isNarrow,
    zoom.control,
    isZoomable,
    onRangeSelect,
    thresholds,
    bands,
    axes,
    shares,
    live,
    chartEvents.plugin,
    chartEvents.options,
    fillTo,
    scale,
    xStart,
    xEnd,
  ]);

  const { canvasRef, chart } = useChart(config);

  // A new window replaces any zoom (a dashboard's range changed, perhaps to the range zoomed to).
  const latestZoom = useLatest({ chart, setZoomed: zoom.control.setZoomed });
  useEffect(() => {
    const { chart: current, setZoomed } = latestZoom.current;
    if (current?.isZoomedOrPanned()) {
      current.resetZoom('none');
    }
    setZoomed(false);
  }, [xStart, xEnd, latestZoom]);

  useEffect(() => {
    live?.onChart(chart);
  }, [live, chart]);

  // A plain-language summary for screen readers: the time span and each series' range and latest value.
  const summary = useMemo(
    () =>
      [
        summaryProp ?? describeTimeSeries(series, messages, locale, timeZone),
        ...[axes?.left?.title, hasRight ? axes?.right?.title : undefined].flatMap((title) =>
          title === undefined ? [] : [messages.valueAxisTitle({ title })],
        ),
        ...(chartEvents.summary === '' ? [] : [chartEvents.summary]),
      ].join(' '),
    [series, messages, locale, timeZone, axes, hasRight, summaryProp, chartEvents.summary],
  );

  const table = (): ChartTable => {
    const byTime = new Map<number, Record<string, unknown>>();
    for (const entry of series) {
      for (const point of entry.data) {
        const time = toEpochMs(point.t);
        const row = byTime.get(time) ?? { __key: time, time };
        row[entry.id] = point.v;
        byTime.set(time, row);
      }
    }
    const columns = [
      timeColumn(messages.time, (time) => formatTime(time, locale, timeZone)),
      ...series.map((entry) =>
        entry.format === 'percent'
          ? numberColumn(entry.id, entry.label, (value) => formatPercent(value, locale), {
              isSortable: true,
              mobile: true,
            })
          : numberColumn(
              entry.id,
              withUnit(entry.label, entry.unit),
              (value) => formatValue(value, locale),
              { isSortable: true, mobile: true },
            ),
      ),
    ];
    return withEventRows(
      { columns, rows: [...byTime.values()].sort((a, b) => Number(a.time) - Number(b.time)) },
      events,
      messages,
      locale,
    );
  };

  const latestValue = (entry: TimeSeries) => {
    for (let index = entry.data.length - 1; index >= 0; index--) {
      const value = entry.data[index]?.v;
      if (value !== null && value !== undefined) {
        return formatSeriesValue(value, locale, entry);
      }
    }
    return undefined;
  };

  return (
    <ChartFrame
      {...frame}
      summary={summary}
      isEmpty={isEmpty}
      {...legendProps(
        series.map((entry) => ({
          id: entry.id,
          label: entry.label,
          color: colors.get(entry.id) ?? palette.series(undefined, 0),
          value: hasLegendValues ? latestValue(entry) : undefined,
        })),
      )}
      table={table}
      chart={chart}
      zoom={zoom}
      canvasRef={canvasRef}
      actions={actions}
      overlay={
        chartEvents.overlay !== null || overlay !== undefined ? (
          <>
            {chartEvents.overlay}
            {overlay}
          </>
        ) : undefined
      }
    />
  );
}
