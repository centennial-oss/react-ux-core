// Deterministic data for the latency, candlestick, waterfall and treemap stories and tests (no randomness, so
// snapshots stay stable): observatory network latency, a fictional "STAR" price series, an observatory's monthly
// budget bridge, and storage use by instrument at three sites.

import type { Ohlc } from '../src/chart/CandlestickChart';
import type { ChartEvent } from '../src/chart/events';
import type { HistogramBucket, LatencySeries } from '../src/chart/LatencyChart';
import type { TimeSeries } from '../src/chart/TimeSeriesChart';
import type { TreemapNode } from '../src/chart/Treemap';
import type { WaterfallStep } from '../src/chart/Waterfall';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** The start of the latency day: Oct 14, 2026, 00:00 UTC. */
export const LATENCY_START = Date.UTC(2026, 9, 14);

/** A bump added to p95 and p99 inside the breach windows (09:00–10:30 and 18:00–18:40). */
function incident(minute: number): number {
  if (minute >= 9 * 60 && minute <= 10.5 * 60) {
    return 120;
  }
  if (minute >= 18 * 60 && minute <= 18 * 60 + 40) {
    return 95;
  }
  return 0;
}

const round = (value: number) => Math.round(value * 10) / 10;

/** 24 hours of observatory network latency percentiles, every 10 minutes, with two p95 breaches of 300 ms. */
export function latencyDay(scale = 1, offset = 0): LatencySeries['data'] {
  return Array.from({ length: 24 * 6 + 1 }, (_, step) => {
    const minute = step * 10;
    const daily = Math.sin(((minute / 60 - 8 + offset) * Math.PI) / 12);
    const p50 = (80 + 15 * daily + ((step * 7) % 5)) * scale;
    const p90 = p50 * 2 + ((step * 3) % 7);
    const p95 = p50 * 2.5 + ((step * 5) % 9) + incident(minute) * scale;
    const p99 = p95 * 1.5 + ((step * 11) % 13);
    return {
      t: LATENCY_START + minute * MINUTE,
      p50: round(p50),
      p90: round(p90),
      p95: round(p95),
      p99: round(p99),
    };
  });
}

/** One series: the observatory network's p50, p95 and p99 (no p90). */
export const networkLatency: LatencySeries = {
  id: 'network',
  label: 'Observatory network',
  data: latencyDay().map(({ t, p50, p95, p99 }) => ({ t, p50, p95, p99 })),
};

/** Two sites' p50 and p95, for the multi-series story. */
export const siteLatency: LatencySeries[] = [
  {
    id: 'north',
    label: 'North site',
    color: 'chart-1',
    data: latencyDay(1).map(({ t, p50, p95 }) => ({ t, p50, p95 })),
  },
  {
    id: 'south',
    label: 'South site',
    color: 'chart-3',
    data: latencyDay(0.7, 3).map(({ t, p50, p95 }) => ({ t, p50, p95 })),
  },
];

/**
 * A latency distribution in 30 buckets (29 with upper bounds from 10 ms to about 5 s, growing by a quarter each,
 * and an open-ended last bucket): most requests near 120 ms, with a long slow tail.
 */
export const latencyHistogram: HistogramBucket[] = [
  ...Array.from({ length: 29 }, (_, index) => {
    const le = Math.round(10 * 1.25 ** index);
    const spread = (Math.log(le) - Math.log(120)) / 0.55;
    const tail = le > 250 ? Math.round(30_000 / le) : 0;
    return { le, count: Math.round(2400 * Math.exp(-(spread * spread) / 2)) + tail };
  }),
  { le: Infinity, count: 6 },
];

/** A simple deterministic generator (a linear congruential one), so the price walk is the same every run. */
function sequence(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

/** The first trading day: Oct 16, 2025 (UTC). */
export const CANDLE_START = Date.UTC(2025, 9, 16);

/** A year of daily candles (weekdays) for the fictional "STAR" index, with volumes. */
export const starCandles: Ohlc[] = (() => {
  const next = sequence(42);
  const candles: Ohlc[] = [];
  let close = 100;
  for (let day = 0; day < 365; day++) {
    const t = CANDLE_START + day * DAY;
    const weekday = new Date(t).getUTCDay();
    if (weekday === 0 || weekday === 6) {
      continue;
    }
    const open = close * (1 + (next() - 0.5) * 0.01);
    const trend = 0.0009 + Math.sin(day / 40) * 0.004;
    close = open * (1 + trend + (next() - 0.5) * 0.03);
    const high = Math.max(open, close) * (1 + next() * 0.012);
    const low = Math.min(open, close) * (1 - next() * 0.012);
    candles.push({
      t,
      o: Math.round(open * 100) / 100,
      h: Math.round(high * 100) / 100,
      l: Math.round(low * 100) / 100,
      c: Math.round(close * 100) / 100,
      v: Math.round(800_000 + next() * 900_000 + Math.abs(close - open) * 60_000),
    });
  }
  return candles;
})();

/** A moving average of the candles' closes over `days` trading days, from the first full window. */
export function movingAverage(candles: readonly Ohlc[], days: number): TimeSeries['data'] {
  return candles.flatMap((candle, index) => {
    if (index < days - 1) {
      return [];
    }
    const window = candles.slice(index - days + 1, index + 1);
    const mean = window.reduce((sum, entry) => sum + entry.c, 0) / days;
    return [{ t: candle.t, v: Math.round(mean * 100) / 100 }];
  });
}

/** The 50-day moving average of STAR's closes. */
export const starAverage: TimeSeries = {
  id: 'ma50',
  label: '50-day average',
  color: 'chart-4',
  data: movingAverage(starCandles, 50),
};

/** News on STAR's price chart. */
export const starNews: ChartEvent[] = [
  {
    id: 'report-q4',
    at: Date.UTC(2026, 0, 22),
    label: 'Annual report',
    tone: 'accent',
    detail: 'Observing hours up 12% on the year.',
  },
  { id: 'split', at: Date.UTC(2026, 4, 12), label: 'New telescope announced', tone: 'success' },
  {
    id: 'outage',
    at: Date.UTC(2026, 7, 3),
    until: Date.UTC(2026, 7, 7),
    label: 'Exchange maintenance',
    tone: 'warning',
  },
];

/** An observatory's budget bridge from September to October (USD): 8 steps, 2 of them totals. */
export const budgetBridge: WaterfallStep[] = [
  { label: 'September', value: 48_200, kind: 'total' },
  { label: 'Telescope time', value: 3_400 },
  { label: 'Power', value: -1_250 },
  { label: 'Data storage', value: 820 },
  { label: 'Travel', value: -2_100 },
  { label: 'Instrument repairs', value: 4_600 },
  { label: 'Grant offset', value: -3_000 },
  { label: 'October', value: 50_670, kind: 'total' },
];

const instruments = [
  'Spectrograph',
  'Wide-field camera',
  'Adaptive optics',
  'Infrared imager',
  'Guide camera',
  'All-sky camera',
  'Seeing monitor',
  'Weather station',
  'Polarimeter',
  'Photometer',
  'Calibration lamps',
  'Dome telemetry',
  'Archive mirror',
  'Solar telescope',
  'Radio receiver',
];

function site(id: string, label: string, count: number, factor: number): TreemapNode {
  return {
    id,
    label,
    value: 0,
    children: instruments.slice(0, count).map((instrument, index) => ({
      id: `${id}-${String(index)}`,
      label: instrument,
      value: Math.round((((index * 37 + count) % 23) + 2 + (count - index) * 3) * factor),
      colorValue: ((index * 13 + count * 5) % 21) - 8,
    })),
  };
}

/** Storage use (TB) by instrument at three sites: 40 instruments in all, each with its % change on last month. */
export const storageBySite: TreemapNode = {
  id: 'all',
  label: 'All sites',
  value: 0,
  children: [
    site('mauna-kea', 'Mauna Kea', 15, 4),
    site('atacama', 'Atacama', 13, 3),
    site('la-palma', 'La Palma', 12, 2),
  ],
};
