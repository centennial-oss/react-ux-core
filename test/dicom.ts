// Synthetic DICOM for tests and stories: a tiny Part 10 writer (explicit or implicit VR little endian) and a CT-like
// phantom (concentric rings of air, soft tissue, lung, bone and water) across a stack of slices. Everything is
// generated in code and deterministic, so nothing is downloaded.

export const EXPLICIT_LE = '1.2.840.10008.1.2.1';
export const IMPLICIT_LE = '1.2.840.10008.1.2';
export const JPEG_BASELINE = '1.2.840.10008.1.2.4.50';
const CT_IMAGE_STORAGE = '1.2.840.10008.5.1.4.1.1.2';

type Value =
  | { vr: 'US'; value: number }
  | { vr: 'SS'; value: number }
  | { vr: 'UL'; value: number }
  | { vr: 'OB' | 'OW'; value: Uint8Array }
  | { vr: 'SQ'; value: Uint8Array }
  | { vr: string; value: string };

interface Element {
  tag: number;
  vr: string;
  value: Value['value'];
}

const LONG_VRS = new Set(['OB', 'OD', 'OF', 'OL', 'OW', 'SQ', 'UC', 'UN', 'UR', 'UT']);

function valueBytes({ vr, value }: Element): Uint8Array {
  if (typeof value === 'number') {
    const size = vr === 'UL' ? 4 : 2;
    const bytes = new Uint8Array(size);
    const view = new DataView(bytes.buffer);
    if (vr === 'UL') {
      view.setUint32(0, value, true);
    } else if (vr === 'SS') {
      view.setInt16(0, value, true);
    } else {
      view.setUint16(0, value, true);
    }
    return bytes;
  }
  if (typeof value === 'string') {
    let text = value;
    if (text.length % 2 === 1) {
      text += vr === 'UI' ? '\0' : ' ';
    }
    return new TextEncoder().encode(text);
  }
  if (value.length % 2 === 1) {
    const padded = new Uint8Array(value.length + 1);
    padded.set(value);
    return padded;
  }
  return value;
}

function encodeElement(element: Element, isExplicit: boolean): Uint8Array {
  const value = valueBytes(element);
  // A sequence written here always has undefined length, ending with a sequence delimiter.
  const isSequence = element.vr === 'SQ';
  const length = isSequence ? 0xffffffff : value.length;
  const headerSize = !isExplicit ? 8 : LONG_VRS.has(element.vr) ? 12 : 8;
  const trailer = isSequence ? 8 : 0;
  const bytes = new Uint8Array(headerSize + value.length + trailer);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, element.tag >>> 16, true);
  view.setUint16(2, element.tag & 0xffff, true);
  if (!isExplicit) {
    view.setUint32(4, length, true);
  } else {
    bytes[4] = element.vr.charCodeAt(0);
    bytes[5] = element.vr.charCodeAt(1);
    if (LONG_VRS.has(element.vr)) {
      view.setUint32(8, length, true);
    } else {
      view.setUint16(6, length, true);
    }
  }
  bytes.set(value, headerSize);
  if (isSequence) {
    const end = headerSize + value.length;
    view.setUint16(end, 0xfffe, true);
    view.setUint16(end + 2, 0xe0dd, true);
    view.setUint32(end + 4, 0, true);
  }
  return bytes;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** One item of undefined length holding a single element, for a sequence the parser must skip. */
function sequenceItem(isExplicit: boolean): Uint8Array {
  const inner = encodeElement({ tag: 0x00081155, vr: 'UI', value: '1.2.3.4.5' }, isExplicit);
  const bytes = new Uint8Array(8 + inner.length + 8);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 0xfffe, true);
  view.setUint16(2, 0xe000, true);
  view.setUint32(4, 0xffffffff, true);
  bytes.set(inner, 8);
  view.setUint16(8 + inner.length, 0xfffe, true);
  view.setUint16(10 + inner.length, 0xe00d, true);
  view.setUint32(12 + inner.length, 0, true);
  return bytes;
}

export interface SyntheticDicomOptions {
  rows: number;
  columns: number;
  /** Stored pixel values, row by row. */
  pixels: Int16Array | Uint16Array;
  /** Defaults to explicit VR little endian. */
  transferSyntax?: string;
  /** Leaves out the 128-byte preamble and the meta group (an old-style raw data set; implicit VR only). */
  isRaw?: boolean;
  rescaleSlope?: number;
  rescaleIntercept?: number;
  /** `[row, column]` in mm. */
  pixelSpacing?: readonly [number, number];
  windowCenters?: readonly number[];
  windowWidths?: readonly number[];
  windowExplanations?: readonly string[];
  bitsStored?: number;
  photometricInterpretation?: string;
  sliceLocation?: number;
  instanceNumber?: number;
  patientName?: string;
  studyDescription?: string;
  seriesDescription?: string;
  seriesUid?: string;
  modality?: string;
}

/** Writes a valid DICOM Part 10 byte stream for a single-frame greyscale image. */
export function writeDicom(options: SyntheticDicomOptions): Uint8Array {
  const transferSyntax = options.transferSyntax ?? EXPLICIT_LE;
  const isExplicit = transferSyntax !== IMPLICIT_LE;
  const isSigned = options.pixels instanceof Int16Array;
  const instance = options.instanceNumber ?? 1;
  const sopInstance = `1.2.826.0.1.3680043.10.1.${String(instance)}`;
  const pixelBytes = new Uint8Array(
    options.pixels.buffer,
    options.pixels.byteOffset,
    options.pixels.byteLength,
  );
  const str = (tag: number, vr: string, value: string): Element => ({ tag, vr, value });
  const ds = (tag: number, values: readonly number[]): Element =>
    str(tag, 'DS', values.map((value) => String(value)).join('\\'));
  const us = (tag: number, value: number): Element => ({ tag, vr: 'US', value });

  const dataset: Element[] = [
    str(0x00080005, 'CS', 'ISO_IR 100'),
    str(0x00080016, 'UI', CT_IMAGE_STORAGE),
    str(0x00080018, 'UI', sopInstance),
    str(0x00080060, 'CS', options.modality ?? 'CT'),
    str(0x00081030, 'LO', options.studyDescription ?? 'Phantom study'),
    str(0x0008103e, 'LO', options.seriesDescription ?? 'Ring phantom'),
    // A sequence of undefined length the parser has to skip.
    { tag: 0x00081140, vr: 'SQ', value: sequenceItem(isExplicit) },
    str(0x00100010, 'PN', options.patientName ?? 'Phantom^Ada'),
    str(0x00100020, 'LO', 'PHANTOM-001'),
    ds(0x00180050, [5]),
    str(0x0020000e, 'UI', options.seriesUid ?? '1.2.826.0.1.3680043.10.2'),
    str(0x00200013, 'IS', String(instance)),
    ds(0x00200032, [-96, -96, options.sliceLocation ?? 0]),
    ...(options.sliceLocation !== undefined ? [ds(0x00201041, [options.sliceLocation])] : []),
    us(0x00280002, 1),
    str(0x00280004, 'CS', options.photometricInterpretation ?? 'MONOCHROME2'),
    us(0x00280010, options.rows),
    us(0x00280011, options.columns),
    ...(options.pixelSpacing ? [ds(0x00280030, options.pixelSpacing)] : []),
    us(0x00280100, 16),
    us(0x00280101, options.bitsStored ?? 16),
    us(0x00280102, (options.bitsStored ?? 16) - 1),
    us(0x00280103, isSigned ? 1 : 0),
    ...(options.windowCenters ? [ds(0x00281050, options.windowCenters)] : []),
    ...(options.windowWidths ? [ds(0x00281051, options.windowWidths)] : []),
    ds(0x00281052, [options.rescaleIntercept ?? 0]),
    ds(0x00281053, [options.rescaleSlope ?? 1]),
    ...(options.windowExplanations
      ? [str(0x00281055, 'LO', options.windowExplanations.join('\\'))]
      : []),
    { tag: 0x7fe00010, vr: 'OW', value: pixelBytes },
  ];
  const body = concat(dataset.map((element) => encodeElement(element, isExplicit)));
  if (options.isRaw) {
    return body;
  }

  const metaElements = concat(
    [
      { tag: 0x00020001, vr: 'OB', value: new Uint8Array([0, 1]) },
      str(0x00020002, 'UI', CT_IMAGE_STORAGE),
      str(0x00020003, 'UI', sopInstance),
      str(0x00020010, 'UI', transferSyntax),
      str(0x00020012, 'UI', '1.2.826.0.1.3680043.10.99'),
    ].map((element) => encodeElement(element, true)),
  );
  const groupLength = encodeElement(
    { tag: 0x00020000, vr: 'UL', value: metaElements.length },
    true,
  );
  const preamble = new Uint8Array(132);
  preamble.set(new TextEncoder().encode('DICM'), 128);
  return concat([preamble, groupLength, metaElements, body]);
}

/** Hounsfield units of the phantom's rings, from the outside in. */
export const PHANTOM_HU = { air: -1000, softTissue: 40, lung: -700, bone: 700, water: 0 } as const;

/** The stack's slice spacing and the first slice's location, in mm. */
export const PHANTOM_SLICE_SPACING = 5;
export const PHANTOM_FIRST_LOCATION = -50;
/** Pixel spacing of the phantom, in mm. */
export const PHANTOM_PIXEL_SPACING = 0.75;

/**
 * The phantom's Hounsfield units for slice `index` of `count`: rings that shrink towards both ends of the stack, like
 * a sphere, and a small bright marker that moves around with the slice so scrolling is visible.
 */
export function phantomSlice(size: number, index: number, count: number): Int16Array {
  const hu = new Int16Array(size * size);
  const middle = (count - 1) / 2;
  const t = middle === 0 ? 0 : (index - middle) / middle;
  const scale = Math.sqrt(Math.max(0.2, 1 - 0.7 * t * t));
  const center = size / 2;
  const markerAngle = (2 * Math.PI * index) / Math.max(count, 1);
  const markerX = center + Math.cos(markerAngle) * size * 0.36 * scale;
  const markerY = center + Math.sin(markerAngle) * size * 0.36 * scale;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x + 0.5 - center, y + 0.5 - center) / size;
      let value: number = PHANTOM_HU.air;
      if (r < 0.44 * scale) {
        value = PHANTOM_HU.softTissue;
      }
      if (r < 0.3 * scale) {
        value = PHANTOM_HU.lung;
      }
      if (r < 0.16 * scale) {
        value = PHANTOM_HU.bone;
      }
      if (r < 0.08 * scale) {
        value = PHANTOM_HU.water;
      }
      if (Math.hypot(x + 0.5 - markerX, y + 0.5 - markerY) < size * 0.025) {
        value = PHANTOM_HU.bone;
      }
      hu[y * size + x] = value;
    }
  }
  return hu;
}

export interface PhantomOptions {
  /** Defaults to 20. */
  slices?: number;
  /** Rows and columns. Defaults to 128. */
  size?: number;
  transferSyntax?: string;
  seriesDescription?: string;
  seriesUid?: string;
  /** Leaves out pixel spacing, so lengths are in pixels. */
  hasNoSpacing?: boolean;
}

/** The phantom's slices as DICOM files: stored as unsigned values with a −1024 intercept, as CT usually is. */
export function phantomFiles({
  slices = 20,
  size = 128,
  transferSyntax = EXPLICIT_LE,
  seriesDescription,
  seriesUid,
  hasNoSpacing = false,
}: PhantomOptions = {}): Uint8Array[] {
  return Array.from({ length: slices }, (_, index) => {
    const hu = phantomSlice(size, index, slices);
    const stored = new Uint16Array(hu.length);
    for (let at = 0; at < hu.length; at++) {
      stored[at] = (hu[at] ?? 0) + 1024;
    }
    return writeDicom({
      rows: size,
      columns: size,
      pixels: stored,
      transferSyntax,
      rescaleIntercept: -1024,
      rescaleSlope: 1,
      ...(hasNoSpacing ? {} : { pixelSpacing: [PHANTOM_PIXEL_SPACING, PHANTOM_PIXEL_SPACING] }),
      windowCenters: [40, -600],
      windowWidths: [400, 1500],
      windowExplanations: ['SOFT TISSUE', 'LUNG'],
      bitsStored: 12,
      sliceLocation: PHANTOM_FIRST_LOCATION + index * PHANTOM_SLICE_SPACING,
      instanceNumber: index + 1,
      ...(seriesDescription !== undefined ? { seriesDescription } : {}),
      ...(seriesUid !== undefined ? { seriesUid } : {}),
    });
  });
}

/** `wadouri:` image ids for DICOM files, served from Blob URLs. */
export function toImageIds(files: readonly Uint8Array[]): string[] {
  return files.map(
    (file) =>
      `wadouri:${URL.createObjectURL(new Blob([file as BlobPart], { type: 'application/dicom' }))}`,
  );
}

/** A phantom series as `wadouri:` image ids. */
export function phantomImageIds(options?: PhantomOptions): string[] {
  return toImageIds(phantomFiles(options));
}

/** The item at `index`, failing loudly when there isn't one (fixtures always have it). */
export function itemAt<T>(items: readonly T[], index = 0): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`No item at ${String(index)}`);
  }
  return item;
}
