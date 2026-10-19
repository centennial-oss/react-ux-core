import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react';
import { Fragment, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Button as AriaButton, type Key } from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { Checkbox } from '../components/Checkbox/Checkbox';
import { IconButton } from '../components/IconButton/IconButton';
import { OverflowMenu } from '../components/Menu/MenuButtons';
import { Skeleton } from '../components/Skeleton/Skeleton';
import { SpinnerIcon } from '../components/Spinner/SpinnerIcon';

import { cn } from '../utils/cn';
import { isRightToLeft } from '../utils/direction';
import { columnLabel } from './columns';
import type { TreeRows } from './DataTable';
import type { TableModel } from './model';
import { activateRowLink, alignClasses, renderCell, RowLink } from './shared';
import type { DataTableColumn, TableSort } from './types';
import { useTableMessages } from './messages';

export interface TableViewProps<Row extends object> {
  model: TableModel<Row>;
  /** The visible columns, in order. */
  columns: readonly DataTableColumn<Row>[];
  'aria-label'?: string;
  'aria-labelledby'?: string;
  sort: TableSort | null;
  onSortPress: (columnId: string) => void;
  selectionMode: 'none' | 'single' | 'multiple';
  getRowLabel: (row: Row) => string;
  getRowHref?: (row: Row) => string | undefined;
  rowActions?: (row: Row) => ReactNode;
  onRowAction?: (key: Key, row: Row) => void;
  renderRowDetail?: (row: Row) => ReactNode;
  /** Rows whose detail panel is open. */
  openDetails: ReadonlySet<string>;
  onToggleDetail: (id: string) => void;
  /** Tree rows: indentation and toggles in the tree column. */
  tree?: TreeRows<Row>;
  density: 'compact' | 'regular';
  maxHeight?: string;
  hasStickyFirstColumn: boolean;
  isVirtualized: boolean;
  /** Rows of skeleton cells while the first page loads. */
  loadingRows: number;
  isBusy: boolean;
}

const cellPadding = {
  compact: 'px-3 py-1.5',
  regular: 'px-3 py-3',
} as const;

/** Sticky offsets for the first data column, after the selection and detail-toggle columns (2.75rem each). */
const stickyStart = ['start-0', 'start-11', 'start-22'] as const;

/** How far each tree level indents, in rem (the toggle adds its own width). */
const TREE_INDENT = 1.5;

/** Moves focus between tree rows (the treegrid keys); other keys and keys from controls inside are left alone. */
function onTreeRowKeyDown(
  event: KeyboardEvent<HTMLTableRowElement>,
  options: { canExpand: boolean; isExpanded: boolean; parentId?: string; toggle: () => void },
) {
  if (event.target !== event.currentTarget) {
    return;
  }
  const rows = [
    ...(event.currentTarget.closest('tbody')?.querySelectorAll<HTMLElement>('tr[data-row-id]') ??
      []),
  ];
  const index = rows.indexOf(event.currentTarget);
  let target: HTMLElement | undefined;
  switch (event.key) {
    case 'ArrowDown':
      target = rows[index + 1];
      break;
    case 'ArrowUp':
      target = rows[index - 1];
      break;
    case 'Home':
      target = rows[0];
      break;
    case 'End':
      target = rows.at(-1);
      break;
    case 'ArrowRight':
    case 'ArrowLeft': {
      // Right opens a row (then moves to its first child), Left closes it (then moves to its parent); flipped in
      // right-to-left text.
      const isRtl = isRightToLeft(event.currentTarget);
      const opens = (event.key === 'ArrowRight') !== isRtl;
      if (opens && options.canExpand && !options.isExpanded) {
        options.toggle();
      } else if (opens && options.isExpanded) {
        const next = rows[index + 1];
        target =
          next?.getAttribute('aria-level') ===
          String(Number(event.currentTarget.getAttribute('aria-level')) + 1)
            ? next
            : undefined;
      } else if (!opens && options.isExpanded) {
        options.toggle();
      } else if (!opens && options.parentId !== undefined) {
        target = rows.find((row) => row.dataset.rowId === options.parentId);
      }
      break;
    }
    default:
      return;
  }
  event.preventDefault();
  target?.focus();
}

/**
 * A semantic table: sortable headers with `aria-sort`, selection, a row link, row actions and expandable detail.
 * Tree rows make it a `treegrid`: rows carry their level and expanded state, and arrow keys move between rows and
 * open and close them.
 */
export function TableView<Row extends object>({
  model,
  columns,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  sort,
  onSortPress,
  selectionMode,
  getRowLabel,
  getRowHref,
  rowActions,
  onRowAction,
  renderRowDetail,
  openDetails,
  onToggleDetail,
  tree,
  density,
  maxHeight,
  hasStickyFirstColumn,
  isVirtualized,
  loadingRows,
  isBusy,
}: TableViewProps<Row>) {
  const messages = useTableMessages();
  const detailIdPrefix = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = model.getRowModel().rows;
  // The tree row that takes Tab focus (a roving tab stop); the first row until one is focused.
  const [focusedId, setFocusedId] = useState<string>();
  const tabStopId =
    focusedId !== undefined && rows.some((row) => row.id === focusedId) ? focusedId : rows[0]?.id;
  // Each tree row's position among its siblings as shown (sorted), for `aria-posinset` and `aria-setsize`.
  const positions = new Map<string, number>();
  const setSizes = new Map<string, number>();
  if (tree) {
    for (const row of rows) {
      const parent = row.parentId ?? '';
      const position = (setSizes.get(parent) ?? 0) + 1;
      setSizes.set(parent, position);
      positions.set(row.id, position);
    }
  }
  const hasSelection = selectionMode !== 'none';
  const hasDetail = renderRowDetail !== undefined;
  const hasActions = rowActions !== undefined;
  const leading = Number(hasSelection) + Number(hasDetail);
  const totalColumns = columns.length + leading + Number(hasActions);
  const padding = cellPadding[density];
  const treeColumnIndex = Math.max(
    0,
    columns.findIndex((column) => column.id === tree?.columnId),
  );

  // TanStack Virtual returns functions the React Compiler can't memoise, so it skips this component (as it says).
  // eslint-disable-next-line react-hooks/incompatible-library -- expected; the component re-renders on scroll anyway.
  const virtualizer = useVirtualizer({
    count: isVirtualized ? rows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (density === 'compact' ? 37 : 49),
    overscan: 8,
  });
  const virtualItems = isVirtualized ? virtualizer.getVirtualItems() : [];
  const visibleRows = isVirtualized
    ? virtualItems.flatMap((item) => {
        const row = rows[item.index];
        return row ? [row] : [];
      })
    : rows;
  const paddingTop = isVirtualized ? (virtualItems[0]?.start ?? 0) : 0;
  const paddingBottom = isVirtualized
    ? virtualizer.getTotalSize() - (virtualItems.at(-1)?.end ?? 0)
    : 0;

  // A flexible column takes the leftover width and clamps its text; the others keep their content's width (a
  // percentage-width column would otherwise squeeze them until short values wrap). Without one, the table lays out
  // as usual.
  const flexibleId = columns.find((column) => column.isFlexible)?.id;
  const widthClasses = (column: (typeof columns)[number]) =>
    column.id === flexibleId ? 'w-full max-w-0' : undefined;
  /** The cell's content, held between the column's minimum and maximum widths (cells ignore them themselves). */
  const sized = (column: (typeof columns)[number], content: ReactNode, isHeader = false) => {
    const isFlexible = column.id === flexibleId;
    const minWidth = column.minWidth ?? (isFlexible ? '8rem' : undefined);
    const maxWidth = column.maxWidth;
    const keepsContentWidth = flexibleId !== undefined && !isFlexible && maxWidth === undefined;
    if (minWidth === undefined && maxWidth === undefined && !keepsContentWidth) {
      return content;
    }
    return (
      <div
        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the column's configured bounds.
        style={
          minWidth === undefined && maxWidth === undefined ? undefined : { minWidth, maxWidth }
        }
        className={cn(
          keepsContentWidth ? 'w-max' : 'min-w-0',
          isHeader && isFlexible && 'truncate',
        )}
      >
        {content}
      </div>
    );
  };

  const stickyFirst = (index: number) =>
    hasStickyFirstColumn && index === 0 ? cn('sticky z-[1] bg-inherit', stickyStart[leading]) : '';
  const stickyLeading = (position: number) =>
    hasStickyFirstColumn ? cn('sticky z-[1] bg-inherit', stickyStart[position]) : '';

  const header = (
    <tr className="bg-surface-2">
      {hasSelection && (
        <th scope="col" className={cn('w-11 px-3 py-2', stickyLeading(0))}>
          {selectionMode === 'multiple' && (
            <Checkbox
              aria-label={messages.selectAllRows}
              isSelected={model.getIsAllPageRowsSelected()}
              isIndeterminate={model.getIsSomePageRowsSelected()}
              isDisabled={rows.length === 0}
              onChange={(isSelected) => {
                model.toggleAllPageRowsSelected(isSelected);
              }}
            />
          )}
        </th>
      )}
      {hasDetail && (
        <th scope="col" className={cn('w-11', stickyLeading(Number(hasSelection)))}>
          <span className="sr-only">{messages.details}</span>
        </th>
      )}
      {columns.map((column, index) => {
        const isSorted = sort?.column === column.id;
        const SortIcon = !isSorted
          ? ArrowUpDown
          : sort.direction === 'ascending'
            ? ArrowUp
            : ArrowDown;
        return (
          <th
            key={column.id}
            scope="col"
            aria-sort={isSorted ? sort.direction : column.isSortable ? 'none' : undefined}
            // Column widths come from the column config (dynamic geometry).
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the column's configured width.
            style={column.width === undefined ? undefined : { width: column.width }}
            className={cn(
              'px-3 py-2 text-xs font-semibold whitespace-nowrap text-fg-muted',
              alignClasses[column.align ?? 'start'],
              widthClasses(column),
              stickyFirst(index),
            )}
          >
            {sized(
              column,
              column.isSortable ? (
                <AriaButton
                  onPress={() => {
                    onSortPress(column.id);
                  }}
                  className={cn(
                    '-mx-1 inline-flex cursor-pointer items-center gap-1 rounded-sm px-1 outline-none data-focus-visible:focus-ring data-hovered:text-fg',
                    column.align === 'end' && 'flex-row-reverse',
                  )}
                >
                  {column.header}
                  <SortIcon
                    aria-hidden="true"
                    className={cn('size-3.5 shrink-0', !isSorted && 'opacity-40')}
                  />
                </AriaButton>
              ) : (
                column.header
              ),
              true,
            )}
          </th>
        );
      })}
      {hasActions && (
        <th scope="col" className="w-12">
          <span className="sr-only">{messages.moreActions}</span>
        </th>
      )}
    </tr>
  );

  const skeletonRows = Array.from({ length: loadingRows }, (_, index) => (
    <tr key={`loading-${String(index)}`} className="border-t border-border">
      {Array.from({ length: totalColumns }, (_, cell) => (
        <td key={cell} className={padding}>
          <Skeleton shape="text" />
        </td>
      ))}
    </tr>
  ));

  return (
    <div
      ref={scrollRef}
      // A scrollable region must be focusable so keyboard users can scroll it.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see above.
      tabIndex={0}
      role="region"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the app's maximum height.
      style={maxHeight === undefined ? undefined : { maxHeight }}
      className="relative w-full overflow-auto rounded-card border border-border outline-none focus-visible:focus-ring"
    >
      <table
        role={tree ? 'treegrid' : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-busy={isBusy || undefined}
        className="w-full border-collapse text-sm"
      >
        <thead className="sticky top-0 z-[2] bg-surface-2">{header}</thead>
        <tbody>
          {loadingRows > 0 && skeletonRows}
          {paddingTop > 0 && (
            <tr aria-hidden="true">
              {/* eslint-disable-next-line no-restricted-syntax -- dynamic geometry: virtualised rows above. */}
              <td colSpan={totalColumns} style={{ height: paddingTop }} />
            </tr>
          )}
          {visibleRows.map((row) => {
            const original = row.original;
            const href = getRowHref?.(original);
            // A group is checked when all its children are, and indeterminate when some are.
            const isSelected =
              row.getIsSelected() || (tree !== undefined && row.getIsAllSubRowsSelected());
            const isIndeterminate = tree !== undefined && !isSelected && row.getIsSomeSelected();
            const isExpanded = openDetails.has(row.id);
            const detailId = `${detailIdPrefix}-${row.id}`;
            const label = getRowLabel(original);
            const canExpand = tree?.canExpand(original) ?? false;
            const isTreeExpanded = canExpand && (tree?.isExpanded(row.id) ?? false);
            const childStatus = isTreeExpanded ? tree?.status(original) : undefined;
            const toggleTree = () => {
              tree?.toggle(row.id);
            };
            const treeContent = (content: ReactNode) => (
              <div
                className="flex min-w-0 items-center gap-1"
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the row's depth in the tree.
                style={{ paddingInlineStart: `${String(row.depth * TREE_INDENT)}rem` }}
              >
                {canExpand ? (
                  <IconButton
                    icon={ChevronRight}
                    aria-label={messages.childRows({ row: label })}
                    aria-expanded={isTreeExpanded}
                    variant="ghost"
                    size="sm"
                    className={cn('transition-transform', isTreeExpanded && 'rotate-90')}
                    onPress={toggleTree}
                  />
                ) : (
                  <span aria-hidden="true" className="size-8 shrink-0" />
                )}
                <div className="min-w-0">{content}</div>
              </div>
            );
            return (
              <Fragment key={row.id}>
                <tr
                  data-selected={isSelected || undefined}
                  data-row-id={tree ? row.id : undefined}
                  aria-level={tree ? row.depth + 1 : undefined}
                  aria-setsize={tree ? setSizes.get(row.parentId ?? '') : undefined}
                  aria-posinset={tree ? positions.get(row.id) : undefined}
                  aria-expanded={canExpand ? isTreeExpanded : undefined}
                  tabIndex={tree ? (row.id === tabStopId ? 0 : -1) : undefined}
                  onFocus={
                    tree
                      ? () => {
                          setFocusedId(row.id);
                        }
                      : undefined
                  }
                  onKeyDown={
                    tree
                      ? (event) => {
                          onTreeRowKeyDown(event, {
                            canExpand,
                            isExpanded: isTreeExpanded,
                            parentId: row.parentId,
                            toggle: toggleTree,
                          });
                        }
                      : undefined
                  }
                  onClick={href === undefined ? undefined : activateRowLink}
                  className={cn(
                    'group/row border-t border-border bg-surface-1',
                    'data-selected:bg-accent-bg hover:bg-surface-2',
                    href !== undefined && 'cursor-pointer',
                    tree && 'outline-none focus-visible:focus-ring focus-visible:-outline-offset-2',
                  )}
                >
                  {hasSelection && (
                    <td className={cn('w-11 px-3', stickyLeading(0))}>
                      <Checkbox
                        aria-label={messages.selectRow({ row: label })}
                        isSelected={isSelected}
                        isIndeterminate={isIndeterminate}
                        onChange={(value) => {
                          row.toggleSelected(value);
                        }}
                      />
                    </td>
                  )}
                  {hasDetail && (
                    <td className={cn('w-11 px-1', stickyLeading(Number(hasSelection)))}>
                      <IconButton
                        icon={ChevronRight}
                        aria-label={messages.showRowDetails({ row: label })}
                        aria-expanded={isExpanded}
                        aria-controls={isExpanded ? detailId : undefined}
                        variant="ghost"
                        size="sm"
                        className={cn('transition-transform', isExpanded && 'rotate-90')}
                        onPress={() => {
                          onToggleDetail(row.id);
                        }}
                      />
                    </td>
                  )}
                  {columns.map((column, index) => {
                    const cell = renderCell(column, original, row.index);
                    const content = column.id === tree?.columnId ? treeContent(cell) : cell;
                    const className = cn(
                      padding,
                      'text-fg',
                      alignClasses[column.align ?? 'start'],
                      column.align === 'end' && 'tabular-nums',
                      widthClasses(column),
                      stickyFirst(index),
                    );
                    return column.isRowHeader ? (
                      <th key={column.id} scope="row" className={cn(className, 'font-normal')}>
                        {sized(
                          column,
                          href === undefined ? content : <RowLink href={href}>{content}</RowLink>,
                        )}
                      </th>
                    ) : (
                      <td key={column.id} className={className}>
                        {sized(column, content)}
                      </td>
                    );
                  })}
                  {hasActions && (
                    <td className="w-12 px-1 text-end">
                      <OverflowMenu
                        aria-label={messages.rowActions({ row: label })}
                        size="sm"
                        onAction={(key) => {
                          onRowAction?.(key, original);
                        }}
                      >
                        {rowActions(original)}
                      </OverflowMenu>
                    </td>
                  )}
                </tr>
                {childStatus !== undefined && childStatus !== 'ready' && (
                  <tr aria-level={row.depth + 2} className="border-t border-border bg-surface-1">
                    {/* Empty cells up to the tree column, so the status lines up with the children. */}
                    {Array.from({ length: leading + treeColumnIndex }, (_, cell) => (
                      <td key={cell} />
                    ))}
                    <td colSpan={totalColumns - leading - treeColumnIndex} className={padding}>
                      <div
                        className="flex flex-wrap items-center gap-2 text-fg-muted"
                        // The children's indentation, past the toggle (2rem and a gap).
                        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the children's depth.
                        style={{
                          paddingInlineStart: `${String((row.depth + 1) * TREE_INDENT + 2.25)}rem`,
                        }}
                      >
                        {childStatus === 'loading' ? (
                          <>
                            <SpinnerIcon className="size-4" />
                            {messages.loading}
                          </>
                        ) : (
                          <>
                            <span className="text-danger-fg">{messages.childRowsFailed}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onPress={() => {
                                tree?.retry(row.id);
                              }}
                            >
                              {messages.retry}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {hasDetail && isExpanded && (
                  <tr id={detailId} className="bg-surface-2">
                    <td colSpan={totalColumns} className="px-4 py-3">
                      {renderRowDetail(original)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {paddingBottom > 0 && (
            <tr aria-hidden="true">
              {/* eslint-disable-next-line no-restricted-syntax -- dynamic geometry: virtualised rows below. */}
              <td colSpan={totalColumns} style={{ height: paddingBottom }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export { columnLabel };
