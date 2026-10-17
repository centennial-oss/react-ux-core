// Pure helpers for CoordinatePlane: adaptive function sampling with discontinuity breaks, "nice" axis ticks (decimal
// or multiples of π) and the linear scales between data and pixels.

/** A point in data coordinates. */
export type PlotPoint = readonly [x: number, y: number];

export interface SampleOptions {
  /** The visible y range; jumps across most of it mark a discontinuity, and huge values are clamped near it. */
  yRange: readonly [number, number];
  /** Evenly spaced intervals to start from. Defaults to 128. */
  initialIntervals?: number;
  /** How many times an interval may halve where the curve bends or jumps. Defaults to 10. */
  maxDepth?: number;
  /**
   * How far (as a fraction of the visible y range) the curve may stray from a straight segment before the interval
   * is split. Defaults to 0.002, about half a pixel on a 250 px plot.
   */
  tolerance?: number;
}

/**
 * Samples `fn` over `[xMin, xMax]` into polylines, adding points where the curve bends and breaking it where the
 * function isn't finite or jumps (such as `1/x` at 0 or `tan x` at π/2), so no vertical line is drawn across a
 * discontinuity. Each returned array is one connected piece.
 */
export function sampleFunction(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  { yRange, initialIntervals = 128, maxDepth = 10, tolerance = 0.002 }: SampleOptions,
): PlotPoint[][] {
  const [yMin, yMax] = yRange;
  const ySpan = Math.max(Math.abs(yMax - yMin), Number.EPSILON);
  const maxError = tolerance * ySpan;
  // Values far outside the view are clamped, so huge numbers near an asymptote don't upset the SVG renderer.
  const clampLow = yMin - 4 * ySpan;
  const clampHigh = yMax + 4 * ySpan;
  const evaluate = (x: number): number => {
    try {
      const y = fn(x);
      return typeof y === 'number' ? y : Number.NaN;
    } catch {
      return Number.NaN;
    }
  };
  const isVisible = (y: number) => y >= yMin && y <= yMax;

  const pieces: PlotPoint[][] = [];
  let current: PlotPoint[] = [];
  const push = (x: number, y: number) => {
    current.push([x, Math.min(clampHigh, Math.max(clampLow, y))]);
  };
  const breakPiece = () => {
    if (current.length > 1) {
      pieces.push(current);
    }
    current = [];
  };

  // Adds the points between (x0, y0) and (x1, y1), excluding the first, splitting where needed.
  const refine = (x0: number, y0: number, x1: number, y1: number, depth: number): void => {
    const finite0 = Number.isFinite(y0);
    const finite1 = Number.isFinite(y1);
    if (depth >= maxDepth) {
      // At the finest level, a jump across most of the view, from one side of it to the other, or into non-finite
      // values is a discontinuity.
      const isJump =
        finite0 && finite1 && Math.abs(y1 - y0) > ySpan * 0.5 && (isVisible(y0) || isVisible(y1));
      const isCrossing = (y0 < yMin && y1 > yMax) || (y0 > yMax && y1 < yMin);
      if (!finite1 || !finite0 || isJump || isCrossing) {
        breakPiece();
      }
      if (finite1) {
        push(x1, y1);
      }
      return;
    }
    const xm = (x0 + x1) / 2;
    const ym = evaluate(xm);
    const finiteM = Number.isFinite(ym);
    let shouldSplit = !finite0 || !finite1 || !finiteM;
    if (!shouldSplit) {
      const bothOutside =
        (y0 > yMax && y1 > yMax && ym > yMax) || (y0 < yMin && y1 < yMin && ym < yMin);
      // A stretch beyond one edge of the view draws nothing visible, however it bends.
      shouldSplit = !bothOutside && Math.abs(ym - (y0 + y1) / 2) > maxError;
    }
    if (!shouldSplit) {
      push(x1, y1);
      return;
    }
    refine(x0, y0, xm, ym, depth + 1);
    refine(xm, ym, x1, y1, depth + 1);
  };

  const count = Math.max(1, Math.round(initialIntervals));
  const step = (xMax - xMin) / count;
  let x0 = xMin;
  let y0 = evaluate(x0);
  if (Number.isFinite(y0)) {
    push(x0, y0);
  }
  for (let index = 1; index <= count; index += 1) {
    const x1 = index === count ? xMax : xMin + step * index;
    const y1 = evaluate(x1);
    refine(x0, y0, x1, y1, 0);
    x0 = x1;
    y0 = y1;
  }
  breakPiece();
  return pieces;
}

/** Evenly spaced tick values over a range, at a step of 1, 2 or 5 × 10ⁿ. */
export interface Ticks {
  step: number;
  values: number[];
}

/** A step of 1, 2 or 5 × 10ⁿ that gives at most about `maxCount` ticks over `span`. */
export function niceStep(span: number, maxCount: number): number {
  if (!(span > 0) || !Number.isFinite(span)) {
    return 1;
  }
  const raw = span / Math.max(1, maxCount);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
}

/** Values from `min` to `max` (inclusive) at multiples of `step`, without floating-point drift. */
export function ticksAtStep(min: number, max: number, step: number): number[] {
  if (!(step > 0) || !Number.isFinite(min) || !Number.isFinite(max) || max < min) {
    return [];
  }
  const first = Math.ceil(min / step - 1e-9);
  const last = Math.floor(max / step + 1e-9);
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  const values: number[] = [];
  for (let index = first; index <= last && values.length < 1000; index += 1) {
    const value = Number((index * step).toFixed(Math.min(decimals, 20)));
    values.push(Object.is(value, -0) ? 0 : value);
  }
  return values;
}

/** Nice decimal ticks over `[min, max]`, at most about `maxCount` of them. */
export function niceTicks(min: number, max: number, maxCount = 8): Ticks {
  const step = niceStep(max - min, maxCount);
  return { step, values: ticksAtStep(min, max, step) };
}

/** A tick at a multiple of π: its value and label, such as "π/2" or "−3π". */
export interface PiTick {
  value: number;
  label: string;
}

/** Steps of π, from π/12 up, that give readable labels. */
const PI_FRACTIONS = [1 / 12, 1 / 6, 1 / 4, 1 / 2, 1, 2, 5, 10, 20, 50, 100];

/** Labels `numerator·π/denominator` in lowest terms ("π/2", "−3π/4", "2π", "0"). */
export function formatPiMultiple(numerator: number, denominator: number): string {
  if (numerator === 0) {
    return '0';
  }
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(Math.abs(numerator), Math.abs(denominator));
  const top = numerator / divisor;
  const bottom = denominator / divisor;
  const sign = top < 0 ? '−' : '';
  const magnitude = Math.abs(top);
  const coefficient = magnitude === 1 ? '' : String(magnitude);
  return bottom === 1 ? `${sign}${coefficient}π` : `${sign}${coefficient}π/${String(bottom)}`;
}

/** Ticks at multiples of π (or of a fraction of π) over `[min, max]`, at most about `maxCount` of them. */
export function piTicks(min: number, max: number, maxCount = 8): { step: number; ticks: PiTick[] } {
  const span = max - min;
  const fraction =
    PI_FRACTIONS.find((candidate) => span / (candidate * Math.PI) <= maxCount) ??
    PI_FRACTIONS[PI_FRACTIONS.length - 1] ??
    1;
  const step = fraction * Math.PI;
  const denominator = fraction < 1 ? Math.round(1 / fraction) : 1;
  const multiplier = fraction < 1 ? 1 : fraction;
  const first = Math.ceil(min / step - 1e-9);
  const last = Math.floor(max / step + 1e-9);
  const ticks: PiTick[] = [];
  for (let index = first; index <= last && ticks.length < 1000; index += 1) {
    ticks.push({
      value: index * step,
      label: formatPiMultiple(index * multiplier, denominator),
    });
  }
  return { step, ticks };
}

/** A linear map from a data range to a pixel range (which may run backwards, as y does in SVG). */
export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): { (value: number): number; invert: (pixel: number) => number } {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const ratio = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  const scale = (value: number) => r0 + (value - d0) * ratio;
  scale.invert = (pixel: number) => (ratio === 0 ? d0 : d0 + (pixel - r0) / ratio);
  return scale;
}

/** An SVG path through polylines already in pixels. */
export function polylinePath(pieces: readonly (readonly PlotPoint[])[]): string {
  return pieces
    .map((piece) =>
      piece
        .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
        .join(''),
    )
    .join('');
}

/** Zooms `[min, max]` by `factor` (below 1 zooms in) around `anchor`. */
export function zoomRange(
  range: readonly [number, number],
  factor: number,
  anchor = (range[0] + range[1]) / 2,
): [number, number] {
  return [anchor - (anchor - range[0]) * factor, anchor + (range[1] - anchor) * factor];
}

/** Rounds `value` to the nearest multiple of `step`, without floating-point drift. */
export function snapTo(value: number, step: number): number {
  if (!(step > 0)) {
    return value;
  }
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 2);
  const snapped = Number((Math.round(value / step) * step).toFixed(Math.min(decimals, 20)));
  return Object.is(snapped, -0) ? 0 : snapped;
}
