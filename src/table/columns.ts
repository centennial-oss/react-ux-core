// A helper that builds typed columns for a row type.

import type { DataTableColumn } from './types';

/** Column options without the parts the helper fills in. */
export type ColumnOptions<Row, Value> = Omit<DataTableColumn<Row, Value>, 'id' | 'value'> & {
  /** Defaults to the field name for `field` columns. */
  id?: string;
};

/**
 * Typed column builders for `Row`: `field` reads a property, `computed` derives a value, and `display` has no value
 * (actions, decorations).
 *
 * ```ts
 * const col = columnsFor<Customer>();
 * const columns = [col.field('name', { header: 'Name', isRowHeader: true }), col.field('balance', { ... })];
 * ```
 */
export function columnsFor<Row>() {
  return {
    field<K extends keyof Row & string>(
      key: K,
      options: ColumnOptions<Row, Row[K]>,
    ): DataTableColumn<Row, Row[K]> {
      return { ...options, id: options.id ?? key, value: (row) => row[key] };
    },
    computed<Value>(
      id: string,
      value: (row: Row) => Value,
      options: Omit<ColumnOptions<Row, Value>, 'id'>,
    ): DataTableColumn<Row, Value> {
      return { ...options, id, value };
    },
    display(
      id: string,
      options: Omit<ColumnOptions<Row, undefined>, 'id' | 'isSortable' | 'compare' | 'csv'>,
    ): DataTableColumn<Row, undefined> {
      return { ...options, id };
    },
  };
}

/** The plain-text name of a column. */
export function columnLabel(column: DataTableColumn<never>): string {
  return column.label ?? (typeof column.header === 'string' ? column.header : column.id);
}
