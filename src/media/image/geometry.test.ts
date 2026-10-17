import { describe, expect, it } from 'vitest';
import {
  annotationAnchor,
  annotationBounds,
  clampPan,
  createAnnotation,
  fitZoom,
  fromImagePoint,
  moveAnnotation,
  moveVertex,
  panLimits,
  rectBetween,
  resizeRect,
  resizeRectBy,
  toImagePoint,
  viewTransform,
  zoomAt,
  type ImageView,
} from './geometry';
import type { PolygonAnnotation, RectAnnotation } from './types';

const frame = { width: 400, height: 300 };
const image = { width: 6000, height: 4000 };
const base: ImageView = { zoom: 0.0666, panX: 0, panY: 0, rotation: 0 };

describe('fitZoom', () => {
  it('fits, fills, or shows actual size, and never upscales a small image to fit', () => {
    expect(fitZoom(frame, image, 0, 'fit')).toBeCloseTo(400 / 6000);
    expect(fitZoom(frame, image, 0, 'fill')).toBeCloseTo(300 / 4000);
    expect(fitZoom(frame, image, 0, 'actual')).toBe(1);
    expect(fitZoom(frame, { width: 100, height: 50 }, 0, 'fit')).toBe(1);
    expect(fitZoom(frame, { width: 100, height: 50 }, 0, 'fill')).toBe(6);
  });

  it('uses the rotated size for quarter turns', () => {
    expect(fitZoom(frame, image, 90, 'fit')).toBeCloseTo(300 / 6000);
    expect(fitZoom(frame, image, 180, 'fit')).toBeCloseTo(400 / 6000);
  });
});

describe('pan limits', () => {
  it('allows no pan while the image fits, and keeps a zoomed image covering the frame', () => {
    expect(panLimits(base, frame, image)).toEqual({ x: 0, y: 0 });
    const zoomed = { ...base, zoom: 0.2 };
    expect(panLimits(zoomed, frame, image)).toEqual({ x: 400, y: 250 });
    expect(clampPan({ ...zoomed, panX: 1000, panY: -1000 }, frame, image)).toMatchObject({
      panX: 400,
      panY: -250,
    });
  });
});

describe('zoomAt', () => {
  it('keeps the image point under the anchor in place', () => {
    const anchor = { x: 300, y: 100 };
    const before = toImagePoint(anchor, base, frame, image);
    const after = zoomAt(base, 0.2, anchor, frame, image);
    expect(after.zoom).toBe(0.2);
    const point = toImagePoint(anchor, after, frame, image);
    expect(point.x).toBeCloseTo(before.x, 6);
    expect(point.y).toBeCloseTo(before.y, 6);
  });
});

describe('screen and image points', () => {
  it.each([0, 90, 180, 270] as const)('round-trips at a %i° rotation', (rotation) => {
    const view: ImageView = { zoom: 0.3, panX: 40, panY: -25, rotation };
    const screen = fromImagePoint({ x: 0.2, y: 0.7 }, view, frame, image);
    const back = toImagePoint(screen, view, frame, image);
    expect(back.x).toBeCloseTo(0.2, 9);
    expect(back.y).toBeCloseTo(0.7, 9);
  });

  it('maps the frame centre to the image centre with no pan', () => {
    expect(toImagePoint({ x: 200, y: 150 }, base, frame, image)).toEqual({ x: 0.5, y: 0.5 });
  });

  it('puts the top-left corner where the transform does after a quarter turn', () => {
    // Turned clockwise, the image's top-left corner is at the top right.
    const view: ImageView = { zoom: 0.05, panX: 0, panY: 0, rotation: 90 };
    const corner = fromImagePoint({ x: 0, y: 0 }, view, frame, image);
    expect(corner.x).toBeCloseTo(200 + 100);
    expect(corner.y).toBeCloseTo(150 - 150);
    expect(viewTransform(view, frame, image)).toBe(
      'translate(200px, 150px) rotate(90deg) scale(0.05) translate(-3000px, -2000px)',
    );
  });
});

describe('annotations', () => {
  const rect: RectAnnotation = {
    id: 'r',
    kind: 'rect',
    x: 0.2,
    y: 0.2,
    width: 0.3,
    height: 0.2,
    label: 'Crater',
  };
  const polygon: PolygonAnnotation = {
    id: 'p',
    kind: 'polygon',
    label: 'Sea',
    points: [
      { x: 0.1, y: 0.5 },
      { x: 0.3, y: 0.2 },
      { x: 0.5, y: 0.6 },
    ],
  };

  it('moves shapes without leaving the image', () => {
    const near = (value: number) => expect.closeTo(value) as number;
    expect(moveAnnotation(rect, 0.1, 0.1)).toMatchObject({ x: near(0.3), y: near(0.3) });
    expect(moveAnnotation(rect, 1, -1)).toMatchObject({ x: near(0.7), y: 0 });
    const moved = moveAnnotation(polygon, -0.5, 0) as PolygonAnnotation;
    expect(moved.points.map((point) => point.x)).toEqual([near(0), near(0.2), near(0.4)]);
  });

  it('resizes a rectangle by a corner, and by the keyboard within limits', () => {
    expect(resizeRect(rect, 'se', { x: 0.9, y: 0.9 })).toMatchObject({
      x: 0.2,
      y: 0.2,
      width: expect.closeTo(0.7) as number,
      height: expect.closeTo(0.7) as number,
    });
    // Dragging past the opposite corner flips the box.
    expect(resizeRect(rect, 'nw', { x: 0.6, y: 0.5 })).toMatchObject({
      x: 0.5,
      y: 0.4,
      width: expect.closeTo(0.1) as number,
      height: expect.closeTo(0.1) as number,
    });
    expect(resizeRectBy(rect, -1, 1)).toMatchObject({ width: 0.01, height: 0.8 });
  });

  it('builds boxes from two points and moves polygon points', () => {
    expect(rectBetween({ x: 0.5, y: 0.5 }, { x: 0.2, y: 1.4 })).toMatchObject({
      x: 0.2,
      y: 0.5,
      width: expect.closeTo(0.3) as number,
      height: 0.5,
    });
    expect(moveVertex(polygon, 1, { x: -1, y: 0.4 }).points[1]).toEqual({ x: 0, y: 0.4 });
  });

  it('creates shapes centred in view and finds their anchors and bounds', () => {
    const pin = createAnnotation('pin', { x: 0.4, y: 0.6 }, { id: 'a', label: '' });
    expect(pin).toEqual({ id: 'a', label: '', kind: 'pin', x: 0.4, y: 0.6 });
    const box = createAnnotation('rect', { x: 0.98, y: 0.02 }, { id: 'b', label: '' });
    expect(annotationBounds(box)).toEqual({
      x: expect.closeTo(0.8) as number,
      y: 0,
      width: 0.2,
      height: 0.2,
    });
    expect(annotationAnchor(rect)).toEqual({ x: expect.closeTo(0.35) as number, y: 0.2 });
    expect(annotationAnchor(polygon)).toEqual({ x: 0.3, y: 0.2 });
    const triangle = createAnnotation('polygon', { x: 0.5, y: 0.5 }, { id: 'c', label: '' });
    expect(annotationBounds(triangle)).toMatchObject({
      width: expect.closeTo(0.2) as number,
      height: expect.closeTo(0.2) as number,
    });
  });
});
