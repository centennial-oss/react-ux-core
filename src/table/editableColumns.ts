// Types and column builders for EditableTable.

import type { ReactNode } from 'react';
import type { DataTableColumn } from './types';

/** What a column's `editor` receives. Spread `aria-label`, `aria-describedby` and `isInvalid` onto the field. */
export interface EditorProps<Row, Value> {
  value: Value;
  /** Sets the cell's value. (A method, so columns of different value types fit one list.) */
  onChange(value: Value): void;
  /** Replaces the whole row, for editors that fill several fields (a product that also sets the unit price). */
  onRowChange(row: Row): void;
  row: Row;
  /** The row's position, from 0. */
  rowIndex: number;
  /**
   * The cell's error. The table already shows it under the cell and links it with `aria-describedby`, so editors
   * usually show only `isInvalid`.
   */
  errorMessage?: string;
  isInvalid: boolean;
  /** The editor's accessible name: the column and the row ("Exposure, Rung 3"). */
  'aria-label': string;
  /** The id of the cell's error, when there is one. */
  'aria-describedby'?: string;
  isDisabled: boolean;
}

/**
 * An EditableTable column: a DataTable column (header, `value`, `cell`, alignment, widths…) plus an editor. Columns
 * without an `editor` are read-only (computed amounts, labels).
 */
export interface EditableColumn<Row, Value = unknown> extends DataTableColumn<Row, Value> {
  /**
   * Renders the editor: a CCUX field (TextField, NumberField, Select, MoneyField, ComboBox…) at size `sm`. See
   * `textEditor`, `numberEditor`, `selectEditor` and `moneyEditor` for ready-made ones. Declared as a method so
   * typed columns fit a list of columns with different value types.
   */
  editor?(props: EditorProps<Row, Value>): ReactNode;
  /** Writes an edited value into a copy of the row. Defaults to setting the property named by `id`. */
  setValue?(row: Row, value: Value): Row;
  /** An empty value (`''`, `null` or `undefined`) is an error on the cell. */
  isRequired?: boolean;
}

/** Errors by row id, then column id. */
export type EditableTableErrors = Readonly<Record<string, Readonly<Record<string, string>>>>;

/** Column options without the parts the helper fills in. */
export type EditableColumnOptions<Row, Value> = Omit<
  EditableColumn<Row, Value>,
  'id' | 'value' | 'setValue'
> & {
  /** Defaults to the field name for `field` columns. */
  id?: string;
};

/**
 * Typed column builders for an EditableTable of `Row`: `field` reads and writes a property, `computed` derives a
 * read-only value (or writes it back with `setValue`).
 *
 * ```ts
 * const col = editableColumnsFor<Rung>();
 * const columns = [col.field('fps', { header: 'Frame rate', editor: numberEditor({ minValue: 1 }) })];
 * ```
 */
export function editableColumnsFor<Row>() {
  return {
    field<K extends keyof Row & string>(
      key: K,
      options: EditableColumnOptions<Row, Row[K]>,
    ): EditableColumn<Row, Row[K]> {
      return {
        ...options,
        id: options.id ?? key,
        value: (row) => row[key],
        setValue: (row, value) => ({ ...row, [key]: value }),
      };
    },
    computed<Value>(
      id: string,
      value: (row: Row) => Value,
      options: Omit<EditableColumnOptions<Row, Value>, 'id'> & {
        setValue?: (row: Row, value: Value) => Row;
      },
    ): EditableColumn<Row, Value> {
      return { ...options, id, value };
    },
  };
}

/** Whether a cell value counts as empty for `isRequired`. */
export function isEmptyValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '') ||
    (typeof value === 'number' && Number.isNaN(value))
  );
}
