import { describe, expect, it } from 'vitest';
import { itemAt, PHANTOM_HU, phantomFiles } from '../../test/dicom';
import { computeMeasurement, measureAngle, measureLength, measureRoi } from './measurements';
import { decodeDicomImage, type DicomImage } from './parseDicom';

const uniform = (value: number, spacing?: readonly [number, number]): DicomImage => ({
  width: 20,
  height: 10,
  pixels: new Int16Array(200).fill(value),
  rescaleSlope: 2,
  rescaleIntercept: -10,
  ...(spacing ? { pixelSpacing: spacing } : {}),
});

describe('measureLength', () => {
  it('converts to mm with row and column spacing', () => {
    // 4 columns at 0.75 mm and 3 rows at 0.5 mm.
    expect(measureLength({ x: 0, y: 0 }, { x: 4, y: 3 }, [0.5, 0.75])).toEqual({
      length: Math.hypot(3, 1.5),
      unit: 'mm',
    });
  });

  it('falls back to pixels without spacing', () => {
    expect(measureLength({ x: 1, y: 1 }, { x: 4, y: 5 })).toEqual({ length: 5, unit: 'px' });
  });
});

describe('measureAngle', () => {
  it('measures the angle at the vertex', () => {
    expect(measureAngle({ x: 10, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(90);
    expect(measureAngle({ x: -5, y: 0 }, { x: 0, y: 0 }, { x: 5, y: 0 })).toBeCloseTo(180);
    expect(measureAngle({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(45);
  });

  it('measures in physical space with non-square pixels', () => {
    // Rows twice as far apart as columns: (1, 1) is really at 63.4° from the x axis.
    expect(measureAngle({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }, [2, 1])).toBeCloseTo(
      (Math.atan(2) * 180) / Math.PI,
    );
  });

  it('is 0 for a degenerate angle', () => {
    expect(measureAngle({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(0);
  });
});

describe('measureRoi', () => {
  it('reports the area in mm² and statistics in modality units', () => {
    const stats = measureRoi('rectangle', { x: 2, y: 2 }, { x: 6, y: 5 }, uniform(30, [0.5, 0.5]));
    expect(stats.area).toBeCloseTo(4 * 3 * 0.25);
    expect(stats.unit).toBe('mm');
    expect(stats.pixelCount).toBe(12);
    expect(stats.mean).toBe(50);
    expect(stats.stdDev).toBe(0);
    expect(stats.min).toBe(50);
    expect(stats.max).toBe(50);
  });

  it('measures an ellipse’s geometric area and the pixels inside it', () => {
    const stats = measureRoi('ellipse', { x: 0, y: 0 }, { x: 10, y: 10 }, uniform(0));
    expect(stats.unit).toBe('px');
    expect(stats.area).toBeCloseTo(Math.PI * 25);
    // Pixel centres inside a radius-5 circle.
    expect(stats.pixelCount).toBeGreaterThan(70);
    expect(stats.pixelCount).toBeLessThan(90);
  });

  it('finds the phantom’s water core and its spread across rings', () => {
    const image = decodeDicomImage(itemAt(phantomFiles({ slices: 1, size: 64 })));
    const core = measureRoi('ellipse', { x: 29, y: 29 }, { x: 35, y: 35 }, image);
    expect(core.mean).toBe(PHANTOM_HU.water);
    expect(core.stdDev).toBe(0);
    const wide = measureRoi('rectangle', { x: 16, y: 16 }, { x: 48, y: 48 }, image);
    expect(wide.min).toBe(PHANTOM_HU.lung);
    expect(wide.max).toBe(PHANTOM_HU.bone);
    expect(wide.stdDev).toBeGreaterThan(100);
  });
});

describe('computeMeasurement', () => {
  it('fills in the values for its kind', () => {
    const image = uniform(0, [0.5, 0.5]);
    const base = { id: 'm1', imageId: 'a', sliceIndex: 3 };
    const length = computeMeasurement(
      {
        ...base,
        kind: 'length',
        points: [
          { x: 0, y: 0 },
          { x: 6, y: 8 },
        ],
      },
      image,
    );
    expect(length).toMatchObject({ kind: 'length', length: 5, unit: 'mm', sliceIndex: 3 });
    const angle = computeMeasurement(
      {
        ...base,
        kind: 'angle',
        points: [
          { x: 1, y: 0 },
          { x: 0, y: 0 },
          { x: 0, y: 1 },
        ],
      },
      image,
    );
    expect(angle.kind === 'angle' && angle.degrees).toBeCloseTo(90);
  });
});
