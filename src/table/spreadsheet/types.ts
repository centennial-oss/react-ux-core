// Public types for Spreadsheet.

import type { EditableTableErrors } from '../editableColumns';

/** A cell's value: text, a number, a checkbox, a date as ISO text (`2026-10-17`), an option id, or empty (`null`). */
export type SpreadsheetValue = string | number | boolean | null;

/**
 * A row: its cell values by column id. It may hold other values the app needs (such as its id) under keys that
 * aren't columns; the sheet keeps them as they are.
 */
export type SpreadsheetRow = Readonly<Record<string, SpreadsheetValue | undefined>>;

/** What a column holds. Typed, pasted and filled values are parsed and checked against it. */
export type SpreadsheetColumnType = 'text' | 'number' | 'boolean' | 'date' | 'enum';

/**
 * What users can change: `all` the columns (add, remove, rename, retype, reorder) and the data, `data` (the default)
 * the values and rows only, or `none` (read-only). Sorting, filtering, searching, hiding and resizing columns, and
 * copying work in every scope; they change the view, not the data.
 */
export type SpreadsheetEditScope = 'all' | 'data' | 'none';

/**
 * A column of a Spreadsheet: plain data, so the sheet can create and change columns when `editScope` is `all`. The
 * options below apply to the types they name.
 */
export interface SpreadsheetColumn {
  /** Unique within the sheet; the key of the column's values in each row. */
  id: string;
  /** The header text. */
  label: string;
  /** What the column holds. Defaults to `text`. */
  type?: SpreadsheetColumnType;
  /** A heading over this column and its neighbours with the same group (consecutive columns are joined). */
  group?: string;
  /** A CSS width in `px`, `rem` or `em`, such as `160px` or `10rem`. Defaults by type. Users can resize. */
  width?: string;
  /** Defaults to `end` for numbers and dates, `center` for checkboxes and `start` otherwise. */
  align?: 'start' | 'center' | 'end';
  /** An empty value is an error on the cell. */
  isRequired?: boolean;
  /** Values can't be changed in the sheet (computed or system columns). */
  isReadOnly?: boolean;
  /** `text`: the longest value, in characters. */
  maxLength?: number;
  /** `number`: the smallest value allowed. */
  minValue?: number;
  /** `number`: the largest value allowed. */
  maxValue?: number;
  /** `number`: values must be multiples of `step` (from `minValue`, or 0); `1` allows whole numbers only. */
  step?: number;
  /** `number`: how values show, such as `{ style: 'currency', currency: 'USD' }`. Editing uses plain numbers. */
  formatOptions?: Intl.NumberFormatOptions;
  /** `enum`: the choices, in order. Cells hold the option's `id`. */
  options?: readonly { id: string; label: string }[];
  /**
   * More checks on a value that already fits the type (a pattern, a lookup). Returns the error message, if any.
   * Declared as a method so columns stay plain objects.
   */
  validate?(value: SpreadsheetValue, row: SpreadsheetRow): string | undefined;
}

/** Errors by row id, then column id, from the sheet's `validate` (the same shape as EditableTable's). */
export type SpreadsheetErrors = EditableTableErrors;
