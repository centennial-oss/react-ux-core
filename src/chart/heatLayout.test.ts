import { describe, expect, it } from 'vitest';
import { heatCellSize, rowLabelEvery, rowLabelWidth, visibleColumnLabels } from './heatLayout';

describe('heatCellSize', () => {
  const base = { size: 'fit' as const, columns: 27, labelWidth: 36, isCoarse: false };

  it('fits every week of six months in a 1000 px plot at the regular size', () => {
    expect(heatCellSize({ ...base, width: 1000 })).toBe(28);
  });

  it('shrinks cells to fit, down to 10 px (24 px on touch screens)', () => {
    expect(heatCellSize({ ...base, width: 600 })).toBe(19);
    expect(heatCellSize({ ...base, columns: 53, width: 400 })).toBe(10);
    expect(heatCellSize({ ...base, width: 360, isCoarse: true })).toBe(24);
    expect(heatCellSize({ ...base, width: 1400, isCoarse: true })).toBe(44);
  });

  it('uses fixed sizes, never below 24 px on touch screens, and the regular size before measuring', () => {
    expect(heatCellSize({ ...base, size: 'sm', width: 1000 })).toBe(12);
    expect(heatCellSize({ ...base, size: 'sm', width: 1000, isCoarse: true })).toBe(24);
    expect(heatCellSize({ ...base, size: 'lg', width: 100 })).toBe(28);
    expect(heatCellSize({ ...base, width: undefined })).toBe(28);
  });
});

describe('visibleColumnLabels', () => {
  it('shows the latest labels first and drops ones that would overlap', () => {
    // Month names on weekly columns of 11 px: "Apr" in the first column is too close to "May".
    const marks = [
      'Apr',
      undefined,
      'May',
      undefined,
      undefined,
      undefined,
      'Jun',
      undefined,
      undefined,
    ];
    expect(visibleColumnLabels(marks, 10)).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
    ]);
    // On large cells every month shows.
    expect(visibleColumnLabels(marks, 28).filter(Boolean)).toHaveLength(3);
  });

  it('drops a label with no room before the plot ends', () => {
    expect(visibleColumnLabels([undefined, undefined, 'Oct'], 10)).toEqual([false, false, false]);
  });
});

describe('row labels', () => {
  it('sizes the label column to the labels, and thins labels on small cells', () => {
    expect(rowLabelWidth(['Mon', 'Tue'])).toBe(36);
    expect(rowLabelWidth(['A rather long topic name for a row'])).toBe(192);
    expect(rowLabelEvery(28)).toBe(1);
    expect(rowLabelEvery(10)).toBe(2);
  });
});
