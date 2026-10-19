import { describe, expect, it } from 'vitest';
import {
  fitRect,
  niceStep,
  normalizeRect,
  rectsIntersect,
  screenToWorld,
  snapValue,
  unionRects,
  worldToScreen,
  zoomAt,
} from './geometry';

describe('canvas geometry', () => {
  it('converts between world and screen coordinates', () => {
    const viewport = { x: 100, y: 50, zoom: 2 };
    expect(worldToScreen({ x: 110, y: 60 }, viewport)).toEqual({ x: 20, y: 20 });
    expect(screenToWorld({ x: 20, y: 20 }, viewport)).toEqual({ x: 110, y: 60 });
  });

  it('zooms about a screen point, keeping the world point under it', () => {
    const viewport = { x: 0, y: 0, zoom: 1 };
    const point = { x: 200, y: 100 };
    const before = screenToWorld(point, viewport);
    const zoomed = zoomAt(viewport, point, 2.5);
    expect(zoomed.zoom).toBe(2.5);
    const after = screenToWorld(point, zoomed);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('fits and centres a rectangle within the zoom limits', () => {
    const fit = fitRect({ x: 0, y: 0, width: 1000, height: 500 }, { width: 548, height: 300 });
    // (548 - 48) / 1000 = 0.5 wide, (300 - 48) / 500 = 0.504 tall: the width decides.
    expect(fit.zoom).toBeCloseTo(0.5);
    const centre = worldToScreen({ x: 500, y: 250 }, fit);
    expect(centre.x).toBeCloseTo(274);
    expect(centre.y).toBeCloseTo(150);
    // Small content isn't magnified past maxZoom.
    expect(fitRect({ x: 0, y: 0, width: 10, height: 10 }, { width: 500, height: 500 }).zoom).toBe(
      1,
    );
    expect(
      fitRect({ x: 0, y: 0, width: 1e6, height: 10 }, { width: 500, height: 500 }, { minZoom: 0.2 })
        .zoom,
    ).toBe(0.2);
  });

  it('snaps to a grid step', () => {
    expect(snapValue(29, 20)).toBe(20);
    expect(snapValue(31, 20)).toBe(40);
    expect(snapValue(-11, 20)).toBe(-20);
    expect(snapValue(7, 0)).toBe(7);
  });

  it('normalizes, intersects and unions rectangles', () => {
    expect(normalizeRect({ x: 10, y: 40 }, { x: 0, y: 20 })).toEqual({
      x: 0,
      y: 20,
      width: 10,
      height: 20,
    });
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(rectsIntersect(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
    expect(rectsIntersect(a, { x: 11, y: 0, width: 10, height: 10 })).toBe(false);
    expect(unionRects([a, { x: -5, y: 20, width: 5, height: 5 }])).toEqual({
      x: -5,
      y: 0,
      width: 15,
      height: 25,
    });
    expect(unionRects([])).toBeNull();
  });

  it('picks nice steps of 1, 2 or 5 times a power of ten', () => {
    expect(niceStep(0.7)).toBe(1);
    expect(niceStep(13)).toBe(20);
    expect(niceStep(40)).toBe(50);
    expect(niceStep(64)).toBe(100);
    expect(niceStep(0.03)).toBeCloseTo(0.05);
  });
});
