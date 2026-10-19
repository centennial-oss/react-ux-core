// Changes to a Spreadsheet's rows and columns, applied to immutable arrays and inverted for undo. A change keeps only
// what it touched: references to the rows before and after (rows are immutable, so the "after" rows are the sheet's
// own and cost nothing extra), the inserted or removed rows with their positions, and both column lists. The history
// is bounded by entries and by the rows its entries hold, so a long session can't grow without limit.

import type { SpreadsheetColumn, SpreadsheetRow } from './types';

export type SheetChange =
  /** Rows replaced by edited copies (cell edits, clears, pastes, fills, column data changes). */
  | { type: 'replace'; entries: readonly { before: SpreadsheetRow; after: SpreadsheetRow }[] }
  /** Rows inserted at positions in the rows, ascending. */
  | { type: 'insert'; entries: readonly { index: number; row: SpreadsheetRow }[] }
  /** Rows removed from positions in the rows, ascending. */
  | { type: 'remove'; entries: readonly { index: number; row: SpreadsheetRow }[] }
  /** The column list replaced. */
  | { type: 'columns'; before: readonly SpreadsheetColumn[]; after: readonly SpreadsheetColumn[] };

/** One undoable step: its changes in the order they apply. */
export interface HistoryEntry {
  changes: readonly SheetChange[];
}

export function invertChange(change: SheetChange): SheetChange {
  switch (change.type) {
    case 'replace':
      return {
        type: 'replace',
        entries: change.entries.map(({ before, after }) => ({ before: after, after: before })),
      };
    case 'insert':
      return { type: 'remove', entries: change.entries };
    case 'remove':
      return { type: 'insert', entries: change.entries };
    case 'columns':
      return { type: 'columns', before: change.after, after: change.before };
  }
}

/** The entry that undoes `entry`: each change inverted, in reverse order. */
export function invertEntry(entry: HistoryEntry): HistoryEntry {
  return { changes: [...entry.changes].reverse().map(invertChange) };
}

/** Finds rows in the current array: by identity first, then by id (the app may have replaced a row). */
function rowLocator(rows: readonly SpreadsheetRow[], getRowId: (row: SpreadsheetRow) => string) {
  let byIdentity: Map<SpreadsheetRow, number> | null = null;
  let byId: Map<string, number> | null = null;
  return (row: SpreadsheetRow): number | undefined => {
    byIdentity ??= new Map(rows.map((candidate, index) => [candidate, index]));
    const index = byIdentity.get(row);
    if (index !== undefined) {
      return index;
    }
    byId ??= new Map(rows.map((candidate, position) => [getRowId(candidate), position]));
    return byId.get(getRowId(row));
  };
}

/** Applies a row change (not `columns`) to `rows`, returning a new array. */
export function applyRowChange(
  rows: readonly SpreadsheetRow[],
  change: Exclude<SheetChange, { type: 'columns' }>,
  getRowId: (row: SpreadsheetRow) => string,
): SpreadsheetRow[] {
  switch (change.type) {
    case 'replace': {
      const next = rows.slice();
      const locate = rowLocator(rows, getRowId);
      for (const { before, after } of change.entries) {
        const index = locate(before);
        if (index !== undefined) {
          next[index] = after;
        }
      }
      return next;
    }
    case 'insert': {
      // One merge pass (no spreading into calls), so inserting into large sheets stays linear and safe.
      const next: SpreadsheetRow[] = [];
      const pending = change.entries;
      let cursor = 0;
      const insertDue = () => {
        for (
          let entry = pending[cursor];
          entry !== undefined && entry.index <= next.length;
          entry = pending[cursor]
        ) {
          next.push(entry.row);
          cursor++;
        }
      };
      insertDue();
      for (const row of rows) {
        next.push(row);
        insertDue();
      }
      for (const entry of pending.slice(cursor)) {
        next.push(entry.row);
      }
      return next;
    }
    case 'remove': {
      const locate = rowLocator(rows, getRowId);
      const removed = new Set<number>();
      for (const { row } of change.entries) {
        const index = locate(row);
        if (index !== undefined) {
          removed.add(index);
        }
      }
      return rows.filter((_, index) => !removed.has(index));
    }
  }
}

/** Rows a change holds on to, for the history's budget. */
function sizeOf(entry: HistoryEntry): number {
  return entry.changes.reduce(
    (total, change) => total + (change.type === 'columns' ? 1 : change.entries.length),
    0,
  );
}

/** Undo and redo stacks, bounded by entry count and by the rows the entries hold. */
export class SheetHistory {
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private held = 0;

  constructor(
    private readonly maxEntries = 100,
    private readonly maxRows = 250_000,
  ) {}

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Records a step that has just been applied; clears redo. */
  push(entry: HistoryEntry): void {
    if (entry.changes.length === 0) {
      return;
    }
    this.past.push(entry);
    this.held += sizeOf(entry);
    for (const dropped of this.future) {
      this.held -= sizeOf(dropped);
    }
    this.future = [];
    while (
      this.past.length > 1 &&
      (this.past.length > this.maxEntries || this.held > this.maxRows)
    ) {
      const oldest = this.past.shift();
      if (oldest) {
        this.held -= sizeOf(oldest);
      }
    }
  }

  /** The step to apply to undo, moved to the redo stack. */
  undo(): HistoryEntry | null {
    const entry = this.past.pop();
    if (!entry) {
      return null;
    }
    this.future.push(entry);
    return invertEntry(entry);
  }

  /** The step to apply to redo, moved back to the undo stack. */
  redo(): HistoryEntry | null {
    const entry = this.future.pop();
    if (!entry) {
      return null;
    }
    this.past.push(entry);
    return entry;
  }

  clear(): void {
    this.past = [];
    this.future = [];
    this.held = 0;
  }
}
