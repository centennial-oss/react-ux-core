// A small DICOM Part 10 parser for the uncompressed transfer syntaxes (implicit VR little endian, explicit VR little
// and big endian). It reads only what a review viewer needs: the image geometry and pixel format, the modality LUT
// (rescale slope and intercept), the default windows, pixel spacing, slice position and the descriptive tags apps use
// for overlays. Compressed transfer syntaxes (JPEG, JPEG 2000, RLE, deflate…) raise a `DicomParseError` with code
// `compressed`; apps that need them plug in their own loader (Cornerstone, a DICOMweb client with server-side
// transcoding…).

/** The transfer syntaxes the built-in parser reads. */
export const IMPLICIT_VR_LITTLE_ENDIAN = '1.2.840.10008.1.2';
export const EXPLICIT_VR_LITTLE_ENDIAN = '1.2.840.10008.1.2.1';
export const EXPLICIT_VR_BIG_ENDIAN = '1.2.840.10008.1.2.2';

export type DicomParseErrorCode =
  /** Not a DICOM file, or cut short. */
  | 'invalid'
  /** A compressed (or deflated) transfer syntax: decode it with a custom loader. */
  | 'compressed'
  /** A pixel format the built-in decoder doesn't handle (for example palette colour or 1-bit). */
  | 'unsupported';

/** Why a DICOM file couldn't be parsed or decoded. `code` says what kind of problem it is. */
export class DicomParseError extends Error {
  readonly code: DicomParseErrorCode;
  /** The transfer syntax UID, when the file got far enough to name one. */
  readonly transferSyntax: string | undefined;

  constructor(code: DicomParseErrorCode, message: string, transferSyntax?: string) {
    super(message);
    this.name = 'DicomParseError';
    this.code = code;
    this.transferSyntax = transferSyntax;
  }
}

/** The pixel data of a decoded frame: one value per pixel (or three, interleaved, for RGB). */
export type DicomPixelArray = Int16Array | Uint16Array | Uint8Array | Int8Array | Float32Array;

/** A decoded frame, ready to display. Custom loaders return this. */
export interface DicomImage {
  /** Columns. */
  width: number;
  /** Rows. */
  height: number;
  /** Stored pixel values, row by row. Modality values (such as Hounsfield units) are `pixel × slope + intercept`. */
  pixels: DicomPixelArray;
  /** 1 for greyscale (the default), 3 for RGB (interleaved: R, G, B, R, G, B…). */
  samplesPerPixel?: 1 | 3;
  /** Defaults to `MONOCHROME2` (higher values are brighter). `MONOCHROME1` is shown inverted. */
  photometricInterpretation?: 'MONOCHROME1' | 'MONOCHROME2' | 'RGB';
  /** Defaults to 1. */
  rescaleSlope?: number;
  /** Defaults to 0. */
  rescaleIntercept?: number;
  /** Millimetres between rows and between columns: `[row spacing, column spacing]`. Without it, lengths are in pixels. */
  pixelSpacing?: readonly [number, number];
  /** The default window, in modality units. Without it, the viewer windows the full range of values. */
  windowCenter?: number;
  windowWidth?: number;
  /** Every window the file suggests (the first is the default), with their explanations if any. */
  windows?: readonly { center: number; width: number; explanation?: string }[];
  /** The slice's position along the stack, in mm (slice location, or the image position's z). */
  slicePosition?: number;
  instanceNumber?: number;
  /** The smallest and largest stored pixel values, if known (computed by the viewer otherwise). */
  minPixelValue?: number;
  maxPixelValue?: number;
}

/** The tags the parser reads, decoded. Absent tags are `undefined`. */
export interface DicomDataSet {
  transferSyntax: string;
  sopInstanceUid?: string;
  seriesInstanceUid?: string;
  studyInstanceUid?: string;
  modality?: string;
  patientName?: string;
  patientId?: string;
  studyDate?: string;
  studyDescription?: string;
  seriesDescription?: string;
  seriesNumber?: number;
  instanceNumber?: number;
  sliceLocation?: number;
  sliceThickness?: number;
  imagePositionPatient?: readonly number[];
  imageOrientationPatient?: readonly number[];
  rows?: number;
  columns?: number;
  numberOfFrames?: number;
  samplesPerPixel?: number;
  photometricInterpretation?: string;
  planarConfiguration?: number;
  bitsAllocated?: number;
  bitsStored?: number;
  highBit?: number;
  pixelRepresentation?: number;
  pixelSpacing?: readonly number[];
  imagerPixelSpacing?: readonly number[];
  rescaleSlope?: number;
  rescaleIntercept?: number;
  windowCenter?: readonly number[];
  windowWidth?: readonly number[];
  windowExplanation?: readonly string[];
  smallestPixelValue?: number;
  largestPixelValue?: number;
  /** Where the pixel data starts in the buffer, and its length in bytes. */
  pixelDataOffset?: number;
  pixelDataLength?: number;
  /** Whether multi-byte values are big endian (explicit VR big endian only). */
  isBigEndian: boolean;
}

type ValueKind = 'string' | 'strings' | 'number' | 'numbers' | 'us' | 'usSigned';

// The tags the parser keeps: (group << 16 | element) → [field, how to decode, VR for implicit VR files].
const TAGS: Record<number, [keyof DicomDataSet, ValueKind, string]> = {
  0x00080018: ['sopInstanceUid', 'string', 'UI'],
  0x0020000e: ['seriesInstanceUid', 'string', 'UI'],
  0x0020000d: ['studyInstanceUid', 'string', 'UI'],
  0x00080060: ['modality', 'string', 'CS'],
  0x00100010: ['patientName', 'string', 'PN'],
  0x00100020: ['patientId', 'string', 'LO'],
  0x00080020: ['studyDate', 'string', 'DA'],
  0x00081030: ['studyDescription', 'string', 'LO'],
  0x0008103e: ['seriesDescription', 'string', 'LO'],
  0x00200011: ['seriesNumber', 'number', 'IS'],
  0x00200013: ['instanceNumber', 'number', 'IS'],
  0x00201041: ['sliceLocation', 'number', 'DS'],
  0x00180050: ['sliceThickness', 'number', 'DS'],
  0x00200032: ['imagePositionPatient', 'numbers', 'DS'],
  0x00200037: ['imageOrientationPatient', 'numbers', 'DS'],
  0x00280010: ['rows', 'us', 'US'],
  0x00280011: ['columns', 'us', 'US'],
  0x00280008: ['numberOfFrames', 'number', 'IS'],
  0x00280002: ['samplesPerPixel', 'us', 'US'],
  0x00280004: ['photometricInterpretation', 'string', 'CS'],
  0x00280006: ['planarConfiguration', 'us', 'US'],
  0x00280100: ['bitsAllocated', 'us', 'US'],
  0x00280101: ['bitsStored', 'us', 'US'],
  0x00280102: ['highBit', 'us', 'US'],
  0x00280103: ['pixelRepresentation', 'us', 'US'],
  0x00280030: ['pixelSpacing', 'numbers', 'DS'],
  0x00181164: ['imagerPixelSpacing', 'numbers', 'DS'],
  0x00281052: ['rescaleIntercept', 'number', 'DS'],
  0x00281053: ['rescaleSlope', 'number', 'DS'],
  0x00281050: ['windowCenter', 'numbers', 'DS'],
  0x00281051: ['windowWidth', 'numbers', 'DS'],
  0x00281055: ['windowExplanation', 'strings', 'LO'],
  // Their VR is US or SS depending on Pixel Representation; read once that's known.
  0x00280106: ['smallestPixelValue', 'usSigned', 'US'],
  0x00280107: ['largestPixelValue', 'usSigned', 'US'],
};

const PIXEL_DATA = 0x7fe00010;
const SPECIFIC_CHARACTER_SET = 0x00080005;
const TRANSFER_SYNTAX = 0x00020010;
const ITEM = 0xfffee000;
const ITEM_DELIMITER = 0xfffee00d;
const SEQUENCE_DELIMITER = 0xfffee0dd;
const UNDEFINED_LENGTH = 0xffffffff;

// Explicit VRs whose length is 4 bytes (after 2 reserved bytes); every other VR has a 2-byte length.
const LONG_VRS = new Set([
  'OB',
  'OD',
  'OF',
  'OL',
  'OV',
  'OW',
  'SQ',
  'SV',
  'UC',
  'UN',
  'UR',
  'UT',
  'UV',
]);

interface Cursor {
  view: DataView;
  offset: number;
  isLittleEndian: boolean;
  isExplicit: boolean;
}

function fail(message: string, transferSyntax?: string): never {
  throw new DicomParseError('invalid', message, transferSyntax);
}

function readTag(cursor: Cursor): number {
  const { view, offset, isLittleEndian } = cursor;
  if (offset + 4 > view.byteLength) {
    fail('The DICOM file ends in the middle of an element.');
  }
  const group = view.getUint16(offset, isLittleEndian);
  const element = view.getUint16(offset + 2, isLittleEndian);
  cursor.offset += 4;
  return ((group << 16) | element) >>> 0;
}

interface ElementHeader {
  tag: number;
  vr: string | undefined;
  length: number;
}

function readHeader(cursor: Cursor): ElementHeader {
  const tag = readTag(cursor);
  const { view, isLittleEndian } = cursor;
  // Item and delimiter tags never carry a VR, even in explicit VR files.
  if (tag === ITEM || tag === ITEM_DELIMITER || tag === SEQUENCE_DELIMITER || !cursor.isExplicit) {
    const length = view.getUint32(cursor.offset, isLittleEndian);
    cursor.offset += 4;
    return { tag, vr: undefined, length };
  }
  const vr = String.fromCharCode(view.getUint8(cursor.offset), view.getUint8(cursor.offset + 1));
  if (LONG_VRS.has(vr)) {
    const length = view.getUint32(cursor.offset + 4, isLittleEndian);
    cursor.offset += 8;
    return { tag, vr, length };
  }
  const length = view.getUint16(cursor.offset + 2, isLittleEndian);
  cursor.offset += 4;
  return { tag, vr, length };
}

/** Skips a value of undefined length: a sequence's items up to its delimiter. */
function skipUndefinedLength(cursor: Cursor): void {
  while (cursor.offset < cursor.view.byteLength) {
    const header = readHeader(cursor);
    if (header.tag === SEQUENCE_DELIMITER) {
      return;
    }
    if (header.tag === ITEM) {
      if (header.length === UNDEFINED_LENGTH) {
        skipItem(cursor);
      } else {
        cursor.offset += header.length;
      }
      continue;
    }
    fail('A sequence in the DICOM file is malformed.');
  }
  fail('A sequence in the DICOM file has no end.');
}

/** Skips the elements of an item of undefined length, up to its delimiter. */
function skipItem(cursor: Cursor): void {
  while (cursor.offset < cursor.view.byteLength) {
    const header = readHeader(cursor);
    if (header.tag === ITEM_DELIMITER) {
      return;
    }
    if (header.length === UNDEFINED_LENGTH) {
      skipUndefinedLength(cursor);
    } else {
      cursor.offset += header.length;
    }
  }
  fail('An item in the DICOM file has no end.');
}

function decodeText(bytes: Uint8Array, isUtf8: boolean): string {
  // DICOM pads values with spaces (or a NUL for UIs); the default character set is ASCII, extended to Latin-1.
  const text = new TextDecoder(isUtf8 ? 'utf-8' : 'windows-1252').decode(bytes);
  return text.replace(/[\0 ]+$/, '').replace(/^ +/, '');
}

function readValue(
  cursor: Cursor,
  kind: ValueKind,
  vr: string,
  offset: number,
  length: number,
  isUtf8: boolean,
): unknown {
  const { view, isLittleEndian } = cursor;
  if (kind === 'us' || kind === 'usSigned') {
    if (length < 2) {
      return undefined;
    }
    return vr === 'SS'
      ? view.getInt16(offset, isLittleEndian)
      : view.getUint16(offset, isLittleEndian);
  }
  const text = decodeText(new Uint8Array(view.buffer, view.byteOffset + offset, length), isUtf8);
  const parts = text.split('\\').map((part) => part.trim());
  if (kind === 'string') {
    return vr === 'PN' ? text.replaceAll('^', ' ').trim() : text;
  }
  if (kind === 'strings') {
    return parts;
  }
  const numbers = parts.filter((part) => part !== '').map(Number);
  if (numbers.some((value) => !Number.isFinite(value))) {
    return undefined;
  }
  return kind === 'number' ? numbers[0] : numbers;
}

function readElements(cursor: Cursor, data: Partial<DicomDataSet>, end: number, isUtf8: boolean) {
  let utf8 = isUtf8;
  // Signed min/max pixel values are read after the loop, once Pixel Representation is known.
  const deferred: [keyof DicomDataSet, number, number][] = [];
  while (cursor.offset < end) {
    if (cursor.offset + 8 > end) {
      fail('The DICOM file ends in the middle of an element.', data.transferSyntax);
    }
    const header = readHeader(cursor);
    const valueOffset = cursor.offset;
    if (header.tag === PIXEL_DATA) {
      if (header.length === UNDEFINED_LENGTH) {
        // Encapsulated pixel data only appears with compressed transfer syntaxes.
        throw new DicomParseError(
          'compressed',
          'The pixel data is encapsulated (compressed). Use a custom loadImage that can decode it.',
          data.transferSyntax,
        );
      }
      data.pixelDataOffset = valueOffset;
      data.pixelDataLength = Math.min(header.length, cursor.view.byteLength - valueOffset);
      cursor.offset += header.length;
      continue;
    }
    if (header.length === UNDEFINED_LENGTH) {
      skipUndefinedLength(cursor);
      continue;
    }
    if (valueOffset + header.length > cursor.view.byteLength) {
      fail('The DICOM file ends in the middle of an element.', data.transferSyntax);
    }
    if (header.tag === SPECIFIC_CHARACTER_SET) {
      const value = decodeText(
        new Uint8Array(cursor.view.buffer, cursor.view.byteOffset + valueOffset, header.length),
        false,
      );
      utf8 = value.includes('ISO_IR 192');
    }
    const known = TAGS[header.tag];
    if (known) {
      const [field, kind, implicitVr] = known;
      if (kind === 'usSigned' && header.vr === undefined) {
        deferred.push([field, valueOffset, header.length]);
      } else {
        const value = readValue(
          cursor,
          kind,
          header.vr ?? implicitVr,
          valueOffset,
          header.length,
          utf8,
        );
        if (value !== undefined) {
          (data as Record<string, unknown>)[field] = value;
        }
      }
    }
    cursor.offset = valueOffset + header.length;
  }
  for (const [field, offset, length] of deferred) {
    const vr = data.pixelRepresentation === 1 ? 'SS' : 'US';
    (data as Record<string, unknown>)[field] = readValue(cursor, 'us', vr, offset, length, utf8);
  }
}

/**
 * Parses a DICOM Part 10 file (with or without the 128-byte preamble) and returns the tags a viewer needs, with
 * where the pixel data is. Throws `DicomParseError` for files it can't read, with code `compressed` for compressed
 * transfer syntaxes.
 */
export function parseDicom(buffer: ArrayBuffer | ArrayBufferView): DicomDataSet {
  const view =
    buffer instanceof ArrayBuffer
      ? new DataView(buffer)
      : new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const hasPreamble =
    view.byteLength >= 132 && view.getUint32(128, false) === 0x4449434d; /* "DICM" */
  const cursor: Cursor = {
    view,
    offset: hasPreamble ? 132 : 0,
    isLittleEndian: true,
    isExplicit: true,
  };
  const data: Partial<DicomDataSet> = {};

  // File meta information: group 0002, always explicit VR little endian.
  let transferSyntax = IMPLICIT_VR_LITTLE_ENDIAN;
  if (view.byteLength >= cursor.offset + 6 && view.getUint16(cursor.offset, true) === 0x0002) {
    while (cursor.offset + 6 <= view.byteLength && view.getUint16(cursor.offset, true) === 0x0002) {
      const header = readHeader(cursor);
      if (header.tag === TRANSFER_SYNTAX) {
        transferSyntax = decodeText(
          new Uint8Array(view.buffer, view.byteOffset + cursor.offset, header.length),
          false,
        );
      }
      cursor.offset += header.length;
    }
  } else if (!hasPreamble) {
    // No preamble and no meta group: a raw data set, which by default is implicit VR little endian. Check the first
    // element looks plausible (a low group number) before going on.
    if (view.byteLength < 8 || view.getUint16(0, true) > 0x0028) {
      fail('This isn’t a DICOM file.');
    }
  }

  if (transferSyntax === IMPLICIT_VR_LITTLE_ENDIAN) {
    cursor.isExplicit = false;
  } else if (transferSyntax === EXPLICIT_VR_BIG_ENDIAN) {
    cursor.isLittleEndian = false;
  } else if (transferSyntax !== EXPLICIT_VR_LITTLE_ENDIAN) {
    throw new DicomParseError(
      'compressed',
      `The transfer syntax ${transferSyntax} is compressed, which the built-in parser doesn’t decode. Use a custom loadImage (for example Cornerstone’s image loader, or a DICOMweb server that transcodes).`,
      transferSyntax,
    );
  }
  data.transferSyntax = transferSyntax;
  data.isBigEndian = !cursor.isLittleEndian;
  readElements(cursor, data, view.byteLength, false);
  return data as DicomDataSet;
}

/** Copies (and if needed byte-swaps) the stored pixel values of one frame into an aligned typed array. */
function readPixels(view: DataView, data: DicomDataSet, frame: number): DicomPixelArray {
  const rows = data.rows ?? 0;
  const columns = data.columns ?? 0;
  const samples = data.samplesPerPixel ?? 1;
  const bitsAllocated = data.bitsAllocated ?? 16;
  const bitsStored = data.bitsStored ?? bitsAllocated;
  const isSigned = data.pixelRepresentation === 1;
  const count = rows * columns * samples;
  const bytesPerSample = bitsAllocated / 8;
  const start = (data.pixelDataOffset ?? 0) + frame * count * bytesPerSample;
  if (start + count * bytesPerSample > view.byteLength) {
    fail('The pixel data is shorter than the image size says.', data.transferSyntax);
  }
  const isLittleEndian = !data.isBigEndian;
  const planar = samples === 3 && data.planarConfiguration === 1;
  // Index into the output for the i-th stored sample (planar RGB is stored R…R G…G B…B).
  const target = (index: number) =>
    planar ? (index % (rows * columns)) * 3 + Math.floor(index / (rows * columns)) : index;

  if (bitsAllocated === 8) {
    const out = isSigned ? new Int8Array(count) : new Uint8Array(count);
    for (let index = 0; index < count; index++) {
      out[target(index)] = isSigned ? view.getInt8(start + index) : view.getUint8(start + index);
    }
    return out;
  }
  if (bitsAllocated === 16) {
    const out = isSigned ? new Int16Array(count) : new Uint16Array(count);
    // Values stored in fewer bits than allocated (12 of 16) are masked, and sign-extended when signed.
    const shift = 32 - bitsStored;
    const mask = bitsStored >= 16 ? 0xffff : (1 << bitsStored) - 1;
    for (let index = 0; index < count; index++) {
      const raw = view.getUint16(start + index * 2, isLittleEndian) & mask;
      out[target(index)] = isSigned && bitsStored < 16 ? (raw << shift) >> shift : raw;
    }
    return out;
  }
  if (bitsAllocated === 32) {
    const out = new Float32Array(count);
    for (let index = 0; index < count; index++) {
      out[target(index)] = isSigned
        ? view.getInt32(start + index * 4, isLittleEndian)
        : view.getUint32(start + index * 4, isLittleEndian);
    }
    return out;
  }
  throw new DicomParseError(
    'unsupported',
    `Pixel data with ${String(bitsAllocated)} bits allocated isn’t supported.`,
    data.transferSyntax,
  );
}

/** Turns a parsed data set into a displayable frame (the first frame unless `frame`, 0-based, says otherwise). */
export function toDicomImage(
  buffer: ArrayBuffer | ArrayBufferView,
  data: DicomDataSet,
  frame = 0,
): DicomImage {
  if (data.pixelDataOffset === undefined || data.rows === undefined || data.columns === undefined) {
    fail('The DICOM file has no image.', data.transferSyntax);
  }
  const photometric = data.photometricInterpretation ?? 'MONOCHROME2';
  const samples = data.samplesPerPixel ?? 1;
  if (!(
    (samples === 1 && (photometric === 'MONOCHROME1' || photometric === 'MONOCHROME2')) ||
    (samples === 3 && photometric === 'RGB')
  )) {
    throw new DicomParseError(
      'unsupported',
      `The ${photometric} photometric interpretation isn’t supported. Use a custom loadImage.`,
      data.transferSyntax,
    );
  }
  if (frame < 0 || frame >= (data.numberOfFrames ?? 1)) {
    fail(`The DICOM file has no frame ${String(frame + 1)}.`, data.transferSyntax);
  }
  const view =
    buffer instanceof ArrayBuffer
      ? new DataView(buffer)
      : new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const centers = data.windowCenter ?? [];
  const widths = data.windowWidth ?? [];
  const windows = centers.flatMap((center, index) => {
    const width = widths[index] ?? widths[0];
    if (width === undefined || width < 1) {
      return [];
    }
    const explanation = data.windowExplanation?.[index];
    return [{ center, width, ...(explanation ? { explanation } : {}) }];
  });
  const [rowSpacing = 0, columnSpacing = 0] = data.pixelSpacing ?? data.imagerPixelSpacing ?? [];
  const slicePosition = data.sliceLocation ?? data.imagePositionPatient?.[2];
  return {
    width: data.columns,
    height: data.rows,
    pixels: readPixels(view, data, frame),
    samplesPerPixel: samples === 3 ? 3 : 1,
    photometricInterpretation: photometric,
    rescaleSlope: data.rescaleSlope ?? 1,
    rescaleIntercept: data.rescaleIntercept ?? 0,
    ...(rowSpacing > 0 && columnSpacing > 0
      ? { pixelSpacing: [rowSpacing, columnSpacing] as const }
      : {}),
    ...(windows[0]
      ? { windowCenter: windows[0].center, windowWidth: windows[0].width, windows }
      : {}),
    ...(slicePosition !== undefined ? { slicePosition } : {}),
    ...(data.instanceNumber !== undefined ? { instanceNumber: data.instanceNumber } : {}),
    ...(data.smallestPixelValue !== undefined ? { minPixelValue: data.smallestPixelValue } : {}),
    ...(data.largestPixelValue !== undefined ? { maxPixelValue: data.largestPixelValue } : {}),
  };
}

/** Parses a DICOM Part 10 file and decodes a frame of it (the first by default). */
export function decodeDicomImage(buffer: ArrayBuffer | ArrayBufferView, frame = 0): DicomImage {
  return toDicomImage(buffer, parseDicom(buffer), frame);
}
