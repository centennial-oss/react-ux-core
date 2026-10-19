// Reading property values for one selected object or several: a shared value, or "mixed" when they differ.

import { clamp, decimalsOf, roundTo } from '../../utils/math';

/** A 2D vector property's value. */
export interface Vector2 {
  x: number;
  y: number;
}

export type PropertyValues =
  Readonly<Record<string, unknown>> | readonly Readonly<Record<string, unknown>>[];

/** The selected objects as a list (one object becomes a list of one). */
export function selectionOf(values: PropertyValues): readonly Readonly<Record<string, unknown>>[] {
  return Array.isArray(values)
    ? (values as readonly Readonly<Record<string, unknown>>[])
    : [values as Readonly<Record<string, unknown>>];
}

function isSame(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The value every object shares (`isMixed: false`), or the first object's value when they differ. */
export function sharedValue(
  selection: readonly Readonly<Record<string, unknown>>[],
  read: (object: Readonly<Record<string, unknown>>) => unknown,
): { value: unknown; isMixed: boolean } {
  const [first, ...others] = selection;
  if (!first) {
    return { value: undefined, isMixed: false };
  }
  const value = read(first);
  return { value, isMixed: others.some((object) => !isSame(read(object), value)) };
}

/** A vector's component from an unknown value, or null. */
export function vectorComponent(value: unknown, axis: 'x' | 'y'): number | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const component = (value as Partial<Record<'x' | 'y', unknown>>)[axis];
  return typeof component === 'number' ? component : null;
}

/** A value moved by whole steps from `start`, clamped and rounded to the step's precision. */
export function scrubValue(
  start: number,
  steps: number,
  options: { step: number; min?: number; max?: number },
): number {
  const { step, min, max } = options;
  const next = roundTo(start + steps * step, decimalsOf(step));
  return clamp(next, min ?? Number.NEGATIVE_INFINITY, max ?? Number.POSITIVE_INFINITY);
}
