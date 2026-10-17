import { describe, expect, it } from 'vitest';
import {
  EXPLICIT_LE,
  itemAt,
  IMPLICIT_LE,
  JPEG_BASELINE,
  PHANTOM_FIRST_LOCATION,
  PHANTOM_HU,
  PHANTOM_SLICE_SPACING,
  phantomFiles,
  writeDicom,
} from '../../test/dicom';
import { decodeDicomImage, DicomParseError, parseDicom } from './parseDicom';
import { toModality } from './windowLevel';

function expectParseError(run: () => unknown, code: string): DicomParseError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(DicomParseError);
    expect((error as DicomParseError).code).toBe(code);
    return error as DicomParseError;
  }
  throw new Error('Expected a DicomParseError');
}

describe('parseDicom', () => {
  it('reads the tags a viewer needs from an explicit VR little endian file, skipping sequences', () => {
    const data = parseDicom(itemAt(phantomFiles({ slices: 3, size: 16 })));
    expect(data.transferSyntax).toBe(EXPLICIT_LE);
    expect(data).toMatchObject({
      rows: 16,
      columns: 16,
      bitsAllocated: 16,
      bitsStored: 12,
      highBit: 11,
      pixelRepresentation: 0,
      samplesPerPixel: 1,
      photometricInterpretation: 'MONOCHROME2',
      rescaleSlope: 1,
      rescaleIntercept: -1024,
      pixelSpacing: [0.75, 0.75],
      windowCenter: [40, -600],
      windowWidth: [400, 1500],
      windowExplanation: ['SOFT TISSUE', 'LUNG'],
      sliceLocation: PHANTOM_FIRST_LOCATION,
      instanceNumber: 1,
      modality: 'CT',
      patientName: 'Phantom Ada',
      studyDescription: 'Phantom study',
      seriesDescription: 'Ring phantom',
      pixelDataLength: 16 * 16 * 2,
    });
    expect(data.imagePositionPatient).toEqual([-96, -96, PHANTOM_FIRST_LOCATION]);
  });

  it('reads implicit VR little endian files to the same image', () => {
    const explicit = itemAt(phantomFiles({ slices: 3, size: 16 }));
    const implicit = itemAt(phantomFiles({ slices: 3, size: 16, transferSyntax: IMPLICIT_LE }));
    const a = decodeDicomImage(explicit);
    const b = decodeDicomImage(implicit);
    expect(parseDicom(implicit).transferSyntax).toBe(IMPLICIT_LE);
    expect(b.pixels).toEqual(a.pixels);
    expect(b.windows).toEqual(a.windows);
    expect(b.pixelSpacing).toEqual([0.75, 0.75]);
  });

  it('reads a raw data set without the preamble or meta group as implicit VR', () => {
    const file = writeDicom({
      rows: 2,
      columns: 2,
      pixels: new Uint16Array([1, 2, 3, 4]),
      transferSyntax: IMPLICIT_LE,
      isRaw: true,
    });
    const image = decodeDicomImage(file);
    expect(Array.from(image.pixels)).toEqual([1, 2, 3, 4]);
  });

  it('sign-extends signed values stored in fewer bits than allocated', () => {
    const values = [-1000, 0, 700, -2048, 2047, -1];
    const file = writeDicom({
      rows: 2,
      columns: 3,
      pixels: new Int16Array(values),
      bitsStored: 12,
    });
    const image = decodeDicomImage(file);
    expect(image.pixels).toBeInstanceOf(Int16Array);
    expect(Array.from(image.pixels)).toEqual(values);
  });

  it('decodes the phantom to Hounsfield units, with its default window and slice position', () => {
    const files = phantomFiles({ slices: 5, size: 64 });
    const image = decodeDicomImage(itemAt(files, 2));
    const center = image.pixels[32 * 64 + 32] ?? 0;
    const corner = image.pixels[0] ?? 0;
    expect(toModality(image, center)).toBe(PHANTOM_HU.water);
    expect(toModality(image, corner)).toBe(PHANTOM_HU.air);
    expect(image.windowCenter).toBe(40);
    expect(image.windowWidth).toBe(400);
    expect(image.slicePosition).toBe(PHANTOM_FIRST_LOCATION + 2 * PHANTOM_SLICE_SPACING);
    expect(image.instanceNumber).toBe(3);
  });

  it('raises a compressed error, naming the transfer syntax, for compressed files', () => {
    const file = writeDicom({
      rows: 2,
      columns: 2,
      pixels: new Uint16Array(4),
      transferSyntax: JPEG_BASELINE,
    });
    const error = expectParseError(() => parseDicom(file), 'compressed');
    expect(error.transferSyntax).toBe(JPEG_BASELINE);
    expect(error.message).toContain('loadImage');
  });

  it('rejects files that aren’t DICOM, or are cut short', () => {
    expectParseError(
      () => parseDicom(new TextEncoder().encode('not a dicom file at all')),
      'invalid',
    );
    const file = itemAt(phantomFiles({ slices: 1, size: 16 }));
    expectParseError(() => decodeDicomImage(file.slice(0, file.length - 100)), 'invalid');
  });

  it('rejects photometric interpretations it can’t display', () => {
    const file = writeDicom({
      rows: 2,
      columns: 2,
      pixels: new Uint16Array(4),
      photometricInterpretation: 'PALETTE COLOR',
    });
    expectParseError(() => decodeDicomImage(file), 'unsupported');
  });
});
