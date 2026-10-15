import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Key } from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { EmptyState } from '../components/EmptyState/EmptyState';
import { ErrorState } from '../components/ErrorState/ErrorState';
import { ProgressBar } from '../components/ProgressBar/ProgressBar';

import { cn } from '../utils/cn';
import { useControllableState } from '../utils/useControllableState';
import { useElementWidth } from '../utils/useElementWidth';
import { useIsPhone } from '../utils/useMediaQuery';
import { CardList } from './CardList';
import { columnLabel } from './columns';
import { useTableModel } from './model';
import { TablePager } from './TablePager';
import { TableView } from './TableView';
import type { DataTableColumn, TablePagination, TableSort } from './types';
import { useTableMessages } from './messages';

const EMPTY_KEYS: ReadonlySet<string> = new Set();

export interface DataTableProps<Row extends object> {
  rows: readonly Row[];
  columns: readonly DataTableColumn<Row>[];
  /** A stable id for each row (selection and keys survive sorting and paging). */
  getRowId: (row: Row) => string;
  /** Names the table. Give this or `aria-labelledby`. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** A short name for a row in control labels ("Select Acme"). Defaults to its row header's value. */
  getRowLabel?: (row: Row) => string;
  /** The sort, controlled. Apps that keep it in the URL control it. */
  sort?: TableSort | null;
  defaultSort?: TableSort | null;
  onSortChange?: (sort: TableSort | null) => void;
  /** `server`: rows arrive sorted (send the sort with the request). Defaults to `client`. */
  sortMode?: 'client' | 'server';
  pagination?: TablePagination;
  /** Defaults to `none`. */
  selectionMode?: 'none' | 'single' | 'multiple';
  selectedKeys?: ReadonlySet<string>;
  defaultSelectedKeys?: ReadonlySet<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  /** Buttons for the selected rows, shown in a bar above the table while any are selected. */
  bulkActions?: (selectedKeys: ReadonlySet<string>) => ReactNode;
  /** Menu items (`MenuItem`) for a row's actions menu. */
  rowActions?: (row: Row) => ReactNode;
  onRowAction?: (key: Key, row: Row) => void;
  /**
   * Where a row leads. The row header cell gets a real link (for keyboard and screen readers) and a click anywhere
   * on the row follows it.
   */
  getRowHref?: (row: Row) => string | undefined;
  /** Expandable detail under a row. */
  renderRowDetail?: (row: Row) => ReactNode;
  /** Column ids to hide (the TableToolbar's column menu changes them). */
  hiddenColumns?: ReadonlySet<string>;
  /** Defaults to `regular`. */
  density?: 'compact' | 'regular';
  /** Limits the table's height so it scrolls inside with a sticky header, such as `24rem` or `60vh`. */
  maxHeight?: string;
  /** Keeps the first column visible while the table scrolls sideways. Defaults to true. */
  hasStickyFirstColumn?: boolean;
  /** The first page is loading: skeleton rows. */
  isLoading?: boolean;
  /** New rows are loading: the current rows stay, with an "Updating" indicator. */
  isRefreshing?: boolean;
  /** Loading failed: shows an error state (with Retry when `onRetry` is given). */
  error?: ReactNode;
  onRetry?: () => void;
  /** Shown when there are no rows. Defaults to "No matching rows". */
  emptyState?: ReactNode;
  /** Renders only the rows in view (long client-side lists). Needs `maxHeight`. */
  isVirtualized?: boolean;
  className?: string;
}

/** Below this width (of the table itself) rows become cards. */
const CARD_WIDTH = 640;
/** Below these widths, columns of priority 2 and 3 hide. */
const PRIORITY_WIDTH = { 2: 768, 3: 1024 } as const;

function nextSort(current: TableSort | null, column: string): TableSort | null {
  if (current?.column !== column) {
    return { column, direction: 'ascending' };
  }
  return current.direction === 'ascending' ? { column, direction: 'descending' } : null;
}

/**
 * A data table: sortable (client or server), paged (client, offset or cursor), selectable with a bulk-action bar,
 * with row actions, row links and expandable detail. On phones (or in narrow containers) rows become cards; on
 * tablets low-priority columns hide and the first column stays put while the table scrolls sideways. All state can
 * be controlled, so apps can keep it in the URL.
 */
export function DataTable<Row extends object>({
  rows,
  columns,
  getRowId,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  getRowLabel: getRowLabelProp,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  sortMode = 'client',
  pagination,
  selectionMode = 'none',
  selectedKeys: selectedKeysProp,
  defaultSelectedKeys = EMPTY_KEYS,
  onSelectionChange,
  bulkActions,
  rowActions,
  onRowAction,
  getRowHref,
  renderRowDetail,
  hiddenColumns = EMPTY_KEYS,
  density = 'regular',
  maxHeight,
  hasStickyFirstColumn = true,
  isLoading = false,
  isRefreshing = false,
  error,
  onRetry,
  emptyState,
  isVirtualized = false,
  className,
}: DataTableProps<Row>) {
  const messages = useTableMessages();
  const isPhone = useIsPhone();
  const [widthRef, measuredWidth] = useElementWidth();
  const width = measuredWidth ?? (isPhone ? 360 : 1280);

  const [sort, setSort] = useControllableState<TableSort | null>(
    sortProp,
    defaultSort,
    onSortChange,
  );
  const [selectedKeys, setSelectedKeys] = useControllableState<ReadonlySet<string>>(
    selectedKeysProp,
    defaultSelectedKeys,
    onSelectionChange as ((keys: ReadonlySet<string>) => void) | undefined,
  );
  const clientPaging = pagination?.mode === 'client' ? pagination : undefined;
  const [pageIndex, setPageIndex] = useControllableState(
    clientPaging?.pageIndex,
    0,
    clientPaging?.onPageChange,
  );
  const pageCount = clientPaging ? Math.max(1, Math.ceil(rows.length / clientPaging.pageSize)) : 1;
  const clampedPage = Math.min(pageIndex, pageCount - 1);
  const clientPage = useMemo(
    () => (clientPaging ? { pageIndex: clampedPage, pageSize: clientPaging.pageSize } : undefined),
    [clientPaging, clampedPage],
  );

  const rowHeader = columns.find((column) => column.isRowHeader);
  const getRowLabel = (row: Row) =>
    getRowLabelProp?.(row) ??
    String((rowHeader?.value?.(row) as string | number | undefined) ?? getRowId(row));

  const model = useTableModel({
    rows,
    columns,
    getRowId,
    sort,
    onSortChange: setSort,
    isServerSorted: sortMode === 'server',
    clientPage,
    selectionMode,
    selectedKeys,
    onSelectionChange: (keys) => {
      setSelectedKeys(keys);
    },
    hiddenColumns,
    canExpand: renderRowDetail !== undefined,
  });

  const isCards = width < CARD_WIDTH;
  const visibleColumns = columns.filter((column) => {
    if (hiddenColumns.has(column.id)) {
      return false;
    }
    // Cards choose their content by each column's `mobile` role; priorities apply to the table only.
    const priority = column.priority ?? 2;
    return (
      isCards || column.isRowHeader === true || priority === 1 || width >= PRIORITY_WIDTH[priority]
    );
  });

  // Announce sort changes and loaded results.
  const [announcement, setAnnouncement] = useState('');
  const announceSort = (next: TableSort | null) => {
    const column = next ? columns.find((candidate) => candidate.id === next.column) : undefined;
    setAnnouncement(
      next && column
        ? messages.sortedBy({
            column: columnLabel(column),
            direction: next.direction,
          })
        : messages.notSorted,
    );
  };
  const wasBusy = useRef(isLoading || isRefreshing);
  useEffect(() => {
    const isBusy = isLoading || isRefreshing;
    if (wasBusy.current && !isBusy && error === undefined) {
      const total = pagination?.mode === 'offset' ? pagination.total : rows.length;
      setAnnouncement(messages.rowCount({ count: total }));
    }
    wasBusy.current = isBusy;
  }, [isLoading, isRefreshing, error, rows.length, pagination, messages]);

  const isBusy = isLoading || isRefreshing;
  const loadingRows = isLoading && rows.length === 0 ? (isCards ? 3 : 5) : 0;
  const viewProps = {
    model,
    columns: visibleColumns,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    selectionMode,
    getRowLabel,
    getRowHref,
    rowActions,
    onRowAction,
    renderRowDetail,
    loadingRows,
    isBusy,
  };

  let body: ReactNode;
  if (error !== undefined && error !== null && error !== false) {
    body = (
      <ErrorState
        title={messages.loadFailed}
        description={error}
        onRetry={onRetry}
        className="rounded-card border border-border"
      />
    );
  } else if (!isLoading && rows.length === 0) {
    body = emptyState ?? (
      <EmptyState title={messages.noMatchingRows} className="rounded-card border border-border" />
    );
  } else if (isCards) {
    body = <CardList {...viewProps} />;
  } else {
    body = (
      <TableView
        {...viewProps}
        sort={sort}
        onSortPress={(columnId) => {
          const next = nextSort(sort, columnId);
          setSort(next);
          announceSort(next);
        }}
        density={density}
        maxHeight={maxHeight}
        hasStickyFirstColumn={hasStickyFirstColumn}
        isVirtualized={isVirtualized && maxHeight !== undefined}
      />
    );
  }

  const selectedCount = selectedKeys.size;
  return (
    <div ref={widthRef} className={cn('flex min-w-0 flex-col gap-3', className)}>
      {bulkActions && selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-card border border-accent-border bg-accent-bg px-3 py-2 text-sm">
          <span className="font-medium text-fg">
            {messages.selectedCount({ count: selectedCount })}
          </span>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {bulkActions(selectedKeys)}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              setSelectedKeys(new Set());
            }}
          >
            {messages.clearSelection}
          </Button>
        </div>
      )}
      {isRefreshing && (
        <ProgressBar aria-label={messages.updating} isIndeterminate isValueHidden size="sm" />
      )}
      {body}
      {pagination && error === undefined && rows.length > 0 && (
        <TablePager
          pagination={pagination}
          pageRowCount={model.getRowModel().rows.length}
          totalRowCount={rows.length}
          clientPageIndex={clampedPage}
          onClientPageChange={setPageIndex}
          isCompact={isCards}
          isDisabled={isBusy}
        />
      )}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
