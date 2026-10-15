// CSV export of the current page.

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

function escape(text: string): string {
  // Quote fields with separators, quotes or line breaks; neutralise spreadsheet formulas.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
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
  const lines = [
    exported.map((column) => escape(columnLabel(column))).join(','),
    ...rows.map((row) =>
      exported
        .map((column) => escape(cellText(column.csv ? column.csv(row) : column.value?.(row))))
        .join(','),
    ),
  ];
  return `${lines.join('\r\n')}\r\n`;
}

/** Offers `csv` to the user as a file download. */
export function downloadCsv(csv: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
