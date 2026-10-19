// Barcode geometry shared by the SVG and canvas renderers: bar runs, guard extensions and text positions, in modules,
// plus physical-size handling (px, mm, cm, in, pt) so printed codes come out at their nominal size at 100% scale.

import type { BarcodeEncoding, BarcodeFormat } from './barcodeEncode';

/** A length in CSS pixels or millimetres. */
export interface CodeLength {
  value: number;
  unit: 'px' | 'mm';
}

const MM_PER_PX = 25.4 / 96;

/** Parses `2`, `"2px"`, `"0.33mm"`, `"0.1cm"`, `"0.013in"` or `"1pt"`; undefined when it can't. */
export function parseCodeLength(length: number | string): CodeLength | undefined {
  if (typeof length === 'number') {
    return Number.isFinite(length) && length > 0 ? { value: length, unit: 'px' } : undefined;
  }
  const match = /^\s*([0-9]*\.?[0-9]+)\s*(px|mm|cm|in|pt)?\s*$/i.exec(length);
  if (!match) {
    return undefined;
  }
  const value = Number(match[1]);
  if (!(value > 0)) {
    return undefined;
  }
  switch ((match[2] ?? 'px').toLowerCase()) {
    case 'mm':
      return { value, unit: 'mm' };
    case 'cm':
      return { value: value * 10, unit: 'mm' };
    case 'in':
      return { value: value * 25.4, unit: 'mm' };
    case 'pt':
      return { value: (value * 25.4) / 72, unit: 'mm' };
    default:
      return { value, unit: 'px' };
  }
}

/** Converts a length to a unit. */
export function convertCodeLength(length: CodeLength, unit: 'px' | 'mm'): number {
  if (length.unit === unit) {
    return length.value;
  }
  return unit === 'mm' ? length.value * MM_PER_PX : length.value / MM_PER_PX;
}

/** Nominal bar height in modules when only a physical module width is given (GS1: 22.85 mm at 0.33 mm for UPC-A). */
const NOMINAL_HEIGHT_MODULES: Record<BarcodeFormat, number> = {
  'upc-a': 69.24,
  'ean-13': 69.24,
  'upc-e': 69.24,
  'ean-8': 55.24,
  code128: 40,
};

/** Text size and position in modules: the font size, the baseline below the bars, and the band height. */
const TEXT_FONT_MODULES = 8;
const TEXT_BASELINE_MODULES = 8;
const TEXT_BAND_MODULES = 10;
/** How far guard bars extend below the others, into the text band. */
const GUARD_EXTENSION_MODULES = 5;

export interface BarcodeGeometry {
  /** Width and height in modules, quiet zones and text included. */
  width: number;
  height: number;
  /** Bars as [x, width, height] in modules, from the top. */
  bars: readonly (readonly [number, number, number])[];
  /** Text runs: the centre x and the baseline y, in modules. */
  text: readonly { text: string; x: number; y: number }[];
  fontSize: number;
  /** One module's size, and the unit the drawing is sized in. */
  module: CodeLength;
}

export interface BarcodeGeometryOptions {
  moduleWidth: number | string;
  height?: number | string;
  hasText: boolean;
  /** Overrides both quiet zones, in modules. */
  quietZone?: number;
}

/** Lays out an encoded barcode. */
export function barcodeGeometry(
  encoding: BarcodeEncoding,
  options: BarcodeGeometryOptions,
): BarcodeGeometry {
  const module = parseCodeLength(options.moduleWidth) ?? { value: 2, unit: 'px' };
  const height = options.height === undefined ? undefined : parseCodeLength(options.height);
  let barHeight: number;
  if (height) {
    barHeight = convertCodeLength(height, module.unit) / module.value;
  } else if (module.unit === 'px') {
    barHeight = 64 / module.value;
  } else {
    barHeight = NOMINAL_HEIGHT_MODULES[encoding.format];
  }
  const left = options.quietZone ?? encoding.quietZone.left;
  const right = options.quietZone ?? encoding.quietZone.right;
  const hasText = options.hasText;
  const bars: [number, number, number][] = [];
  const { bars: modules, longBars } = encoding;
  for (let index = 0; index < modules.length; index++) {
    if (!modules[index]) {
      continue;
    }
    const isLong = hasText && longBars[index] === true;
    let width = 1;
    while (modules[index + width] && (hasText && longBars[index + width] === true) === isLong) {
      width++;
    }
    bars.push([left + index, width, barHeight + (isLong ? GUARD_EXTENSION_MODULES : 0)]);
    index += width - 1;
  }
  const text = hasText
    ? encoding.text.layout.map((segment) => ({
        text: segment.text,
        x: left + (segment.start + segment.end) / 2,
        y: barHeight + TEXT_BASELINE_MODULES,
      }))
    : [];
  return {
    width: left + modules.length + right,
    height: barHeight + (hasText ? TEXT_BAND_MODULES : 0),
    bars,
    text,
    fontSize: TEXT_FONT_MODULES,
    module,
  };
}

/** Draws a barcode onto a canvas context at `scale` device pixels per module, with bar edges on whole pixels. */
export function drawBarcode(
  context: CanvasRenderingContext2D,
  geometry: BarcodeGeometry,
  scale: number,
  colors: { foreground: string; background: string },
  fontFamily: string,
): void {
  const snap = (value: number) => Math.round(value * scale);
  context.save();
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.fillStyle = colors.background;
  context.fillRect(0, 0, snap(geometry.width), snap(geometry.height));
  context.fillStyle = colors.foreground;
  for (const [x, width, height] of geometry.bars) {
    context.fillRect(snap(x), 0, snap(x + width) - snap(x), snap(height));
  }
  if (geometry.text.length > 0) {
    context.font = `${geometry.fontSize * scale}px ${fontFamily}`;
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    for (const run of geometry.text) {
      context.fillText(run.text, run.x * scale, run.y * scale);
    }
  }
  context.restore();
}
