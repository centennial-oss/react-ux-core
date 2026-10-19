// Pure viewport maths for Canvas: converting between world and screen coordinates, zooming about a point, fitting a
// rectangle, snapping and rectangle tests. No DOM, so it's unit-tested on its own.

import { clamp } from '../utils/math';

// Re-exported for the graph components, which share the canvas's pointer handling.
export { capturePointer } from '../utils/pointer';

/**
 * What the canvas shows: `x` and `y` are the world point at the canvas's top-left corner, and `zoom` is screen pixels
 * per world unit (1 is 100%).
 */
export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

/** A world point in screen pixels, relative to the canvas's top-left corner. */
export function worldToScreen(point: CanvasPoint, viewport: CanvasViewport): CanvasPoint {
  return { x: (point.x - viewport.x) * viewport.zoom, y: (point.y - viewport.y) * viewport.zoom };
}

/** A screen point (relative to the canvas's top-left corner) in world units. */
export function screenToWorld(point: CanvasPoint, viewport: CanvasViewport): CanvasPoint {
  return { x: point.x / viewport.zoom + viewport.x, y: point.y / viewport.zoom + viewport.y };
}

/** The viewport at `zoom`, keeping the world point under `screenPoint` where it is (zoom at the cursor). */
export function zoomAt(
  viewport: CanvasViewport,
  screenPoint: CanvasPoint,
  zoom: number,
): CanvasViewport {
  const world = screenToWorld(screenPoint, viewport);
  return { x: world.x - screenPoint.x / zoom, y: world.y - screenPoint.y / zoom, zoom };
}

/** The viewport that centres `rect` in `size` with `padding` screen pixels around it, within the zoom limits. */
export function fitRect(
  rect: CanvasRect,
  size: CanvasSize,
  {
    padding = 24,
    minZoom = 0.1,
    maxZoom = 1,
  }: { padding?: number; minZoom?: number; maxZoom?: number } = {},
): CanvasViewport {
  const width = Math.max(1, size.width - padding * 2);
  const height = Math.max(1, size.height - padding * 2);
  const zoom = clamp(
    Math.min(width / Math.max(rect.width, 1), height / Math.max(rect.height, 1)),
    minZoom,
    maxZoom,
  );
  return {
    x: rect.x + rect.width / 2 - size.width / 2 / zoom,
    y: rect.y + rect.height / 2 - size.height / 2 / zoom,
    zoom,
  };
}

/** The world rectangle the viewport shows. */
export function visibleRect(viewport: CanvasViewport, size: CanvasSize): CanvasRect {
  return {
    x: viewport.x,
    y: viewport.y,
    width: size.width / viewport.zoom,
    height: size.height / viewport.zoom,
  };
}

/** `value` rounded to the nearest multiple of `step`. */
export function snapValue(value: number, step: number): number {
  return step > 0 ? Math.round(value / step) * step : value;
}

/** The rectangle between two corner points, in any order. */
export function normalizeRect(a: CanvasPoint, b: CanvasPoint): CanvasRect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

/** Whether two rectangles overlap (touching edges count). */
export function rectsIntersect(a: CanvasRect, b: CanvasRect): boolean {
  return (
    a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height
  );
}

/** The smallest rectangle around all `rects`, or null when there are none. */
export function unionRects(rects: Iterable<CanvasRect>): CanvasRect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }
  return Number.isFinite(minX)
    ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    : null;
}

/** The smallest "nice" step (1, 2 or 5 × 10ⁿ) that is at least `minimum`, for ruler ticks and grid lines. */
export function niceStep(minimum: number): number {
  if (!(minimum > 0) || !Number.isFinite(minimum)) {
    return 1;
  }
  const power = 10 ** Math.floor(Math.log10(minimum));
  for (const factor of [1, 2, 5, 10]) {
    if (power * factor >= minimum) {
      return power * factor;
    }
  }
  return power * 10;
}

/** Whether two viewports are the same (within a hair, so float noise doesn't cause updates). */
export function sameViewport(a: CanvasViewport, b: CanvasViewport): boolean {
  return (
    Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6 && Math.abs(a.zoom - b.zoom) < 1e-9
  );
}
