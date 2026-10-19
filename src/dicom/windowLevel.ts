// Window and level: maps modality values (stored pixel × slope + intercept, such as Hounsfield units) to display
// brightness with DICOM's linear VOI function (PS3.3 C.11.2.1.2), and turns a decoded frame into RGBA pixels.

import type { DicomImage } from './parseDicom';

/** A window in modality units: values below `center − width / 2` are black, above `center + width / 2` white. */
export interface DicomWindow {
  center: number;
  width: number;
}

/** A named window, such as Lung or Bone. */
export interface DicomWindowPreset {
  id: string;
  label: string;
  windowWidth: number;
  windowCenter: number;
}

/** The built-in CT presets (Hounsfield units). The viewer labels them with its messages (`dicomPresetLung`…). */
export type DicomCtPreset = 'softTissue' | 'lung' | 'bone' | 'brain' | 'abdomen';

export const ctPresetWindows: Readonly<Record<DicomCtPreset, DicomWindow>> = {
  softTissue: { width: 400, center: 40 },
  lung: { width: 1500, center: -600 },
  bone: { width: 1800, center: 400 },
  brain: { width: 80, center: 40 },
  abdomen: { width: 350, center: 50 },
};

/**
 * The display value (0–255) of a modality value under a window, per DICOM's linear function: the window spans
 * `center − 0.5 ± (width − 1) / 2`.
 */
export function applyWindow(value: number, { center, width }: DicomWindow): number {
  const w = Math.max(width, 1);
  const low = center - 0.5 - (w - 1) / 2;
  const high = center - 0.5 + (w - 1) / 2;
  if (value <= low) {
    return 0;
  }
  if (value > high) {
    return 255;
  }
  return w === 1 ? 255 : Math.round(((value - (center - 0.5)) / (w - 1) + 0.5) * 255);
}

/** The modality value of a stored pixel value. */
export function toModality(image: DicomImage, stored: number): number {
  return stored * (image.rescaleSlope ?? 1) + (image.rescaleIntercept ?? 0);
}

const rangeCache = new WeakMap<DicomImage, { min: number; max: number }>();

/** The smallest and largest modality values in the frame (cached per image). */
export function modalityRange(image: DicomImage): { min: number; max: number } {
  const cached = rangeCache.get(image);
  if (cached) {
    return cached;
  }
  let minStored = image.minPixelValue;
  let maxStored = image.maxPixelValue;
  if (minStored === undefined || maxStored === undefined) {
    minStored = Infinity;
    maxStored = -Infinity;
    for (const value of image.pixels) {
      if (value < minStored) {
        minStored = value;
      }
      if (value > maxStored) {
        maxStored = value;
      }
    }
    if (!Number.isFinite(minStored)) {
      minStored = 0;
      maxStored = 0;
    }
  }
  const a = toModality(image, minStored);
  const b = toModality(image, maxStored);
  const range = { min: Math.min(a, b), max: Math.max(a, b) };
  rangeCache.set(image, range);
  return range;
}

/** The frame's own default window, or one spanning its full range of values. */
export function defaultWindow(image: DicomImage): DicomWindow {
  if (
    image.windowCenter !== undefined &&
    image.windowWidth !== undefined &&
    image.windowWidth >= 1
  ) {
    return { center: image.windowCenter, width: image.windowWidth };
  }
  const { min, max } = modalityRange(image);
  return { center: (min + max) / 2, width: Math.max(max - min, 1) };
}

/**
 * Writes the frame's pixels, windowed, into `out` (RGBA, `width × height × 4`). MONOCHROME1 frames are inverted (as
 * DICOM requires), and `isInverted` inverts again. RGB frames are copied as they are (windowing doesn't apply).
 */
export function renderFrame(
  image: DicomImage,
  window: DicomWindow,
  out: Uint8ClampedArray,
  isInverted = false,
): void {
  const { pixels } = image;
  const count = image.width * image.height;
  if (image.samplesPerPixel === 3) {
    for (let index = 0; index < count; index++) {
      const r = pixels[index * 3] ?? 0;
      const g = pixels[index * 3 + 1] ?? 0;
      const b = pixels[index * 3 + 2] ?? 0;
      out[index * 4] = isInverted ? 255 - r : r;
      out[index * 4 + 1] = isInverted ? 255 - g : g;
      out[index * 4 + 2] = isInverted ? 255 - b : b;
      out[index * 4 + 3] = 255;
    }
    return;
  }
  const invert = (image.photometricInterpretation === 'MONOCHROME1') !== isInverted;
  const slope = image.rescaleSlope ?? 1;
  const intercept = image.rescaleIntercept ?? 0;
  const isInteger = !(pixels instanceof Float32Array);
  // Integer pixels go through a lookup table indexed by stored value, which is much faster than computing each one.
  let lut: Uint8Array | undefined;
  let lutMin = 0;
  if (isInteger) {
    let min = image.minPixelValue;
    let max = image.maxPixelValue;
    if (min === undefined || max === undefined) {
      const range = modalityRange(image);
      // Back from modality values to stored values (slope may be negative).
      const a = (range.min - intercept) / slope;
      const b = (range.max - intercept) / slope;
      min = Math.round(Math.min(a, b));
      max = Math.round(Math.max(a, b));
    }
    if (max - min <= 1 << 20) {
      lutMin = min;
      lut = new Uint8Array(max - min + 1);
      for (let stored = min; stored <= max; stored++) {
        const value = applyWindow(stored * slope + intercept, window);
        lut[stored - min] = invert ? 255 - value : value;
      }
    }
  }
  for (let index = 0; index < count; index++) {
    const stored = pixels[index] ?? 0;
    let value: number;
    if (lut) {
      value = lut[stored - lutMin] ?? 0;
    } else {
      value = applyWindow(stored * slope + intercept, window);
      value = invert ? 255 - value : value;
    }
    const at = index * 4;
    out[at] = value;
    out[at + 1] = value;
    out[at + 2] = value;
    out[at + 3] = 255;
  }
}
