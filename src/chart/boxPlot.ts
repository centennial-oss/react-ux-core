// The five-number summaries behind BoxPlotChart: from raw values (quartiles by linear interpolation, whiskers at the
// furthest values within 1.5 times the interquartile range, the rest outliers), or from histogram buckets, using
// LatencyChart's percentile estimates.

import { clamp } from '../utils/math';
import { histogramPercentile, toLatencyBuckets, type HistogramBucket } from './latency';

/** A box plot's summary of one group of values. */
export interface BoxPlotStats {
  /** The low whisker's end. */
  min: number;
  /** The lower quartile: the box's low edge. */
  q1: number;
  median: number;
  /** The upper quartile: the box's high edge. */
  q3: number;
  /** The high whisker's end. */
  max: number;
  /** Drawn as a small diamond when given. */
  mean?: number;
  /** Values beyond the whiskers, drawn as hollow dots. */
  outliers?: readonly number[];
  /** How many values the summary is of. */
  count?: number;
}

/** The value at `rank` (0–1) of sorted values, interpolated linearly between neighbours. */
export function quantile(sorted: readonly number[], rank: number): number {
  if (sorted.length === 0) {
    return Number.NaN;
  }
  const position = (sorted.length - 1) * clamp(rank, 0, 1);
  const below = Math.floor(position);
  const low = sorted[below] ?? 0;
  const high = sorted[Math.min(sorted.length - 1, below + 1)] ?? low;
  return low + (high - low) * (position - below);
}

/**
 * A box plot's summary of raw values (non-finite ones skipped): quartiles, whiskers at the furthest values within
 * `whisker` (default 1.5) times the interquartile range of the box, and the values beyond them as outliers.
 * Undefined when there are no values.
 */
export function boxPlotStats(
  values: readonly number[],
  { whisker = 1.5 }: { whisker?: number } = {},
): BoxPlotStats | undefined {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return undefined;
  }
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const reach = (q3 - q1) * whisker;
  const inside = sorted.filter((value) => value >= q1 - reach && value <= q3 + reach);
  return {
    min: inside[0] ?? q1,
    q1,
    median: quantile(sorted, 0.5),
    q3,
    max: inside.at(-1) ?? q3,
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    outliers: sorted.filter((value) => value < q1 - reach || value > q3 + reach),
    count: sorted.length,
  };
}

/**
 * A box plot's summary of histogram buckets (as LatencyChart takes them): quartiles estimated within their buckets,
 * and whiskers at the lowest and highest non-empty buckets' bounds (the open last bucket's lower bound). Undefined
 * without observations.
 */
export function histogramBoxStats(
  histogram: readonly HistogramBucket[],
  { isCumulative = false }: { isCumulative?: boolean } = {},
): BoxPlotStats | undefined {
  const buckets = toLatencyBuckets(histogram, { isCumulative });
  const filled = buckets.filter((bucket) => bucket.count > 0);
  const first = filled[0];
  const last = filled.at(-1);
  const q1 = histogramPercentile(buckets, 0.25);
  const median = histogramPercentile(buckets, 0.5);
  const q3 = histogramPercentile(buckets, 0.75);
  if (!first || !last || q1 === undefined || median === undefined || q3 === undefined) {
    return undefined;
  }
  return {
    min: Math.min(first.from, q1),
    q1,
    median,
    q3,
    max: Math.max(last.isOpen ? last.from : last.to, q3),
    count: filled.reduce((sum, bucket) => sum + bucket.count, 0),
  };
}
