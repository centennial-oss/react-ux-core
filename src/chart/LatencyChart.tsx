// LatencyChart (FR-044): latency percentiles over time, or a latency distribution. Over time, each series' p50, p90,
// p95 and p99 are lines with the space between them shaded as bands (TimeSeriesChart's plot), and an objective such
// as "p95 at most 300 ms" is a threshold line whose breaches are shaded windows, marked and listed like chart events.
// As a histogram, buckets are bars on a linear or log axis with p50, p95 and p99 markers, and the buckets past the
// objective are highlighted. Summaries state the percentiles and breaches; table views list each percentile.

import type { ChartConfiguration } from 'chart.js';
import { TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';
import { useLocale } from 'react-aria-components';
import { useTimeZone } from '../provider/context';
import { downloadCsv, toCsv } from '../table/csv';
import type { DataTableColumn } from '../table/types';
import { useMediaQuery } from '../utils/useMediaQuery';
import { ChartFrame, type ChartFrameOptions, type ChartTable } from './ChartFrame';
import { withAlpha, type ChartColor } from './colors';
import type { ChartEvent } from './events';
import { extent, formatPercent, formatTime, formatValue, toTime } from './format';
import { histogramPlugin, type HistogramMarker } from './histogram';
import {
  bucketTotal,
  findBreaches,
  histogramPercentile,
  PERCENTILE_RANKS,
  PERCENTILES,
  toLatencyBuckets,
  type HistogramBucket,
  type LatencyBucket,
  type Percentile,
  type PercentilePoint,
} from './latency';
import { useChartMessages, type ChartStrings } from './messages';
import { TimeSeriesPlot, type TimeSeries } from './TimeSeriesChart';
import { downloadPng, useChart, useChartLook } from './useChart';
import { isLogTickShown } from './valueAxis';

export type { HistogramBucket, Percentile, PercentilePoint } from './latency';

/** One source's percentiles over time, such as an API or a region. */
export interface LatencySeries {
  id: string;
  label: string;
  /** Defaults to the next palette colour. */
  color?: ChartColor;
  data: readonly PercentilePoint[];
}

/** A latency objective, such as "p95 at most 300 ms". */
export interface LatencyObjective {
  percentile: Percentile;
  value: number;
}

export interface LatencyChartProps extends ChartFrameOptions {
  /** Percentiles over time: lines, with the space between them shaded as bands. */
  series?: readonly LatencySeries[];
  /** Or a distribution: histogram buckets, with percentile markers. Used when `series` isn't given. */
  histogram?: readonly HistogramBucket[];
  /** The histogram's counts are cumulative (each bucket counts everything up to its `le`, as Prometheus's do). */
  isCumulative?: boolean;
  /** Defaults to `ms`. */
  unit?: 'ms' | 's' | 'µs';
  /** An objective, such as `{ percentile: 'p95', value: 300 }`: a line, with breaches highlighted. */
  objective?: LatencyObjective;
  /** The value axis (over time) or the latency axis (histogram). Defaults to `linear`. */
  scale?: 'linear' | 'log';
  /** The histogram's colour. Defaults to `chart-1`. */
  color?: ChartColor;
  /** IANA time zone for the axis, tooltips and table (over time). Defaults to the provider's. */
  timeZone?: string;
  /** Events marked on the time axis (over time), such as deploys. */
  events?: readonly ChartEvent[];
  onEventPress?: (event: ChartEvent) => void;
  /** Called with the range dragged across the chart (over time); see TimeSeriesChart. */
  onRangeSelect?: (start: Date, end: Date) => void;
  /** Allows zooming (over time). Defaults to true. */
  isZoomable?: boolean;
}

/** Each percentile's line dash, and the opacity of the band between it and the percentile below. */
const percentileLook: Record<Percentile, { dash?: readonly number[]; band: number }> = {
  p50: { band: 0 },
  p90: { dash: [2, 3], band: 0.24 },
  p95: { dash: [6, 4], band: 0.18 },
  p99: { dash: [10, 4], band: 0.12 },
};

const noEvents: readonly ChartEvent[] = [];

/** Latency percentiles over time (with shaded bands and objective breaches), or as a histogram. */
export function LatencyChart({ series, histogram, ...props }: LatencyChartProps) {
  if (series === undefined && histogram !== undefined) {
    return <LatencyHistogram {...props} histogram={histogram} />;
  }
  return <LatencyOverTime {...props} series={series ?? []} />;
}

function paletteSlot(index: number): ChartColor {
  return `chart-${String((index % 10) + 1)}` as ChartColor;
}

/** The percentiles a series has values for, in order. */
function presentPercentiles(entry: LatencySeries): Percentile[] {
  return PERCENTILES.filter((percentile) =>
    entry.data.some((point) => typeof point[percentile] === 'number'),
  );
}

function LatencyOverTime({
  series,
  // Histogram-only props, kept out of the plot's.
  isCumulative,
  color,
  unit = 'ms',
  objective,
  scale = 'linear',
  timeZone: timeZoneProp,
  events = noEvents,
  ...plot
}: Omit<LatencyChartProps, 'histogram' | 'series'> & { series: readonly LatencySeries[] }) {
  const messages = useChartMessages();
  const { locale } = useLocale();
  const providerZone = useTimeZone();
  const timeZone = timeZoneProp ?? providerZone;
  const isMulti = series.length > 1;

  // One line per percentile; each band shades down to the percentile below it.
  const { lines, fillTo } = useMemo(() => {
    const built: TimeSeries[] = [];
    const targets = new Map<string, string>();
    series.forEach((entry, index) => {
      let below: string | undefined;
      for (const percentile of presentPercentiles(entry)) {
        const id = `${entry.id}:${percentile}`;
        const look = percentileLook[percentile];
        built.push({
          id,
          label: isMulti
            ? messages.latencyPercentileOf({ label: entry.label, percentile })
            : percentile,
          unit,
          color: entry.color ?? paletteSlot(index),
          dash: look.dash,
          shadeOpacity: look.band,
          data: entry.data.map((point) => ({ t: point.t, v: point[percentile] ?? null })),
        });
        if (below !== undefined) {
          targets.set(id, below);
        }
        below = id;
      }
    });
    return { lines: built, fillTo: targets };
  }, [series, isMulti, unit, messages]);

  const breaches = useMemo(
    () =>
      objective === undefined
        ? []
        : series.flatMap((entry) =>
            findBreaches(
              entry.data.map((point) => ({ t: point.t, v: point[objective.percentile] })),
              objective.value,
            ).map((breach) => ({ entry, breach })),
          ),
    [series, objective],
  );

  const allEvents = useMemo((): readonly ChartEvent[] => {
    if (objective === undefined || breaches.length === 0) {
      return events;
    }
    const value = formatValue(objective.value, locale, unit);
    return [
      ...events,
      ...breaches.map(({ entry, breach }, index): ChartEvent => {
        const percentile = isMulti
          ? messages.latencyPercentileOf({ label: entry.label, percentile: objective.percentile })
          : objective.percentile;
        return {
          id: `breach-${entry.id}-${String(index)}`,
          at: breach.from,
          until: breach.to > breach.from ? breach.to : undefined,
          label: messages.latencyBreach({ percentile, value }),
          tone: 'danger',
          icon: TriangleAlert,
          detail: messages.latencyBreachPeak({ value: formatValue(breach.peak, locale, unit) }),
        };
      }),
    ];
  }, [events, breaches, objective, isMulti, messages, locale, unit]);

  const thresholds = useMemo(
    () =>
      objective === undefined
        ? []
        : [
            {
              value: objective.value,
              label: messages.latencyObjective({
                percentile: objective.percentile,
                value: formatValue(objective.value, locale, unit),
              }),
              tone: 'danger' as const,
            },
          ],
    [objective, messages, locale, unit],
  );

  const summary = useMemo(
    () => describeLatency(lines, objective, breaches.length, unit, messages, locale, timeZone),
    [lines, objective, breaches.length, unit, messages, locale, timeZone],
  );

  return (
    <TimeSeriesPlot
      {...plot}
      series={lines}
      timeZone={timeZone}
      thresholds={thresholds}
      events={allEvents}
      summary={summary}
      fillTo={fillTo}
      valueScale={scale === 'log' ? 'logarithmic' : 'linear'}
    />
  );
}

/** The summary over time: the span, each percentile's range and latest value, and the objective. */
function describeLatency(
  lines: readonly TimeSeries[],
  objective: LatencyObjective | undefined,
  breachCount: number,
  unit: string,
  messages: ChartStrings,
  locale: string,
  timeZone: string,
): string {
  const span = extent(lines.flatMap((line) => line.data.map((point) => toTime(point.t))));
  if (!span) {
    return messages.noData;
  }
  const parts = [
    messages.latencySummary({
      start: formatTime(span[0], locale, timeZone),
      end: formatTime(span[1], locale, timeZone),
    }),
  ];
  for (const line of lines) {
    const values = line.data.flatMap((point) => (point.v === null ? [] : [point.v]));
    const range = extent(values);
    const latest = values.at(-1);
    if (range && latest !== undefined) {
      parts.push(
        messages.seriesRange({
          label: line.label,
          min: formatValue(range[0], locale, unit),
          max: formatValue(range[1], locale, unit),
          latest: formatValue(latest, locale, unit),
        }),
      );
    }
  }
  if (objective) {
    const values = {
      percentile: objective.percentile,
      value: formatValue(objective.value, locale, unit),
    };
    parts.push(
      breachCount === 0
        ? messages.latencyObjectiveMet(values)
        : messages.latencyObjectiveBreached({ ...values, count: breachCount }),
    );
  }
  return parts.join(' ');
}

/** The percentiles marked on a histogram: p50, p95 and p99, plus the objective's own. */
function markedPercentiles(objective: LatencyObjective | undefined): Percentile[] {
  return PERCENTILES.filter(
    (percentile) => percentile !== 'p90' || objective?.percentile === 'p90',
  );
}

function bucketLabel(
  bucket: LatencyBucket,
  unit: string,
  messages: ChartStrings,
  locale: string,
): string {
  return bucket.isOpen
    ? messages.latencyBucketOpen({ from: formatValue(bucket.from, locale, unit) })
    : messages.latencyBucket({
        from: formatValue(bucket.from, locale),
        to: formatValue(bucket.to, locale, unit),
      });
}

function LatencyHistogram({
  histogram,
  isCumulative = false,
  unit = 'ms',
  objective,
  scale = 'linear',
  color,
  // Over-time-only props, kept out of the frame's.
  timeZone,
  events,
  onEventPress,
  onRangeSelect,
  isZoomable,
  exportFileName,
  ...frame
}: Omit<LatencyChartProps, 'series' | 'histogram'> & {
  histogram: readonly HistogramBucket[];
}) {
  const messages = useChartMessages();
  const { locale } = useLocale();
  const { palette, isReducedMotion } = useChartLook();
  const isNarrow = useMediaQuery('(max-width: 639.98px)');
  const isLog = scale === 'log';

  const buckets = useMemo(
    () => toLatencyBuckets(histogram, { isCumulative, isLog }),
    [histogram, isCumulative, isLog],
  );
  const total = bucketTotal(buckets);
  const percentiles = useMemo(
    () =>
      markedPercentiles(objective).flatMap((percentile) => {
        const value = histogramPercentile(buckets, PERCENTILE_RANKS[percentile]);
        return value === undefined ? [] : [{ percentile, value }];
      }),
    [buckets, objective],
  );

  const config = useMemo((): ChartConfiguration<'line'> => {
    const base = palette.series(color ?? 'chart-1', 0);
    const danger = palette.tone('danger');
    const isSlow = (bucket: LatencyBucket) =>
      objective !== undefined && bucket.from >= objective.value;
    const markers: HistogramMarker[] = percentiles.map(({ percentile, value }) => ({
      value,
      label: percentile,
      color: palette.text,
      isDashed: true,
    }));
    if (objective) {
      markers.push({
        value: objective.value,
        label: messages.latencyObjective({
          percentile: objective.percentile,
          value: formatValue(objective.value, locale, unit),
        }),
        color: danger,
        isDashed: false,
      });
    }
    const first = buckets[0];
    const last = buckets.at(-1);
    return {
      type: 'line',
      plugins: [histogramPlugin],
      data: {
        datasets: [
          {
            label: messages.latencyCount,
            // One invisible point per bucket, at its middle (in the axis's own terms), for the tooltip.
            data: buckets.map((bucket) => ({
              x: isLog ? Math.sqrt(bucket.from * bucket.to) : (bucket.from + bucket.to) / 2,
              y: bucket.count,
            })),
            showLine: false,
            pointRadius: 0,
            pointHoverRadius: 0,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
          },
        ],
      },
      options: {
        parsing: false,
        responsive: true,
        maintainAspectRatio: false,
        animation: isReducedMotion ? false : { duration: 250 },
        interaction: { mode: 'bucket', intersect: false },
        color: palette.text,
        font: { family: palette.font.replace(/^\d+px /, '') },
        scales: {
          x: {
            type: isLog ? 'logarithmic' : 'linear',
            min: first?.from,
            max: last?.to,
            grid: { color: palette.grid },
            border: { color: palette.grid },
            ticks: {
              color: palette.mutedText,
              maxTicksLimit: isNarrow ? 4 : 8,
              maxRotation: 0,
              // The bounds are the buckets' edges, not round numbers, so they aren't labelled.
              includeBounds: false,
              callback: (value: number | string, index: number, ticks: readonly unknown[]) =>
                isLog && !isLogTickShown(Number(value), index, ticks.length)
                  ? ''
                  : formatValue(Number(value), locale, unit),
            },
          },
          y: {
            type: 'linear',
            beginAtZero: true,
            // Room above the tallest bar for the markers' labels.
            grace: '25%',
            grid: { color: palette.grid },
            border: { color: palette.grid },
            ticks: {
              color: palette.mutedText,
              maxTicksLimit: isNarrow ? 4 : 6,
              precision: 0,
              callback: (value: number | string) => formatValue(Number(value), locale),
            },
          },
        },
        plugins: {
          legend: { display: false },
          histogram: {
            buckets,
            colors: buckets.map((bucket) => withAlpha(isSlow(bucket) ? danger : base, 0.75)),
            activeColors: buckets.map((bucket) => (isSlow(bucket) ? danger : base)),
            markers,
            surface: withAlpha(palette.surface, 0.85),
            font: palette.font,
          },
          tooltip: {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            borderWidth: 1,
            titleColor: palette.text,
            bodyColor: palette.text,
            callbacks: {
              title: (items) => {
                const bucket = buckets[items[0]?.dataIndex ?? -1];
                return bucket ? bucketLabel(bucket, unit, messages, locale) : '';
              },
              label: (item) => {
                const count = buckets[item.dataIndex]?.count ?? 0;
                return messages.latencyBucketCount({
                  count: formatValue(count, locale),
                  share: formatPercent(total > 0 ? (count / total) * 100 : 0, locale),
                });
              },
            },
          },
        },
      },
    };
  }, [
    buckets,
    percentiles,
    objective,
    palette,
    color,
    isLog,
    isNarrow,
    isReducedMotion,
    locale,
    unit,
    messages,
    total,
  ]);

  const { canvasRef, chart } = useChart(config);

  const summary = useMemo(() => {
    if (total <= 0) {
      return messages.noData;
    }
    const parts = [
      messages.latencyHistogramSummary({
        count: formatValue(total, locale),
        buckets: buckets.length,
      }),
      messages.latencyPercentiles({
        list: new Intl.ListFormat(locale, { type: 'conjunction' }).format(
          percentiles.map(({ percentile, value }) =>
            messages.latencyPercentileValue({
              percentile,
              value: formatValue(value, locale, unit),
            }),
          ),
        ),
      }),
    ];
    if (objective) {
      const actual = histogramPercentile(buckets, PERCENTILE_RANKS[objective.percentile]);
      const values = {
        percentile: objective.percentile,
        value: formatValue(objective.value, locale, unit),
      };
      if (actual !== undefined) {
        parts.push(
          actual <= objective.value
            ? messages.latencyObjectiveMet(values)
            : messages.latencyObjectiveMissed({
                ...values,
                actual: formatValue(actual, locale, unit),
              }),
        );
      }
    }
    return parts.join(' ');
  }, [total, buckets, percentiles, objective, messages, locale, unit]);

  const table = (): ChartTable => {
    let below = 0;
    const rows = buckets.map((bucket, index) => {
      below += bucket.count;
      const inBucket = percentiles.filter(
        ({ value }) =>
          value >= bucket.from &&
          (value < bucket.to || (index === buckets.length - 1 && value <= bucket.to)),
      );
      return {
        __key: index,
        bucket: bucketLabel(bucket, unit, messages, locale),
        count: bucket.count,
        share: total > 0 ? (bucket.count / total) * 100 : 0,
        cumulative: total > 0 ? (below / total) * 100 : 0,
        percentiles: new Intl.ListFormat(locale, { type: 'conjunction' }).format(
          inBucket.map(({ percentile }) => percentile),
        ),
      };
    });
    const percent = (id: string, header: string): DataTableColumn<Record<string, unknown>> => ({
      id,
      header,
      align: 'end',
      value: (row) => row[id],
      cell: ({ value }) => (typeof value === 'number' ? formatPercent(value, locale) : ''),
    });
    const columns: DataTableColumn<Record<string, unknown>>[] = [
      {
        id: 'bucket',
        header: messages.latencyBucketColumn,
        isRowHeader: true,
        value: (row) => row.bucket,
      },
      {
        id: 'count',
        header: messages.latencyCount,
        align: 'end',
        mobile: true,
        value: (row) => row.count,
        cell: ({ value }) => (typeof value === 'number' ? formatValue(value, locale) : ''),
      },
      percent('share', messages.latencyShare),
      percent('cumulative', messages.latencyCumulative),
      {
        id: 'percentiles',
        header: messages.latencyPercentilesColumn,
        mobile: true,
        value: (row) => row.percentiles,
      },
    ];
    return { columns, rows };
  };

  return (
    <ChartFrame
      {...frame}
      exportFileName={exportFileName}
      summary={summary}
      isEmpty={total <= 0}
      legend={[]}
      onToggleSeries={() => undefined}
      onHighlightSeries={() => undefined}
      table={table}
      onExportPng={() => {
        downloadPng(chart, exportFileName ?? 'latency');
      }}
      onExportCsv={() => {
        const data = table();
        downloadCsv(toCsv(data.rows, data.columns), exportFileName ?? 'latency');
      }}
      canvasRef={canvasRef}
    />
  );
}
