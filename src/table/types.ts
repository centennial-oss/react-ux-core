// Public types for DataTable, its columns, paging, filters and export.

import type { ReactNode } from 'react';

/** Context a cell renderer receives. */
export interface CellContext<Row, Value> {
  row: Row;
  value: Value;
  /** The row's position in the current page, from 0. */
  rowIndex: number;
}

/**
 * A column. `value` reads the cell's value from a row (for display, client sorting and CSV); `cell` renders it.
 * Build typed columns with `columnsFor<Row>()`.
 */
export interface DataTableColumn<Row, Value = unknown> {
  /** Unique within the table; used for sorting, visibility and filters. */
  id: string;
  header: ReactNode;
  /** Plain-text name for menus, the phone card and CSV. Defaults to `header` when it's a string. */
  label?: string;
  /** Reads the cell's value. Columns without one (actions, decorations) can't sort or export. */
  value?: (row: Row) => Value;
  /**
   * Renders the cell. Defaults to the value as text. Declared as a method so typed columns fit a list of columns
   * with different value types.
   */
  cell?(context: CellContext<Row, Value>): ReactNode;
  /** The column's header sorts the table. Needs `value` (client sorting) or server sorting. */
  isSortable?: boolean;
  /** Orders values for client sorting. Defaults to comparing `value`s (numbers, strings, dates). */
  compare?(a: Value, b: Value): number;
  align?: 'start' | 'center' | 'end';
  /** A CSS width, such as `12rem` or `160px`. */
  width?: string;
  /** The narrowest the column gets, as a CSS length. */
  minWidth?: string;
  /** The widest the column gets, as a CSS length; longer content wraps or clamps within it. */
  maxWidth?: string;
  /**
   * Takes the leftover width, so text in it (such as a clamped TwoLineCell) clamps instead of widening the table, and
   * the other columns keep their content's width. One column per table. At least `8rem` wide unless `minWidth` says
   * otherwise.
   */
  isFlexible?: boolean;
  /**
   * How essential the column is when space runs short: `1` always shows, `2` hides on tablets in narrow containers,
   * `3` hides on tablets. Phones show the card instead. Defaults to 2.
   */
  priority?: 1 | 2 | 3;
  /** The row's header cell (`<th scope="row">`): it holds the row link and titles the phone card. */
  isRowHeader?: boolean;
  /**
   * What the column contributes to the phone card: `title`, `subtitle`, `status`, or `true` for a labelled detail
   * line. Defaults to `title` for the row header and nothing for other columns.
   */
  mobile?: 'title' | 'subtitle' | 'status' | boolean;
  /** Users can hide the column from the column menu. Defaults to true (false for the row header). */
  isHideable?: boolean;
  /** The CSV value. Defaults to `value`. */
  csv?(row: Row): string | number | boolean | null | undefined;
}

export type SortDirection = 'ascending' | 'descending';

/** The current sort: one column and a direction, or `null` for the rows' own order. */
export interface TableSort {
  column: string;
  direction: SortDirection;
}

/** Client paging: the table slices `rows` into pages. */
export interface ClientPagination {
  mode: 'client';
  pageSize: number;
  /** Controlled page index, from 0. */
  pageIndex?: number;
  onPageChange?: (pageIndex: number) => void;
}

/** Offset paging: `rows` is the current page of `total` rows on the server. */
export interface OffsetPagination {
  mode: 'offset';
  /** The current page index, from 0. */
  pageIndex: number;
  pageSize: number;
  total: number;
  onPageChange: (pageIndex: number) => void;
  /** Offers a rows-per-page choice. */
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (pageSize: number) => void;
  /** On phones, a "Load more" button that appends the next page instead of a pager. */
  onLoadMore?: () => void;
}

/** Cursor (keyset) paging: `rows` is the current page; the app moves the cursor. */
export interface CursorPagination {
  mode: 'cursor';
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  /** An approximate total, shown as "about 1,200". */
  approximateTotal?: number;
  /** On phones, a "Load more" button that appends the next page instead of a pager. */
  onLoadMore?: () => void;
}

export type TablePagination = ClientPagination | OffsetPagination | CursorPagination;

/** What `onExport` is asked for. */
export interface ExportRequest {
  format: 'csv';
  /** The current page (`toCsv` builds it) or every row (usually a server endpoint). */
  scope: 'page' | 'all';
}

/** A choice in an enum filter. */
export interface FilterOption {
  id: string;
  label: string;
}

interface FilterBase {
  /** The key in the filter value object. */
  id: string;
  label: string;
}

/** One value from a list. */
export interface EnumFilter extends FilterBase {
  type: 'enum';
  options: readonly FilterOption[];
}

/** Any values from a list. */
export interface MultiEnumFilter extends FilterBase {
  type: 'multiEnum';
  options: readonly FilterOption[];
}

/** A date range (ISO dates). */
export interface DateRangeFilter extends FilterBase {
  type: 'dateRange';
}

/** A number range; either end may be open. */
export interface NumberRangeFilter extends FilterBase {
  type: 'numberRange';
  /** Shown after the numbers, such as "kWh". */
  unit?: string;
}

/** Yes or no. */
export interface BooleanFilter extends FilterBase {
  type: 'boolean';
  trueLabel?: string;
  falseLabel?: string;
}

/** An entity chosen from a search (a ComboBox backed by `loadOptions`). */
export interface AsyncEntityFilter extends FilterBase {
  type: 'asyncEntity';
  loadOptions: (query: string, signal: AbortSignal) => Promise<readonly FilterOption[]>;
  /** The label of an already chosen id, for the active-filter chip (the app may need to look it up). */
  getOptionLabel?: (id: string) => string | undefined;
}

export type FilterConfig =
  | EnumFilter
  | MultiEnumFilter
  | DateRangeFilter
  | NumberRangeFilter
  | BooleanFilter
  | AsyncEntityFilter;

/** A date range filter's value. */
export interface DateRangeFilterValue {
  start: string;
  end: string;
}

/** A number range filter's value; a missing end is open. */
export interface NumberRangeFilterValue {
  min?: number;
  max?: number;
}

/** One filter's value: plain, serialisable data (so it can live in the URL). */
export type FilterValue =
  string | readonly string[] | boolean | DateRangeFilterValue | NumberRangeFilterValue;

/** Every active filter by id. A missing key means the filter isn't applied. */
export type FilterValues = Readonly<Record<string, FilterValue | undefined>>;
