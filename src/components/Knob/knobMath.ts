// The Knob's scale: maps values to a position from 0 to 1 along the arc (linearly or logarithmically), snaps to the
// step, and draws arc paths.

export type KnobScale = 'linear' | 'log';

export interface KnobRange {
  minValue: number;
  maxValue: number;
  scale: KnobScale;
}

/** A log scale needs a positive minimum; otherwise the knob falls back to linear. */
export function effectiveScale({ minValue, maxValue, scale }: KnobRange): KnobScale {
  return scale === 'log' && minValue > 0 && maxValue > minValue ? 'log' : 'linear';
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The position (0–1) of `value` on the arc. */
export function valueToPosition(value: number, range: KnobRange): number {
  const { minValue, maxValue } = range;
  if (maxValue <= minValue) {
    return 0;
  }
  const clamped = clamp(value, minValue, maxValue);
  if (effectiveScale(range) === 'log') {
    return Math.log(clamped / minValue) / Math.log(maxValue / minValue);
  }
  return (clamped - minValue) / (maxValue - minValue);
}

/** The value at a position (0–1) on the arc, before snapping. */
export function positionToValue(position: number, range: KnobRange): number {
  const { minValue, maxValue } = range;
  const p = clamp(position, 0, 1);
  if (effectiveScale(range) === 'log') {
    return minValue * (maxValue / minValue) ** p;
  }
  return minValue + p * (maxValue - minValue);
}

/** The number of decimals in `step`, so snapped values don't pick up float noise (0.1 + 0.2). */
function decimalsOf(step: number): number {
  const text = String(step);
  const exponent = /e-(\d+)$/.exec(text);
  if (exponent) {
    return Number(exponent[1]);
  }
  return text.split('.')[1]?.length ?? 0;
}

/** Snaps `value` to the nearest multiple of `step` from `minValue`, within the range. `step` 0 doesn't snap. */
export function snapToStep(
  value: number,
  minValue: number,
  maxValue: number,
  step: number,
): number {
  const clamped = clamp(value, minValue, maxValue);
  if (step <= 0) {
    return clamped;
  }
  const snapped = minValue + Math.round((clamped - minValue) / step) * step;
  const rounded = Number(snapped.toFixed(Math.max(decimalsOf(step), decimalsOf(minValue))));
  // Rounding up may land just past the maximum when the range isn't a whole number of steps.
  return rounded > maxValue ? rounded - step : rounded;
}

/** The value at the centre of the arc: the midpoint, or the geometric mean on a log scale. */
export function centreValue(range: KnobRange): number {
  return positionToValue(0.5, range);
}

// The arc sweeps 270°, from 135° left of straight up (the minimum) to 135° right (the maximum).
export const SWEEP_DEGREES = 270;

/** The angle in degrees, clockwise from straight up, of a position on the arc. */
export function positionToAngle(position: number): number {
  return -SWEEP_DEGREES / 2 + clamp(position, 0, 1) * SWEEP_DEGREES;
}

/** A point at `angle` degrees (clockwise from straight up) on a circle around (50, 50). */
export function pointAt(angle: number, radius: number): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;
  return { x: 50 + radius * Math.sin(radians), y: 50 - radius * Math.cos(radians) };
}

/** An SVG arc path between two positions on the arc, in a 100 × 100 view box. */
export function arcPath(from: number, to: number, radius: number): string {
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  const a = pointAt(positionToAngle(start), radius);
  const b = pointAt(positionToAngle(end), radius);
  const isLarge = (end - start) * SWEEP_DEGREES > 180 ? 1 : 0;
  const r = String(radius);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${String(isLarge)} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}
