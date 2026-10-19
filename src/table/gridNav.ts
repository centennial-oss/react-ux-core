// Arrow, Home/End and PageUp/PageDown movement between the cells of a read-only or editable ARIA grid.

import { clamp } from '../utils/math';

export interface GridNavPosition {
  /** Ctrl (or ⌘) is held: Home and End go to the first and last cells of the grid rather than of the row. */
  isCtrl: boolean;
  /** Right to left, where ArrowRight moves back a column. */
  isRtl: boolean;
  row: number;
  col: number;
  lastRow: number;
  lastCol: number;
  /** Rows PageUp and PageDown move by. Without it they go to the first and last rows. */
  pageSize?: number;
}

/**
 * The cell a navigation key moves to from `row` and `col`, kept inside the grid, or `null` when the key isn't a
 * navigation key.
 */
export function nextGridCell(
  key: string,
  { isCtrl, isRtl, row, col, lastRow, lastCol, pageSize }: GridNavPosition,
): [number, number] | null {
  const forward = isRtl ? -1 : 1;
  let next: [number, number];
  switch (key) {
    case 'ArrowDown':
      next = [row + 1, col];
      break;
    case 'ArrowUp':
      next = [row - 1, col];
      break;
    case 'ArrowRight':
      next = [row, col + forward];
      break;
    case 'ArrowLeft':
      next = [row, col - forward];
      break;
    case 'Home':
      next = isCtrl ? [0, 0] : [row, 0];
      break;
    case 'End':
      next = isCtrl ? [lastRow, lastCol] : [row, lastCol];
      break;
    case 'PageDown':
      next = [pageSize === undefined ? lastRow : row + pageSize, col];
      break;
    case 'PageUp':
      next = [pageSize === undefined ? 0 : row - pageSize, col];
      break;
    default:
      return null;
  }
  return [clamp(next[0], 0, lastRow), clamp(next[1], 0, lastCol)];
}
