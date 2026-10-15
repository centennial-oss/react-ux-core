// The table model on TanStack Table: sorting (client or server), client paging, selection, column visibility and
// row detail expansion. DataTable renders the model itself (semantic table markup, or phone cards).

import {
  columnVisibilityFeature,
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnVisibilityState,
  type RowSelectionState,
  type SortingState,
  type Updater,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import type { DataTableColumn, TableSort } from './types';

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowSelectionFeature,
  columnVisibilityFeature,
  rowExpandingFeature,
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
  canExpand: boolean;
}

export function useTableModel<Row extends object>(options: TableModelOptions<Row>) {
  const { columns, sort, selectedKeys, hiddenColumns, clientPage } = options;
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
  const pagination = useMemo(
    () => clientPage ?? { pageIndex: 0, pageSize: Math.max(options.rows.length, 1) },
    [clientPage, options.rows.length],
  );

  return useTable({
    features,
    columns: definitions,
    data: options.rows,
    getRowId: (row: Row) => options.getRowId(row),
    manualSorting: options.isServerSorted,
    manualPagination: clientPage === undefined,
    autoResetPageIndex: false,
    enableMultiSort: false,
    enableSortingRemoval: true,
    enableRowSelection: options.selectionMode !== 'none',
    enableMultiRowSelection: options.selectionMode === 'multiple',
    getRowCanExpand: () => options.canExpand,
    state: { sorting, rowSelection, columnVisibility, pagination },
    onSortingChange: (updater: Updater<SortingState>) => {
      const [next] = resolve(updater, sorting);
      options.onSortChange(
        next ? { column: next.id, direction: next.desc ? 'descending' : 'ascending' } : null,
      );
    },
    onRowSelectionChange: (updater: Updater<RowSelectionState>) => {
      const next = resolve(updater, rowSelection);
      options.onSelectionChange(new Set(Object.keys(next).filter((key) => next[key] === true)));
    },
  });
}

export type TableModel<Row extends object> = ReturnType<typeof useTableModel<Row>>;
