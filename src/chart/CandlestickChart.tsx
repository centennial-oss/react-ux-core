// CandlestickChart (FR-052): prices over time as candles, OHLC bars or a closing line, with a volume pane, overlays
// such as moving averages, and events. Candles are Chart.js floating bars (no financial plugin): a body from the open
// to the close and a thin wick from the low to the high. Up candles are hollow and down candles filled, in the success
// and danger tones, so colour isn't the only signal. Hovering or touching the plot moves a crosshair and fills the
// readout above it with that candle's open, high, low, close, change and volume (the latest candle otherwise). Zoom
// and pan work as in TimeSeriesChart, and the last candle updates live through a handle.

import type { Chart, ChartConfiguration, ChartDataset, ChartType, Plugin } from 'chart.js';
import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { useLocale } from 'react-aria-components';
import { useTimeZone } from '../provider/context';
import { downloadCsv, toCsv } from '../table/csv';
import type { DataTableColumn } from '../table/types';
import { cn } from '../utils/cn';
import { useMediaQuery } from '../utils/useMediaQuery';
import { ChartFrame, type ChartFrameOptions, type ChartTable } from './ChartFrame';
import { withAlpha, type ChartColor } from './colors';
import { useChartEvents, withEventRows, type ChartEvent } from './events';
import { formatTime, toTime } from './format';
import { useChartMessages, type ChartStrings } from './messages';
import type { TimeSeries } from './TimeSeriesChart';
import { downloadPng, useChart, useChartLook } from './useChart';
import { timeAxis } from './timeAxis';

/** One period's open, high, low and close, and optionally its volume. */
export interface Ohlc {
  t: Date | number | string;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
}

export interface CandlestickChartHandle {
  /** Replaces the latest candle (the same time) or adds one (a later time). Draws on the next animation frame. */
  update: (candle: Ohlc) => void;
}

export interface CandlestickChartProps extends ChartFrameOptions {
  data: readonly Ohlc[];
  /** Names the price series in the summary, legend and table, such as a ticker. Defaults to "Price". */
  label?: string;
  /** `candle` bodies and wicks, `ohlc` bars, or a `line` of closes. Defaults to `candle`. */
  style?: 'candle' | 'ohlc' | 'line';
  /** Volume bars in a pane below the prices. Defaults to true when the data has volumes (`v`). */
  hasVolume?: boolean;
  /** Lines over the prices, such as moving averages computed by the app. */
  overlays?: readonly TimeSeries[];
  /** The closing line's colour (`style: 'line'`). Defaults to `chart-1`. */
  color?: ChartColor;
  /** Events marked on the time axis, such as news or earnings. */
  events?: readonly ChartEvent[];
  onEventPress?: (event: ChartEvent) => void;
  /** An ISO 4217 code: prices are shown as that currency. Without one they're numbers with two decimals. */
  currency?: string;
  /** IANA time zone for the axis, readout, summary and table. Defaults to the provider's. */
  timeZone?: string;
  /** Called with the range dragged across the chart (desktop) or zoomed to; see TimeSeriesChart. */
  onRangeSelect?: (start: Date, end: Date) => void;
  /** Allows zooming (pinch and pan on touch, Ctrl+wheel or drag with `onRangeSelect`). Defaults to true. */
  isZoomable?: boolean;
  /** Receives the handle that updates the latest candle. */
  handleRef?: Ref<CandlestickChartHandle>;
}

/**
 * The candles after live updates: each replaces the candle at its time (the latest, usually) or, when later than
 * them all, is added. Updates older than the latest candle with no candle at their time are dropped.
 */
export function applyCandleUpdates(
  candles: readonly Ohlc[],
  updates: readonly Ohlc[],
): readonly Ohlc[] {
  if (updates.length === 0) {
    return candles;
  }
  const next = [...candles];
  for (const update of updates) {
    const time = toTime(update.t);
    const last = next.at(-1);
    if (!last || time > toTime(last.t)) {
      next.push(update);
      continue;
    }
    for (let index = next.length - 1; index >= 0; index--) {
      const candle = next[index];
      if (candle && toTime(candle.t) === time) {
        next[index] = update;
        break;
      }
      if (candle && toTime(candle.t) < time) {
        break;
      }
    }
  }
  return next;
}

/** Whether the candles are a day or more apart, so times are shown as dates. */
function isDaily(candles: readonly Ohlc[]): boolean {
  let gap = Number.POSITIVE_INFINITY;
  for (let index = 1; index < Math.min(candles.length, 50); index++) {
    gap = Math.min(gap, toTime(candles[index]?.t ?? 0) - toTime(candles[index - 1]?.t ?? 0));
  }
  return Number.isFinite(gap) && gap >= 20 * 3_600_000;
}

/** Options for the OHLC ticks plugin, keyed under `plugins.ohlcTicks`. */
interface OhlcTickOptions {
  /** The dataset whose bars give each candle's position and width. */
  datasetIndex: number;
  ticks: readonly { open: number; close: number; color: string }[];
}

declare module 'chart.js' {
  // The type parameter must match Chart.js's declaration to merge with it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    ohlcTicks?: OhlcTickOptions;
  }
}

/** OHLC bars' ticks: the open to the left of each bar, the close to the right. */
const ohlcTicksPlugin: Plugin<ChartType, OhlcTickOptions> = {
  id: 'ohlcTicks',
  afterDatasetsDraw(chart, _args, options: OhlcTickOptions | undefined) {
    const scale = chart.scales.price;
    if (!Array.isArray(options?.ticks) || !scale) {
      return;
    }
    const meta = chart.getDatasetMeta(options.datasetIndex);
    if (meta.hidden || !chart.isDatasetVisible(options.datasetIndex)) {
      return;
    }
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.lineWidth = 1.5;
    meta.data.forEach((element, index) => {
      const tick = options.ticks[index];
      const { x, width } = element.getProps(['x', 'width'], true) as { x: number; width: number };
      if (!tick || x < chartArea.left || x > chartArea.right) {
        return;
      }
      const half = Math.max(1.5, width / 2);
      ctx.strokeStyle = tick.color;
      ctx.beginPath();
      ctx.moveTo(x - half, scale.getPixelForValue(tick.open));
      ctx.lineTo(x, scale.getPixelForValue(tick.open));
      ctx.moveTo(x, scale.getPixelForValue(tick.close));
      ctx.lineTo(x + half, scale.getPixelForValue(tick.close));
      ctx.stroke();
    });
    ctx.restore();
  },
};

const noEvents: readonly ChartEvent[] = [];
const noOverlays: readonly TimeSeries[] = [];

/** Prices over time as candles, OHLC bars or a line, with volume, overlays, events and a crosshair readout. */
export function CandlestickChart({
  data,
  label: labelProp,
  style = 'candle',
  hasVolume: hasVolumeProp,
  overlays = noOverlays,
  color,
  events = noEvents,
  onEventPress,
  currency,
  timeZone: timeZoneProp,
  onRangeSelect,
  isZoomable = true,
  handleRef,
  exportFileName,
  isLoading,
  error,
  ...frame
}: CandlestickChartProps) {
  const messages = useChartMessages();
  const { locale } = useLocale();
  const providerZone = useTimeZone();
  const timeZone = timeZoneProp ?? providerZone;
  const { palette, isReducedMotion } = useChartLook();
  const isCoarse = useMediaQuery('(pointer: coarse)');
  const isNarrow = useMediaQuery('(max-width: 639.98px)');
  const label = labelProp ?? messages.candlePrice;
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [isZoomed, setZoomed] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Live updates: queued by the handle, applied once per animation frame, and dropped when `data` changes.
  const [live, setLive] = useState({ source: data, candles: data });
  const candles = live.source === data ? live.candles : data;
  const queue = useRef({ updates: [] as Ohlc[], frame: null as number | null, data });
  useEffect(() => {
    queue.current.data = data;
  }, [data]);
  useEffect(
    () => () => {
      const { frame } = queue.current;
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
    },
    [],
  );
  useImperativeHandle(
    handleRef,
    () => ({
      update(candle) {
        const current = queue.current;
        current.updates.push(candle);
        current.frame ??= requestAnimationFrame(() => {
          current.frame = null;
          const updates = current.updates;
          current.updates = [];
          setLive((previous) => {
            const base = previous.source === current.data ? previous.candles : current.data;
            return { source: current.data, candles: applyCandleUpdates(base, updates) };
          });
        });
      },
    }),
    [],
  );

  const hasVolume = hasVolumeProp ?? candles.some((candle) => candle.v !== undefined);
  const isDay = useMemo(() => isDaily(candles), [candles]);
  const formats = useMemo(() => {
    const price = new Intl.NumberFormat(
      locale,
      currency === undefined
        ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        : { style: 'currency', currency },
    );
    const volume = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
    const change = new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits: 2,
      signDisplay: 'exceptZero',
    });
    const day = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone });
    return {
      price: (value: number) => price.format(value),
      volume: (value: number) => volume.format(value),
      change: (from: number, to: number) => change.format(from === 0 ? 0 : (to - from) / from),
      time: (time: number) => (isDay ? day.format(time) : formatTime(time, locale, timeZone)),
    };
  }, [locale, currency, timeZone, isDay]);

  const chartEvents = useChartEvents({
    events,
    palette,
    messages,
    locale,
    timeZone,
    onEventPress,
  });

  const priceId = '__price';
  const isPriceHidden = hidden.has(priceId);

  const config = useMemo((): ChartConfiguration<'bar' | 'line'> => {
    const up = palette.tone('success');
    const down = palette.tone('danger');
    const isUp = (candle: Ohlc) => candle.c >= candle.o;
    const dim = (id: string, value: string, alpha = 1) =>
      withAlpha(value, highlighted !== null && highlighted !== id ? 0.25 : alpha);
    const times = candles.map((candle) => toTime(candle.t));
    const datasets: ChartDataset<'bar' | 'line', unknown[]>[] = overlays.map(
      (overlay, index): ChartDataset<'line', unknown[]> => ({
        type: 'line',
        label: overlay.label,
        data: overlay.data.map((point) => ({ x: toTime(point.t), y: point.v })),
        yAxisID: 'price',
        hidden: hidden.has(overlay.id),
        borderColor: dim(overlay.id, palette.series(overlay.color, index + 1)),
        borderWidth: overlay.isEmphasized ? 2.5 : 1.5,
        borderDash: overlay.dash ? [...overlay.dash] : undefined,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0.2,
        spanGaps: false,
      }),
    );
    // The dataset the readout follows: the wick (candles and OHLC bars) or the closing line.
    let priceIndex: number;
    if (style === 'line') {
      priceIndex = datasets.length;
      datasets.push({
        type: 'line',
        label,
        data: candles.map((candle, index) => ({ x: times[index], y: candle.c })),
        yAxisID: 'price',
        hidden: isPriceHidden,
        borderColor: dim(priceId, palette.series(color ?? 'chart-1', 0)),
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        tension: 0,
      } satisfies ChartDataset<'line', unknown[]>);
    } else {
      // The body (or, for OHLC bars, an invisible bar that sets each tick's width) is drawn over the wick.
      const isCandle = style === 'candle';
      datasets.push({
        type: 'bar',
        label,
        data: candles.map((candle, index) => ({
          x: times[index],
          y: [Math.min(candle.o, candle.c), Math.max(candle.o, candle.c)],
        })),
        yAxisID: 'price',
        hidden: isPriceHidden,
        grouped: false,
        backgroundColor: candles.map((candle) =>
          !isCandle ? 'transparent' : isUp(candle) ? palette.surface : dim(priceId, down),
        ),
        borderColor: candles.map((candle) =>
          isCandle ? dim(priceId, isUp(candle) ? up : down) : 'transparent',
        ),
        borderWidth: isCandle ? 1 : 0,
        borderSkipped: false,
        minBarLength: isCandle ? 1 : 0,
        categoryPercentage: 0.9,
        barPercentage: 0.8,
      } satisfies ChartDataset<'bar', unknown[]>);
      priceIndex = datasets.length;
      datasets.push({
        type: 'bar',
        label,
        data: candles.map((candle, index) => ({ x: times[index], y: [candle.l, candle.h] })),
        yAxisID: 'price',
        hidden: isPriceHidden,
        grouped: false,
        backgroundColor: candles.map((candle) => dim(priceId, isUp(candle) ? up : down)),
        borderWidth: 0,
        minBarLength: 1,
        categoryPercentage: 0.9,
        barPercentage: 0.8,
        maxBarThickness: style === 'ohlc' ? 2 : 1.5,
      } satisfies ChartDataset<'bar', unknown[]>);
    }
    if (hasVolume) {
      datasets.push({
        type: 'bar',
        label: messages.candleVolume,
        data: candles.map((candle, index) => ({ x: times[index], y: candle.v ?? null })),
        yAxisID: 'volume',
        grouped: false,
        backgroundColor: candles.map((candle) => withAlpha(isUp(candle) ? up : down, 0.45)),
        borderWidth: 0,
        categoryPercentage: 0.9,
        barPercentage: 0.8,
      } satisfies ChartDataset<'bar', unknown[]>);
    }

    const maxVolume = candles.reduce((max, candle) => Math.max(max, candle.v ?? 0), 0);
    let minGap = Number.POSITIVE_INFINITY;
    for (let index = 1; index < times.length; index++) {
      minGap = Math.min(minGap, (times[index] ?? 0) - (times[index - 1] ?? 0));
    }
    const xAxis = timeAxis({ timeZone, locale, palette, isNarrow, times, barTimes: times });
    const pane = hasVolume ? { stack: 'panes', stackWeight: 4 } : {};

    return {
      type: 'bar',
      data: { datasets: datasets as ChartDataset<'bar' | 'line'>[] },
      plugins: [chartEvents.plugin, ohlcTicksPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: isReducedMotion ? false : { duration: 200 },
        interaction: { mode: 'timeAll', intersect: false },
        color: palette.text,
        font: { family: palette.font.replace(/^\d+px /, '') },
        scales: {
          x: xAxis,
          price: {
            type: 'linear',
            position: 'right',
            ...pane,
            // Bar charts' value axes start at zero by default; prices fit their range.
            beginAtZero: false,
            grace: '4%',
            grid: { color: palette.grid },
            border: { color: palette.grid },
            ticks: {
              color: palette.mutedText,
              maxTicksLimit: isNarrow ? 5 : 7,
              callback: (value: number | string) => formats.price(Number(value)),
            },
          },
          ...(hasVolume
            ? {
                volume: {
                  type: 'linear' as const,
                  position: 'right' as const,
                  stack: 'panes',
                  stackWeight: 1,
                  min: 0,
                  // Headroom, so the tallest volume bar doesn't touch the prices.
                  max: maxVolume > 0 ? maxVolume * 1.25 : 1,
                  grid: { drawOnChartArea: false },
                  border: { color: palette.grid },
                  // Unlabelled: its top label would collide with the prices' lowest, and the readout and table give
                  // each volume.
                  ticks: { display: false },
                },
              }
            : {}),
        },
        plugins: {
          legend: { display: false },
          // The readout above the plot replaces the tooltip; this tracks the candle under the pointer for it.
          tooltip: {
            enabled: false,
            external: ({ tooltip }) => {
              const point =
                tooltip.opacity === 0
                  ? undefined
                  : tooltip.dataPoints.find((item) => item.datasetIndex === priceIndex);
              setActiveIndex(point ? point.dataIndex : null);
            },
          },
          crosshair: { color: palette.border },
          chartEvents: chartEvents.options,
          ohlcTicks:
            style === 'ohlc'
              ? {
                  datasetIndex: priceIndex - 1,
                  ticks: candles.map((candle) => ({
                    open: candle.o,
                    close: candle.c,
                    color: dim(priceId, isUp(candle) ? up : down),
                  })),
                }
              : undefined,
          zoom: {
            limits: {
              x: { minRange: Number.isFinite(minGap) ? minGap * 5 : 60_000 },
            },
            pan: { enabled: isZoomable && isCoarse, mode: 'x' },
            zoom: {
              mode: 'x',
              pinch: { enabled: isZoomable },
              wheel: { enabled: isZoomable, modifierKey: 'ctrl' },
              drag: {
                enabled: isZoomable && onRangeSelect !== undefined && !isCoarse,
                backgroundColor: withAlpha(palette.series('accent', 0), 0.15),
              },
              onZoomComplete: ({ chart }: { chart: Chart }) => {
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
    candles,
    overlays,
    style,
    label,
    color,
    hasVolume,
    hidden,
    isPriceHidden,
    highlighted,
    palette,
    isReducedMotion,
    isNarrow,
    isCoarse,
    isZoomable,
    onRangeSelect,
    timeZone,
    locale,
    formats,
    messages,
    chartEvents.plugin,
    chartEvents.options,
  ]);

  const { canvasRef, chart } = useChart(config);

  const summary = useMemo(
    () =>
      [describeCandles(candles, label, formats, messages), chartEvents.summary]
        .filter((part) => part !== '')
        .join(' '),
    [candles, label, formats, messages, chartEvents.summary],
  );

  const table = (): ChartTable => {
    const rows = candles.map((candle, index) => {
      const time = toTime(candle.t);
      const previous = candles[index - 1];
      const row: Record<string, unknown> = {
        __key: time,
        time,
        open: candle.o,
        high: candle.h,
        low: candle.l,
        close: candle.c,
        change: previous ? formats.change(previous.c, candle.c) : '',
        volume: candle.v ?? null,
      };
      for (const overlay of overlays) {
        row[overlay.id] = overlay.data.find((point) => toTime(point.t) === time)?.v ?? null;
      }
      return row;
    });
    const price = (id: string, header: string): DataTableColumn<Record<string, unknown>> => ({
      id,
      header,
      align: 'end',
      value: (row) => row[id],
      cell: ({ value }) => (typeof value === 'number' ? formats.price(value) : ''),
      csv: (row) => (typeof row[id] === 'number' ? String(row[id]) : ''),
    });
    const columns: DataTableColumn<Record<string, unknown>>[] = [
      {
        id: 'time',
        header: messages.time,
        isRowHeader: true,
        isSortable: true,
        value: (row) => row.time,
        cell: ({ value }) => formats.time(Number(value)),
        csv: (row) => new Date(Number(row.time)).toISOString(),
      },
      price('open', messages.candleOpen),
      price('high', messages.candleHigh),
      price('low', messages.candleLow),
      { ...price('close', messages.candleClose), mobile: true },
      {
        id: 'change',
        header: messages.candleChange,
        align: 'end',
        mobile: true,
        value: (row) => row.change,
      },
      ...(candles.some((candle) => candle.v !== undefined)
        ? [
            {
              id: 'volume',
              header: messages.candleVolume,
              align: 'end' as const,
              value: (row: Record<string, unknown>) => row.volume,
              cell: ({ value }: { value: unknown }) =>
                typeof value === 'number' ? formats.volume(value) : '',
              csv: (row: Record<string, unknown>) =>
                typeof row.volume === 'number' ? String(row.volume) : '',
            },
          ]
        : []),
      ...overlays.map((overlay) => price(overlay.id, overlay.label)),
    ];
    return withEventRows({ columns, rows }, events, messages, locale);
  };

  // The readout shows the candle under the pointer, or the latest one.
  const shownIndex =
    activeIndex !== null && activeIndex < candles.length ? activeIndex : candles.length - 1;
  const shown = candles[shownIndex];
  const before = candles[shownIndex - 1];
  const shownTime = shown ? toTime(shown.t) : 0;

  const legend = [
    {
      id: priceId,
      label,
      color: style === 'line' ? palette.series(color ?? 'chart-1', 0) : palette.tone('success'),
      isHidden: isPriceHidden,
    },
    ...overlays.map((overlay, index) => ({
      id: overlay.id,
      label: overlay.label,
      color: palette.series(overlay.color, index + 1),
      isHidden: hidden.has(overlay.id),
    })),
  ];

  return (
    <ChartFrame
      {...frame}
      isLoading={isLoading}
      error={error}
      exportFileName={exportFileName}
      summary={summary}
      isEmpty={candles.length === 0}
      legend={overlays.length > 0 ? legend : []}
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
      overlay={chartEvents.overlay ?? undefined}
      plotHeader={
        shown ? (
          // A visual readout for pointer and touch users; the summary and table view carry the same data.
          <div
            aria-hidden="true"
            data-candle-readout={shownTime}
            className="flex min-h-5 flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-fg-muted tabular-nums"
          >
            <span className="font-medium text-fg">{formats.time(shownTime)}</span>
            <ReadoutValue name={messages.candleOpenShort} value={formats.price(shown.o)} />
            <ReadoutValue name={messages.candleHighShort} value={formats.price(shown.h)} />
            <ReadoutValue name={messages.candleLowShort} value={formats.price(shown.l)} />
            <ReadoutValue name={messages.candleCloseShort} value={formats.price(shown.c)} />
            <span
              className={cn(
                'font-medium',
                shown.c >= (before?.c ?? shown.o) ? 'text-success-fg' : 'text-danger-fg',
              )}
            >
              {formats.change(before?.c ?? shown.o, shown.c)}
            </span>
            {shown.v !== undefined && (
              <ReadoutValue name={messages.candleVolumeShort} value={formats.volume(shown.v)} />
            )}
            {overlays.map((overlay) => {
              const value = overlay.data.find((point) => toTime(point.t) === shownTime)?.v;
              return typeof value === 'number' && !hidden.has(overlay.id) ? (
                <ReadoutValue key={overlay.id} name={overlay.label} value={formats.price(value)} />
              ) : null;
            })}
          </div>
        ) : undefined
      }
    />
  );
}

function ReadoutValue({ name, value }: { name: string; value: ReactNode }) {
  return (
    <span className="whitespace-nowrap">
      {name} <span className="text-fg">{value}</span>
    </span>
  );
}

/** The summary of the range: open, close, change, and the high and low with their dates. */
function describeCandles(
  candles: readonly Ohlc[],
  label: string,
  formats: {
    price: (value: number) => string;
    change: (from: number, to: number) => string;
    time: (time: number) => string;
  },
  messages: ChartStrings,
): string {
  const first = candles[0];
  const last = candles.at(-1);
  if (!first || !last) {
    return messages.noData;
  }
  let high = first;
  let low = first;
  for (const candle of candles) {
    if (candle.h > high.h) {
      high = candle;
    }
    if (candle.l < low.l) {
      low = candle;
    }
  }
  return messages.candleSummary({
    label,
    start: formats.time(toTime(first.t)),
    end: formats.time(toTime(last.t)),
    open: formats.price(first.o),
    close: formats.price(last.c),
    change: formats.change(first.o, last.c),
    high: formats.price(high.h),
    highDate: formats.time(toTime(high.t)),
    low: formats.price(low.l),
    lowDate: formats.time(toTime(low.t)),
  });
}
