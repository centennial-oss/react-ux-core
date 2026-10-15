import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react';
import { Fragment, useId, useRef, type ReactNode } from 'react';
import { Button as AriaButton, type Key } from 'react-aria-components';
import { Checkbox } from '../components/Checkbox/Checkbox';
import { IconButton } from '../components/IconButton/IconButton';
import { OverflowMenu } from '../components/Menu/MenuButtons';
import { Skeleton } from '../components/Skeleton/Skeleton';

import { cn } from '../utils/cn';
import { columnLabel } from './columns';
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

/** A semantic table: sortable headers with `aria-sort`, selection, a row link, row actions and expandable detail. */
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
  const hasSelection = selectionMode !== 'none';
  const hasDetail = renderRowDetail !== undefined;
  const hasActions = rowActions !== undefined;
  const leading = Number(hasSelection) + Number(hasDetail);
  const totalColumns = columns.length + leading + Number(hasActions);
  const padding = cellPadding[density];

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
              stickyFirst(index),
            )}
          >
            {column.isSortable ? (
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
            const isSelected = row.getIsSelected();
            const isExpanded = row.getIsExpanded();
            const detailId = `${detailIdPrefix}-${row.id}`;
            const label = getRowLabel(original);
            return (
              <Fragment key={row.id}>
                <tr
                  data-selected={isSelected || undefined}
                  onClick={href === undefined ? undefined : activateRowLink}
                  className={cn(
                    'group/row border-t border-border bg-surface-1',
                    'data-selected:bg-accent-bg hover:bg-surface-2',
                    href !== undefined && 'cursor-pointer',
                  )}
                >
                  {hasSelection && (
                    <td className={cn('w-11 px-3', stickyLeading(0))}>
                      <Checkbox
                        aria-label={messages.selectRow({ row: label })}
                        isSelected={isSelected}
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
                          row.toggleExpanded();
                        }}
                      />
                    </td>
                  )}
                  {columns.map((column, index) => {
                    const content = renderCell(column, original, row.index);
                    const className = cn(
                      padding,
                      'text-fg',
                      alignClasses[column.align ?? 'start'],
                      column.align === 'end' && 'tabular-nums',
                      stickyFirst(index),
                    );
                    return column.isRowHeader ? (
                      <th key={column.id} scope="row" className={cn(className, 'font-normal')}>
                        {href === undefined ? content : <RowLink href={href}>{content}</RowLink>}
                      </th>
                    ) : (
                      <td key={column.id} className={className}>
                        {content}
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
