import { describe, expect, it } from 'vitest';
import {
  formatPiMultiple,
  linearScale,
  niceStep,
  niceTicks,
  piTicks,
  polylinePath,
  sampleFunction,
  snapTo,
  ticksAtStep,
  zoomRange,
} from './plot';

describe('sampleFunction', () => {
  it('samples a smooth curve as one piece covering the range', () => {
    const pieces = sampleFunction((x) => x * x - 2, -3, 3, { yRange: [-3, 7] });
    expect(pieces).toHaveLength(1);
    const [piece] = pieces;
    expect(piece?.[0]).toEqual([-3, 7]);
    expect(piece?.[piece.length - 1]).toEqual([3, 7]);
    for (const [x, y] of piece ?? []) {
      expect(y).toBeCloseTo(x * x - 2, 9);
    }
  });

  it('adds points where the curve bends more', () => {
    const pieces = sampleFunction(Math.sin, 0, 2 * Math.PI, {
      yRange: [-1.5, 1.5],
      initialIntervals: 8,
    });
    const xs = pieces.flat().map(([x]) => x);
    const nearPeak = xs.filter((x) => Math.abs(x - Math.PI / 2) < 0.4).length;
    const nearZero = xs.filter((x) => Math.abs(x - Math.PI) < 0.4).length;
    expect(xs.length).toBeGreaterThan(9);
    expect(nearPeak).toBeGreaterThan(nearZero);
  });

  it('breaks 1/x at 0 instead of drawing a vertical line', () => {
    const pieces = sampleFunction((x) => 1 / x, -5, 5, { yRange: [-5, 5] });
    expect(pieces).toHaveLength(2);
    expect(pieces[0]?.every(([x]) => x < 0)).toBe(true);
    expect(pieces[1]?.every(([x]) => x > 0)).toBe(true);
  });

  it('breaks 1/x when 0 falls between samples', () => {
    const pieces = sampleFunction((x) => 1 / x, -5.03, 4.97, { yRange: [-5, 5] });
    expect(pieces).toHaveLength(2);
  });

  it('breaks tan x at each asymptote', () => {
    const pieces = sampleFunction(Math.tan, -Math.PI, Math.PI, { yRange: [-4, 4] });
    // Asymptotes at ±π/2 split the range into three pieces.
    expect(pieces).toHaveLength(3);
    for (const piece of pieces) {
      for (let index = 1; index < piece.length; index += 1) {
        const [, y0] = piece[index - 1] ?? [0, 0];
        const [, y1] = piece[index] ?? [0, 0];
        expect(y1).toBeGreaterThanOrEqual(y0);
      }
    }
  });

  it('skips where the function is undefined, and clamps huge values', () => {
    const roots = sampleFunction((x) => Math.sqrt(x), -2, 2, { yRange: [-2, 2] });
    expect(roots).toHaveLength(1);
    expect(roots[0]?.[0]?.[0]).toBeGreaterThanOrEqual(-0.001);
    const steep = sampleFunction((x) => 1e12 * x, -1, 1, { yRange: [-1, 1] });
    for (const [, y] of steep.flat()) {
      expect(Math.abs(y)).toBeLessThanOrEqual(9);
    }
  });

  it('treats a throwing function as undefined', () => {
    const pieces = sampleFunction(
      (x) => {
        if (x > 0) {
          throw new Error('no');
        }
        return x;
      },
      -1,
      1,
      { yRange: [-1, 1] },
    );
    expect(pieces).toHaveLength(1);
    expect(pieces[0]?.every(([x]) => x <= 0)).toBe(true);
  });
});

describe('ticks', () => {
  it('picks 1, 2 or 5 × 10ⁿ steps', () => {
    expect(niceStep(10, 10)).toBe(1);
    expect(niceStep(10, 8)).toBe(2);
    expect(niceStep(10, 3)).toBe(5);
    expect(niceStep(0.3, 6)).toBeCloseTo(0.05);
    expect(niceStep(0, 5)).toBe(1);
  });

  it('lists ticks without floating-point drift', () => {
    expect(ticksAtStep(-0.3, 0.3, 0.1)).toEqual([-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3]);
    expect(niceTicks(-5, 5, 8)).toEqual({ step: 2, values: [-4, -2, 0, 2, 4] });
    expect(niceTicks(-3, 3, 12).values).toEqual([
      -3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3,
    ]);
    expect(Object.is(ticksAtStep(-1, 1, 1)[1], -0)).toBe(false);
  });

  it('labels multiples of π in lowest terms', () => {
    expect(formatPiMultiple(0, 2)).toBe('0');
    expect(formatPiMultiple(1, 2)).toBe('π/2');
    expect(formatPiMultiple(2, 2)).toBe('π');
    expect(formatPiMultiple(-3, 2)).toBe('−3π/2');
    expect(formatPiMultiple(4, 1)).toBe('4π');
    expect(formatPiMultiple(-1, 1)).toBe('−π');
  });

  it('ticks at π fractions over a trigonometric range', () => {
    const { step, ticks } = piTicks(-2 * Math.PI, 2 * Math.PI, 8);
    expect(step).toBeCloseTo(Math.PI / 2);
    expect(ticks.map((tick) => tick.label)).toEqual([
      '−2π',
      '−3π/2',
      '−π',
      '−π/2',
      '0',
      'π/2',
      'π',
      '3π/2',
      '2π',
    ]);
    expect(piTicks(-20 * Math.PI, 20 * Math.PI, 8).ticks.map((tick) => tick.label)).toContain(
      '10π',
    );
  });
});

describe('scales and helpers', () => {
  it('maps and inverts linearly, including reversed ranges', () => {
    const y = linearScale([-5, 5], [200, 0]);
    expect(y(0)).toBe(100);
    expect(y(5)).toBe(0);
    expect(y.invert(50)).toBe(2.5);
  });

  it('zooms around an anchor', () => {
    expect(zoomRange([-10, 10], 0.5)).toEqual([-5, 5]);
    expect(zoomRange([0, 10], 2, 0)).toEqual([0, 20]);
  });

  it('snaps to a step', () => {
    expect(snapTo(1.26, 0.5)).toBe(1.5);
    expect(snapTo(0.30000000000000004, 0.1)).toBe(0.3);
    expect(Object.is(snapTo(-0.01, 1), -0)).toBe(false);
  });

  it('builds SVG paths from polylines', () => {
    expect(
      polylinePath([
        [
          [0, 0],
          [1, 2],
        ],
        [[3, 4]],
      ]),
    ).toBe('M0.00 0.00L1.00 2.00M3.00 4.00');
  });
});
