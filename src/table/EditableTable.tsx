// EditableTable: a small table of rows edited in place (encoder ladders, price tiers, routing weights, invoice lines).
// Wide containers get an ARIA grid: one tab stop, arrow keys between cells, Enter, F2 or a double-click to edit, Escape
// to cancel, and Tab to the next cell while editing. Narrow containers (phones) get an editable card per row. Errors
// show on the cell (linked with aria-describedby) and in a summary above the table. A full spreadsheet is out of scope.

import { AlertCircle, ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { Button as AriaButton, useLocale, type Key } from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { IconButton } from '../components/IconButton/IconButton';
import { MenuItem } from '../components/Menu/Menu';
import { OverflowMenu } from '../components/Menu/MenuButtons';
import { cn } from '../utils/cn';
import { mergeRefs } from '../utils/mergeRefs';
import { useElementWidth } from '../utils/useElementWidth';
import { columnLabel } from './columns';
import { isEmptyValue, type EditableColumn, type EditableTableErrors } from './editableColumns';
import { useTableMessages } from './messages';
import { alignClasses, renderCell } from './shared';

export interface EditableTableProps<Row extends object> {
  rows: readonly Row[];
  columns: readonly EditableColumn<Row>[];
  getRowId: (row: Row) => string;
  /** Called with the new rows after every edit, addition, removal and move. */
  onChange: (rows: Row[]) => void;
  /** Validation across rows, such as "must be higher than the previous rung". Returns errors by row id and column id. */
  validate?: (rows: readonly Row[]) => EditableTableErrors;
  /** Makes a new row for the add-row button; without it, rows can't be added. */
  newRow?: () => Row;
  /** Copies a row (with a new id) for the Duplicate action; without it, rows can't be duplicated. */
  duplicateRow?: (row: Row) => Row;
  /** Rows move up and down from the row's actions. */
  isReorderable?: boolean;
  /** Rows can be removed from the row's actions. Defaults to true. */
  allowsRemovingRows?: boolean;
  /** The add-row button turns off at this many rows. */
  maxRows?: number;
  /** Removing stops at this many rows. Defaults to 0. */
  minRows?: number;
  /**
   * `cell` (the default) shows values and switches a cell to its editor on Enter, F2 or a double-click; `always`
   * shows every editor (a click edits straight away). The keyboard model is the same in both.
   */
  editMode?: 'cell' | 'always';
  /** A row's name for editors, actions and errors ("Rung 3"). Defaults to "Row N". */
  getRowLabel?: (row: Row, index: number) => string;
  /** The add-row button's text. Defaults to the `editableAddRow` message. */
  addRowLabel?: string;
  /** The container width, in pixels, from which rows show as a grid instead of cards. Defaults to 640. */
  minGridWidth?: number;
  isDisabled?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** The column id of the row actions cell. */
const ACTIONS = '__actions';
const FOCUSABLE = 'input, select, textarea, button, a[href], [tabindex]';

interface CellRef {
  rowId: string;
  colId: string;
}

interface Pending extends CellRef {
  isEditing: boolean;
}

/** Whether focus is in an open overlay (a menu, list box or dialog), which keeps it until it closes. */
function isInOverlay(): boolean {
  return document.activeElement?.closest('[data-trigger], [role="dialog"]') != null;
}

/** Writes a value into a copy of the row. */
function writeValue<Row extends object>(
  column: EditableColumn<Row>,
  row: Row,
  value: unknown,
): Row {
  return column.setValue ? column.setValue(row, value) : { ...row, [column.id]: value };
}

interface CellEditorProps<Row extends object> {
  column: EditableColumn<Row>;
  row: Row;
  rowId: string;
  rowIndex: number;
  label: string;
  errorMessage: string | undefined;
  errorId: string | undefined;
  isDisabled: boolean;
  onReplace: (rowId: string, update: (row: Row) => Row) => void;
}

/** A column's editor for one cell, wired to the cell's value, name and error. */
function CellEditor<Row extends object>({
  column,
  row,
  rowId,
  rowIndex,
  label,
  errorMessage,
  errorId,
  isDisabled,
  onReplace,
}: CellEditorProps<Row>) {
  return (
    column.editor?.({
      value: column.value?.(row),
      onChange: (value) => {
        onReplace(rowId, (current) => writeValue(column, current, value));
      },
      onRowChange: (next) => {
        onReplace(rowId, () => next);
      },
      row,
      rowIndex,
      errorMessage,
      isInvalid: errorMessage !== undefined,
      'aria-label': label,
      'aria-describedby': errorId,
      isDisabled,
    }) ?? null
  );
}

/**
 * A table edited in place, with validation across rows, added, duplicated, removed and reordered rows, and a card per
 * row on phones. Wide containers use the ARIA grid pattern: arrow keys move between cells, Home and End to the ends
 * of a row (with Ctrl, of the table), Enter, F2 or a double-click edits, Enter or F2 keeps the edit, Escape cancels
 * it, and Tab moves to the next editable cell while editing.
 */
export function EditableTable<Row extends object>({
  rows,
  columns,
  getRowId,
  onChange,
  validate,
  newRow,
  duplicateRow,
  isReorderable = false,
  allowsRemovingRows = true,
  maxRows,
  minRows = 0,
  editMode = 'cell',
  getRowLabel,
  addRowLabel,
  minGridWidth = 640,
  isDisabled = false,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
  ref,
}: EditableTableProps<Row>) {
  const messages = useTableMessages();
  const { direction } = useLocale();
  const idPrefix = useId();
  const instructionsId = useId();
  const [widthRef, width] = useElementWidth();
  const isGrid = (width ?? 0) >= minGridWidth;
  const gridRef = useRef<HTMLTableElement>(null);
  const cardsRef = useRef<HTMLUListElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState<CellRef | null>(null);
  const [editing, setEditing] = useState<CellRef | null>(null);
  const [announcement, setAnnouncement] = useState('');
  /** Where focus goes after the next render (a new row, a moved row, the next cell on Tab). */
  const pendingFocus = useRef<Pending | null>(null);
  /** Where focus goes in the card layout after the next render: a selector inside the row's card. */
  const pendingCardFocus = useRef<{ rowId: string; selector: string } | null>(null);
  /** The rows when the current edit began, for Escape. */
  const snapshot = useRef<readonly Row[] | null>(null);
  /** The newest rows, including changes made earlier in the same event (an editor may change a row twice). */
  const latestRows = useRef(rows);
  useLayoutEffect(() => {
    latestRows.current = rows;
  }, [rows]);

  const rowIds = rows.map(getRowId);
  const hasActions =
    !isDisabled && (allowsRemovingRows || isReorderable || duplicateRow !== undefined);
  const navColumns = [...columns.map((column) => column.id), ...(hasActions ? [ACTIONS] : [])];
  const labelOf = (row: Row, index: number) =>
    getRowLabel?.(row, index) ?? messages.editableRow({ index: index + 1 });
  const isEditable = (column: EditableColumn<Row> | undefined) =>
    !isDisabled && column?.editor !== undefined;
  const editableIds = columns.filter((column) => isEditable(column)).map((column) => column.id);
  const atMax = maxRows !== undefined && rows.length >= maxRows;
  const canRemove = allowsRemovingRows && rows.length > minRows;

  const errors = useMemo(() => {
    const result = new Map<string, Map<string, string>>();
    const set = (rowId: string, columnId: string, message: string) => {
      const row = result.get(rowId) ?? new Map<string, string>();
      row.set(columnId, message);
      result.set(rowId, row);
    };
    for (const row of rows) {
      for (const column of columns) {
        if (column.isRequired && isEmptyValue(column.value?.(row))) {
          set(getRowId(row), column.id, messages.editableRequired({ column: columnLabel(column) }));
        }
      }
    }
    for (const [rowId, byColumn] of Object.entries(validate?.(rows) ?? {})) {
      for (const [columnId, message] of Object.entries(byColumn)) {
        set(rowId, columnId, message);
      }
    }
    return result;
  }, [rows, columns, validate, getRowId, messages]);

  // The error summary, in row then column order.
  const errorList = rows.flatMap((row, index) => {
    const rowId = getRowId(row);
    const byColumn = errors.get(rowId);
    if (!byColumn) {
      return [];
    }
    return columns.flatMap((column) => {
      const message = byColumn.get(column.id);
      return message === undefined
        ? []
        : [
            {
              rowId,
              colId: column.id,
              row: labelOf(row, index),
              column: columnLabel(column),
              message,
            },
          ];
    });
  });
  const errorIdOf = (rowId: string, colId: string) =>
    `${idPrefix}-err-${String(rowIds.indexOf(rowId))}-${String(columns.findIndex((column) => column.id === colId))}`;

  // The active cell, falling back to the first cell when its row or column is gone.
  const activeRowIndex = active ? rowIds.indexOf(active.rowId) : -1;
  const activeRowId = activeRowIndex >= 0 ? active?.rowId : rowIds[0];
  const activeColId = active && navColumns.includes(active.colId) ? active.colId : navColumns[0];
  const isEditingCell = (rowId: string, colId: string) =>
    editing?.rowId === rowId && editing.colId === colId;

  const emit = (next: Row[]) => {
    latestRows.current = next;
    onChange(next);
  };
  const replaceRow = (rowId: string, update: (row: Row) => Row) => {
    emit(latestRows.current.map((row) => (getRowId(row) === rowId ? update(row) : row)));
  };

  const findCell = (rowId: string, colId: string) =>
    gridRef.current?.querySelector<HTMLElement>(
      `[data-cell-row="${CSS.escape(rowId)}"][data-cell-col="${CSS.escape(colId)}"]`,
    ) ?? null;

  // Focus moves after renders that asked for it: to a cell, its editor, or a row's actions button.
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (pending && isGrid) {
      const cell = findCell(pending.rowId, pending.colId);
      if (cell) {
        pendingFocus.current = null;
        const target =
          pending.colId === ACTIONS
            ? cell.querySelector<HTMLElement>('button')
            : pending.isEditing
              ? (cell.querySelector<HTMLElement>('input:not([type="hidden"]), textarea') ??
                cell.querySelector<HTMLElement>('button, [tabindex]'))
              : cell;
        target?.focus();
        if (target instanceof HTMLInputElement && pending.isEditing) {
          target.select();
        }
        // A menu that closed with its row (Remove) restores focus a frame later; take it back.
        requestAnimationFrame(() => {
          if (target?.isConnected && document.activeElement !== target && !isInOverlay()) {
            target.focus();
          }
        });
      }
    }
    const card = pendingCardFocus.current;
    if (card && !isGrid) {
      pendingCardFocus.current = null;
      const root = cardsRef.current?.querySelector(`[data-card-row="${CSS.escape(card.rowId)}"]`);
      root?.querySelector<HTMLElement>(card.selector)?.focus();
    }
  });

  // A roving tab stop: controls inside cells leave the tab order, except the active row's actions button.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      return;
    }
    for (const element of grid.querySelectorAll<HTMLElement>(FOCUSABLE)) {
      if (element.dataset.cellCol !== undefined) {
        continue;
      }
      const cell = element.closest<HTMLElement>('[data-cell-col]');
      const isActiveAction =
        cell?.dataset.cellCol === ACTIONS &&
        cell.dataset.cellRow === activeRowId &&
        activeColId === ACTIONS &&
        element === cell.querySelector('button');
      element.tabIndex = isActiveAction ? 0 : -1;
    }
  });

  const focusCell = (rowId: string, colId: string, isEditingNext = false) => {
    setActive({ rowId, colId });
    pendingFocus.current = { rowId, colId, isEditing: isEditingNext };
    // Focus right away when the cell is already there (no state change may follow to run the effect).
    const cell = findCell(rowId, colId);
    if (cell && !isEditingNext) {
      pendingFocus.current = null;
      (colId === ACTIONS ? cell.querySelector<HTMLElement>('button') : cell)?.focus();
    }
  };

  const startEditing = (rowId: string, colId: string) => {
    snapshot.current = latestRows.current;
    setEditing({ rowId, colId });
    focusCell(rowId, colId, true);
  };

  const finishEditing = (cell: HTMLElement) => {
    // Focusing the cell first blurs the editor, so fields that commit on blur (NumberField, MoneyField) commit.
    cell.focus();
    setEditing(null);
  };

  const cancelEditing = (cell: HTMLElement) => {
    const before = snapshot.current;
    cell.focus();
    setEditing(null);
    if (before && before !== latestRows.current) {
      emit([...before]);
    }
  };

  /** The next (or previous) editable cell in reading order, wrapping across rows. */
  const nextEditable = (rowId: string, colId: string, isBackward: boolean): CellRef | null => {
    const cells = rowIds.flatMap((id) => editableIds.map((col) => ({ rowId: id, colId: col })));
    const index = cells.findIndex((cell) => cell.rowId === rowId && cell.colId === colId);
    return cells[index + (isBackward ? -1 : 1)] ?? null;
  };

  const onGridKeyDownCapture = (event: KeyboardEvent<HTMLTableElement>) => {
    const target = event.target as HTMLElement;
    const cell = target.closest<HTMLElement>('[data-cell-col]');
    // Keys from overlays (menus, list boxes) reach here through React portals; leave them alone.
    if (!cell || !event.currentTarget.contains(cell)) {
      return;
    }
    const rowId = cell.dataset.cellRow ?? '';
    const colId = cell.dataset.cellCol ?? '';

    if (isEditingCell(rowId, colId)) {
      const isExpanded = target.getAttribute('aria-expanded') === 'true';
      if (event.key === 'Escape' && !isExpanded) {
        event.preventDefault();
        event.stopPropagation();
        cancelEditing(cell);
      } else if (
        (event.key === 'Enter' &&
          target instanceof HTMLInputElement &&
          !isExpanded &&
          !event.nativeEvent.isComposing) ||
        event.key === 'F2'
      ) {
        event.preventDefault();
        event.stopPropagation();
        finishEditing(cell);
      } else if (event.key === 'Tab') {
        const next = nextEditable(rowId, colId, event.shiftKey);
        if (next) {
          event.preventDefault();
          event.stopPropagation();
          cell.focus();
          startEditing(next.rowId, next.colId);
        }
        // Past the last editable cell, Tab leaves the grid as usual and the blur ends the edit.
      }
      return;
    }

    // Grid navigation, only from the cell itself or a row's actions button.
    const isNavTarget = target === cell || (colId === ACTIONS && target.tagName === 'BUTTON');
    if (!isNavTarget) {
      return;
    }
    const rowIndex = rowIds.indexOf(rowId);
    const colIndex = navColumns.indexOf(colId);
    const lastRow = rowIds.length - 1;
    const lastCol = navColumns.length - 1;
    const forward = direction === 'rtl' ? -1 : 1;
    let next: [number, number] | null = null;
    switch (event.key) {
      case 'ArrowDown':
        next = [rowIndex + 1, colIndex];
        break;
      case 'ArrowUp':
        next = [rowIndex - 1, colIndex];
        break;
      case 'ArrowRight':
        next = [rowIndex, colIndex + forward];
        break;
      case 'ArrowLeft':
        next = [rowIndex, colIndex - forward];
        break;
      case 'Home':
        next = event.ctrlKey || event.metaKey ? [0, 0] : [rowIndex, 0];
        break;
      case 'End':
        next = event.ctrlKey || event.metaKey ? [lastRow, lastCol] : [rowIndex, lastCol];
        break;
      case 'PageDown':
        next = [lastRow, colIndex];
        break;
      case 'PageUp':
        next = [0, colIndex];
        break;
      case 'Enter':
      case 'F2':
        if (colId !== ACTIONS && editableIds.includes(colId)) {
          event.preventDefault();
          event.stopPropagation();
          startEditing(rowId, colId);
        }
        return;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    const nextRow = rowIds[Math.min(Math.max(next[0], 0), lastRow)];
    const nextCol = navColumns[Math.min(Math.max(next[1], 0), lastCol)];
    if (nextRow !== undefined && nextCol !== undefined) {
      focusCell(nextRow, nextCol);
    }
  };

  const onCellFocus = (event: FocusEvent<HTMLElement>, rowId: string, colId: string) => {
    const cell = event.currentTarget;
    if (!cell.contains(event.target)) {
      // Focus inside an overlay opened from the cell (a Select's list).
      return;
    }
    if (active?.rowId !== rowId || active.colId !== colId) {
      setActive({ rowId, colId });
    }
    const wantsEditing = event.target !== cell && colId !== ACTIONS && editableIds.includes(colId);
    if (wantsEditing && !isEditingCell(rowId, colId)) {
      snapshot.current = latestRows.current;
      setEditing({ rowId, colId });
    } else if (!wantsEditing && editing) {
      setEditing(null);
    }
  };

  const onCellBlur = (event: FocusEvent<HTMLElement>, rowId: string, colId: string) => {
    if (!isEditingCell(rowId, colId)) {
      return;
    }
    const next = event.relatedTarget;
    // Staying in the cell, or moving into an overlay it opened (popovers carry `data-trigger`).
    if (next && (event.currentTarget.contains(next) || next.closest('[data-trigger]'))) {
      return;
    }
    setEditing(null);
  };

  // Row actions.
  const addRow = () => {
    if (!newRow || atMax) {
      return;
    }
    const row = newRow();
    const next = [...latestRows.current, row];
    emit(next);
    setAnnouncement(messages.editableRowAdded({ row: labelOf(row, next.length - 1) }));
    const rowId = getRowId(row);
    const firstEditable = editableIds[0];
    if (isGrid && firstEditable !== undefined) {
      snapshot.current = next;
      setActive({ rowId, colId: firstEditable });
      setEditing({ rowId, colId: firstEditable });
      pendingFocus.current = { rowId, colId: firstEditable, isEditing: true };
    } else {
      pendingCardFocus.current = { rowId, selector: 'input, button' };
    }
  };

  const removeRow = (rowId: string) => {
    const current = latestRows.current;
    const index = current.findIndex((row) => getRowId(row) === rowId);
    const row = current[index];
    if (!row) {
      return;
    }
    const next = current.filter((item) => getRowId(item) !== rowId);
    emit(next);
    setEditing(null);
    setAnnouncement(messages.editableRowRemoved({ row: labelOf(row, index) }));
    const neighbour = next[Math.min(index, next.length - 1)];
    if (!neighbour) {
      addButtonRef.current?.focus();
      requestAnimationFrame(() => {
        addButtonRef.current?.focus();
      });
      return;
    }
    const neighbourId = getRowId(neighbour);
    if (isGrid) {
      setActive({ rowId: neighbourId, colId: ACTIONS });
      pendingFocus.current = { rowId: neighbourId, colId: ACTIONS, isEditing: false };
    } else {
      pendingCardFocus.current = { rowId: neighbourId, selector: '[data-card-action="remove"]' };
    }
  };

  const duplicate = (rowId: string) => {
    if (!duplicateRow || atMax) {
      return;
    }
    const current = latestRows.current;
    const index = current.findIndex((row) => getRowId(row) === rowId);
    const row = current[index];
    if (!row) {
      return;
    }
    const copy = duplicateRow(row);
    const next = [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    emit(next);
    setAnnouncement(messages.editableRowDuplicated({ row: labelOf(row, index) }));
    const copyId = getRowId(copy);
    if (isGrid) {
      setActive({ rowId: copyId, colId: ACTIONS });
      pendingFocus.current = { rowId: copyId, colId: ACTIONS, isEditing: false };
    } else {
      pendingCardFocus.current = { rowId: copyId, selector: 'input, button' };
    }
  };

  const move = (rowId: string, step: -1 | 1) => {
    const current = latestRows.current;
    const from = current.findIndex((row) => getRowId(row) === rowId);
    const to = from + step;
    const row = current[from];
    if (!row || to < 0 || to >= current.length) {
      return;
    }
    const next = [...current];
    next.splice(from, 1);
    next.splice(to, 0, row);
    emit(next);
    setAnnouncement(
      messages.itemMovedTo({ item: labelOf(row, from), position: to + 1, total: next.length }),
    );
    if (isGrid) {
      setActive({ rowId, colId: ACTIONS });
    } else {
      // Stay on the button, or switch to the other one once the row reaches an end.
      const isAtEnd = step === -1 ? to === 0 : to === next.length - 1;
      const direction = isAtEnd ? (step === -1 ? 'down' : 'up') : step === -1 ? 'up' : 'down';
      pendingCardFocus.current = { rowId, selector: `[data-card-action="${direction}"]` };
    }
  };

  const onRowAction = (key: Key, rowId: string) => {
    if (key === 'up' || key === 'down') {
      move(rowId, key === 'up' ? -1 : 1);
    } else if (key === 'duplicate') {
      duplicate(rowId);
    } else if (key === 'remove') {
      removeRow(rowId);
    }
  };

  const goToError = (rowId: string, colId: string) => {
    if (isGrid) {
      if (editableIds.includes(colId)) {
        startEditing(rowId, colId);
      } else {
        focusCell(rowId, colId);
      }
      return;
    }
    cardsRef.current
      ?.querySelector<HTMLElement>(
        `[data-card-row="${CSS.escape(rowId)}"] [data-card-col="${CSS.escape(colId)}"] :is(input, button, textarea)`,
      )
      ?.focus();
  };

  /** The editor for a cell, wired to its value, name and error. */
  const editorFor = (column: EditableColumn<Row>, row: Row, rowIndex: number) => {
    const rowId = getRowId(row);
    const message = errors.get(rowId)?.get(column.id);
    return (
      <CellEditor
        column={column}
        row={row}
        rowId={rowId}
        rowIndex={rowIndex}
        label={messages.editableCell({ column: columnLabel(column), row: labelOf(row, rowIndex) })}
        errorMessage={message}
        errorId={message === undefined ? undefined : errorIdOf(rowId, column.id)}
        isDisabled={isDisabled}
        onReplace={replaceRow}
      />
    );
  };

  const displayFor = (column: EditableColumn<Row>, row: Row, rowIndex: number) => {
    const content = renderCell(column, row, rowIndex);
    if (content === '' || content === null || content === undefined) {
      return (
        <>
          <span aria-hidden="true" className="text-fg-muted">
            —
          </span>
          <span className="sr-only">{messages.notSet}</span>
        </>
      );
    }
    return content;
  };

  const errorText = (rowId: string, colId: string) => {
    const message = errors.get(rowId)?.get(colId);
    return message === undefined ? null : (
      <span id={errorIdOf(rowId, colId)} className="mt-1 block text-xs font-medium text-danger-fg">
        {message}
      </span>
    );
  };

  const rowMenu = (row: Row, index: number, rowId: string, size: 'sm' | 'md' = 'sm') => {
    const label = labelOf(row, index);
    const disabled = [
      ...(index === 0 ? ['up'] : []),
      ...(index === rows.length - 1 ? ['down'] : []),
      ...(atMax ? ['duplicate'] : []),
      ...(canRemove ? [] : ['remove']),
    ];
    return (
      <OverflowMenu
        aria-label={messages.rowActions({ row: label })}
        size={size}
        disabledKeys={disabled}
        onAction={(key) => {
          onRowAction(key, rowId);
        }}
      >
        {isReorderable && (
          <MenuItem id="up" icon={ArrowUp}>
            {messages.moveUp({ item: label })}
          </MenuItem>
        )}
        {isReorderable && (
          <MenuItem id="down" icon={ArrowDown}>
            {messages.moveDown({ item: label })}
          </MenuItem>
        )}
        {duplicateRow !== undefined && (
          <MenuItem id="duplicate" icon={Copy}>
            {messages.editableDuplicate}
          </MenuItem>
        )}
        {allowsRemovingRows && (
          <MenuItem id="remove" icon={Trash2} tone="danger">
            {messages.remove}
          </MenuItem>
        )}
      </OverflowMenu>
    );
  };

  const grid = (
    <div className="relative w-full overflow-x-auto rounded-card border border-border">
      <table
        ref={gridRef}
        role="grid"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={instructionsId}
        aria-rowcount={rows.length + 1}
        aria-colcount={navColumns.length}
        onKeyDownCapture={onGridKeyDownCapture}
        className="w-full border-collapse text-sm"
      >
        <thead className="bg-surface-2">
          <tr role="row" aria-rowindex={1}>
            {columns.map((column) => (
              <th
                key={column.id}
                role="columnheader"
                scope="col"
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the column's configured width.
                style={
                  column.width === undefined && column.minWidth === undefined
                    ? undefined
                    : { width: column.width, minWidth: column.minWidth }
                }
                className={cn(
                  'px-3 py-2 text-xs font-semibold whitespace-nowrap text-fg-muted',
                  alignClasses[column.align ?? 'start'],
                )}
              >
                {column.header}
              </th>
            ))}
            {hasActions && (
              <th role="columnheader" scope="col" className="w-12">
                <span className="sr-only">{messages.moreActions}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr role="row">
              <td
                role="gridcell"
                colSpan={navColumns.length}
                className="px-3 py-6 text-center text-fg-muted"
              >
                {messages.noData}
              </td>
            </tr>
          )}
          {rows.map((row, rowIndex) => {
            const rowId = getRowId(row);
            return (
              <tr
                key={rowId}
                role="row"
                aria-rowindex={rowIndex + 2}
                className="border-t border-border bg-surface-1"
              >
                {columns.map((column) => {
                  const isActive = activeRowId === rowId && activeColId === column.id;
                  const editable = isEditable(column);
                  const isEditingHere = isEditingCell(rowId, column.id);
                  const showsEditor = editable && (editMode === 'always' || isEditingHere);
                  const message = errors.get(rowId)?.get(column.id);
                  const Cell = column.isRowHeader ? 'th' : 'td';
                  return (
                    <Cell
                      key={column.id}
                      role={column.isRowHeader ? 'rowheader' : 'gridcell'}
                      scope={column.isRowHeader ? 'row' : undefined}
                      tabIndex={isActive ? 0 : -1}
                      data-cell-row={rowId}
                      data-cell-col={column.id}
                      data-editing={isEditingHere || undefined}
                      data-invalid={message !== undefined || undefined}
                      aria-invalid={message !== undefined || undefined}
                      aria-readonly={editable ? undefined : true}
                      aria-required={column.isRequired === true ? true : undefined}
                      aria-describedby={
                        message === undefined ? undefined : errorIdOf(rowId, column.id)
                      }
                      onFocus={(event) => {
                        onCellFocus(event, rowId, column.id);
                      }}
                      onBlur={(event) => {
                        onCellBlur(event, rowId, column.id);
                      }}
                      onDoubleClick={() => {
                        if (editable && !isEditingHere) {
                          startEditing(rowId, column.id);
                        }
                      }}
                      className={cn(
                        'align-top font-normal text-fg outline-none',
                        'focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset',
                        'data-editing:ring-2 data-editing:ring-accent-solid data-editing:ring-inset',
                        'data-invalid:bg-danger-bg',
                        showsEditor ? 'px-1.5 py-1.5' : 'px-3 py-2.5',
                        alignClasses[column.align ?? 'start'],
                        column.align === 'end' && 'tabular-nums',
                        editable && !showsEditor && 'cursor-text',
                      )}
                    >
                      {showsEditor
                        ? editorFor(column, row, rowIndex)
                        : displayFor(column, row, rowIndex)}
                      {errorText(rowId, column.id)}
                    </Cell>
                  );
                })}
                {hasActions && (
                  <td
                    role="gridcell"
                    data-cell-row={rowId}
                    data-cell-col={ACTIONS}
                    tabIndex={-1}
                    onFocus={(event) => {
                      onCellFocus(event, rowId, ACTIONS);
                    }}
                    className="w-12 px-1 py-1 text-end align-top outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
                  >
                    {rowMenu(row, rowIndex, rowId)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const cards = (
    <ul
      ref={cardsRef}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className="flex flex-col gap-3"
    >
      {rows.length === 0 && (
        <li className="rounded-card border border-border px-3 py-6 text-center text-fg-muted">
          {messages.noData}
        </li>
      )}
      {rows.map((row, rowIndex) => {
        const rowId = getRowId(row);
        const label = labelOf(row, rowIndex);
        const titleId = `${idPrefix}-card-${String(rowIndex)}`;
        const hasRowErrors = errors.has(rowId);
        return (
          <li key={rowId} data-card-row={rowId}>
            <div
              role="group"
              aria-labelledby={titleId}
              className={cn(
                'flex flex-col gap-3 rounded-card border bg-surface-1 p-3',
                hasRowErrors ? 'border-danger-border' : 'border-border',
              )}
            >
              <div className="flex min-h-hit items-center gap-1">
                <span id={titleId} className="min-w-0 flex-1 font-medium break-words">
                  {label}
                </span>
                {!isDisabled && isReorderable && (
                  <>
                    <IconButton
                      icon={ArrowUp}
                      size="sm"
                      aria-label={messages.moveUp({ item: label })}
                      data-card-action="up"
                      isDisabled={rowIndex === 0}
                      onPress={() => {
                        move(rowId, -1);
                      }}
                    />
                    <IconButton
                      icon={ArrowDown}
                      size="sm"
                      aria-label={messages.moveDown({ item: label })}
                      data-card-action="down"
                      isDisabled={rowIndex === rows.length - 1}
                      onPress={() => {
                        move(rowId, 1);
                      }}
                    />
                  </>
                )}
                {!isDisabled && duplicateRow !== undefined && (
                  <IconButton
                    icon={Copy}
                    size="sm"
                    aria-label={messages.editableDuplicateRow({ row: label })}
                    data-card-action="duplicate"
                    isDisabled={atMax}
                    onPress={() => {
                      duplicate(rowId);
                    }}
                  />
                )}
                {!isDisabled && allowsRemovingRows && (
                  <IconButton
                    icon={Trash2}
                    size="sm"
                    tone="danger"
                    aria-label={messages.editableRemoveRow({ row: label })}
                    data-card-action="remove"
                    isDisabled={!canRemove}
                    onPress={() => {
                      removeRow(rowId);
                    }}
                  />
                )}
              </div>
              {columns.map((column) => {
                const editable = isEditable(column);
                const text = columnLabel(column);
                // The card's title already names the row (from getRowLabel), so a read-only row header repeats it.
                if (column.isRowHeader && !editable && getRowLabel !== undefined) {
                  return null;
                }
                return (
                  <div
                    key={column.id}
                    data-card-col={column.id}
                    className="flex min-w-0 flex-col gap-1"
                  >
                    <span
                      aria-hidden={editable || undefined}
                      className="text-xs font-medium text-fg-muted"
                    >
                      {text}
                    </span>
                    {editable ? (
                      editorFor(column, row, rowIndex)
                    ) : (
                      <span
                        className={cn('min-w-0 text-fg', column.align === 'end' && 'tabular-nums')}
                      >
                        {displayFor(column, row, rowIndex)}
                      </span>
                    )}
                    {errorText(rowId, column.id)}
                  </div>
                );
              })}
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div
      ref={mergeRefs(ref, widthRef)}
      className={cn('flex min-w-0 flex-col gap-3 text-sm text-fg', className)}
    >
      {errorList.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-card border border-danger-border bg-danger-bg p-3 text-danger-fg">
          <p className="flex items-center gap-2 font-medium">
            <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
            {messages.editableErrorCount({ count: errorList.length })}
          </p>
          <ul className="flex flex-col gap-1 ps-6">
            {errorList.map((error) => (
              <li key={`${error.rowId}:${error.colId}`}>
                <AriaButton
                  onPress={() => {
                    goToError(error.rowId, error.colId);
                  }}
                  className="cursor-pointer rounded-sm text-start underline underline-offset-2 outline-none data-focus-visible:focus-ring"
                >
                  {messages.editableErrorItem(error)}
                </AriaButton>
              </li>
            ))}
          </ul>
        </div>
      )}
      {isGrid ? grid : cards}
      {isGrid && (
        <span id={instructionsId} className="sr-only">
          {messages.editableInstructions}
        </span>
      )}
      {newRow !== undefined && !isDisabled && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            ref={addButtonRef}
            variant="outline"
            size="sm"
            icon={Plus}
            isDisabled={atMax}
            onPress={addRow}
          >
            {addRowLabel ?? messages.editableAddRow}
          </Button>
          {atMax && (
            <span className="text-xs text-fg-muted">
              {messages.editableMaxRows({ max: maxRows })}
            </span>
          )}
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
      <span className="sr-only" aria-live="polite">
        {errorList.length > 0 ? messages.editableErrorCount({ count: errorList.length }) : ''}
      </span>
    </div>
  );
}
