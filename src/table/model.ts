// The table model on TanStack Table: sorting (client or server), client paging, selection, column visibility and
// tree rows. DataTable renders the model itself (semantic table markup, or phone cards).

import {
  columnVisibilityFeature,
  createColumnHelper,
  createExpandedRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnVisibilityState,
  type ExpandedState,
  type RowSelectionState,
  type SortingState,
  type Updater,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import { normalizeTreeSelection } from './tree';
import type { DataTableColumn, TableSort } from './types';

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowSelectionFeature,
  columnVisibilityFeature,
  rowExpandingFeature,
  expandedRowModel: createExpandedRowModel(),
});

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Compares two cell values for sorting: numbers, dates, booleans and text (natural order); empty values last. */
export function compareValues(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }
  return collator.compare(String(a), String(b));
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

function resolve<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === 'function' ? (updater as (old: T) => T)(previous) : updater;
}

export interface TableModelOptions<Row extends object> {
  rows: readonly Row[];
  columns: readonly DataTableColumn<Row>[];
  getRowId: (row: Row) => string;
  sort: TableSort | null;
  onSortChange: (sort: TableSort | null) => void;
  isServerSorted: boolean;
  /** Client paging: the page to show; `undefined` shows every row (the rows are already a page). */
  clientPage?: { pageIndex: number; pageSize: number };
  selectionMode: 'none' | 'single' | 'multiple';
  selectedKeys: ReadonlySet<string>;
  onSelectionChange: (keys: Set<string>) => void;
  hiddenColumns: ReadonlySet<string>;
  /** Tree data: a row's children (loaded ones only). */
  getSubRows?: (row: Row) => readonly Row[] | undefined;
  /** Tree rows whose children show. */
  expandedIds: ReadonlySet<string>;
}

export function useTableModel<Row extends object>(options: TableModelOptions<Row>) {
  const { columns, sort, selectedKeys, hiddenColumns, clientPage, getSubRows, expandedIds } =
    options;
  const definitions = useMemo(() => {
    const helper = createColumnHelper<typeof features, Row>();
    return columns.map((column) => {
      const read = column.value;
      if (!read) {
        return helper.display({ id: column.id, enableSorting: false });
      }
      const compare = (a: unknown, b: unknown) =>
        column.compare ? column.compare(a, b) : compareValues(a, b);
      return helper.accessor((row: Row) => read(row), {
        id: column.id,
        enableSorting: column.isSortable === true,
        // Empty values sort last in both directions; the comparator only sees values.
        sortUndefined: 'last',
        sortFn: (rowA, rowB, columnId) => {
          const a: unknown = rowA.getValue(columnId);
          const b: unknown = rowB.getValue(columnId);
          if (isEmpty(a) || isEmpty(b)) {
            return Number(isEmpty(a)) - Number(isEmpty(b));
          }
          return compare(a, b);
        },
      });
    });
  }, [columns]);

  const sorting: SortingState = useMemo(
    () => (sort ? [{ id: sort.column, desc: sort.direction === 'descending' }] : []),
    [sort],
  );
  const rowSelection: RowSelectionState = useMemo(
    () => Object.fromEntries([...selectedKeys].map((key) => [key, true])),
    [selectedKeys],
  );
  const columnVisibility: ColumnVisibilityState = useMemo(
    () => Object.fromEntries([...hiddenColumns].map((id) => [id, false])),
    [hiddenColumns],
  );
  const expanded: ExpandedState = useMemo(
    () => Object.fromEntries([...expandedIds].map((key) => [key, true])),
    [expandedIds],
  );
  // TanStack rebuilds rows when `data` changes, so newly loaded children need a new array.
  const data = useMemo(() => [...options.rows], [options.rows, getSubRows]);
  const pagination = useMemo(
    () => clientPage ?? { pageIndex: 0, pageSize: Math.max(options.rows.length, 1) },
    [clientPage, options.rows.length],
  );

  const isTree = getSubRows !== undefined;
  const table = useTable({
    features,
    columns: definitions,
    data,
    getRowId: (row: Row) => options.getRowId(row),
    getSubRows,
    // Pages hold top-level rows, each with its expanded children.
    paginateExpandedRows: false,
    autoResetExpanded: false,
    manualSorting: options.isServerSorted,
    manualPagination: clientPage === undefined,
    autoResetPageIndex: false,
    enableMultiSort: false,
    enableSortingRemoval: true,
    enableRowSelection: options.selectionMode !== 'none',
    enableMultiRowSelection: options.selectionMode === 'multiple',
    // Selecting a group selects its children (multiple selection only).
    enableSubRowSelection: options.selectionMode === 'multiple',
    state: { sorting, rowSelection, columnVisibility, pagination, expanded },
    onSortingChange: (updater: Updater<SortingState>) => {
      const [next] = resolve(updater, sorting);
      options.onSortChange(
        next ? { column: next.id, direction: next.desc ? 'descending' : 'ascending' } : null,
      );
    },
    onRowSelectionChange: (updater: Updater<RowSelectionState>) => {
      const next = resolve(updater, rowSelection);
      const keys = new Set(Object.keys(next).filter((key) => next[key] === true));
      options.onSelectionChange(
        isTree && options.selectionMode === 'multiple'
          ? new Set(normalizeTreeSelection(keys, table.getCoreRowModel().rows))
          : keys,
      );
    },
  });
  return table;
}

export type TableModel<Row extends object> = ReturnType<typeof useTableModel<Row>>;
