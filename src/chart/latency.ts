// The arithmetic behind LatencyChart (FR-044): histogram buckets with their lower bounds, percentiles estimated from
// buckets (linear interpolation within the bucket, as Prometheus's `histogram_quantile` does), and the windows in
// which a percentile breaches its objective.

import { clamp } from '../utils/math';
import { toEpochMs } from '../utils/time';

/** A latency percentile. */
export type Percentile = 'p50' | 'p90' | 'p95' | 'p99';

/** The percentiles in order, from the median up. */
export const PERCENTILES: readonly Percentile[] = ['p50', 'p90', 'p95', 'p99'];

/** Each percentile as a rank from 0 to 1. */
export const PERCENTILE_RANKS: Readonly<Record<Percentile, number>> = {
  p50: 0.5,
  p90: 0.9,
  p95: 0.95,
  p99: 0.99,
};

/** One time's percentiles (`null` for a gap). */
export interface PercentilePoint {
  t: Date | number | string;
  p50: number | null;
  p90?: number | null;
  p95?: number | null;
  p99?: number | null;
}

/** A histogram bucket: how many observations were at most `le` (and above the previous bucket's `le`). */
export interface HistogramBucket {
  /** The bucket's upper bound. `Infinity` is the open-ended last bucket (Prometheus's `+Inf`). */
  le: number;
  count: number;
}

/** A bucket with both bounds, ready to draw. */
export interface LatencyBucket {
  from: number;
  to: number;
  count: number;
  /** The open-ended last bucket (`le` was `Infinity`): drawn as wide as the one before it, labelled "over …". */
  isOpen: boolean;
}

/**
 * The buckets sorted, with lower bounds: each starts where the previous one ends. The first starts at 0 (or, on a
 * log axis, which can't show 0, one step below its upper bound). `isCumulative` counts (Prometheus's) become
 * per-bucket counts.
 */
export function toLatencyBuckets(
  histogram: readonly HistogramBucket[],
  { isCumulative = false, isLog = false }: { isCumulative?: boolean; isLog?: boolean } = {},
): LatencyBucket[] {
  const sorted = [...histogram]
    .filter((bucket) => !Number.isNaN(bucket.le) && (!isLog || bucket.le > 0))
    .sort((a, b) => a.le - b.le);
  const buckets: LatencyBucket[] = [];
  sorted.forEach((bucket, index) => {
    const previous = sorted[index - 1];
    const count = Math.max(
      0,
      isCumulative && previous ? bucket.count - previous.count : bucket.count,
    );
    if (!previous) {
      const next = sorted[index + 1]?.le;
      const hasNext = next !== undefined && Number.isFinite(next) && next > bucket.le;
      let from: number;
      if (isLog) {
        from = hasNext ? (bucket.le * bucket.le) / next : bucket.le / 2;
      } else {
        from = bucket.le > 0 ? 0 : bucket.le - (hasNext ? next - bucket.le : 1);
      }
      buckets.push({ from, to: bucket.le, count, isOpen: false });
      return;
    }
    const from = previous.le;
    if (!Number.isFinite(bucket.le)) {
      // As wide as the bucket before (on a log axis, the same ratio wide).
      const before = buckets.at(-1);
      const width = before ? before.to - before.from : 1;
      const to =
        isLog && before && before.from > 0 ? from * (before.to / before.from) : from + width;
      buckets.push({ from, to, count, isOpen: true });
      return;
    }
    buckets.push({ from, to: bucket.le, count, isOpen: false });
  });
  return buckets;
}

/** The total count across buckets. */
export function bucketTotal(buckets: readonly LatencyBucket[]): number {
  return buckets.reduce((sum, bucket) => sum + bucket.count, 0);
}

/**
 * The value below which `rank` (0–1) of the observations fall, interpolated linearly within its bucket; the open
 * last bucket gives its lower bound. Undefined without observations.
 */
export function histogramPercentile(
  buckets: readonly LatencyBucket[],
  rank: number,
): number | undefined {
  const total = bucketTotal(buckets);
  if (total <= 0) {
    return undefined;
  }
  const target = clamp(rank, 0, 1) * total;
  let below = 0;
  for (const bucket of buckets) {
    if (bucket.count > 0 && below + bucket.count >= target) {
      if (bucket.isOpen) {
        return bucket.from;
      }
      return bucket.from + (bucket.to - bucket.from) * ((target - below) / bucket.count);
    }
    below += bucket.count;
  }
  return buckets.at(-1)?.to;
}

/** A window in which a percentile was over its objective. */
export interface LatencyBreach {
  /** The first reading over the objective. */
  from: number;
  /** The first reading back within it (or the last reading, when the breach runs to the end or into a gap). */
  to: number;
  /** The highest reading in the window. */
  peak: number;
}

/** The windows in which the readings (in time order) are over `objective`. */
export function findBreaches(
  points: readonly { t: Date | number | string; v: number | null | undefined }[],
  objective: number,
): LatencyBreach[] {
  const breaches: LatencyBreach[] = [];
  let open: LatencyBreach | null = null;
  for (const point of points) {
    const time = toEpochMs(point.t);
    const value = point.v;
    if (value === null || value === undefined) {
      if (open) {
        breaches.push(open);
        open = null;
      }
      continue;
    }
    if (value > objective) {
      if (open) {
        open.to = time;
        open.peak = Math.max(open.peak, value);
      } else {
        open = { from: time, to: time, peak: value };
      }
    } else if (open) {
      open.to = time;
      breaches.push(open);
      open = null;
    }
  }
  if (open) {
    breaches.push(open);
  }
  return breaches;
}
