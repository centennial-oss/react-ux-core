// Draws the viewport: the windowed frame, measurements, the measurement in progress, the keyboard cursor and the
// overlay text. Colours here are fixed rather than theme tokens: they sit on the image's own (black) background,
// which doesn't change with the theme, and must stand out from greyscale pixels.

import type { DicomMeasurement, DicomPoint } from './measurements';
import type { DicomImage } from './parseDicom';
import { toScreen, type ViewTransform, type ViewportSize } from './viewport';
import { renderFrame, type DicomWindow } from './windowLevel';

const BACKGROUND = '#000000';
const ANNOTATION = '#ffd400';
const ACTIVE = '#4fd1ff';
const TEXT = '#ffffff';
const TEXT_OUTLINE = '#000000';
const FONT = '12px system-ui, -apple-system, "Segoe UI", sans-serif';
const LINE_HEIGHT = 16;
const PADDING = 8;
const HANDLE_RADIUS = 3;

export interface OverlayCorners {
  topLeft: readonly string[];
  topRight: readonly string[];
  bottomLeft: readonly string[];
  bottomRight: readonly string[];
}

export interface DraftShape {
  kind: DicomMeasurement['kind'];
  points: readonly DicomPoint[];
}

export interface Scene {
  size: ViewportSize;
  pixelRatio: number;
  /** The windowed frame at its native size, or null while there's none to show. */
  frame: CanvasImageSource | null;
  frameWidth: number;
  frameHeight: number;
  transform: ViewTransform;
  /** The measurements on this slice, with their labels. */
  measurements: readonly { measurement: DicomMeasurement; label: string }[];
  selectedId?: string | undefined;
  /** The measurement being drawn, with the pointer (or keyboard cursor) as its next point. */
  draft?: DraftShape | undefined;
  /** Where the next point goes: the pointer or the keyboard cursor, in image coordinates. */
  nextPoint?: DicomPoint | undefined;
  /** Shows a crosshair at `nextPoint` (keyboard placement). */
  hasCursor?: boolean;
  /** Overlay text, or undefined while it's hidden. */
  overlays?: OverlayCorners | undefined;
}

function outlinedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color = TEXT,
): void {
  context.lineWidth = 3;
  context.strokeStyle = TEXT_OUTLINE;
  context.lineJoin = 'round';
  context.strokeText(text, x, y);
  context.fillStyle = color;
  context.fillText(text, x, y);
}

function handle(context: CanvasRenderingContext2D, point: DicomPoint): void {
  context.beginPath();
  context.arc(point.x, point.y, HANDLE_RADIUS, 0, Math.PI * 2);
  context.fill();
}

/** Draws a shape from its screen points; returns where its label goes. */
function shape(
  context: CanvasRenderingContext2D,
  kind: DicomMeasurement['kind'],
  points: readonly DicomPoint[],
): DicomPoint | undefined {
  const [a, b, c] = points;
  if (!a) {
    return undefined;
  }
  context.beginPath();
  if (kind === 'length' || kind === 'angle') {
    context.moveTo(a.x, a.y);
    if (b) {
      context.lineTo(b.x, b.y);
    }
    if (c) {
      context.lineTo(c.x, c.y);
    }
    context.stroke();
    for (const point of points) {
      handle(context, point);
    }
    // Lengths are labelled at their end, angles at their vertex.
    const anchor = b ?? a;
    return { x: anchor.x + 8, y: anchor.y - 8 };
  }
  if (!b) {
    handle(context, a);
    return undefined;
  }
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const width = Math.abs(b.x - a.x);
  const height = Math.abs(b.y - a.y);
  if (kind === 'ellipse') {
    context.ellipse(left + width / 2, top + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  } else {
    context.rect(left, top, width, height);
  }
  context.stroke();
  return { x: left + width + 6, y: top };
}

function corner(
  context: CanvasRenderingContext2D,
  lines: readonly string[],
  size: ViewportSize,
  position: keyof OverlayCorners,
): void {
  const isRight = position === 'topRight' || position === 'bottomRight';
  const isBottom = position === 'bottomLeft' || position === 'bottomRight';
  context.textAlign = isRight ? 'right' : 'left';
  context.textBaseline = 'top';
  const x = isRight ? size.width - PADDING : PADDING;
  const startY = isBottom ? size.height - PADDING - lines.length * LINE_HEIGHT : PADDING;
  lines.forEach((line, index) => {
    outlinedText(context, line, x, startY + index * LINE_HEIGHT);
  });
}

/** Draws a scene onto `context`, whose canvas is `size × pixelRatio` device pixels. */
export function drawScene(context: CanvasRenderingContext2D, scene: Scene): void {
  const { size, pixelRatio, transform } = scene;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, size.width, size.height);

  if (scene.frame) {
    // Smooth when shrinking or slightly enlarging; show crisp pixels when zoomed well in.
    context.imageSmoothingEnabled = transform.scaleX < 3;
    context.drawImage(
      scene.frame,
      transform.originX,
      transform.originY,
      scene.frameWidth * transform.scaleX,
      scene.frameHeight * transform.scaleY,
    );
  }

  context.font = FONT;
  context.lineWidth = 1.5;
  for (const { measurement, label } of scene.measurements) {
    const color = measurement.id === scene.selectedId ? ACTIVE : ANNOTATION;
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = 1.5;
    const at = shape(
      context,
      measurement.kind,
      measurement.points.map((point) => toScreen(transform, point)),
    );
    if (at) {
      context.textAlign = 'left';
      context.textBaseline = 'bottom';
      outlinedText(context, label, at.x, at.y, color);
    }
  }

  if (scene.draft) {
    const points = [...scene.draft.points, ...(scene.nextPoint ? [scene.nextPoint] : [])];
    context.strokeStyle = ACTIVE;
    context.fillStyle = ACTIVE;
    context.lineWidth = 1.5;
    context.setLineDash([4, 3]);
    shape(
      context,
      scene.draft.kind,
      points.map((point) => toScreen(transform, point)),
    );
    context.setLineDash([]);
  }

  if (scene.hasCursor && scene.nextPoint) {
    const { x, y } = toScreen(transform, scene.nextPoint);
    context.strokeStyle = TEXT_OUTLINE;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(x - 8, y);
    context.lineTo(x + 8, y);
    context.moveTo(x, y - 8);
    context.lineTo(x, y + 8);
    context.stroke();
    context.strokeStyle = ACTIVE;
    context.lineWidth = 1.5;
    context.stroke();
  }

  if (scene.overlays) {
    context.font = FONT;
    corner(context, scene.overlays.topLeft, size, 'topLeft');
    corner(context, scene.overlays.topRight, size, 'topRight');
    corner(context, scene.overlays.bottomLeft, size, 'bottomLeft');
    corner(context, scene.overlays.bottomRight, size, 'bottomRight');
  }
}

/**
 * Renders a frame, windowed, into a canvas at its native size (`target`, or a new one), ready to be drawn scaled.
 * Returns null where a 2D context isn't available.
 */
export function frameToCanvas(
  image: DicomImage,
  window: DicomWindow,
  isInverted: boolean,
  target?: HTMLCanvasElement,
): HTMLCanvasElement | null {
  const canvas = target ?? document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }
  const data = context.createImageData(image.width, image.height);
  renderFrame(image, window, data.data, isInverted);
  context.putImageData(data, 0, 0);
  return canvas;
}
