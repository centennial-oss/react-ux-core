import { describe, expect, it } from 'vitest';
import { squarify, type TreemapRect } from './treemapLayout';

const area = (rect: TreemapRect) => rect.width * rect.height;
const ratio = (rect: TreemapRect) => Math.max(rect.width / rect.height, rect.height / rect.width);

function overlaps(a: TreemapRect, b: TreemapRect): boolean {
  const epsilon = 1e-6;
  return (
    a.x + a.width > b.x + epsilon &&
    b.x + b.width > a.x + epsilon &&
    a.y + a.height > b.y + epsilon &&
    b.y + b.height > a.y + epsilon
  );
}

describe('squarify', () => {
  const box = { x: 10, y: 20, width: 600, height: 400 };
  const values = [6, 6, 4, 3, 2, 2, 1];

  it('gives each value an area in proportion, inside the rectangle, filling it', () => {
    const rects = squarify(values, box);
    const total = values.reduce((sum, value) => sum + value, 0);
    rects.forEach((rect, index) => {
      expect(area(rect)).toBeCloseTo(((values[index] ?? 0) / total) * area(box), 6);
      expect(rect.x).toBeGreaterThanOrEqual(box.x - 1e-9);
      expect(rect.y).toBeGreaterThanOrEqual(box.y - 1e-9);
      expect(rect.x + rect.width).toBeLessThanOrEqual(box.x + box.width + 1e-9);
      expect(rect.y + rect.height).toBeLessThanOrEqual(box.y + box.height + 1e-9);
    });
    expect(rects.reduce((sum, rect) => sum + area(rect), 0)).toBeCloseTo(area(box), 6);
  });

  it('never overlaps two rectangles', () => {
    const rects = squarify([9, 7, 5, 5, 4, 3, 3, 2, 1, 1, 0.5], box);
    rects.forEach((a, i) => {
      rects.slice(i + 1).forEach((b) => {
        expect(overlaps(a, b)).toBe(false);
      });
    });
  });

  it('keeps rectangles close to square (the paper’s example: worst ratio under 3)', () => {
    const rects = squarify(values, { x: 0, y: 0, width: 6, height: 4 });
    expect(Math.max(...rects.map(ratio))).toBeLessThan(3);
    // The two largest values share the first column, as in Bruls et al.
    expect(rects[0]).toEqual({ x: 0, y: 0, width: 3, height: 2 });
    expect(rects[1]?.x).toBe(0);
    expect(rects[1]?.y).toBeCloseTo(2, 9);
  });

  it('lays equal values in a square out as a grid', () => {
    const rects = squarify([1, 1, 1, 1], { x: 0, y: 0, width: 100, height: 100 });
    for (const rect of rects) {
      expect(rect.width).toBeCloseTo(50, 9);
      expect(rect.height).toBeCloseTo(50, 9);
    }
  });

  it('returns rectangles in the order of the values, whatever their size', () => {
    const rects = squarify([1, 10], { x: 0, y: 0, width: 110, height: 10 });
    expect(area(rects[0] ?? box)).toBeCloseTo(100, 6);
    expect(area(rects[1] ?? box)).toBeCloseTo(1000, 6);
    // The larger value is placed first, at the corner.
    expect(rects[1]?.x).toBe(0);
  });

  it('gives empty rectangles to zero, negative and non-finite values, and to an empty space', () => {
    const rects = squarify([0, 5, -2, Number.NaN], box);
    expect(area(rects[0] ?? box)).toBe(0);
    expect(area(rects[1] ?? box)).toBeCloseTo(area(box), 6);
    expect(area(rects[2] ?? box)).toBe(0);
    expect(area(rects[3] ?? box)).toBe(0);
    expect(squarify([], box)).toEqual([]);
    expect(squarify([1, 2], { x: 0, y: 0, width: 0, height: 10 }).map(area)).toEqual([0, 0]);
  });
});
