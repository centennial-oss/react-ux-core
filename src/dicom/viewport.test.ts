import { describe, expect, it } from 'vitest';
import { getTransform, initialView, toImage, toScreen, zoomAt } from './viewport';

const size = { width: 400, height: 200 };
const image = { width: 100, height: 100 };

describe('viewport geometry', () => {
  it('fits and centres the image', () => {
    const transform = getTransform(size, image, initialView);
    expect(transform).toEqual({ originX: 100, originY: 0, scaleX: 2, scaleY: 2 });
    expect(toScreen(transform, { x: 50, y: 50 })).toEqual({ x: 200, y: 100 });
    expect(toImage(transform, { x: 200, y: 100 })).toEqual({ x: 50, y: 50 });
  });

  it('draws non-square pixels at their physical aspect ratio', () => {
    const transform = getTransform(size, { ...image, pixelSpacing: [2, 1] }, initialView);
    expect(transform.scaleY).toBe(transform.scaleX * 2);
  });

  it('keeps the anchored point in place when zooming', () => {
    const anchor = { x: 120, y: 40 };
    const before = toImage(getTransform(size, image, initialView), anchor);
    const view = zoomAt(size, image, initialView, 3, anchor);
    expect(view.zoom).toBe(3);
    const after = toScreen(getTransform(size, image, view), before);
    expect(after.x).toBeCloseTo(anchor.x);
    expect(after.y).toBeCloseTo(anchor.y);
  });

  it('clamps the zoom', () => {
    expect(zoomAt(size, image, initialView, 100).zoom).toBe(16);
    expect(zoomAt(size, image, initialView, 0.01).zoom).toBe(0.25);
  });
});
