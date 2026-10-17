// Pure helpers for the model viewer: the file format from a URL, camera framing, view directions, grid sizes and
// unit formatting.

export type ModelFormat = 'glb' | 'gltf' | 'stl' | 'obj';
export type ModelUnits = 'mm' | 'cm' | 'm' | 'in';
export type ModelView = 'front' | 'top' | 'right' | 'iso';

/** The format from the URL's extension (ignoring any query or hash), or `null` when it isn't one we load. */
export function detectFormat(src: string): ModelFormat | null {
  const path = src.split(/[?#]/)[0] ?? '';
  const extension = /\.([a-z0-9]+)$/i.exec(path)?.[1]?.toLowerCase();
  switch (extension) {
    case 'glb':
    case 'gltf':
    case 'stl':
    case 'obj':
      return extension;
    default:
      return null;
  }
}

/** The direction from the target to the camera for each view (y is up on screen). */
export const viewDirections: Record<ModelView, readonly [number, number, number]> = {
  front: [0, 0, 1],
  // Straight down, nudged so the orbit controls keep a defined "up".
  top: [0, 1, 0.0001],
  right: [1, 0, 0],
  iso: [1, 0.8, 1],
};

/**
 * How far the camera sits from a sphere of `radius` so it fills the view with a margin, for a vertical field of view
 * of `fovDegrees` and the viewport's `aspect` (width / height).
 */
export function fitDistance(radius: number, fovDegrees: number, aspect: number): number {
  const vertical = (fovDegrees * Math.PI) / 360;
  // The narrower of the two half-angles decides.
  const horizontal = Math.atan(Math.tan(vertical) * aspect);
  const half = Math.min(vertical, horizontal);
  return (radius / Math.sin(half)) * 1.1;
}

/** The smallest 1, 2 or 5 × 10ⁿ at or above `value`, for a tidy grid. */
export function niceCeil(value: number): number {
  if (!(value > 0)) {
    return 1;
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 5, 10]) {
    if (step * magnitude >= value * (1 - 1e-9)) {
      return step * magnitude;
    }
  }
  return 10 * magnitude;
}

const unitNames: Record<ModelUnits, string> = {
  mm: 'millimeter',
  cm: 'centimeter',
  m: 'meter',
  in: 'inch',
};

/** A length in model units, with its unit when known (`12.5 mm`), in the user's locale. */
export function formatLength(value: number, units: ModelUnits | undefined, locale: string): string {
  const digits = Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    ...(units === undefined ? {} : { style: 'unit', unit: unitNames[units], unitDisplay: 'short' }),
  }).format(value);
}
