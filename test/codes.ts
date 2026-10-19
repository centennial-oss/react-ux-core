// Test helpers for /codes: rasterize rendered codes and decode them with dev-only decoders (jsQR for QR codes, ZXing
// for linear barcodes), plus a generated centre-image logo. Never shipped.
import {
  BarcodeFormat as ZXingFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library';
import jsQR from 'jsqr';

/** Decodes a QR code from pixels. */
export function decodeQr(
  image: ImageData,
): { text: string; bytes: number[]; version: number } | null {
  const result = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
  return result ? { text: result.data, bytes: result.binaryData, version: result.version } : null;
}

/** The pixels of a canvas. */
export function canvasPixels(canvas: HTMLCanvasElement): ImageData {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No 2D context');
  }
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

/** Draws an image source onto a new canvas of the given size, on white, and returns its pixels. */
export function pixelsOf(source: CanvasImageSource, width: number, height: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No 2D context');
  }
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

/** Rasterizes an SVG element or document string at the given pixel size. */
export async function rasterizeSvg(
  svg: SVGSVGElement | string,
  width: number,
  height: number,
): Promise<ImageData> {
  let markup = typeof svg === 'string' ? svg : new XMLSerializer().serializeToString(svg);
  if (!markup.includes('xmlns=')) {
    markup = markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return pixelsOf(image, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const zxingFormats = {
  'upc-a': ZXingFormat.UPC_A,
  'upc-e': ZXingFormat.UPC_E,
  'ean-13': ZXingFormat.EAN_13,
  'ean-8': ZXingFormat.EAN_8,
  code128: ZXingFormat.CODE_128,
} as const;

/** Decodes a linear barcode of the given format from pixels; null when it can't. */
export function decodeBarcode(image: ImageData, format: keyof typeof zxingFormats): string | null {
  const luminance = new Uint8ClampedArray(image.width * image.height);
  for (let index = 0; index < luminance.length; index++) {
    const offset = index * 4;
    luminance[index] =
      ((image.data[offset] ?? 0) * 299 +
        (image.data[offset + 1] ?? 0) * 587 +
        (image.data[offset + 2] ?? 0) * 114) /
      1000;
  }
  const reader = new MultiFormatReader();
  const hints = new Map<DecodeHintType, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [zxingFormats[format]]],
    [DecodeHintType.TRY_HARDER, true],
  ]);
  reader.setHints(hints);
  try {
    const bitmap = new BinaryBitmap(
      new HybridBinarizer(new RGBLuminanceSource(luminance, image.width, image.height)),
    );
    return reader.decode(bitmap).getText();
  } catch {
    return null;
  }
}

// ZXing-js's UPC-E reader is broken (its decodeMiddle returns the wrong shape and mixes up characters and char codes
// when adding the number system and check digit), so UPC-E is read here by sampling module centres along a row.
const UPCE_L =
  '0001101 0011001 0010011 0111101 0100011 0110001 0101111 0111011 0110111 0001011'.split(' ');
const UPCE_G = UPCE_L.map((code) =>
  Array.from(code, (bit) => (bit === '0' ? '1' : '0'))
    .reverse()
    .join(''),
);
/** Parity (G = even) of the six digits by check digit, number system 0; number system 1 is the inverse. */
const UPCE_PARITY = 'GGGLLL GGLGLL GGLLGL GGLLLG GLGGLL GLLGGL GLLLGG GLGLGL GLGLLG GLLGLG'.split(
  ' ',
);

/** Reads a UPC-E symbol (8 digits) from the middle row of the bars, or null. */
export function decodeUpcE(image: ImageData): string | null {
  const y = Math.floor(image.height * 0.3);
  const isDark = (x: number) => (image.data[(y * image.width + x) * 4] ?? 255) < 128;
  let first = 0;
  while (first < image.width && !isDark(first)) {
    first++;
  }
  let last = image.width - 1;
  while (last > first && !isDark(last)) {
    last--;
  }
  // From the first bar to the last: 3 + 42 + 6 modules, the last module (a bar) included.
  const moduleWidth = (last + 1 - first) / 51;
  const bits = Array.from({ length: 51 }, (_, index) =>
    isDark(Math.floor(first + (index + 0.5) * moduleWidth)) ? '1' : '0',
  ).join('');
  if (!bits.startsWith('101') || !bits.endsWith('010101')) {
    return null;
  }
  let digits = '';
  let parity = '';
  for (let index = 0; index < 6; index++) {
    const code = bits.slice(3 + index * 7, 10 + index * 7);
    const odd = UPCE_L.indexOf(code);
    const even = UPCE_G.indexOf(code);
    if (odd < 0 && even < 0) {
      return null;
    }
    digits += String(odd >= 0 ? odd : even);
    parity += odd >= 0 ? 'L' : 'G';
  }
  const inverted = Array.from(parity, (side) => (side === 'L' ? 'G' : 'L')).join('');
  const system = UPCE_PARITY.includes(parity) ? 0 : UPCE_PARITY.includes(inverted) ? 1 : -1;
  if (system < 0) {
    return null;
  }
  const check = UPCE_PARITY.indexOf(system === 0 ? parity : inverted);
  // The check digit belongs to the expanded UPC-A number; reject the read if it doesn't match.
  const [d1, d2, d3, d4, d5, d6] = digits;
  const body =
    d6 === '0' || d6 === '1' || d6 === '2'
      ? `${d1}${d2}${d6}0000${d3}${d4}${d5}`
      : d6 === '3'
        ? `${d1}${d2}${d3}00000${d4}${d5}`
        : d6 === '4'
          ? `${d1}${d2}${d3}${d4}00000${d5}`
          : `${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  const upcA = `${system}${body}`;
  let sum = 0;
  for (let index = 0; index < 11; index++) {
    sum += Number(upcA[index]) * (index % 2 === 0 ? 3 : 1);
  }
  if ((10 - (sum % 10)) % 10 !== check) {
    return null;
  }
  return `${system}${digits}${check}`;
}

/** A colourful round logo as a PNG data URL, drawn on a canvas (no assets). */
export function logoDataUrl(size = 96): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No 2D context');
  }
  context.fillStyle = '#1b4d3e';
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#f4b942';
  context.beginPath();
  context.arc(size * 0.38, size * 0.42, size * 0.18, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#ffffff';
  context.lineWidth = size * 0.06;
  context.beginPath();
  context.ellipse(size / 2, size / 2, size * 0.4, size * 0.14, -0.4, 0, Math.PI * 2);
  context.stroke();
  return canvas.toDataURL('image/png');
}

/** A small planet logo as an SVG data URL, for stories (deterministic, no canvas). */
export const planetLogo = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="64" height="64"><circle cx="16" cy="16" r="16" fill="#1b4d3e"/><circle cx="12" cy="13" r="6" fill="#f4b942"/><ellipse cx="16" cy="16" rx="13" ry="4.5" fill="none" stroke="#fff" stroke-width="2" transform="rotate(-23 16 16)"/></svg>',
)}`;
