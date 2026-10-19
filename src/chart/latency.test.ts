import { describe, expect, it } from 'vitest';
import { findBreaches, histogramPercentile, toLatencyBuckets } from './latency';

describe('toLatencyBuckets', () => {
  it('sorts the buckets and starts each where the previous one ends, the first at 0', () => {
    expect(
      toLatencyBuckets([
        { le: 20, count: 2 },
        { le: 10, count: 1 },
      ]),
    ).toEqual([
      { from: 0, to: 10, count: 1, isOpen: false },
      { from: 10, to: 20, count: 2, isOpen: false },
    ]);
  });

  it('starts a log axis’s first bucket one step below its bound, since a log axis can’t show 0', () => {
    const buckets = toLatencyBuckets(
      [
        { le: 10, count: 1 },
        { le: 20, count: 2 },
      ],
      { isLog: true },
    );
    expect(buckets[0]?.from).toBe(5);
  });

  it('turns cumulative counts into per-bucket counts', () => {
    const buckets = toLatencyBuckets(
      [
        { le: 10, count: 4 },
        { le: 20, count: 10 },
        { le: 40, count: 12 },
      ],
      { isCumulative: true },
    );
    expect(buckets.map((bucket) => bucket.count)).toEqual([4, 6, 2]);
  });

  it('draws the open-ended last bucket as wide as the one before (the same ratio on a log axis)', () => {
    const histogram = [
      { le: 10, count: 1 },
      { le: 20, count: 1 },
      { le: Infinity, count: 1 },
    ];
    expect(toLatencyBuckets(histogram).at(-1)).toEqual({
      from: 20,
      to: 30,
      count: 1,
      isOpen: true,
    });
    expect(toLatencyBuckets(histogram, { isLog: true }).at(-1)?.to).toBe(40);
  });
});

describe('histogramPercentile', () => {
  const buckets = toLatencyBuckets([
    { le: 10, count: 50 },
    { le: 20, count: 50 },
  ]);

  it('interpolates within the bucket where the rank falls', () => {
    expect(histogramPercentile(buckets, 0.5)).toBe(10);
    expect(histogramPercentile(buckets, 0.75)).toBe(15);
    expect(histogramPercentile(buckets, 0.25)).toBe(5);
    expect(histogramPercentile(buckets, 1)).toBe(20);
  });

  it('gives the open bucket’s lower bound, and nothing without observations', () => {
    const open = toLatencyBuckets([
      { le: 10, count: 1 },
      { le: Infinity, count: 9 },
    ]);
    expect(histogramPercentile(open, 0.99)).toBe(10);
    expect(histogramPercentile(toLatencyBuckets([{ le: 10, count: 0 }]), 0.5)).toBeUndefined();
  });
});

describe('findBreaches', () => {
  const points = [3, 5, 8, 9, 4, 2, 7, null, 6, 1, 9].map((v, t) => ({ t, v }));

  it('finds each window over the objective, ending at the first reading back within it', () => {
    expect(findBreaches(points, 5)).toEqual([
      { from: 2, to: 4, peak: 9 },
      // A gap ends a window at its last reading.
      { from: 6, to: 6, peak: 7 },
      { from: 8, to: 9, peak: 6 },
      // A window that runs to the end ends at the last reading.
      { from: 10, to: 10, peak: 9 },
    ]);
  });

  it('finds nothing when every reading is within the objective', () => {
    expect(findBreaches(points, 10)).toEqual([]);
  });
});
