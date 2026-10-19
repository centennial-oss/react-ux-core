// CSV export of the current page.

import { saveBlob, withExtension } from '../utils/download';
import { columnLabel } from './columns';
import type { DataTableColumn } from './types';

function cellText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

/** Quotes a CSV field when needed and neutralises spreadsheet formulas. */
export function escapeCsvField(text: string): string {
  // Quote fields with separators, quotes or line breaks; neutralise spreadsheet formulas.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** RFC 4180 lines for rows of field text (the header row first), each field escaped, ending with a line break. */
export function csvLines(rows: readonly (readonly string[])[]): string {
  return `${rows.map((fields) => fields.map(escapeCsvField).join(',')).join('\r\n')}\r\n`;
}

/**
 * RFC 4180 CSV for `rows` (usually the current page): a header row of column labels, then each row's `csv` (or
 * `value`) per column. Columns without a value are left out. Values that a spreadsheet would run as formulas are
 * prefixed with an apostrophe.
 */
export function toCsv<Row>(rows: readonly Row[], columns: readonly DataTableColumn<Row>[]): string {
  const exported = columns.filter(
    (column) => column.csv !== undefined || column.value !== undefined,
  );
  return csvLines([
    exported.map((column) => columnLabel(column)),
    ...rows.map((row) =>
      exported.map((column) => cellText(column.csv ? column.csv(row) : column.value?.(row))),
    ),
  ]);
}

/** Offers `csv` to the user as a file download. */
export function downloadCsv(csv: string, fileName: string) {
  saveBlob(csv, withExtension(fileName, '.csv'), 'text/csv;charset=utf-8');
}
