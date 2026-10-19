// The selection: one rectangle of cells, whole rows, whole columns or everything, in view positions (the row's place
// in the view, the column's place among the visible columns). The anchor is the active cell; the focus is the corner
// that Shift with an arrow key or a drag moves.

import { clamp } from '../../utils/math';

export interface CellPosition {
  row: number;
  col: number;
}

export type SelectionKind = 'cells' | 'rows' | 'columns' | 'all';

export interface SheetSelection {
  anchor: CellPosition;
  focus: CellPosition;
  kind: SelectionKind;
}

export interface SelectionBounds {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function cellSelection(row: number, col: number): SheetSelection {
  return { anchor: { row, col }, focus: { row, col }, kind: 'cells' };
}

/** The selected rectangle, with whole rows and columns spanning the sheet. */
export function selectionBounds(
  selection: SheetSelection,
  rowCount: number,
  colCount: number,
): SelectionBounds {
  const wholeRows = selection.kind === 'rows' || selection.kind === 'all';
  const wholeCols = selection.kind === 'columns' || selection.kind === 'all';
  return {
    top: wholeCols ? 0 : Math.min(selection.anchor.row, selection.focus.row),
    bottom: wholeCols ? rowCount - 1 : Math.max(selection.anchor.row, selection.focus.row),
    left: wholeRows ? 0 : Math.min(selection.anchor.col, selection.focus.col),
    right: wholeRows ? colCount - 1 : Math.max(selection.anchor.col, selection.focus.col),
  };
}

/** Keeps a selection inside the sheet after rows or columns go; `null` when the sheet is empty. */
export function clampSelection(
  selection: SheetSelection | null,
  rowCount: number,
  colCount: number,
): SheetSelection | null {
  if (!selection || rowCount === 0 || colCount === 0) {
    return rowCount === 0 || colCount === 0 ? null : selection;
  }
  const clampPosition = (position: CellPosition): CellPosition => ({
    row: clamp(position.row, 0, rowCount - 1),
    col: clamp(position.col, 0, colCount - 1),
  });
  const anchor = clampPosition(selection.anchor);
  const focus = clampPosition(selection.focus);
  if (
    anchor.row === selection.anchor.row &&
    anchor.col === selection.anchor.col &&
    focus.row === selection.focus.row &&
    focus.col === selection.focus.col
  ) {
    return selection;
  }
  return { ...selection, anchor, focus };
}

export function boundsSize(bounds: SelectionBounds): { rows: number; cols: number; cells: number } {
  const rows = bounds.bottom - bounds.top + 1;
  const cols = bounds.right - bounds.left + 1;
  return { rows, cols, cells: rows * cols };
}
