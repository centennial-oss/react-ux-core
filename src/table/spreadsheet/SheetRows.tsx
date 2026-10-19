// The rendered parts of the virtualised grid: the header rows and the body rows in view, with only the columns in
// view. Rows are memoised on primitive props, so scrolling renders just the rows that come into view, and an edit
// renders just its row. Pointer input is handled once on the grid, which finds cells by their data attributes.

import { ArrowDown, ArrowUp, Check, ChevronDown, ListFilter } from 'lucide-react';
import { memo, useState, type ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { Menu, MenuTrigger } from '../../components/Menu/Menu';
import { cn } from '../../utils/cn';
import type { TableSort } from '../types';
import type { SpreadsheetColumn, SpreadsheetRow } from './types';
import type { ColumnFormat } from './values';

/** A column in view, with its formatters and place. */
export interface VisibleColumn {
  column: SpreadsheetColumn;
  format: ColumnFormat;
  width: number;
  /** Pixels from the first column's start. */
  offset: number;
  align: 'start' | 'center' | 'end';
  /** Read-only here: the column's own setting, or a read-only sheet. */
  isReadOnly: boolean;
}

/** A run of neighbouring columns with the same group. */
export interface GroupSpan {
  label: string;
  start: number;
  end: number;
  /** Which of the group colours it takes. */
  tone: number;
}

const alignClasses = {
  start: 'justify-start text-start',
  center: 'justify-center text-center',
  end: 'justify-end text-end',
} as const;

const groupToneClasses = [
  'border-t-chart-1',
  'border-t-chart-2',
  'border-t-chart-3',
  'border-t-chart-4',
  'border-t-chart-5',
  'border-t-chart-6',
  'border-t-chart-7',
  'border-t-chart-8',
  'border-t-chart-9',
  'border-t-chart-10',
] as const;

/** The id of a body cell, for `aria-activedescendant`. */
export function cellId(idPrefix: string, row: number, col: number): string {
  return `${idPrefix}-r${String(row)}-c${String(col)}`;
}

/** The id of a column header cell. */
export function headerId(idPrefix: string, col: number): string {
  return `${idPrefix}-h${String(col)}`;
}

interface SheetRowProps {
  idPrefix: string;
  viewIndex: number;
  ariaRowIndex: number;
  row: SpreadsheetRow | undefined;
  /** The row's number in the data, formatted. */
  rowLabel: string;
  top: number;
  height: number;
  totalWidth: number;
  rowHeaderWidth: number;
  columns: readonly VisibleColumn[];
  colIndexes: readonly number[];
  /** The selected columns in this row, or -1 when the row isn't in the selection. */
  selLeft: number;
  selRight: number;
  /** The whole row is selected (row header highlight). */
  isWholeRow: boolean;
  /** The active cell's column when it's in this row, otherwise -1. */
  activeCol: number;
  /** The id of the active cell's error text, for its description. */
  activeErrorId: string;
  /** Errors from the app's `validate` for this row, by column id. */
  errors: Readonly<Record<string, string>> | undefined;
  editingCol: number;
  editor: ReactNode;
}

/** One body row: a sticky row header and the cells of the columns in view. */
export const SheetRow = memo(function SheetRow({
  idPrefix,
  viewIndex,
  ariaRowIndex,
  row,
  rowLabel,
  top,
  height,
  totalWidth,
  rowHeaderWidth,
  columns,
  colIndexes,
  selLeft,
  selRight,
  isWholeRow,
  activeCol,
  activeErrorId,
  errors,
  editingCol,
  editor,
}: SheetRowProps) {
  return (
    <div
      role="row"
      aria-rowindex={ariaRowIndex}
      // The row being edited sits above the others, so the editor's error can show over the next row.
      className={cn('absolute start-0 top-0 flex', editingCol >= 0 && 'z-[2]')}
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the row's place and size.
      style={{ transform: `translateY(${String(top)}px)`, height, width: totalWidth }}
    >
      <div
        role="rowheader"
        aria-colindex={1}
        aria-selected={isWholeRow}
        data-row-header={viewIndex}
        className={cn(
          'sticky start-0 z-[2] flex h-full shrink-0 cursor-default items-center justify-center border-e border-b border-border bg-surface-3 px-1 text-xs text-fg-muted tabular-nums select-none',
          selLeft >= 0 && 'bg-accent-bg font-semibold text-accent-fg',
        )}
        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the row header's width.
        style={{ width: rowHeaderWidth }}
      >
        {rowLabel}
      </div>
      {row !== undefined &&
        colIndexes.map((col) => {
          const visible = columns[col];
          if (!visible) {
            return null;
          }
          const { column, format } = visible;
          const value = row[column.id];
          const error = errors?.[column.id] ?? format.check(value, row);
          const isActive = col === activeCol;
          const isSelected = selLeft >= 0 && col >= selLeft && col <= selRight;
          const isEditing = col === editingCol;
          const text = format.display(value);
          return (
            <div
              key={column.id}
              role="gridcell"
              id={cellId(idPrefix, viewIndex, col)}
              aria-colindex={col + 2}
              aria-selected={isSelected}
              aria-readonly={visible.isReadOnly || undefined}
              aria-invalid={error !== undefined || undefined}
              aria-describedby={isActive && error !== undefined ? activeErrorId : undefined}
              title={isEditing ? undefined : error}
              data-row={viewIndex}
              data-col={col}
              className={cn(
                'absolute top-0 flex h-full items-center overflow-hidden border-e border-b border-border px-2 whitespace-nowrap select-none',
                alignClasses[visible.align],
                isSelected && !isActive ? 'bg-accent-bg' : 'bg-surface-2',
                visible.isReadOnly && 'text-fg-muted',
                error !== undefined &&
                  'shadow-[inset_0_0_0_1px_var(--color-danger-solid)] after:absolute after:end-0 after:top-0 after:border-4 after:border-transparent after:border-e-danger-solid after:border-t-danger-solid',
                isEditing && 'z-[3] overflow-visible',
              )}
              // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the cell's place and width.
              style={{ insetInlineStart: rowHeaderWidth + visible.offset, width: visible.width }}
            >
              {isEditing ? (
                editor
              ) : format.type === 'boolean' &&
                (value === true || value === false || value == null) ? (
                <>
                  <span
                    aria-hidden="true"
                    data-toggle=""
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded-[0.25rem] border',
                      value === true
                        ? 'border-accent-solid bg-accent-solid text-accent-on-solid'
                        : 'border-border-strong bg-surface-2',
                      visible.isReadOnly && 'opacity-60',
                    )}
                  >
                    {value === true && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="sr-only">{text}</span>
                </>
              ) : (
                <span className="truncate">{text}</span>
              )}
              {isActive && error !== undefined && !isEditing && (
                <span id={activeErrorId} className="sr-only">
                  {error}
                </span>
              )}
            </div>
          );
        })}
    </div>
  );
});

interface ColumnMenuButtonProps {
  col: number;
  label: string;
  renderItems: (col: number) => ReactNode;
  onAction: (key: string, col: number) => void;
  /** Called when the menu has closed and focus is back on its button (outside the tab order). */
  onClose: () => void;
}

/** A column header's menu button; its items render once it has been opened. */
function ColumnMenuButton({ col, label, renderItems, onAction, onClose }: ColumnMenuButtonProps) {
  const [isOpen, setOpen] = useState(false);
  // The items stay while the menu animates out, so focus can go back to the button.
  const [hasOpened, setHasOpened] = useState(false);
  const [isClosing, setClosing] = useState(false);
  return (
    <MenuTrigger
      isOpen={isOpen}
      onOpenChange={(open) => {
        setOpen(open);
        setClosing(!open);
        if (open) {
          setHasOpened(true);
        }
      }}
    >
      <AriaButton
        excludeFromTabOrder
        aria-label={label}
        data-column-menu=""
        onFocus={() => {
          if (isClosing) {
            setClosing(false);
            onClose();
          }
        }}
        className="relative flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-control text-fg-muted outline-none hit-area data-focus-visible:focus-ring data-hovered:bg-surface-4 data-pressed:bg-surface-4"
      >
        <ChevronDown aria-hidden="true" className="size-3.5" />
      </AriaButton>
      <Menu
        onAction={(key) => {
          onAction(String(key), col);
        }}
      >
        {isOpen || hasOpened ? renderItems(col) : []}
      </Menu>
    </MenuTrigger>
  );
}

interface HeaderRowProps {
  idPrefix: string;
  ariaRowIndex: number;
  height: number;
  totalWidth: number;
  rowHeaderWidth: number;
  columns: readonly VisibleColumn[];
  colIndexes: readonly number[];
  sorting: readonly TableSort[];
  filtered: ReadonlySet<string>;
  /** The selected columns, or -1. */
  selLeft: number;
  selRight: number;
  isAllSelected: boolean;
  selectAllLabel: string;
  columnOptionsLabel: (column: string) => string;
  renderColumnMenu: (col: number) => ReactNode;
  onColumnAction: (key: string, col: number) => void;
  onColumnMenuClose: () => void;
  onSelectAll: () => void;
  canResize: boolean;
}

/** The column headers: sort and filter marks, a menu button, and a resize handle. */
export const HeaderRow = memo(function HeaderRow({
  idPrefix,
  ariaRowIndex,
  height,
  totalWidth,
  rowHeaderWidth,
  columns,
  colIndexes,
  sorting,
  filtered,
  selLeft,
  selRight,
  isAllSelected,
  selectAllLabel,
  columnOptionsLabel,
  renderColumnMenu,
  onColumnAction,
  onColumnMenuClose,
  onSelectAll,
  canResize,
}: HeaderRowProps) {
  return (
    <div
      role="row"
      aria-rowindex={ariaRowIndex}
      className="relative flex"
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the header's size.
      style={{ height, width: totalWidth }}
    >
      <div
        role="columnheader"
        aria-colindex={1}
        className="sticky start-0 z-[2] flex h-full shrink-0 items-center justify-center border-e border-b border-border bg-surface-3"
        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the row header column's width.
        style={{ width: rowHeaderWidth }}
      >
        <AriaButton
          excludeFromTabOrder
          aria-label={selectAllLabel}
          onPress={onSelectAll}
          className={cn(
            'relative size-full outline-none hit-area data-focus-visible:focus-ring data-hovered:bg-surface-4',
            isAllSelected && 'bg-accent-bg',
          )}
        >
          <span
            aria-hidden="true"
            className="absolute end-1 bottom-1 size-0 border-4 border-transparent border-e-border-strong border-b-border-strong"
          />
        </AriaButton>
      </div>
      {colIndexes.map((col) => {
        const visible = columns[col];
        if (!visible) {
          return null;
        }
        const { column } = visible;
        const level = sorting.findIndex((sort) => sort.column === column.id);
        const sort = level >= 0 ? sorting[level] : undefined;
        const isSelected = selLeft >= 0 && col >= selLeft && col <= selRight;
        return (
          <div
            key={column.id}
            role="columnheader"
            id={headerId(idPrefix, col)}
            aria-colindex={col + 2}
            aria-sort={sort === undefined ? undefined : level === 0 ? sort.direction : 'other'}
            data-header-col={col}
            className={cn(
              'absolute top-0 flex h-full cursor-default items-center gap-1 border-e border-b border-border ps-2 pe-1 text-xs font-semibold select-none',
              isSelected ? 'bg-accent-bg text-accent-fg' : 'bg-surface-3 text-fg',
            )}
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the header's place and width.
            style={{ insetInlineStart: rowHeaderWidth + visible.offset, width: visible.width }}
          >
            <span className="min-w-0 flex-1 truncate">{column.label}</span>
            {sort !== undefined && (
              <span aria-hidden="true" className="flex shrink-0 items-center text-fg-muted">
                {sort.direction === 'ascending' ? (
                  <ArrowUp className="size-3.5" />
                ) : (
                  <ArrowDown className="size-3.5" />
                )}
                {sorting.length > 1 && <span className="text-[0.625rem]">{level + 1}</span>}
              </span>
            )}
            {filtered.has(column.id) && (
              <ListFilter aria-hidden="true" className="size-3.5 shrink-0 text-accent-fg" />
            )}
            <ColumnMenuButton
              col={col}
              label={columnOptionsLabel(column.label)}
              renderItems={renderColumnMenu}
              onAction={onColumnAction}
              onClose={onColumnMenuClose}
            />
            {canResize && (
              <span
                aria-hidden="true"
                data-resize-col={col}
                className="absolute -end-1 top-0 z-[1] h-full w-2 cursor-col-resize hover:bg-accent-border"
              />
            )}
          </div>
        );
      })}
    </div>
  );
});

interface GroupRowProps {
  ariaRowIndex: number;
  height: number;
  totalWidth: number;
  rowHeaderWidth: number;
  columns: readonly VisibleColumn[];
  groups: readonly GroupSpan[];
  firstCol: number;
  lastCol: number;
}

/** The group headings over the column headers. */
export const GroupRow = memo(function GroupRow({
  ariaRowIndex,
  height,
  totalWidth,
  rowHeaderWidth,
  columns,
  groups,
  firstCol,
  lastCol,
}: GroupRowProps) {
  return (
    <div
      role="row"
      aria-rowindex={ariaRowIndex}
      className="relative flex"
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the row's size.
      style={{ height, width: totalWidth }}
    >
      <div
        aria-hidden="true"
        className="sticky start-0 z-[2] h-full shrink-0 border-e border-b border-border bg-surface-3"
        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the row header column's width.
        style={{ width: rowHeaderWidth }}
      />
      {groups
        .filter((group) => group.end >= firstCol && group.start <= lastCol)
        .map((group) => {
          const start = columns[group.start];
          const end = columns[group.end];
          if (!start || !end) {
            return null;
          }
          const left = rowHeaderWidth + start.offset;
          const width = end.offset + end.width - start.offset;
          const geometry = { insetInlineStart: left, width };
          if (group.label === '') {
            return (
              <div
                key={`gap-${String(group.start)}`}
                aria-hidden="true"
                className="absolute top-0 h-full border-e border-b border-border bg-surface-3"
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the gap's place and width.
                style={geometry}
              />
            );
          }
          return (
            <div
              key={`group-${String(group.start)}`}
              role="columnheader"
              aria-colindex={group.start + 2}
              aria-colspan={group.end - group.start + 1}
              className={cn(
                'absolute top-0 flex h-full items-center border-t-[3px] border-e border-b border-border bg-surface-3 text-xs font-semibold text-fg',
                groupToneClasses[group.tone % groupToneClasses.length],
              )}
              // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the group's place and width.
              style={geometry}
            >
              <span
                className="sticky truncate px-2"
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: stays clear of the row headers.
                style={{ insetInlineStart: rowHeaderWidth }}
              >
                {group.label}
              </span>
            </div>
          );
        })}
    </div>
  );
});
