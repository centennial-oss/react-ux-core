// Pure maths for the image viewer (fit, zoom about a point, pan limits, screen ↔ image mapping) and for annotations
// (moving, resizing and creating shapes in fractional image coordinates).
import type {
  Annotation,
  AnnotationKind,
  AnnotationPoint,
  ImageFit,
  PinAnnotation,
  PolygonAnnotation,
  RectAnnotation,
} from './types';

/** Quarter turns, clockwise. */
export type ImageRotation = 0 | 90 | 180 | 270;

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Where the image sits in its frame. `zoom` is the scale against the image's own pixels (1 = 100%); `panX`/`panY`
 * offset the image's centre from the frame's centre, in screen pixels.
 */
export interface ImageView {
  zoom: number;
  panX: number;
  panY: number;
  rotation: ImageRotation;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** The image's bounding size after rotating it. */
export function rotatedSize(image: Size, rotation: ImageRotation): Size {
  return rotation % 180 === 0 ? image : { width: image.height, height: image.width };
}

/** The zoom that shows the image as `fit` asks: whole without upscaling, covering the frame, or at 100%. */
export function fitZoom(frame: Size, image: Size, rotation: ImageRotation, fit: ImageFit): number {
  if (fit === 'actual' || image.width <= 0 || image.height <= 0) {
    return 1;
  }
  const rotated = rotatedSize(image, rotation);
  const scaleX = frame.width / rotated.width;
  const scaleY = frame.height / rotated.height;
  if (fit === 'fill') {
    return Math.max(scaleX, scaleY);
  }
  // Small images stay sharp at their own size instead of being blown up.
  return Math.min(1, scaleX, scaleY);
}

/** How far the image can pan each way: none along an axis where it's no bigger than the frame. */
export function panLimits(view: ImageView, frame: Size, image: Size): Point {
  const rotated = rotatedSize(image, view.rotation);
  return {
    x: Math.max(0, (rotated.width * view.zoom - frame.width) / 2),
    y: Math.max(0, (rotated.height * view.zoom - frame.height) / 2),
  };
}

/** Keeps the image covering the frame along any axis where it's bigger, and centred where it's smaller. */
export function clampPan(view: ImageView, frame: Size, image: Size): ImageView {
  const limits = panLimits(view, frame, image);
  return {
    ...view,
    panX: clamp(view.panX, -limits.x, limits.x),
    panY: clamp(view.panY, -limits.y, limits.y),
  };
}

/** Zooms to `zoom` keeping the image point under `anchor` (frame coordinates) where it is, then clamps the pan. */
export function zoomAt(
  view: ImageView,
  zoom: number,
  anchor: Point,
  frame: Size,
  image: Size,
): ImageView {
  const ratio = zoom / view.zoom;
  const centreX = frame.width / 2;
  const centreY = frame.height / 2;
  return clampPan(
    {
      ...view,
      zoom,
      panX: anchor.x - centreX - (anchor.x - centreX - view.panX) * ratio,
      panY: anchor.y - centreY - (anchor.y - centreY - view.panY) * ratio,
    },
    frame,
    image,
  );
}

function rotate(point: Point, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.round(Math.cos(radians));
  const sin = Math.round(Math.sin(radians));
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

/** Maps a frame point to a point on the image, as fractions of its width and height (outside 0–1 when off it). */
export function toImagePoint(point: Point, view: ImageView, frame: Size, image: Size): Point {
  const relative = rotate(
    {
      x: point.x - frame.width / 2 - view.panX,
      y: point.y - frame.height / 2 - view.panY,
    },
    -view.rotation,
  );
  return {
    x: (relative.x / view.zoom + image.width / 2) / image.width,
    y: (relative.y / view.zoom + image.height / 2) / image.height,
  };
}

/** Maps an image point (fractions) to frame coordinates. */
export function fromImagePoint(point: Point, view: ImageView, frame: Size, image: Size): Point {
  const rotated = rotate(
    {
      x: (point.x * image.width - image.width / 2) * view.zoom,
      y: (point.y * image.height - image.height / 2) * view.zoom,
    },
    view.rotation,
  );
  return {
    x: rotated.x + frame.width / 2 + view.panX,
    y: rotated.y + frame.height / 2 + view.panY,
  };
}

/**
 * The CSS transform for an element the image's own size with `transform-origin: 0 0`: centre it on the frame
 * centre plus the pan, rotate and scale it.
 */
export function viewTransform(view: ImageView, frame: Size, image: Size): string {
  const x = frame.width / 2 + view.panX;
  const y = frame.height / 2 + view.panY;
  return `translate(${x}px, ${y}px) rotate(${view.rotation}deg) scale(${view.zoom}) translate(${-image.width / 2}px, ${-image.height / 2}px)`;
}

/** The distance between two points and their midpoint, for pinch gestures. */
export function pinchOf(points: readonly Point[]): { distance: number; mid: Point } {
  const [a = { x: 0, y: 0 }, b = a] = points;
  return {
    distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
    mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  };
}

// Annotations.

/** The smallest a rectangle can be resized to, as a fraction of the image. */
export const MIN_RECT_SIZE = 0.01;

const clamp01 = (value: number) => clamp(value, 0, 1);

export function clampPoint(point: AnnotationPoint): AnnotationPoint {
  return { x: clamp01(point.x), y: clamp01(point.y) };
}

/** The smallest box around an annotation (a pin's box has no size). */
export function annotationBounds(annotation: Annotation): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  switch (annotation.kind) {
    case 'pin':
      return { x: annotation.x, y: annotation.y, width: 0, height: 0 };
    case 'rect':
      return {
        x: annotation.x,
        y: annotation.y,
        width: annotation.width,
        height: annotation.height,
      };
    case 'polygon': {
      const xs = annotation.points.map((point) => point.x);
      const ys = annotation.points.map((point) => point.y);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
    }
  }
}

/** Where an annotation's number marker (and its edit popover) sits: a pin's point, or the top of a shape. */
export function annotationAnchor(annotation: Annotation): AnnotationPoint {
  switch (annotation.kind) {
    case 'pin':
      return { x: annotation.x, y: annotation.y };
    case 'rect':
      return { x: annotation.x + annotation.width / 2, y: annotation.y };
    case 'polygon':
      return annotation.points.reduce(
        (top, point) => (point.y < top.y ? point : top),
        annotation.points[0] ?? { x: 0.5, y: 0.5 },
      );
  }
}

/** Moves an annotation by a fraction of the image, keeping the whole shape on the image. */
export function moveAnnotation(annotation: Annotation, dx: number, dy: number): Annotation {
  const bounds = annotationBounds(annotation);
  const moveX = clamp(dx, -bounds.x, 1 - bounds.x - bounds.width);
  const moveY = clamp(dy, -bounds.y, 1 - bounds.y - bounds.height);
  switch (annotation.kind) {
    case 'pin':
    case 'rect':
      return { ...annotation, x: annotation.x + moveX, y: annotation.y + moveY };
    case 'polygon':
      return {
        ...annotation,
        points: annotation.points.map((point) => ({ x: point.x + moveX, y: point.y + moveY })),
      };
  }
}

/** A rectangle corner: north-west, north-east, south-west or south-east. */
export type RectCorner = 'nw' | 'ne' | 'sw' | 'se';

/** Drags one corner of a rectangle to `point`, keeping the opposite corner fixed (the corners may swap). */
export function resizeRect(
  rect: RectAnnotation,
  corner: RectCorner,
  point: AnnotationPoint,
): RectAnnotation {
  const target = clampPoint(point);
  const fixedX = corner === 'nw' || corner === 'sw' ? rect.x + rect.width : rect.x;
  const fixedY = corner === 'nw' || corner === 'ne' ? rect.y + rect.height : rect.y;
  return { ...rect, ...rectBetween({ x: fixedX, y: fixedY }, target) };
}

/** Grows or shrinks a rectangle from its top-left corner, staying on the image and at least the minimum size. */
export function resizeRectBy(rect: RectAnnotation, dw: number, dh: number): RectAnnotation {
  return {
    ...rect,
    width: clamp(rect.width + dw, MIN_RECT_SIZE, 1 - rect.x),
    height: clamp(rect.height + dh, MIN_RECT_SIZE, 1 - rect.y),
  };
}

/** The box between two points, at least the minimum size and on the image. */
export function rectBetween(
  a: AnnotationPoint,
  b: AnnotationPoint,
): { x: number; y: number; width: number; height: number } {
  const start = clampPoint(a);
  const end = clampPoint(b);
  const width = Math.max(MIN_RECT_SIZE, Math.abs(end.x - start.x));
  const height = Math.max(MIN_RECT_SIZE, Math.abs(end.y - start.y));
  return {
    x: Math.min(Math.min(start.x, end.x), 1 - width),
    y: Math.min(Math.min(start.y, end.y), 1 - height),
    width,
    height,
  };
}

/** Moves one point of a polygon. */
export function moveVertex(
  polygon: PolygonAnnotation,
  index: number,
  point: AnnotationPoint,
): PolygonAnnotation {
  const target = clampPoint(point);
  return {
    ...polygon,
    points: polygon.points.map((current, at) => (at === index ? target : current)),
  };
}

/** The size of a shape created with a tap or the keyboard, as a fraction of the image. */
const DEFAULT_SHAPE_SIZE = 0.2;

/**
 * A new annotation of `kind` centred on `centre`: a pin there, or a square-ish box or triangle around it that stays
 * on the image.
 */
export function createAnnotation(
  kind: AnnotationKind,
  centre: AnnotationPoint,
  base: { id: string; label: string },
): Annotation {
  const point = clampPoint(centre);
  const half = DEFAULT_SHAPE_SIZE / 2;
  const x = clamp(point.x, half, 1 - half);
  const y = clamp(point.y, half, 1 - half);
  switch (kind) {
    case 'pin':
      return { ...base, kind, x: point.x, y: point.y } satisfies PinAnnotation;
    case 'rect':
      return {
        ...base,
        kind,
        x: x - half,
        y: y - half,
        width: DEFAULT_SHAPE_SIZE,
        height: DEFAULT_SHAPE_SIZE,
      } satisfies RectAnnotation;
    case 'polygon':
      return {
        ...base,
        kind,
        points: [
          { x, y: y - half },
          { x: x + half, y: y + half },
          { x: x - half, y: y + half },
        ],
      } satisfies PolygonAnnotation;
  }
}

/** An SVG `points` attribute in image fractions. */
export function svgPoints(points: readonly AnnotationPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}
