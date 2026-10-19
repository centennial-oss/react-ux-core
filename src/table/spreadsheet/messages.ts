// English defaults of Spreadsheet's strings. Apps override them through `UIProvider`'s `messages` like any other
// table string. They're kept out of the other table components' defaults, so those don't carry them. Counts arrive as
// numbers; values and positions arrive already formatted for the locale.

import { useEntryMessages } from '../../provider/context';
import { defaultTableMessages, type TableStrings } from '../messages';

/** Strings for Spreadsheet. */
export interface SpreadsheetMessages {
  /** How to use the grid, read when it's focused. */
  spreadsheetInstructions: string;
  /** The corner button that selects every cell. */
  spreadsheetSelectAll: string;
  /** A column header's menu button ("Port options"). */
  spreadsheetColumnOptions: (params: { column: string }) => string;
  /** The cell editor's name ("Port, row 12"). */
  spreadsheetCellLabel: (params: { column: string; row: string }) => string;
  /** The active cell in the status bar ("Port · row 12"). */
  spreadsheetCellPosition: (params: { column: string; row: string }) => string;
  /** The row count in the status bar ("1,204 rows", or "35 of 1,204 rows" while filtered). */
  spreadsheetRowCount: (params: {
    shown: number;
    total: number;
    shownText: string;
    totalText: string;
  }) => string;
  /** Selection statistics in the status bar. */
  spreadsheetCount: (params: { value: string }) => string;
  spreadsheetSum: (params: { value: string }) => string;
  spreadsheetAverage: (params: { value: string }) => string;
  /** Problems found by the app's `validate` ("3 problems"). */
  spreadsheetProblemCount: (params: { count: number }) => string;
  /** Moves to the next cell with a problem. */
  spreadsheetNextProblem: string;
  /** Shown when the sheet has no rows, or none match. */
  spreadsheetNoRows: string;

  // Toolbar
  spreadsheetUndo: string;
  spreadsheetRedo: string;
  spreadsheetAddRow: string;
  spreadsheetAddColumn: string;
  spreadsheetShowAllColumns: string;
  /** The sort chip ("Sorted by Name, then Port"). */
  spreadsheetSortedBy: (params: { columns: string }) => string;
  /** Reapplies sorting and filters after edits, which don't move rows on their own. */
  spreadsheetReapply: string;
  /** Why Reapply shows. */
  spreadsheetReapplyHint: string;

  // Cell and row actions
  spreadsheetEditCell: string;
  spreadsheetEditRow: string;
  spreadsheetCut: string;
  spreadsheetPaste: string;
  spreadsheetCopyWithHeaders: string;
  spreadsheetClearCells: (params: { count: number }) => string;
  spreadsheetFillDown: string;
  spreadsheetFillRight: string;
  spreadsheetInsertRowsAbove: (params: { count: number }) => string;
  spreadsheetInsertRowsBelow: (params: { count: number }) => string;
  spreadsheetDuplicateRows: (params: { count: number }) => string;
  spreadsheetDeleteRows: (params: { count: number }) => string;
  spreadsheetMoveRowsUp: (params: { count: number }) => string;
  spreadsheetMoveRowsDown: (params: { count: number }) => string;

  // Column actions
  spreadsheetSortAscending: string;
  spreadsheetSortDescending: string;
  spreadsheetThenSortAscending: string;
  spreadsheetThenSortDescending: string;
  spreadsheetClearSort: string;
  spreadsheetFilter: string;
  spreadsheetClearFilter: string;
  spreadsheetHideColumns: (params: { count: number }) => string;
  spreadsheetFitWidth: string;
  spreadsheetInsertColumnBefore: string;
  spreadsheetInsertColumnAfter: string;
  spreadsheetMoveColumnEarlier: string;
  spreadsheetMoveColumnLater: string;
  spreadsheetDeleteColumns: (params: { count: number }) => string;
  spreadsheetColumnSettings: string;
  /** The filter popover's name ("Filter Port"). */
  spreadsheetFilterTitle: (params: { column: string }) => string;
  spreadsheetDone: string;
  /** The row editor's title ("Row 12"). */
  spreadsheetRowTitle: (params: { row: string }) => string;
  spreadsheetPreviousRow: string;
  spreadsheetNextRow: string;

  // Column settings
  spreadsheetColumnSettingsTitle: (params: { column: string }) => string;
  spreadsheetColumnName: string;
  spreadsheetColumnType: string;
  spreadsheetColumnGroup: string;
  spreadsheetColumnWidth: string;
  spreadsheetColumnRequired: string;
  spreadsheetColumnReadOnly: string;
  spreadsheetColumnMaxLength: string;
  spreadsheetColumnStep: string;
  spreadsheetColumnStepHint: string;
  spreadsheetColumnChoices: string;
  spreadsheetColumnChoicesHint: string;
  spreadsheetTypeChangeHint: string;
  spreadsheetTypeText: string;
  spreadsheetTypeNumber: string;
  spreadsheetTypeBoolean: string;
  spreadsheetTypeDate: string;
  spreadsheetTypeEnum: string;
  /** The name of an added column ("Column 7"). */
  spreadsheetNewColumn: (params: { number: number }) => string;

  // Validation
  spreadsheetRequired: string;
  spreadsheetInvalidNumber: string;
  spreadsheetWholeNumber: string;
  spreadsheetInvalidDate: string;
  spreadsheetInvalidBoolean: string;
  spreadsheetInvalidOption: (params: { options: string }) => string;
  spreadsheetTooLong: (params: { max: number }) => string;
  spreadsheetTooLow: (params: { min: string }) => string;
  spreadsheetTooHigh: (params: { max: string }) => string;
  spreadsheetStepMismatch: (params: { step: string }) => string;

  // Announcements
  spreadsheetReadOnlyCell: (params: { column: string }) => string;
  spreadsheetCopied: (params: { count: number }) => string;
  spreadsheetCutDone: (params: { count: number }) => string;
  spreadsheetPasted: (params: { count: number; skipped: number }) => string;
  spreadsheetCleared: (params: { count: number }) => string;
  spreadsheetPasteBlocked: string;
  spreadsheetNotSaved: (params: { error: string }) => string;
  spreadsheetUndone: string;
  spreadsheetRedone: string;
  spreadsheetRowsInserted: (params: { count: number }) => string;
  spreadsheetRowsDeleted: (params: { count: number }) => string;
  spreadsheetRowsMoved: (params: { count: number }) => string;
  spreadsheetNoProblems: string;
}

const cells = (count: number) => (count === 1 ? '1 cell' : `${String(count)} cells`);
const rows = (count: number) => (count === 1 ? 'row' : `${String(count)} rows`);

export const defaultSpreadsheetMessages: SpreadsheetMessages = {
  spreadsheetInstructions:
    'Arrow keys move between cells; Shift with an arrow key extends the selection. Type, or press Enter or F2, to edit; Escape cancels. Shift+F10 opens the cell menu.',
  spreadsheetSelectAll: 'Select all',
  spreadsheetColumnOptions: ({ column }) => `${column} options`,
  spreadsheetCellLabel: ({ column, row }) => `${column}, row ${row}`,
  spreadsheetCellPosition: ({ column, row }) => `${column} · row ${row}`,
  spreadsheetRowCount: ({ shown, total, shownText, totalText }) =>
    shown === total
      ? `${totalText} ${total === 1 ? 'row' : 'rows'}`
      : `${shownText} of ${totalText} rows`,
  spreadsheetCount: ({ value }) => `Count: ${value}`,
  spreadsheetSum: ({ value }) => `Sum: ${value}`,
  spreadsheetAverage: ({ value }) => `Average: ${value}`,
  spreadsheetProblemCount: ({ count }) => (count === 1 ? '1 problem' : `${String(count)} problems`),
  spreadsheetNextProblem: 'Next problem',
  spreadsheetNoRows: 'No rows',

  spreadsheetUndo: 'Undo',
  spreadsheetRedo: 'Redo',
  spreadsheetAddRow: 'Add row',
  spreadsheetAddColumn: 'Add column',
  spreadsheetShowAllColumns: 'Show all columns',
  spreadsheetSortedBy: ({ columns }) => `Sorted by ${columns}`,
  spreadsheetReapply: 'Reapply sort & filters',
  spreadsheetReapplyHint: 'Edited rows stay in place until you reapply.',

  spreadsheetEditCell: 'Edit cell',
  spreadsheetEditRow: 'Edit row…',
  spreadsheetCut: 'Cut',
  spreadsheetPaste: 'Paste',
  spreadsheetCopyWithHeaders: 'Copy with headers',
  spreadsheetClearCells: ({ count }) => (count === 1 ? 'Clear cell' : `Clear ${cells(count)}`),
  spreadsheetFillDown: 'Fill down',
  spreadsheetFillRight: 'Fill right',
  spreadsheetInsertRowsAbove: ({ count }) => `Insert ${rows(count)} above`,
  spreadsheetInsertRowsBelow: ({ count }) => `Insert ${rows(count)} below`,
  spreadsheetDuplicateRows: ({ count }) => `Duplicate ${rows(count)}`,
  spreadsheetDeleteRows: ({ count }) => `Delete ${rows(count)}`,
  spreadsheetMoveRowsUp: ({ count }) => `Move ${rows(count)} up`,
  spreadsheetMoveRowsDown: ({ count }) => `Move ${rows(count)} down`,

  spreadsheetSortAscending: 'Sort ascending',
  spreadsheetSortDescending: 'Sort descending',
  spreadsheetThenSortAscending: 'Then sort ascending',
  spreadsheetThenSortDescending: 'Then sort descending',
  spreadsheetClearSort: 'Clear sort',
  spreadsheetFilter: 'Filter…',
  spreadsheetClearFilter: 'Clear filter',
  spreadsheetHideColumns: ({ count }) =>
    count === 1 ? 'Hide column' : `Hide ${String(count)} columns`,
  spreadsheetFitWidth: 'Fit width to content',
  spreadsheetInsertColumnBefore: 'Insert column before',
  spreadsheetInsertColumnAfter: 'Insert column after',
  spreadsheetMoveColumnEarlier: 'Move column earlier',
  spreadsheetMoveColumnLater: 'Move column later',
  spreadsheetDeleteColumns: ({ count }) =>
    count === 1 ? 'Delete column' : `Delete ${String(count)} columns`,
  spreadsheetColumnSettings: 'Column settings…',
  spreadsheetFilterTitle: ({ column }) => `Filter ${column}`,
  spreadsheetDone: 'Done',
  spreadsheetRowTitle: ({ row }) => `Row ${row}`,
  spreadsheetPreviousRow: 'Previous row',
  spreadsheetNextRow: 'Next row',

  spreadsheetColumnSettingsTitle: ({ column }) => `${column} column`,
  spreadsheetColumnName: 'Name',
  spreadsheetColumnType: 'Type',
  spreadsheetColumnGroup: 'Group',
  spreadsheetColumnWidth: 'Width',
  spreadsheetColumnRequired: 'Required',
  spreadsheetColumnReadOnly: 'Read-only',
  spreadsheetColumnMaxLength: 'Maximum length',
  spreadsheetColumnStep: 'Step',
  spreadsheetColumnStepHint: 'Use 1 for whole numbers.',
  spreadsheetColumnChoices: 'Choices',
  spreadsheetColumnChoicesHint: 'One per line, in order.',
  spreadsheetTypeChangeHint: "Values that don't fit the new type are kept and marked as problems.",
  spreadsheetTypeText: 'Text',
  spreadsheetTypeNumber: 'Number',
  spreadsheetTypeBoolean: 'Checkbox',
  spreadsheetTypeDate: 'Date',
  spreadsheetTypeEnum: 'Choice',
  spreadsheetNewColumn: ({ number }) => `Column ${String(number)}`,

  spreadsheetRequired: 'Required',
  spreadsheetInvalidNumber: 'Enter a number',
  spreadsheetWholeNumber: 'Enter a whole number',
  spreadsheetInvalidDate: 'Enter a date, such as 2026-10-17',
  spreadsheetInvalidBoolean: 'Enter yes or no',
  spreadsheetInvalidOption: ({ options }) => `Choose one of: ${options}`,
  spreadsheetTooLong: ({ max }) => `Use ${String(max)} characters or fewer`,
  spreadsheetTooLow: ({ min }) => `Must be ${min} or more`,
  spreadsheetTooHigh: ({ max }) => `Must be ${max} or less`,
  spreadsheetStepMismatch: ({ step }) => `Must be a multiple of ${step}`,

  spreadsheetReadOnlyCell: ({ column }) => `${column} is read-only`,
  spreadsheetCopied: ({ count }) => `Copied ${cells(count)}`,
  spreadsheetCutDone: ({ count }) => `Cut ${cells(count)}`,
  spreadsheetPasted: ({ count, skipped }) =>
    skipped === 0
      ? `Pasted ${cells(count)}`
      : `Pasted ${cells(count)}; ${skipped === 1 ? "1 value didn't" : `${String(skipped)} values didn't`} fit and ${skipped === 1 ? 'was' : 'were'} skipped`,
  spreadsheetCleared: ({ count }) => `Cleared ${cells(count)}`,
  spreadsheetPasteBlocked: 'Press Ctrl+V (⌘V on a Mac) to paste',
  spreadsheetNotSaved: ({ error }) => `Not saved: ${error}`,
  spreadsheetUndone: 'Undone',
  spreadsheetRedone: 'Redone',
  spreadsheetRowsInserted: ({ count }) =>
    count === 1 ? 'Inserted 1 row' : `Inserted ${String(count)} rows`,
  spreadsheetRowsDeleted: ({ count }) =>
    count === 1 ? 'Deleted 1 row' : `Deleted ${String(count)} rows`,
  spreadsheetRowsMoved: ({ count }) =>
    count === 1 ? 'Moved 1 row' : `Moved ${String(count)} rows`,
  spreadsheetNoProblems: 'No problems found',
};

/** The strings Spreadsheet's parts read: the core and table strings, and its own. */
export type SpreadsheetStrings = TableStrings & SpreadsheetMessages;

/** Spreadsheet's defaults over the table's, made once so the merged strings stay memoised. */
const defaults = { ...defaultTableMessages, ...defaultSpreadsheetMessages };

/** Spreadsheet's strings, with the app's overrides from `UIProvider`. */
export function useSpreadsheetMessages(): SpreadsheetStrings {
  return useEntryMessages(defaults);
}
