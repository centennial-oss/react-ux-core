import { describe, expect, it } from 'vitest';
import { nextGridCell } from './gridNav';

const at = { isCtrl: false, isRtl: false, row: 2, col: 1, lastRow: 4, lastCol: 3 };

describe('nextGridCell', () => {
  it('moves one cell with the arrow keys', () => {
    expect(nextGridCell('ArrowDown', at)).toEqual([3, 1]);
    expect(nextGridCell('ArrowUp', at)).toEqual([1, 1]);
    expect(nextGridCell('ArrowRight', at)).toEqual([2, 2]);
    expect(nextGridCell('ArrowLeft', at)).toEqual([2, 0]);
  });

  it('swaps left and right in right-to-left layouts', () => {
    expect(nextGridCell('ArrowRight', { ...at, isRtl: true })).toEqual([2, 0]);
    expect(nextGridCell('ArrowLeft', { ...at, isRtl: true })).toEqual([2, 2]);
  });

  it('goes to the ends of the row with Home and End, and of the grid with Ctrl', () => {
    expect(nextGridCell('Home', at)).toEqual([2, 0]);
    expect(nextGridCell('End', at)).toEqual([2, 3]);
    expect(nextGridCell('Home', { ...at, isCtrl: true })).toEqual([0, 0]);
    expect(nextGridCell('End', { ...at, isCtrl: true })).toEqual([4, 3]);
  });

  it('goes to the first and last rows with PageUp and PageDown, or by a page when given', () => {
    expect(nextGridCell('PageUp', at)).toEqual([0, 1]);
    expect(nextGridCell('PageDown', at)).toEqual([4, 1]);
    expect(nextGridCell('PageUp', { ...at, pageSize: 1 })).toEqual([1, 1]);
    expect(nextGridCell('PageDown', { ...at, pageSize: 10 })).toEqual([4, 1]);
  });

  it('stays inside the grid', () => {
    expect(nextGridCell('ArrowUp', { ...at, row: 0 })).toEqual([0, 1]);
    expect(nextGridCell('ArrowDown', { ...at, row: 4 })).toEqual([4, 1]);
    expect(nextGridCell('ArrowLeft', { ...at, col: 0 })).toEqual([2, 0]);
    expect(nextGridCell('ArrowRight', { ...at, col: 3 })).toEqual([2, 3]);
  });

  it('ignores other keys', () => {
    expect(nextGridCell('Enter', at)).toBeNull();
    expect(nextGridCell('a', at)).toBeNull();
  });
});
