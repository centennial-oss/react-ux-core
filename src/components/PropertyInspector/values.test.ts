import { describe, expect, it } from 'vitest';
import { scrubValue, selectionOf, sharedValue, vectorComponent } from './values';

describe('PropertyInspector values', () => {
  it('reads one object or several', () => {
    expect(selectionOf({ a: 1 })).toEqual([{ a: 1 }]);
    expect(selectionOf([{ a: 1 }, { a: 2 }])).toHaveLength(2);
    expect(selectionOf([])).toEqual([]);
  });

  it('finds shared and mixed values, comparing objects by content', () => {
    const read = (object: Readonly<Record<string, unknown>>) => object.p;
    expect(sharedValue([{ p: 1 }, { p: 1 }], read)).toEqual({ value: 1, isMixed: false });
    expect(sharedValue([{ p: 1 }, { p: 2 }], read)).toEqual({ value: 1, isMixed: true });
    expect(sharedValue([{ p: { x: 1, y: 2 } }, { p: { x: 1, y: 2 } }], read).isMixed).toBe(false);
    expect(sharedValue([], read)).toEqual({ value: undefined, isMixed: false });
  });

  it('reads vector components', () => {
    expect(vectorComponent({ x: 3, y: 4 }, 'y')).toBe(4);
    expect(vectorComponent(null, 'x')).toBeNull();
    expect(vectorComponent({ x: 'a' }, 'x')).toBeNull();
  });

  it('scrubs by whole steps, clamped and rounded to the step', () => {
    expect(scrubValue(10, 3, { step: 1 })).toBe(13);
    expect(scrubValue(1, 3, { step: 0.1 })).toBe(1.3);
    expect(scrubValue(2, -10, { step: 0.5, min: 0 })).toBe(0);
    expect(scrubValue(350, 20, { step: 1, max: 360 })).toBe(360);
  });
});
