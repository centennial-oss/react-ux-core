// Measurement maths: lengths (in mm when the frame has pixel spacing), angles, and elliptical or rectangular regions
// of interest with their area and the mean, spread and extremes of the modality values inside them.

import type { DicomImage } from './parseDicom';
import { toModality } from './windowLevel';

/** A point in image pixel coordinates: (0, 0) is the top-left corner of the first pixel. */
export interface DicomPoint {
  x: number;
  y: number;
}

export type DicomMeasurementKind = 'length' | 'angle' | 'ellipse' | 'rectangle';

interface MeasurementBase {
  id: string;
  /** The image the measurement was made on. */
  imageId: string;
  /** The 0-based slice index in its series' stack. */
  sliceIndex: number;
  /** The series' `id`, when the viewer was given `series`. */
  seriesId?: string;
}

/** A straight line. `unit` is `mm` when the frame has pixel spacing, `px` otherwise. */
export interface DicomLengthMeasurement extends MeasurementBase {
  kind: 'length';
  points: readonly [DicomPoint, DicomPoint];
  length: number;
  unit: 'mm' | 'px';
}

/** The angle at `points[1]` between the lines to `points[0]` and `points[2]`, in degrees (0–180). */
export interface DicomAngleMeasurement extends MeasurementBase {
  kind: 'angle';
  points: readonly [DicomPoint, DicomPoint, DicomPoint];
  degrees: number;
}

/**
 * A region of interest: the ellipse or rectangle inside the box with opposite corners `points`. `area` is in mm²
 * when the frame has pixel spacing (`unit` `mm`), in pixels otherwise. The statistics are of the modality values
 * (such as Hounsfield units) of the pixels whose centres are inside.
 */
export interface DicomRoiMeasurement extends MeasurementBase {
  kind: 'ellipse' | 'rectangle';
  points: readonly [DicomPoint, DicomPoint];
  area: number;
  unit: 'mm' | 'px';
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  pixelCount: number;
}

export type DicomMeasurement = DicomLengthMeasurement | DicomAngleMeasurement | DicomRoiMeasurement;

/** The distance between two points, in mm when `pixelSpacing` (`[row, column]` mm) is given, in pixels otherwise. */
export function measureLength(
  a: DicomPoint,
  b: DicomPoint,
  pixelSpacing?: readonly [number, number],
): { length: number; unit: 'mm' | 'px' } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (pixelSpacing) {
    // Row spacing is the vertical distance between rows; column spacing the horizontal one.
    return { length: Math.hypot(dx * pixelSpacing[1], dy * pixelSpacing[0]), unit: 'mm' };
  }
  return { length: Math.hypot(dx, dy), unit: 'px' };
}

/** The angle at `vertex` between the lines to `a` and `c`, in degrees, in physical space when spacing is given. */
export function measureAngle(
  a: DicomPoint,
  vertex: DicomPoint,
  c: DicomPoint,
  pixelSpacing?: readonly [number, number],
): number {
  const [sy, sx] = pixelSpacing ?? [1, 1];
  const ux = (a.x - vertex.x) * sx;
  const uy = (a.y - vertex.y) * sy;
  const vx = (c.x - vertex.x) * sx;
  const vy = (c.y - vertex.y) * sy;
  const lengths = Math.hypot(ux, uy) * Math.hypot(vx, vy);
  if (lengths === 0) {
    return 0;
  }
  const cos = Math.min(1, Math.max(-1, (ux * vx + uy * vy) / lengths));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Area and statistics of an elliptical or rectangular region of a frame. */
export function measureRoi(
  kind: 'ellipse' | 'rectangle',
  a: DicomPoint,
  b: DicomPoint,
  image: DicomImage,
): Pick<DicomRoiMeasurement, 'area' | 'unit' | 'mean' | 'stdDev' | 'min' | 'max' | 'pixelCount'> {
  const left = Math.min(a.x, b.x);
  const right = Math.max(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const bottom = Math.max(a.y, b.y);
  const width = right - left;
  const height = bottom - top;
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const geometricArea = kind === 'ellipse' ? (Math.PI * width * height) / 4 : width * height;
  const spacing = image.pixelSpacing;
  const area = spacing ? geometricArea * spacing[0] * spacing[1] : geometricArea;

  let count = 0;
  let sum = 0;
  let sumSquares = 0;
  let min = Infinity;
  let max = -Infinity;
  const samples = image.samplesPerPixel ?? 1;
  const firstColumn = Math.max(0, Math.floor(left));
  const lastColumn = Math.min(image.width - 1, Math.ceil(right));
  const firstRow = Math.max(0, Math.floor(top));
  const lastRow = Math.min(image.height - 1, Math.ceil(bottom));
  for (let row = firstRow; row <= lastRow; row++) {
    const py = row + 0.5;
    if (py < top || py > bottom) {
      continue;
    }
    for (let column = firstColumn; column <= lastColumn; column++) {
      const px = column + 0.5;
      if (px < left || px > right) {
        continue;
      }
      if (kind === 'ellipse') {
        const nx = width === 0 ? 0 : (px - centerX) / (width / 2);
        const ny = height === 0 ? 0 : (py - centerY) / (height / 2);
        if (nx * nx + ny * ny > 1) {
          continue;
        }
      }
      const offset = (row * image.width + column) * samples;
      // RGB regions report the mean of the channels' average (brightness).
      let stored = image.pixels[offset] ?? 0;
      if (samples === 3) {
        stored = (stored + (image.pixels[offset + 1] ?? 0) + (image.pixels[offset + 2] ?? 0)) / 3;
      }
      const value = samples === 3 ? stored : toModality(image, stored);
      count++;
      sum += value;
      sumSquares += value * value;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  const mean = count === 0 ? 0 : sum / count;
  const variance = count === 0 ? 0 : Math.max(0, sumSquares / count - mean * mean);
  return {
    area,
    unit: spacing ? 'mm' : 'px',
    mean,
    stdDev: Math.sqrt(variance),
    min: count === 0 ? 0 : min,
    max: count === 0 ? 0 : max,
    pixelCount: count,
  };
}

/** A measurement's kind, location and points, before its values are computed. */
export type DicomMeasurementDraft = Pick<
  DicomMeasurement,
  'id' | 'imageId' | 'sliceIndex' | 'seriesId'
> &
  (
    | { kind: 'length'; points: readonly [DicomPoint, DicomPoint] }
    | { kind: 'angle'; points: readonly [DicomPoint, DicomPoint, DicomPoint] }
    | { kind: 'ellipse' | 'rectangle'; points: readonly [DicomPoint, DicomPoint] }
  );

/** Computes a measurement's values on the frame it was drawn on. */
export function computeMeasurement(
  draft: DicomMeasurementDraft,
  image: DicomImage,
): DicomMeasurement {
  const base = {
    id: draft.id,
    imageId: draft.imageId,
    sliceIndex: draft.sliceIndex,
    ...(draft.seriesId !== undefined ? { seriesId: draft.seriesId } : {}),
  };
  switch (draft.kind) {
    case 'length':
      return {
        ...base,
        kind: 'length',
        points: draft.points,
        ...measureLength(draft.points[0], draft.points[1], image.pixelSpacing),
      };
    case 'angle':
      return {
        ...base,
        kind: 'angle',
        points: draft.points,
        degrees: measureAngle(
          draft.points[0],
          draft.points[1],
          draft.points[2],
          image.pixelSpacing,
        ),
      };
    default:
      return {
        ...base,
        kind: draft.kind,
        points: draft.points,
        ...measureRoi(draft.kind, draft.points[0], draft.points[1], image),
      };
  }
}
