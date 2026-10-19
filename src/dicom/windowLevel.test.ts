import { describe, expect, it } from 'vitest';
import type { DicomImage } from './parseDicom';
import { applyWindow, defaultWindow, modalityRange, renderFrame } from './windowLevel';

const image = (overrides: Partial<DicomImage> = {}): DicomImage => ({
  width: 4,
  height: 1,
  pixels: new Uint16Array([0, 800, 1064, 3000]),
  rescaleSlope: 1,
  rescaleIntercept: -1024,
  ...overrides,
});

describe('applyWindow', () => {
  it('follows DICOM’s linear function', () => {
    const soft = { center: 40, width: 400 };
    // The window spans center − 0.5 ± (width − 1) / 2: (−160, 239].
    expect(applyWindow(-160, soft)).toBe(0);
    expect(applyWindow(-1000, soft)).toBe(0);
    expect(applyWindow(239.5, soft)).toBe(255);
    expect(applyWindow(40, soft)).toBe(128);
    expect(applyWindow(-60, soft)).toBe(Math.round(((-60 - 39.5) / 399 + 0.5) * 255));
  });

  it('thresholds with a window one unit wide', () => {
    expect(applyWindow(9, { center: 10, width: 1 })).toBe(0);
    expect(applyWindow(10, { center: 10, width: 1 })).toBe(255);
  });
});

describe('modalityRange and defaultWindow', () => {
  it('applies slope and intercept to the stored range', () => {
    expect(modalityRange(image())).toEqual({ min: -1024, max: 1976 });
    expect(modalityRange(image({ rescaleSlope: -2, rescaleIntercept: 0 }))).toEqual({
      min: -6000,
      max: 0,
    });
  });

  it('uses the image’s window, or its full range', () => {
    expect(defaultWindow(image({ windowCenter: 40, windowWidth: 400 }))).toEqual({
      center: 40,
      width: 400,
    });
    expect(defaultWindow(image())).toEqual({ center: 476, width: 3000 });
  });
});

describe('renderFrame', () => {
  const grey = (out: Uint8ClampedArray) =>
    Array.from({ length: out.length / 4 }, (_, i) => out[i * 4]);

  it('windows modality values into opaque grey pixels', () => {
    const out = new Uint8ClampedArray(16);
    renderFrame(image(), { center: 40, width: 400 }, out);
    expect(grey(out)).toEqual([0, 0, 128, 255]);
    expect(out[3]).toBe(255);
  });

  it('inverts MONOCHROME1, and inverts again on request', () => {
    const out = new Uint8ClampedArray(16);
    const mono1 = image({ photometricInterpretation: 'MONOCHROME1' });
    renderFrame(mono1, { center: 40, width: 400 }, out);
    expect(grey(out)).toEqual([255, 255, 127, 0]);
    renderFrame(mono1, { center: 40, width: 400 }, out, true);
    expect(grey(out)).toEqual([0, 0, 128, 255]);
  });

  it('windows float pixels without a lookup table', () => {
    const out = new Uint8ClampedArray(8);
    renderFrame(
      { width: 2, height: 1, pixels: new Float32Array([-0.5, 0.5]) },
      { center: 0, width: 1 },
      out,
    );
    expect(grey(out)).toEqual([0, 255]);
  });

  it('copies RGB pixels as they are', () => {
    const out = new Uint8ClampedArray(4);
    renderFrame(
      { width: 1, height: 1, pixels: new Uint8Array([10, 20, 30]), samplesPerPixel: 3 },
      { center: 0, width: 1 },
      out,
    );
    expect(Array.from(out)).toEqual([10, 20, 30, 255]);
  });
});
