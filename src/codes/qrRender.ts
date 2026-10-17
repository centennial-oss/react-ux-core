// QR geometry shared by the SVG and canvas renderers and the download exports: one path for the data modules, solid
// finder patterns, and the centre-image box. Coordinates are in modules, with the quiet zone included.

import {
  alignmentPositions,
  qrBlockLayout,
  qrModuleCodewords,
  type QrErrorCorrection,
  type QrMatrix,
} from './qrEncode';

/** Data module shape. `square` is the most reliable. */
export type QrModuleShape = 'square' | 'rounded' | 'dots';
/** Finder (corner) pattern style. */
export type QrFinderShape = 'square' | 'rounded';

/** Art in the centre of a QR code, such as a logo. */
export interface QrCenterImage {
  src: string;
  /** Share of the symbol's width, capped at 0.25. Defaults to 0.2. */
  size?: number;
  /** Clears the modules under the image instead of drawing it over them. Defaults to true. */
  shouldExcavate?: boolean;
  /** A plate behind the image, for contrast. */
  background?: string;
}

/** How a QR code is drawn, for the component and the exports. */
export interface QrStyle {
  /** Dark modules. Defaults to black (#000000). */
  foreground?: string;
  /** Light modules and the quiet zone. Defaults to white (#ffffff). */
  background?: string;
  /** Light border in modules. Defaults to 4, the minimum the specification allows. */
  quietZone?: number;
  /** Defaults to `square`. */
  moduleShape?: QrModuleShape;
  /** Defaults to `square`. */
  finderShape?: QrFinderShape;
  centerImage?: QrCenterImage;
}

export const QR_DEFAULT_FOREGROUND = '#000000';
export const QR_DEFAULT_BACKGROUND = '#ffffff';
/** The largest share of the symbol's width a centre image may take. */
export const QR_CENTER_IMAGE_MAX = 0.25;
/** The lowest level used with centre art. */
export const QR_CENTER_IMAGE_MIN_LEVEL: QrErrorCorrection = 'Q';

/** A square box in modules. */
export interface QrBox {
  x: number;
  y: number;
  size: number;
}

export interface QrGeometry {
  /** Modules per side, quiet zone included. */
  total: number;
  /** The data, timing, alignment and format modules as one path (nonzero fill). */
  modulesPath: string;
  /** The three finder patterns as one path (even-odd fill), plus the alignment patterns for stylized modules, so
   * the patterns scanners look for stay solid. */
  findersPath: string;
  /** Dark runs per row, for crisp canvas drawing of square modules: [x, y, length] in modules. */
  squareRuns: readonly (readonly [number, number, number])[];
  /** Where the centre image goes (and the modules it clears), if there is one. */
  imageBox?: QrBox;
}

/** Light quiet-zone width: a whole number, at least 0. */
function quietZoneOf(style: QrStyle): number {
  return Math.max(0, Math.round(style.quietZone ?? 4));
}

/**
 * The centre-image box in symbol modules (no quiet zone): an odd number of whole modules, centred, at most
 * `QR_CENTER_IMAGE_MAX` of the width, and clear of the finder, separator, timing and format areas.
 */
export function qrCenterBox(
  matrix: Pick<QrMatrix, 'size'>,
  image: QrCenterImage,
): QrBox | undefined {
  const share = Math.min(Math.max(image.size ?? 0.2, 0), QR_CENTER_IMAGE_MAX);
  // The top-left finder, separator and format strip end at module 9; the box starts no earlier than that.
  const largest = matrix.size - 18;
  let modules = Math.min(Math.floor(share * matrix.size), largest);
  if (modules % 2 === 0) {
    modules -= 1;
  }
  if (modules < 1) {
    return undefined;
  }
  const start = (matrix.size - modules) / 2;
  return { x: start, y: start, size: modules };
}

function isFinderModule(size: number, x: number, y: number): boolean {
  const isNearLeft = x < 7;
  const isNearTop = y < 7;
  return (isNearLeft && isNearTop) || (x >= size - 7 && isNearTop) || (isNearLeft && y >= size - 7);
}

const round = (value: number) => Math.round(value * 1000) / 1000;

function roundedRect(
  x: number,
  y: number,
  size: number,
  radius: number,
  isReversed = false,
): string {
  const r = round(radius);
  const side = round(size - 2 * radius);
  if (isReversed) {
    // Counter-clockwise, so it cuts a hole under the nonzero rule too.
    return (
      `M${round(x + r)} ${round(y)}a${r} ${r} 0 0 0 ${-r} ${r}v${side}a${r} ${r} 0 0 0 ${r} ${r}` +
      `h${side}a${r} ${r} 0 0 0 ${r} ${-r}v${-side}a${r} ${r} 0 0 0 ${-r} ${-r}z`
    );
  }
  return (
    `M${round(x + r)} ${round(y)}h${side}a${r} ${r} 0 0 1 ${r} ${r}v${side}a${r} ${r} 0 0 1 ${-r} ${r}` +
    `h${-side}a${r} ${r} 0 0 1 ${-r} ${-r}v${-side}a${r} ${r} 0 0 1 ${r} ${-r}z`
  );
}

function finderPath(x: number, y: number, shape: QrFinderShape): string {
  if (shape === 'rounded') {
    return (
      roundedRect(x, y, 7, 2) +
      roundedRect(x + 1, y + 1, 5, 1.4, true) +
      roundedRect(x + 2, y + 2, 3, 0.9)
    );
  }
  return `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`;
}

function alignmentPath(x: number, y: number, shape: QrFinderShape): string {
  if (shape === 'rounded') {
    return (
      roundedRect(x, y, 5, 1.4) +
      roundedRect(x + 1, y + 1, 3, 0.8, true) +
      roundedRect(x + 2, y + 2, 1, 0.5)
    );
  }
  return `M${x} ${y}h5v5h-5zM${x + 1} ${y + 1}v3h3v-3zM${x + 2} ${y + 2}h1v1h-1z`;
}

/** The top-left corners of the alignment patterns (each 5 × 5), leaving out the three under the finders. */
function alignmentCorners(version: number): [number, number][] {
  const positions = alignmentPositions(version);
  const last = positions.length - 1;
  const corners: [number, number][] = [];
  positions.forEach((cy, row) => {
    positions.forEach((cx, column) => {
      const isUnderFinder =
        (row === 0 && column === 0) ||
        (row === 0 && column === last) ||
        (row === last && column === 0);
      if (!isUnderFinder) {
        corners.push([cx - 2, cy - 2]);
      }
    });
  });
  return corners;
}

/** A module with each corner rounded where both neighbours that share it are light. */
function roundedModulePath(
  x: number,
  y: number,
  isDark: (dx: number, dy: number) => boolean,
): string {
  const r = 0.5;
  const top = isDark(0, -1);
  const right = isDark(1, 0);
  const bottom = isDark(0, 1);
  const left = isDark(-1, 0);
  const tl = !top && !left ? r : 0;
  const tr = !top && !right ? r : 0;
  const br = !bottom && !right ? r : 0;
  const bl = !bottom && !left ? r : 0;
  let path = `M${x + tl} ${y}H${x + 1 - tr}`;
  if (tr) {
    path += `a${r} ${r} 0 0 1 ${r} ${r}`;
  }
  path += `V${y + 1 - br}`;
  if (br) {
    path += `a${r} ${r} 0 0 1 ${-r} ${r}`;
  }
  path += `H${x + bl}`;
  if (bl) {
    path += `a${r} ${r} 0 0 1 ${-r} ${-r}`;
  }
  path += `V${y + tl}`;
  if (tl) {
    path += `a${r} ${r} 0 0 1 ${r} ${-r}`;
  }
  return path + 'z';
}

/** The drawing for a matrix and style, in modules with the quiet zone included. */
export function qrGeometry(matrix: QrMatrix, style: QrStyle = {}): QrGeometry {
  const quiet = quietZoneOf(style);
  const { size, modules } = matrix;
  const moduleShape = style.moduleShape ?? 'square';
  const finderShape = style.finderShape ?? 'square';
  const box = style.centerImage ? qrCenterBox(matrix, style.centerImage) : undefined;
  const shouldExcavate = style.centerImage?.shouldExcavate ?? true;
  const isCleared = (x: number, y: number) =>
    box !== undefined &&
    shouldExcavate &&
    x >= box.x &&
    x < box.x + box.size &&
    y >= box.y &&
    y < box.y + box.size;
  // Stylized modules keep the alignment patterns solid (drawn with the finders); centre art may clear one.
  const solidAlignments =
    moduleShape === 'square'
      ? []
      : alignmentCorners(matrix.version).filter(
          ([ax, ay]) =>
            !(
              box &&
              shouldExcavate &&
              ax < box.x + box.size &&
              ax + 5 > box.x &&
              ay < box.y + box.size &&
              ay + 5 > box.y
            ),
        );
  const isSolidAlignment = (x: number, y: number) =>
    solidAlignments.some(([ax, ay]) => x >= ax && x < ax + 5 && y >= ay && y < ay + 5);
  const isDrawn = (x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    x < size &&
    y < size &&
    modules[y]?.[x] === true &&
    !isFinderModule(size, x, y) &&
    !isCleared(x, y) &&
    !isSolidAlignment(x, y);

  const parts: string[] = [];
  const squareRuns: [number, number, number][] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!isDrawn(x, y)) {
        continue;
      }
      if (moduleShape === 'square') {
        // One subpath per horizontal run of dark modules.
        let length = 1;
        while (isDrawn(x + length, y)) {
          length++;
        }
        parts.push(`M${x + quiet} ${y + quiet}h${length}v1h${-length}z`);
        squareRuns.push([x + quiet, y + quiet, length]);
        x += length - 1;
      } else if (moduleShape === 'dots') {
        const r = 0.45;
        parts.push(
          `M${x + quiet + 0.05} ${y + quiet + 0.5}a${r} ${r} 0 1 0 0.9 0a${r} ${r} 0 1 0 -0.9 0z`,
        );
      } else {
        parts.push(roundedModulePath(x + quiet, y + quiet, (dx, dy) => isDrawn(x + dx, y + dy)));
      }
    }
  }
  const findersPath = [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ]
    .map(([x = 0, y = 0]) => finderPath(x + quiet, y + quiet, finderShape))
    .concat(solidAlignments.map(([x, y]) => alignmentPath(x + quiet, y + quiet, finderShape)))
    .join('');
  return {
    total: size + quiet * 2,
    modulesPath: parts.join(''),
    findersPath,
    squareRuns,
    imageBox: box ? { x: box.x + quiet, y: box.y + quiet, size: box.size } : undefined,
  };
}

/**
 * How much of the error-correction budget a centre box hides: the worst block's share of hidden codewords against
 * the codewords it can correct (half its error-correction codewords). Above 1 the code can't be read.
 */
export function qrObscuredShare(matrix: QrMatrix, box: QrBox | undefined): number {
  if (!box) {
    return 0;
  }
  const { size, version, errorCorrection } = matrix;
  const codewordOf = qrModuleCodewords(version);
  const hidden = new Set<number>();
  for (let y = box.y; y < box.y + box.size; y++) {
    for (let x = box.x; x < box.x + box.size; x++) {
      const codeword = codewordOf[y * size + x] ?? -1;
      if (codeword >= 0) {
        hidden.add(codeword);
      }
    }
  }
  const { totalCodewords, blockCount, eccPerBlock } = qrBlockLayout(version, errorCorrection);
  const shortBlockCount = blockCount - (totalCodewords % blockCount);
  const shortDataLength = Math.floor(totalCodewords / blockCount) - eccPerBlock;
  // The block of each interleaved codeword (see qrInterleave).
  const blockOf: number[] = [];
  for (let column = 0; column <= shortDataLength; column++) {
    for (let block = 0; block < blockCount; block++) {
      if (column < shortDataLength + (block < shortBlockCount ? 0 : 1)) {
        blockOf.push(block);
      }
    }
  }
  for (let column = 0; column < eccPerBlock; column++) {
    for (let block = 0; block < blockCount; block++) {
      blockOf.push(block);
    }
  }
  const perBlock = new Array<number>(blockCount).fill(0);
  for (const codeword of hidden) {
    const block = blockOf[codeword] ?? 0;
    perBlock[block] = (perBlock[block] ?? 0) + 1;
  }
  const correctable = Math.max(1, Math.floor(eccPerBlock / 2));
  return Math.max(...perBlock) / correctable;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** The QR code as a standalone SVG document string, for downloads. Sized in modules unless `pixelSize` is given. */
export function qrToSvgString(matrix: QrMatrix, style: QrStyle = {}, pixelSize?: number): string {
  const geometry = qrGeometry(matrix, style);
  const foreground = escapeAttribute(style.foreground ?? QR_DEFAULT_FOREGROUND);
  const background = escapeAttribute(style.background ?? QR_DEFAULT_BACKGROUND);
  const dimension = pixelSize ?? geometry.total * 8;
  const crisp = (style.moduleShape ?? 'square') === 'square' ? ' shape-rendering="crispEdges"' : '';
  let svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${geometry.total} ${geometry.total}" ` +
    `width="${dimension}" height="${dimension}">` +
    `<rect width="${geometry.total}" height="${geometry.total}" fill="${background}"/>` +
    `<path d="${geometry.modulesPath}" fill="${foreground}"${crisp}/>` +
    `<path d="${geometry.findersPath}" fill="${foreground}" fill-rule="evenodd"/>`;
  const image = style.centerImage;
  const box = geometry.imageBox;
  if (image && box) {
    if (image.background) {
      svg += `<rect x="${box.x}" y="${box.y}" width="${box.size}" height="${box.size}" fill="${escapeAttribute(image.background)}"/>`;
    }
    svg += `<image href="${escapeAttribute(image.src)}" x="${box.x}" y="${box.y}" width="${box.size}" height="${box.size}" preserveAspectRatio="xMidYMid meet"/>`;
  }
  return svg + '</svg>';
}

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Draws the QR code onto a 2D context `pixels` device pixels square. Square modules snap to whole pixels so rows
 * don't show seams; other shapes use the same paths as the SVG.
 */
export function drawQr(
  context: Context2D,
  matrix: QrMatrix,
  style: QrStyle,
  pixels: number,
  image?: HTMLImageElement | ImageBitmap,
): void {
  const geometry = qrGeometry(matrix, style);
  const scale = pixels / geometry.total;
  const snap = (value: number) => Math.round(value * scale);
  context.save();
  context.clearRect(0, 0, pixels, pixels);
  context.fillStyle = style.background ?? QR_DEFAULT_BACKGROUND;
  context.fillRect(0, 0, pixels, pixels);
  context.fillStyle = style.foreground ?? QR_DEFAULT_FOREGROUND;
  if ((style.moduleShape ?? 'square') === 'square') {
    for (const [x, y, length] of geometry.squareRuns) {
      context.fillRect(snap(x), snap(y), snap(x + length) - snap(x), snap(y + 1) - snap(y));
    }
  } else {
    context.save();
    context.scale(scale, scale);
    context.fill(new Path2D(geometry.modulesPath));
    context.restore();
  }
  context.save();
  context.scale(scale, scale);
  context.fill(new Path2D(geometry.findersPath), 'evenodd');
  context.restore();
  const box = geometry.imageBox;
  if (style.centerImage && box) {
    if (style.centerImage.background) {
      context.fillStyle = style.centerImage.background;
      context.fillRect(
        snap(box.x),
        snap(box.y),
        snap(box.x + box.size) - snap(box.x),
        snap(box.y + box.size) - snap(box.y),
      );
    }
    if (image) {
      drawContained(context, image, box.x * scale, box.y * scale, box.size * scale);
    }
  }
  context.restore();
}

/** Draws an image centred in a square, keeping its aspect ratio (like `preserveAspectRatio="xMidYMid meet"`). */
function drawContained(
  context: Context2D,
  image: HTMLImageElement | ImageBitmap,
  x: number,
  y: number,
  size: number,
) {
  const { width, height } = imageSize(image);
  if (!width || !height) {
    return;
  }
  const ratio = Math.min(size / width, size / height);
  const drawWidth = width * ratio;
  const drawHeight = height * ratio;
  context.drawImage(
    image,
    x + (size - drawWidth) / 2,
    y + (size - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function imageSize(image: HTMLImageElement | ImageBitmap): { width: number; height: number } {
  if ('naturalWidth' in image) {
    return { width: image.naturalWidth, height: image.naturalHeight };
  }
  return { width: image.width, height: image.height };
}

/**
 * Loads an image for drawing on a canvas. With `isForExport`, it's requested with CORS so the canvas can still be
 * exported (cross-origin images then need CORS headers).
 */
export function loadQrImage(src: string, isForExport = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (isForExport) {
      image.crossOrigin = 'anonymous';
    }
    image.decoding = 'async';
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error(`Couldn’t load the QR centre image ${src}.`));
    };
    image.src = src;
  });
}

/** The QR code as a PNG `size` pixels square, for downloads. Draws on an OffscreenCanvas where there is one. */
export async function qrToPngBlob(
  matrix: QrMatrix,
  style: QrStyle = {},
  size = 512,
): Promise<Blob> {
  const pixels = Math.max(1, Math.round(size));
  const image = style.centerImage ? await loadQrImage(style.centerImage.src, true) : undefined;
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(pixels, pixels);
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D isn’t available.');
    }
    drawQr(context, matrix, style, pixels, image);
    return canvas.convertToBlob({ type: 'image/png' });
  }
  const canvas = document.createElement('canvas');
  canvas.width = pixels;
  canvas.height = pixels;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D isn’t available.');
  }
  drawQr(context, matrix, style, pixels, image);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Couldn’t export the QR code as PNG.'));
      }
    }, 'image/png');
  });
}
