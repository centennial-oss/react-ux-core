// Columns for the charts' table views (and CSV), shared so every chart's table reads the same way.

import type { DataTableColumn } from '../table/types';

type Row = Record<string, unknown>;

/** A column header with the values' unit: "Energy (kWh)". */
export function withUnit(header: string, unit: string | undefined): string {
  return unit ? `${header} (${unit})` : header;
}

/** An end-aligned column of `row[id]`, shown with `format` (blank when it isn't a number). */
export function numberColumn(
  id: string,
  header: string,
  format: (value: number) => string,
  options?: Omit<DataTableColumn<Row>, 'id' | 'header'>,
): DataTableColumn<Row> {
  return {
    id,
    header,
    align: 'end',
    value: (row) => row[id],
    cell: ({ value }) => (typeof value === 'number' ? format(value) : ''),
    ...options,
  };
}

/** The row-header column of times (`row.time`), shown with `format` and exported as ISO 8601. */
export function timeColumn(header: string, format: (time: number) => string): DataTableColumn<Row> {
  return {
    id: 'time',
    header,
    isRowHeader: true,
    isSortable: true,
    value: (row) => row.time,
    cell: ({ value }) => format(Number(value)),
    csv: (row) => new Date(Number(row.time)).toISOString(),
  };
}
