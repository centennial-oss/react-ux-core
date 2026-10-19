import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Key } from 'react-aria-components';
import type { ActionBarProps } from '../components/ActionBar/ActionBar';
import { EmptyState } from '../components/EmptyState/EmptyState';
import { ErrorState } from '../components/ErrorState/ErrorState';
import { ProgressBar } from '../components/ProgressBar/ProgressBar';

import { cn } from '../utils/cn';
import { toggleInSet } from '../utils/collections';
import { lazyComponent } from '../utils/lazyComponent';
import { useControllableState } from '../utils/useControllableState';
import { useElementWidth } from '../utils/useElementWidth';
import { useLatest } from '../utils/useLatest';
import { useIsPhone } from '../utils/useMediaQuery';
import { CardList } from './CardList';
import { columnLabel } from './columns';
import { useTableModel } from './model';
import { TablePager } from './TablePager';
import { TableView } from './TableView';
import {
  treeRowIds,
  useRowChildrenLoader,
  type LoadRowChildren,
  type RowChildrenStatus,
} from './tree';
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
  /**
   * Buttons for the selected rows, shown while any are selected in a bar (ActionBar) after the table that sticks to
   * the bottom of the view, with the count and a button that clears the selection (so does Escape in the bar).
   */
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
  /**
   * Tree data: a row's child rows, shown indented under it with an expand toggle in the tree column. Return
   * `undefined` while a row's children aren't known yet (see `loadRowChildren`), and `[]` for a row without any. Row
   * ids must be unique across the whole tree.
   */
  getRowChildren?: (row: Row) => readonly Row[] | undefined;
  /**
   * Whether a row whose children aren't known yet (`getRowChildren` returns `undefined`) has any to show, so it gets
   * an expand toggle. Defaults to true with `loadRowChildren`, false without.
   */
  isRowExpandable?: (row: Row) => boolean;
  /**
   * Loads a row's children the first time it expands, with a loading row meanwhile and Retry if it fails. The table
   * keeps them while it's mounted. Children of a selected row are selected when they arrive.
   */
  loadRowChildren?: LoadRowChildren<Row>;
  /** The tree rows whose children show, controlled. */
  expandedIds?: ReadonlySet<string>;
  defaultExpandedIds?: ReadonlySet<string>;
  onExpandedChange?: (ids: Set<string>) => void;
  /** The column id that holds the tree's indentation and toggles. Defaults to the row header column. */
  treeColumn?: string;
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
export const CARD_WIDTH = 640;
/** Below these widths, columns of priority 2 and 3 hide. */
const PRIORITY_WIDTH = { 2: 768, 3: 1024 } as const;

function nextSort(current: TableSort | null, column: string): TableSort | null {
  if (current?.column !== column) {
    return { column, direction: 'ascending' };
  }
  return current.direction === 'ascending' ? { column, direction: 'descending' } : null;
}

/**
 * The bulk-action bar's code loads when a table with `bulkActions` first renders, long before a first selection shows
 * it, so tables without bulk actions (and charts' table views) don't bundle it. Nothing shows until it arrives.
 */
const ActionBar = lazyComponent<ActionBarProps>(
  () => import('../components/ActionBar/ActionBar').then((module) => module.ActionBar),
  () => null,
);

interface BulkActionBarProps {
  selectedKeys: ReadonlySet<string>;
  bulkActions: (selectedKeys: ReadonlySet<string>) => ReactNode;
  onClearSelection: () => void;
}

/**
 * The bulk actions in an ActionBar. While the bar fades out after the selection empties, it keeps the actions of the
 * last selection, as it keeps its count. Its own component, so holding them re-renders only the bar.
 */
function BulkActionBar({ selectedKeys, bulkActions, onClearSelection }: BulkActionBarProps) {
  const [shownKeys, setShownKeys] = useState(selectedKeys);
  if (selectedKeys.size > 0 && selectedKeys !== shownKeys) {
    setShownKeys(selectedKeys);
  }
  return (
    <ActionBar selectedCount={selectedKeys.size} onClearSelection={onClearSelection}>
      {shownKeys.size > 0 && bulkActions(shownKeys)}
    </ActionBar>
  );
}

/** What the views need to draw tree rows. */
export interface TreeRows<Row> {
  /** The column that holds the indentation and toggles. */
  columnId: string | undefined;
  /** The row has (or may have) children. */
  canExpand: (row: Row) => boolean;
  isExpanded: (id: string) => boolean;
  toggle: (id: string) => void;
  /** An expanded row's children: shown, loading or failed. */
  status: (row: Row) => RowChildrenStatus;
  retry: (id: string) => void;
}

/**
 * A data table: sortable (client or server), paged (client, offset or cursor), selectable with a bulk-action bar
 * (ActionBar), with row actions, row links, expandable detail and tree rows. On phones (or in narrow containers) rows
 * become cards; on tablets low-priority columns hide and the first column stays put while the table scrolls sideways.
 * All state can be controlled, so apps can keep it in the URL.
 *
 * Tree rows (`getRowChildren`, `loadRowChildren`): sorting orders each level on its own, children staying under
 * their parent; client paging pages the top-level rows, each with its open children; selecting a group selects its
 * children, and a group is checked when all its children are (some: indeterminate). Filter with `filterTree`.
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
  getRowChildren,
  isRowExpandable,
  loadRowChildren,
  expandedIds: expandedIdsProp,
  defaultExpandedIds = EMPTY_KEYS,
  onExpandedChange,
  treeColumn,
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
    clientPaging?.onPageIndexChange,
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

  // Tree rows: children from the app, or loaded on demand and kept here.
  const isTree = getRowChildren !== undefined || loadRowChildren !== undefined;
  const [expandedIds, setExpandedIds] = useControllableState<ReadonlySet<string>>(
    expandedIdsProp,
    defaultExpandedIds,
    onExpandedChange as ((ids: ReadonlySet<string>) => void) | undefined,
  );
  const loader = useRowChildrenLoader(loadRowChildren, (id, loaded) => {
    // A selected group's new children join the selection.
    if (selectionMode === 'multiple' && selectedKeys.has(id)) {
      setSelectedKeys(new Set([...selectedKeys, ...treeRowIds(loaded, getRowId, getRowChildren)]));
    }
  });
  const { entries } = loader;
  const childrenOf = useCallback(
    (row: Row): readonly Row[] | undefined => {
      const own = getRowChildren?.(row);
      if (own !== undefined) {
        return own;
      }
      const entry = entries[getRowId(row)];
      return entry?.status === 'ready' ? entry.rows : undefined;
    },
    [getRowChildren, getRowId, entries],
  );
  const canExpand = (row: Row) => {
    const children = childrenOf(row);
    return children === undefined
      ? (isRowExpandable?.(row) ?? loadRowChildren !== undefined)
      : children.length > 0;
  };

  // Detail panels open independently of tree rows.
  const [openDetails, setOpenDetails] = useState<ReadonlySet<string>>(EMPTY_KEYS);
  const toggleDetail = (id: string) => {
    setOpenDetails(toggleInSet(openDetails, id));
  };

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
    getSubRows: isTree ? childrenOf : undefined,
    expandedIds: isTree ? expandedIds : EMPTY_KEYS,
  });

  // Load the children of expanded rows that don't have them yet.
  const rowsById = model.getCoreRowModel().rowsById;
  const missing = loadRowChildren
    ? [...expandedIds].flatMap((id) => {
        const row = rowsById[id]?.original;
        return row !== undefined &&
          entries[id] === undefined &&
          childrenOf(row) === undefined &&
          canExpand(row)
          ? [{ id, row }]
          : [];
      })
    : [];
  const missingSignature = missing.map((request) => request.id).join('\u0000');
  const latestMissing = useLatest(missing);
  const { load } = loader;
  useEffect(() => {
    if (missingSignature !== '') {
      load(latestMissing.current);
    }
  }, [load, latestMissing, missingSignature]);

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

  const treeColumnId = isTree
    ? (
        visibleColumns.find((column) => column.id === (treeColumn ?? rowHeader?.id)) ??
        visibleColumns[0]
      )?.id
    : undefined;
  const tree: TreeRows<Row> | undefined = isTree
    ? {
        columnId: treeColumnId,
        canExpand,
        isExpanded: (id) => expandedIds.has(id),
        toggle: (id) => {
          setExpandedIds(toggleInSet(expandedIds, id));
        },
        status: (row) => {
          if (childrenOf(row) !== undefined) {
            return 'ready';
          }
          return entries[getRowId(row)]?.status === 'error' ? 'error' : 'loading';
        },
        retry: loader.retry,
      }
    : undefined;

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
    openDetails,
    onToggleDetail: toggleDetail,
    tree,
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

  return (
    <div ref={widthRef} className={cn('flex min-w-0 flex-col gap-3', className)}>
      {isRefreshing && (
        <ProgressBar aria-label={messages.updating} isIndeterminate isValueHidden size="sm" />
      )}
      {body}
      {pagination && error === undefined && rows.length > 0 && (
        <TablePager
          pagination={pagination}
          // Pages count top-level rows; open children ride along with their parent.
          pageRowCount={model.getRowModel().rows.filter((row) => row.depth === 0).length}
          totalRowCount={rows.length}
          clientPageIndex={clampedPage}
          onClientPageChange={setPageIndex}
          isCompact={isCards}
          isDisabled={isBusy}
        />
      )}
      {bulkActions && (
        <BulkActionBar
          selectedKeys={selectedKeys}
          bulkActions={bulkActions}
          onClearSelection={() => {
            setSelectedKeys(new Set());
          }}
        />
      )}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
