// A QR Code encoder written from ISO/IEC 18004: numeric, alphanumeric and byte (UTF-8) modes, versions 1–40, all four
// error-correction levels, Reed–Solomon codewords split into the specification's blocks and interleaved, the
// function patterns, BCH-protected format and version information, and the lowest-penalty mask of the eight.

import { rsEncode } from './qrReedSolomon';

/** Error-correction level: about 7% (L), 15% (M), 25% (Q) or 30% (H) of codewords recoverable. */
export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';

/** How the data was encoded: the most compact of the three modes that covers the whole value. */
export type QrMode = 'numeric' | 'alphanumeric' | 'byte';

/** An encoded symbol: `modules[row][column]` is true for a dark module. The quiet zone isn't included. */
export interface QrMatrix {
  /** 1–40. */
  version: number;
  /** Modules per side: 17 + 4 × version. */
  size: number;
  errorCorrection: QrErrorCorrection;
  /** The mask pattern applied, 0–7. */
  mask: number;
  /** The encoding mode used. */
  mode: QrMode;
  modules: readonly (readonly boolean[])[];
}

export interface EncodeQrOptions {
  /** Defaults to `M`. */
  errorCorrection?: QrErrorCorrection;
  /** The smallest version to use, 1–40. Defaults to 1. */
  minVersion?: number;
  /** The largest version to use, 1–40. Defaults to 40. */
  maxVersion?: number;
  /** Forces a mask pattern (0–7) instead of choosing the one with the lowest penalty. */
  mask?: number;
}

/** Thrown when the value doesn't fit the largest allowed version at the chosen error-correction level. */
export class QrCapacityError extends Error {
  /** Data bits the value needs at `maxVersion`. */
  readonly requiredBits: number;
  /** Data bits `maxVersion` holds at the chosen level. */
  readonly capacityBits: number;
  readonly errorCorrection: QrErrorCorrection;
  readonly maxVersion: number;

  constructor(
    requiredBits: number,
    capacityBits: number,
    errorCorrection: QrErrorCorrection,
    maxVersion: number,
  ) {
    super(
      `The value needs ${requiredBits} data bits, but a version ${maxVersion} QR code at level ${errorCorrection} holds ${capacityBits}.`,
    );
    this.name = 'QrCapacityError';
    this.requiredBits = requiredBits;
    this.capacityBits = capacityBits;
    this.errorCorrection = errorCorrection;
    this.maxVersion = maxVersion;
  }
}

const levelIndex: Record<QrErrorCorrection, number> = { L: 0, M: 1, Q: 2, H: 3 };
/** The two format-information bits per level (ISO/IEC 18004 table 12). */
const levelFormatBits: Record<QrErrorCorrection, number> = { L: 1, M: 0, Q: 3, H: 2 };

// ISO/IEC 18004 table 9, indexed [level][version] (index 0 unused): error-correction codewords per block, and the
// number of blocks. Data codewords follow from the symbol's raw capacity.
const ECC_PER_BLOCK: readonly (readonly number[])[] = [
  [
    0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30,
    30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
  [
    0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28,
    28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
  ],
  [
    0, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30,
    30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
  [
    0, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
];
const BLOCK_COUNT: readonly (readonly number[])[] = [
  [
    0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14,
    15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25,
  ],
  [
    0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25,
    26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
  ],
  [
    0, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34,
    34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68,
  ],
  [
    0, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37,
    40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81,
  ],
];

const ALPHANUMERIC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const NUMERIC_RE = /^[0-9]*$/;
const ALPHANUMERIC_RE = /^[0-9A-Z $%*+\-./:]*$/;

const modeIndicator: Record<QrMode, number> = {
  numeric: 0b0001,
  alphanumeric: 0b0010,
  byte: 0b0100,
};

/** Bits in the character count indicator, by mode and version range (ISO/IEC 18004 table 3). */
function countBits(mode: QrMode, version: number): number {
  const range = version < 10 ? 0 : version < 27 ? 1 : 2;
  switch (mode) {
    case 'numeric':
      return [10, 12, 14][range] ?? 14;
    case 'alphanumeric':
      return [9, 11, 13][range] ?? 13;
    case 'byte':
      return [8, 16, 16][range] ?? 16;
  }
}

/** Modules per side. */
export function qrSize(version: number): number {
  return version * 4 + 17;
}

/** Modules available for data and error correction (everything but the function patterns), in bits. */
function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const alignCount = Math.floor(version / 7) + 2;
    result -= (25 * alignCount - 10) * alignCount - 55;
    if (version >= 7) {
      result -= 36;
    }
  }
  return result;
}

/** Codeword layout of a version and level. */
export interface QrBlockLayout {
  /** All codewords in the symbol. */
  totalCodewords: number;
  dataCodewords: number;
  blockCount: number;
  eccPerBlock: number;
}

export function qrBlockLayout(version: number, errorCorrection: QrErrorCorrection): QrBlockLayout {
  const level = levelIndex[errorCorrection];
  const blockCount = BLOCK_COUNT[level]?.[version] ?? 1;
  const eccPerBlock = ECC_PER_BLOCK[level]?.[version] ?? 0;
  const totalCodewords = Math.floor(rawDataModules(version) / 8);
  return {
    totalCodewords,
    dataCodewords: totalCodewords - blockCount * eccPerBlock,
    blockCount,
    eccPerBlock,
  };
}

/** The centres of the alignment patterns on each axis (the same list for rows and columns). */
export function alignmentPositions(version: number): number[] {
  if (version === 1) {
    return [];
  }
  const count = Math.floor(version / 7) + 2;
  const step = Math.floor((version * 8 + count * 3 + 5) / (count * 4 - 4)) * 2;
  const positions = [6];
  for (let position = qrSize(version) - 7; positions.length < count; position -= step) {
    positions.splice(1, 0, position);
  }
  return positions;
}

/** Picks the most compact single mode for the whole value. */
export function qrModeFor(value: string): QrMode {
  if (NUMERIC_RE.test(value)) {
    return 'numeric';
  }
  if (ALPHANUMERIC_RE.test(value)) {
    return 'alphanumeric';
  }
  return 'byte';
}

/** A growable bit buffer. */
class BitBuffer {
  readonly bits: number[] = [];
  append(value: number, length: number) {
    for (let bit = length - 1; bit >= 0; bit--) {
      this.bits.push((value >>> bit) & 1);
    }
  }
}

/** The payload (no mode indicator or count) and the character count. */
function encodePayload(value: string, mode: QrMode): { payload: BitBuffer; count: number } {
  const payload = new BitBuffer();
  if (mode === 'numeric') {
    // Groups of three digits in 10 bits; a trailing pair in 7 and a single digit in 4.
    for (let index = 0; index < value.length; index += 3) {
      const group = value.slice(index, index + 3);
      payload.append(Number(group), group.length * 3 + 1);
    }
    return { payload, count: value.length };
  }
  if (mode === 'alphanumeric') {
    // Pairs as 45 × first + second in 11 bits; a trailing character in 6.
    for (let index = 0; index < value.length; index += 2) {
      const first = ALPHANUMERIC.indexOf(value.charAt(index));
      if (index + 1 < value.length) {
        payload.append(first * 45 + ALPHANUMERIC.indexOf(value.charAt(index + 1)), 11);
      } else {
        payload.append(first, 6);
      }
    }
    return { payload, count: value.length };
  }
  const bytes = new TextEncoder().encode(value);
  for (const byte of bytes) {
    payload.append(byte, 8);
  }
  return { payload, count: bytes.length };
}

/**
 * The data codewords for `value` at a version and level: mode, count, payload, terminator, byte padding and the
 * alternating 0xEC 0x11 pad codewords. Exported for tests.
 */
export function qrDataCodewords(
  value: string,
  version: number,
  errorCorrection: QrErrorCorrection,
): Uint8Array {
  const mode = qrModeFor(value);
  const { payload, count } = encodePayload(value, mode);
  const capacityBits = qrBlockLayout(version, errorCorrection).dataCodewords * 8;
  const buffer = new BitBuffer();
  buffer.append(modeIndicator[mode], 4);
  buffer.append(count, countBits(mode, version));
  buffer.bits.push(...payload.bits);
  if (buffer.bits.length > capacityBits) {
    throw new QrCapacityError(buffer.bits.length, capacityBits, errorCorrection, version);
  }
  buffer.append(0, Math.min(4, capacityBits - buffer.bits.length));
  buffer.append(0, (8 - (buffer.bits.length % 8)) % 8);
  for (let pad = 0xec; buffer.bits.length < capacityBits; pad ^= 0xec ^ 0x11) {
    buffer.append(pad, 8);
  }
  const codewords = new Uint8Array(buffer.bits.length / 8);
  buffer.bits.forEach((bit, index) => {
    codewords[index >>> 3] = (codewords[index >>> 3] ?? 0) | (bit << (7 - (index & 7)));
  });
  return codewords;
}

/** Splits data codewords into blocks, adds each block's error correction and interleaves them. Exported for tests. */
export function qrInterleave(
  data: Uint8Array,
  version: number,
  errorCorrection: QrErrorCorrection,
): Uint8Array {
  const { totalCodewords, blockCount, eccPerBlock } = qrBlockLayout(version, errorCorrection);
  const shortBlockCount = blockCount - (totalCodewords % blockCount);
  const shortBlockLength = Math.floor(totalCodewords / blockCount);
  const shortDataLength = shortBlockLength - eccPerBlock;
  const dataBlocks: Uint8Array[] = [];
  const eccBlocks: Uint8Array[] = [];
  let offset = 0;
  for (let block = 0; block < blockCount; block++) {
    const length = shortDataLength + (block < shortBlockCount ? 0 : 1);
    const blockData = data.subarray(offset, offset + length);
    offset += length;
    dataBlocks.push(blockData);
    eccBlocks.push(rsEncode(blockData, eccPerBlock));
  }
  const result = new Uint8Array(totalCodewords);
  let index = 0;
  // Data codewords column by column (the long blocks' extra codeword last), then the error correction the same way.
  for (let column = 0; column <= shortDataLength; column++) {
    for (const blockData of dataBlocks) {
      if (column < blockData.length) {
        result[index++] = blockData[column] ?? 0;
      }
    }
  }
  for (let column = 0; column < eccPerBlock; column++) {
    for (const ecc of eccBlocks) {
      result[index++] = ecc[column] ?? 0;
    }
  }
  return result;
}

/** The 15 format-information bits (level and mask, BCH(15,5), XOR 0x5412). Exported for tests. */
export function qrFormatBits(errorCorrection: QrErrorCorrection, mask: number): number {
  const data = (levelFormatBits[errorCorrection] << 3) | mask;
  let remainder = data;
  for (let bit = 0; bit < 10; bit++) {
    remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  }
  return ((data << 10) | remainder) ^ 0x5412;
}

/** The 18 version-information bits (BCH(18,6)), for version 7 and up. Exported for tests. */
export function qrVersionBits(version: number): number {
  let remainder = version;
  for (let bit = 0; bit < 12; bit++) {
    remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
  }
  return (version << 12) | remainder;
}

/** A working grid: module values and which modules belong to function patterns. Row-major, `size × size`. */
interface Grid {
  size: number;
  dark: Uint8Array;
  isFunction: Uint8Array;
}

function setFunction(grid: Grid, x: number, y: number, isDark: boolean) {
  const index = y * grid.size + x;
  grid.dark[index] = isDark ? 1 : 0;
  grid.isFunction[index] = 1;
}

function drawFormatBits(grid: Grid, bits: number) {
  const { size } = grid;
  const bit = (index: number) => ((bits >>> index) & 1) === 1;
  // Around the top-left finder.
  for (let index = 0; index <= 5; index++) {
    setFunction(grid, 8, index, bit(index));
  }
  setFunction(grid, 8, 7, bit(6));
  setFunction(grid, 8, 8, bit(7));
  setFunction(grid, 7, 8, bit(8));
  for (let index = 9; index < 15; index++) {
    setFunction(grid, 14 - index, 8, bit(index));
  }
  // The second copy, split between the top-right and bottom-left finders.
  for (let index = 0; index < 8; index++) {
    setFunction(grid, size - 1 - index, 8, bit(index));
  }
  for (let index = 8; index < 15; index++) {
    setFunction(grid, 8, size - 15 + index, bit(index));
  }
  // The dark module, always dark.
  setFunction(grid, 8, size - 8, true);
}

function drawFunctionPatterns(version: number): Grid {
  const size = qrSize(version);
  const grid: Grid = {
    size,
    dark: new Uint8Array(size * size),
    isFunction: new Uint8Array(size * size),
  };
  // Timing patterns.
  for (let index = 0; index < size; index++) {
    setFunction(grid, 6, index, index % 2 === 0);
    setFunction(grid, index, 6, index % 2 === 0);
  }
  // Finder patterns with their separators.
  for (const [cx, cy] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ] as const) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) {
          const distance = Math.max(Math.abs(dx), Math.abs(dy));
          setFunction(grid, x, y, distance !== 2 && distance !== 4);
        }
      }
    }
  }
  // Alignment patterns, except where they would overlap a finder.
  const positions = alignmentPositions(version);
  const last = positions.length - 1;
  positions.forEach((cy, row) => {
    positions.forEach((cx, column) => {
      if (
        (row === 0 && column === 0) ||
        (row === 0 && column === last) ||
        (row === last && column === 0)
      ) {
        return;
      }
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          setFunction(grid, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    });
  });
  // Reserve the format areas (filled in once the mask is known) and draw the version information.
  drawFormatBits(grid, 0);
  if (version >= 7) {
    const bits = qrVersionBits(version);
    for (let index = 0; index < 18; index++) {
      const isDark = ((bits >>> index) & 1) === 1;
      const a = size - 11 + (index % 3);
      const b = Math.floor(index / 3);
      setFunction(grid, a, b, isDark);
      setFunction(grid, b, a, isDark);
    }
  }
  return grid;
}

/**
 * Visits the data modules in placement order: two-module columns from the right, alternating upward and downward,
 * skipping the vertical timing column. Calls `visit(index)` with the row-major module index.
 */
function forEachDataModule(grid: Grid, visit: (index: number) => void) {
  const { size } = grid;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right = 5;
    }
    const isUpward = ((right + 1) & 2) === 0;
    for (let step = 0; step < size; step++) {
      const y = isUpward ? size - 1 - step : step;
      for (let offset = 0; offset < 2; offset++) {
        const index = y * size + right - offset;
        if (!grid.isFunction[index]) {
          visit(index);
        }
      }
    }
  }
}

function drawCodewords(grid: Grid, codewords: Uint8Array) {
  const totalBits = codewords.length * 8;
  let bit = 0;
  forEachDataModule(grid, (index) => {
    // Remainder bits past the last codeword stay light.
    if (bit < totalBits) {
      grid.dark[index] = ((codewords[bit >>> 3] ?? 0) >>> (7 - (bit & 7))) & 1;
      bit++;
    }
  });
}

/** Whether mask pattern `mask` inverts the module at column `x`, row `y` (ISO/IEC 18004 table 10). */
function maskBit(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

function applyMask(grid: Grid, mask: number): Uint8Array {
  const { size } = grid;
  const masked = grid.dark.slice();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = y * size + x;
      if (!grid.isFunction[index] && maskBit(mask, x, y)) {
        masked[index] = (masked[index] ?? 0) ^ 1;
      }
    }
  }
  return masked;
}

const FINDER_LIKE = [1, 0, 1, 1, 1, 0, 1];

/** Scores a masked symbol with the four penalty rules (ISO/IEC 18004 §7.8.3). Lower is better. Exported for tests. */
export function qrPenalty(dark: Uint8Array, size: number): number {
  let penalty = 0;
  const at = (x: number, y: number, isHorizontal: boolean) =>
    isHorizontal ? (dark[y * size + x] ?? 0) : (dark[x * size + y] ?? 0);
  // Outside the symbol counts as light, for the finder-like rule.
  const lightRun = (line: number, from: number, isHorizontal: boolean) => {
    for (let offset = 0; offset < 4; offset++) {
      const position = from + offset;
      if (position >= 0 && position < size && at(position, line, isHorizontal) === 1) {
        return false;
      }
    }
    return true;
  };
  for (const isHorizontal of [true, false]) {
    for (let line = 0; line < size; line++) {
      // Rule 1: five or more same-coloured modules in a row: 3 points, plus 1 for each module past five.
      let runColour = -1;
      let runLength = 0;
      for (let position = 0; position < size; position++) {
        const colour = at(position, line, isHorizontal);
        if (colour === runColour) {
          runLength++;
        } else {
          if (runLength >= 5) {
            penalty += runLength - 2;
          }
          runColour = colour;
          runLength = 1;
        }
      }
      if (runLength >= 5) {
        penalty += runLength - 2;
      }
      // Rule 3: a 1:1:3:1:1 finder-like pattern with four light modules on either side: 40 points per side.
      for (let position = 0; position + 7 <= size; position++) {
        let isMatch = true;
        for (let offset = 0; offset < 7; offset++) {
          if (at(position + offset, line, isHorizontal) !== FINDER_LIKE[offset]) {
            isMatch = false;
            break;
          }
        }
        if (isMatch) {
          if (lightRun(line, position - 4, isHorizontal)) {
            penalty += 40;
          }
          if (lightRun(line, position + 7, isHorizontal)) {
            penalty += 40;
          }
        }
      }
    }
  }
  // Rule 2: each 2 × 2 block of one colour: 3 points.
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const colour = dark[y * size + x];
      if (
        colour === dark[y * size + x + 1] &&
        colour === dark[(y + 1) * size + x] &&
        colour === dark[(y + 1) * size + x + 1]
      ) {
        penalty += 3;
      }
    }
  }
  // Rule 4: 10 points for each full 5% the dark share strays from 50%.
  let darkCount = 0;
  for (const module of dark) {
    darkCount += module;
  }
  const total = size * size;
  penalty += Math.floor(Math.abs(darkCount * 20 - total * 10) / total) * 10;
  return penalty;
}

function clampVersion(version: number | undefined, fallback: number): number {
  if (version === undefined || !Number.isFinite(version)) {
    return fallback;
  }
  return Math.min(40, Math.max(1, Math.round(version)));
}

/** The smallest version from `minVersion` to `maxVersion` that holds `value`, or a `QrCapacityError`. */
function chooseVersion(
  value: string,
  errorCorrection: QrErrorCorrection,
  minVersion: number,
  maxVersion: number,
): number {
  const mode = qrModeFor(value);
  const { payload, count } = encodePayload(value, mode);
  let requiredBits = 0;
  let capacityBits = 0;
  for (let version = minVersion; version <= maxVersion; version++) {
    const countLength = countBits(mode, version);
    requiredBits = 4 + countLength + payload.bits.length;
    capacityBits = qrBlockLayout(version, errorCorrection).dataCodewords * 8;
    if (requiredBits <= capacityBits && count < 2 ** countLength) {
      return version;
    }
  }
  throw new QrCapacityError(requiredBits, capacityBits, errorCorrection, maxVersion);
}

/**
 * Encodes `value` (UTF-8) as a QR Code: the smallest version that fits at the error-correction level, and the mask
 * with the lowest penalty unless `mask` is given. Throws `QrCapacityError` when it doesn't fit `maxVersion`.
 */
export function encodeQr(value: string, options: EncodeQrOptions = {}): QrMatrix {
  const errorCorrection = options.errorCorrection ?? 'M';
  const minVersion = clampVersion(options.minVersion, 1);
  const maxVersion = Math.max(minVersion, clampVersion(options.maxVersion, 40));
  const version = chooseVersion(value, errorCorrection, minVersion, maxVersion);
  const grid = drawFunctionPatterns(version);
  drawCodewords(
    grid,
    qrInterleave(qrDataCodewords(value, version, errorCorrection), version, errorCorrection),
  );

  const forcedMask =
    options.mask !== undefined &&
    Number.isInteger(options.mask) &&
    options.mask >= 0 &&
    options.mask <= 7
      ? options.mask
      : undefined;
  let bestMask = 0;
  let bestModules: Uint8Array | undefined;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    if (forcedMask !== undefined && mask !== forcedMask) {
      continue;
    }
    const masked = applyMask(grid, mask);
    drawFormatBits({ ...grid, dark: masked }, qrFormatBits(errorCorrection, mask));
    const penalty = forcedMask === undefined ? qrPenalty(masked, grid.size) : 0;
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
      bestModules = masked;
    }
  }
  const final = bestModules ?? grid.dark;
  const { size } = grid;
  const modules: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) {
      row.push(final[y * size + x] === 1);
    }
    modules.push(row);
  }
  return { version, size, errorCorrection, mask: bestMask, mode: qrModeFor(value), modules };
}

/** Codeword index (interleaved order) of each data module, or -1, row-major. */
export function qrModuleCodewords(version: number): Int32Array {
  const grid = drawFunctionPatterns(version);
  const totalCodewords = Math.floor(rawDataModules(version) / 8);
  const result = new Int32Array(grid.size * grid.size).fill(-1);
  let bit = 0;
  forEachDataModule(grid, (index) => {
    if (bit >>> 3 < totalCodewords) {
      result[index] = bit >>> 3;
    }
    bit++;
  });
  return result;
}

/** Whether each module (row-major) belongs to a function pattern (finder, separator, timing, alignment, format, version). */
export function qrFunctionModules(version: number): Uint8Array {
  return drawFunctionPatterns(version).isFunction;
}
