// CSV export of a Spreadsheet's data.

import { csvLines } from '../csv';
import type { SpreadsheetColumn, SpreadsheetRow, SpreadsheetValue } from './types';

function csvText(column: SpreadsheetColumn, value: SpreadsheetValue | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (column.type === 'boolean' && typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (column.type === 'enum' && typeof value === 'string') {
    return column.options?.find((option) => option.id === value)?.label ?? value;
  }
  return String(value);
}

/**
 * RFC 4180 CSV of `rows`: a header row of column labels, then each row's values (numbers as plain numbers, dates as
 * ISO dates, choices as their labels, checkboxes as TRUE or FALSE). Pass the columns to export, such as the visible
 * ones. Values that a spreadsheet would run as formulas are prefixed with an apostrophe. Use with `downloadCsv`.
 */
export function spreadsheetToCsv(
  rows: readonly SpreadsheetRow[],
  columns: readonly SpreadsheetColumn[],
): string {
  return csvLines([
    columns.map((column) => column.label),
    ...rows.map((row) => columns.map((column) => csvText(column, row[column.id]))),
  ]);
}
