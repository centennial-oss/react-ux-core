// Viewport geometry: where the image sits on screen for a zoom and pan, and conversions between screen (CSS pixel)
// and image (pixel) coordinates. Non-square pixels are drawn at their physical aspect ratio.

import { clamp } from '../utils/math';
import type { DicomPoint } from './measurements';
import type { DicomImage } from './parseDicom';

/** The user's view: `zoom` is relative to fitting the image in the viewport; `pan` is in CSS pixels. */
export interface DicomView {
  zoom: number;
  panX: number;
  panY: number;
}

export const initialView: DicomView = { zoom: 1, panX: 0, panY: 0 };
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 16;

export interface ViewportSize {
  width: number;
  height: number;
}

/** Image pixel → screen: `screen = origin + pixel × scale`, per axis. */
export interface ViewTransform {
  originX: number;
  originY: number;
  scaleX: number;
  scaleY: number;
}

type ImageGeometry = Pick<DicomImage, 'width' | 'height' | 'pixelSpacing'>;

/** How much taller than wide a pixel is drawn (row spacing / column spacing). */
function pixelAspect(image: ImageGeometry): number {
  return image.pixelSpacing ? image.pixelSpacing[0] / image.pixelSpacing[1] : 1;
}

export function getTransform(
  size: ViewportSize,
  image: ImageGeometry,
  view: DicomView,
): ViewTransform {
  const aspect = pixelAspect(image);
  const displayHeight = image.height * aspect;
  const fit = Math.min(size.width / image.width, size.height / displayHeight) || 1;
  const scale = fit * view.zoom;
  return {
    originX: size.width / 2 + view.panX - (image.width * scale) / 2,
    originY: size.height / 2 + view.panY - (displayHeight * scale) / 2,
    scaleX: scale,
    scaleY: scale * aspect,
  };
}

export function toScreen(transform: ViewTransform, point: DicomPoint): DicomPoint {
  return {
    x: transform.originX + point.x * transform.scaleX,
    y: transform.originY + point.y * transform.scaleY,
  };
}

export function toImage(transform: ViewTransform, point: DicomPoint): DicomPoint {
  return {
    x: (point.x - transform.originX) / transform.scaleX,
    y: (point.y - transform.originY) / transform.scaleY,
  };
}

export function clampZoom(zoom: number): number {
  return clamp(zoom, MIN_ZOOM, MAX_ZOOM);
}

/** The view zoomed to `zoom`, keeping the image point under `anchor` (screen coordinates) where it is. */
export function zoomAt(
  size: ViewportSize,
  image: ImageGeometry,
  view: DicomView,
  zoom: number,
  anchor: DicomPoint = { x: size.width / 2, y: size.height / 2 },
): DicomView {
  const nextZoom = clampZoom(zoom);
  const before = getTransform(size, image, view);
  const point = toImage(before, anchor);
  const after = getTransform(size, image, { ...view, zoom: nextZoom });
  // Shift the pan by however far the anchored point moved.
  const moved = toScreen(after, point);
  return {
    zoom: nextZoom,
    panX: view.panX + anchor.x - moved.x,
    panY: view.panY + anchor.y - moved.y,
  };
}
