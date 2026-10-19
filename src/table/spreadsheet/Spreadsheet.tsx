// Spreadsheet: a typed, virtualised grid for editing (or just reading) large tables, with spreadsheet selection,
// clipboard, fill, undo and redo, sorting, filtering, search and column management. Values are parsed and checked
// against their column's type as they're typed, pasted or filled. What users may change is set by `editScope`: the
// columns and the data, the data only, or nothing.
//
// Large sheets stay light: only the rows and columns in view are rendered (rows are memoised), sorting and filtering
// keep a list of row ids (never copies of rows), and undo keeps only what each step changed, within a budget.

import { useVirtualizer, defaultRangeExtractor, type Range } from '@tanstack/react-virtual';
import {
  ArrowDown,
  ArrowDownAZ,
  ArrowDownToLine,
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowRight,
  ArrowRightToLine,
  ArrowUp,
  ArrowUpAZ,
  ArrowUpNarrowWide,
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  ClipboardCopy,
  ClipboardPaste,
  Columns3,
  Copy,
  CopyPlus,
  Eraser,
  EyeOff,
  FunnelX,
  ListFilter,
  MoveHorizontal,
  Plus,
  Scissors,
  Settings2,
  SquarePen,
  TextCursorInput,
  Trash2,
  X,
} from 'lucide-react';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { useLocale, type Key } from 'react-aria-components';
import { Button } from '../../components/Button/Button';
import { ContextMenuTrigger } from '../../components/ContextMenu/ContextMenu';
import { LiveRegion, useAnnouncer } from '../../components/LiveRegion/LiveRegion';
import { Menu, MenuItem, MenuSeparator, SubmenuTrigger } from '../../components/Menu/Menu';
import { Popover } from '../../components/Popover/Popover';
import { cn } from '../../utils/cn';
import { isApplePlatform } from '../../utils/keyboard';
import { clamp } from '../../utils/math';
import { useControllableState } from '../../utils/useControllableState';
import { useLatest } from '../../utils/useLatest';
import { useMediaQuery } from '../../utils/useMediaQuery';
import { activeFilters, NO_FILTERS } from '../filterText';
import { useSpreadsheetMessages } from './messages';
import type { FilterValues, TableSort } from '../types';
import { CellEditor, type EditorMove } from './CellEditor';
import { parseTsv, toTsv } from './clipboard';
import { clampWidth, columnAt, columnOffsets, defaultWidth, widthInPixels } from './geometry';
import { applyRowChange, SheetHistory, type HistoryEntry, type SheetChange } from './history';
import {
  boundsSize,
  cellSelection,
  clampSelection,
  selectionBounds,
  type CellPosition,
  type SheetSelection,
} from './selection';
import {
  cellId,
  GroupRow,
  HeaderRow,
  SheetRow,
  type GroupSpan,
  type VisibleColumn,
} from './SheetRows';
import { SpreadsheetToolbar } from './SpreadsheetToolbar';
import type {
  SpreadsheetColumn,
  SpreadsheetEditScope,
  SpreadsheetErrors,
  SpreadsheetRow,
  SpreadsheetValue,
} from './types';
import {
  alignOf,
  columnFormat,
  emptyValueFor,
  filterConfigFor,
  isEmptyValue,
  isFilterActive,
  parseForColumn,
  typeOf,
  type ColumnFormat,
} from './values';
import { computeView, isViewActive } from './view';

export interface SpreadsheetProps {
  rows: readonly SpreadsheetRow[];
  columns: readonly SpreadsheetColumn[];
  /** A stable id for each row (selection, undo and errors follow rows through sorting and edits). */
  getRowId: (row: SpreadsheetRow) => string;
  /**
   * What users can change: `all` the columns and the data, `data` (the default) the values and rows, or `none`
   * (read-only). Sorting, filtering, searching, hiding and resizing columns, and copying work in every scope.
   */
  editScope?: SpreadsheetEditScope;
  /** Called with the new rows after every edit, paste, fill, clear, insert, delete, move, undo and redo. */
  onChange?: (rows: SpreadsheetRow[]) => void;
  /** Called with the new columns when users change them (`editScope` `all`; resizing in any scope). */
  onColumnsChange?: (columns: SpreadsheetColumn[]) => void;
  /** Makes an empty row (with a new id) for inserted, added and pasted rows; without it, rows can't be added. */
  newRow?: () => SpreadsheetRow;
  /**
   * Checks across rows, such as unique values or totals. Returns errors by row id and column id, shown on the cells
   * and counted in the status bar. Type and column checks run on their own. Keep the function stable (and quick):
   * it runs when the rows change.
   */
  validate?: (rows: readonly SpreadsheetRow[]) => SpreadsheetErrors;
  /** The sort: columns in priority order. Controlled; edits don't re-sort until it changes or users reapply it. */
  sorting?: readonly TableSort[];
  defaultSorting?: readonly TableSort[];
  onSortingChange?: (sorting: TableSort[]) => void;
  /** Filters by column id, as the table filters describe them (text, number and date ranges, yes/no, choices). */
  filterValues?: FilterValues;
  defaultFilterValues?: FilterValues;
  onFilterValuesChange?: (values: FilterValues) => void;
  /** Text that rows must contain in a visible column. */
  search?: string;
  defaultSearch?: string;
  onSearchChange?: (search: string) => void;
  /** Column ids to hide. */
  hiddenColumns?: ReadonlySet<string>;
  defaultHiddenColumns?: ReadonlySet<string>;
  onHiddenColumnsChange?: (hidden: Set<string>) => void;
  /** Defaults to `regular`. On touch screens rows are tall enough to tap either way. */
  density?: 'compact' | 'regular';
  /** The tallest the grid grows before it scrolls, as a CSS length. Defaults to `32rem`. */
  maxHeight?: string;
  /** Shows the toolbar: search, undo and redo, add row and column, columns and actions. Defaults to true. */
  hasToolbar?: boolean;
  /** Shows the status bar: the active cell, selection totals, row count and problems. Defaults to true. */
  hasStatusBar?: boolean;
  /** Names the grid. Give this or `aria-labelledby`. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

// Parts users open now and then load when first needed: the filter controls (with their date picker), column
// settings and the row editor.
const FilterPanel = lazy(() =>
  import('../filters').then((module) => ({ default: module.FilterPanel })),
);
const ColumnSettingsDialog = lazy(() =>
  import('./ColumnSettingsDialog').then((module) => ({ default: module.ColumnSettingsDialog })),
);
const RowEditorDialog = lazy(() =>
  import('./RowEditorDialog').then((module) => ({ default: module.RowEditorDialog })),
);

const NO_SORTING: readonly TableSort[] = [];
const NO_HIDDEN: ReadonlySet<string> = new Set();
const NO_ERRORS: SpreadsheetErrors = {};
/** Selections larger than this show a cell count only (no sum or average), so selecting everything stays quick. */
const MAX_STATS_CELLS = 100_000;
/** How close to the grid's edge (pixels) a drag scrolls it. */
const DRAG_SCROLL_EDGE = 32;

interface ViewState {
  key: string;
  rows: readonly SpreadsheetRow[] | null;
  formats: ReadonlyMap<string, ColumnFormat> | null;
  ids: readonly string[] | null;
}

interface Editing {
  row: number;
  col: number;
  text: string;
  isReplacing: boolean;
  error?: string;
}

type Drag =
  | { kind: 'cells' | 'rows' | 'columns'; pointerId: number; x: number; y: number }
  | { kind: 'move'; pointerId: number; x: number; y: number; target: number }
  | {
      kind: 'resize';
      pointerId: number;
      col: number;
      columnId: string;
      startX: number;
      startWidth: number;
      width: number;
    };

/** A function that always calls the latest version of `callback`, for memoised children and listeners. */
function useStableCallback<Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
): (...args: Args) => Result {
  const ref = useLatest(callback);
  return useCallback((...args: Args) => ref.current(...args), [ref]);
}

/** Keeps an array's identity while its contents are the same, so memoised rows don't re-render. */
function useStableIndexes(indexes: readonly number[]): readonly number[] {
  const key = indexes.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the key stands for the contents.
  return useMemo(() => indexes, [key]);
}

/** Column groups as runs of neighbouring columns, with a colour per distinct group. */
function groupSpans(columns: readonly VisibleColumn[]): GroupSpan[] {
  const spans: GroupSpan[] = [];
  const tones = new Map<string, number>();
  columns.forEach((visible, index) => {
    const label = visible.column.group ?? '';
    const last = spans.at(-1);
    if (last?.label === label && last.end === index - 1) {
      last.end = index;
      return;
    }
    if (label !== '' && !tones.has(label)) {
      tones.set(label, tones.size);
    }
    spans.push({ label, start: index, end: index, tone: tones.get(label) ?? 0 });
  });
  return spans;
}

/** Rows written with `patch` applied; `undefined` removes a key. */
function patchRow(
  row: SpreadsheetRow,
  patch: Readonly<Record<string, SpreadsheetValue | undefined>>,
): SpreadsheetRow {
  const merged = { ...row, ...patch };
  return Object.fromEntries(Object.entries(merged).filter(([, value]) => value !== undefined));
}

/**
 * A spreadsheet: typed columns, values parsed and checked as they're typed, pasted or filled, and the editing users
 * expect from other spreadsheets. Click, drag, Shift+click or Shift with the arrow keys to select cells, rows (from
 * the row numbers) or columns (from the headers); type, Enter, F2 or a double-click to edit; copy, cut and paste
 * with the system clipboard (tab-separated, so it works with other spreadsheets); fill down (Ctrl+D) and right
 * (Ctrl+R); Delete to clear; Ctrl+Z and Ctrl+Shift+Z (or Ctrl+Y) to undo and redo. Right-click (long-press on touch,
 * Shift+F10 on the keyboard) for the cell menu: insert, duplicate, move and delete rows, and sort, filter and
 * column actions. Column headers have the same column actions in their menu, and can be dragged wider. Selected row
 * numbers can be dragged to move rows.
 *
 * `editScope` sets what users can change: `all` (add, remove, rename, retype and reorder columns, and the data),
 * `data` (values and rows) or `none` (read-only). Rows and columns are controlled (`onChange`, `onColumnsChange`);
 * sorting, filters, search and hidden columns can be controlled or not. Only the rows and columns in view render, so
 * sheets of hundreds of thousands of rows scroll smoothly.
 */
export function Spreadsheet({
  rows,
  columns,
  getRowId,
  editScope = 'data',
  onChange,
  onColumnsChange,
  newRow,
  validate,
  sorting: sortingProp,
  defaultSorting = NO_SORTING,
  onSortingChange,
  filterValues: filterValuesProp,
  defaultFilterValues = NO_FILTERS,
  onFilterValuesChange,
  search: searchProp,
  defaultSearch = '',
  onSearchChange,
  hiddenColumns: hiddenColumnsProp,
  defaultHiddenColumns = NO_HIDDEN,
  onHiddenColumnsChange,
  density = 'regular',
  maxHeight = '32rem',
  hasToolbar = true,
  hasStatusBar = true,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
  ref,
}: SpreadsheetProps) {
  const messages = useSpreadsheetMessages();
  const { locale, direction } = useLocale();
  const isRtl = direction === 'rtl';
  const idPrefix = useId();
  const instructionsId = useId();
  const activeErrorId = useId();
  const editorErrorId = useId();
  const isCoarse = useMediaQuery('(pointer: coarse)');
  const [isApple] = useState(isApplePlatform);
  const rowHeight = isCoarse ? 44 : density === 'compact' ? 28 : 34;

  const canEditData = editScope !== 'none';
  const canEditSchema = editScope === 'all';
  /** Makes rows when users may add them. */
  const makeRow = canEditData ? newRow : undefined;
  const canAddRows = makeRow !== undefined;

  const [sorting, setSortingState] = useControllableState<readonly TableSort[]>(
    sortingProp,
    defaultSorting,
    onSortingChange &&
      ((next) => {
        onSortingChange([...next]);
      }),
  );
  const [filterValues, setFilterValues] = useControllableState<FilterValues>(
    filterValuesProp,
    defaultFilterValues,
    onFilterValuesChange,
  );
  const [search, setSearch] = useControllableState(searchProp, defaultSearch, onSearchChange);
  const [hiddenColumns, setHiddenColumns] = useControllableState<ReadonlySet<string>>(
    hiddenColumnsProp,
    defaultHiddenColumns,
    onHiddenColumnsChange &&
      ((next) => {
        onHiddenColumnsChange(new Set(next));
      }),
  );

  const [selection, setSelection] = useState<SheetSelection | null>(null);
  const [editing, setEditingState] = useState<Editing | null>(null);
  const [widthOverrides, setWidthOverrides] = useState<Readonly<Record<string, number>>>({});
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [isStale, setStale] = useState(false);
  const [reapplyCount, setReapplyCount] = useState(0);
  const { ref: liveRef, announce } = useAnnouncer();
  const [moveTarget, setMoveTarget] = useState<number | null>(null);
  const [isContextOpen, setContextOpen] = useState(false);
  // Overlays stay mounted while they close, so React Aria can animate them out and put focus back on the grid.
  const [filterOverlay, setFilterOverlay] = useState<{ id: string; isOpen: boolean } | null>(null);
  const [settingsOverlay, setSettingsOverlay] = useState<{ id: string; isOpen: boolean } | null>(
    null,
  );
  /** The row editor's row: its id, and where it was in the view when opened (checked before use). */
  const [rowOverlay, setRowOverlay] = useState<{
    id: string;
    index: number;
    isOpen: boolean;
  } | null>(null);
  const closeOverlay = <T extends { isOpen: boolean }>(current: T | null): T | null =>
    current && { ...current, isOpen: false };
  const [remPixels] = useState(() =>
    typeof document === 'undefined'
      ? 16
      : Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<SheetHistory | null>(null);
  const latestRows = useRef(rows);
  const latestColumns = useRef(columns);
  const editingRef = useRef<Editing | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const touchRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const scrollFrame = useRef<number | null>(null);
  const filterAnchor = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    latestRows.current = rows;
  }, [rows]);
  useLayoutEffect(() => {
    latestColumns.current = columns;
  }, [columns]);

  const setEditing = (next: Editing | null) => {
    editingRef.current = next;
    setEditingState(next);
  };

  // Columns: formatters (made once per column and locale) and the visible columns' places.
  const collator = useMemo(
    () => new Intl.Collator(locale, { numeric: true, sensitivity: 'base' }),
    [locale],
  );
  const formats = useMemo(
    () =>
      new Map(
        columns.map((column) => [column.id, columnFormat(column, locale, messages, collator)]),
      ),
    [columns, locale, messages, collator],
  );
  const visible = useMemo(() => {
    let offset = 0;
    return columns.flatMap((column): VisibleColumn[] => {
      const format = formats.get(column.id);
      if (!format || hiddenColumns.has(column.id)) {
        return [];
      }
      const width =
        widthOverrides[column.id] ??
        widthInPixels(column.width, defaultWidth(format.type), remPixels);
      const entry: VisibleColumn = {
        column,
        format,
        width,
        offset,
        align: alignOf(column),
        isReadOnly: !canEditData || column.isReadOnly === true,
      };
      offset += width;
      return [entry];
    });
  }, [columns, formats, hiddenColumns, widthOverrides, remPixels, canEditData]);
  const offsets = useMemo(() => columnOffsets(visible.map((entry) => entry.width)), [visible]);
  const groups = useMemo(() => groupSpans(visible), [visible]);
  const hasGroups = groups.some((group) => group.label !== '');
  const colCount = visible.length;

  // The view: the ids of matching rows in sort order, recomputed when the criteria change, when the rows change from
  // outside, or on Reapply. The sheet's own edits keep the order (rows don't jump away while being edited).
  const criteria = useMemo(
    () => ({ search, filterValues, sorting }),
    [search, filterValues, sorting],
  );
  const isActive = isViewActive(criteria, formats);
  const searchFormats = useMemo(() => visible.map((entry) => entry.format), [visible]);
  const criteriaKey = isActive
    ? JSON.stringify([
        search.trim().toLowerCase(),
        filterValues,
        sorting,
        searchFormats.map((format) => format.column.id),
        reapplyCount,
      ])
    : '';
  const [view, setView] = useState<ViewState>({ key: '', rows: null, formats: null, ids: null });
  let ids: readonly string[] | null = null;
  if (isActive) {
    if (view.key !== criteriaKey || view.rows !== rows || view.formats !== formats) {
      ids = computeView(rows, getRowId, formats, searchFormats, criteria);
      setView({ key: criteriaKey, rows, formats, ids });
      if (isStale) {
        setStale(false);
      }
    } else {
      ids = view.ids;
    }
  }
  const hasView = ids !== null;
  const idIndex = useMemo(
    () => (hasView ? new Map(rows.map((row, index) => [getRowId(row), index])) : null),
    [hasView, rows, getRowId],
  );
  const viewCount = ids ? ids.length : rows.length;
  const baseIndexAt = (viewIndex: number): number | undefined => {
    if (ids) {
      const id = ids[viewIndex];
      return id === undefined ? undefined : idIndex?.get(id);
    }
    return viewIndex >= 0 && viewIndex < rows.length ? viewIndex : undefined;
  };
  const rowAt = (viewIndex: number): SpreadsheetRow | undefined => {
    const base = baseIndexAt(viewIndex);
    return base === undefined ? undefined : rows[base];
  };

  const errors = useMemo(() => validate?.(rows) ?? NO_ERRORS, [validate, rows]);
  const problemCount = useMemo(
    () =>
      Object.values(errors).reduce((total, byColumn) => total + Object.keys(byColumn).length, 0),
    [errors],
  );

  // Keep the selection inside the sheet as rows and columns come and go.
  const clamped = clampSelection(selection, viewCount, colCount);
  if (clamped !== selection) {
    setSelection(clamped);
  }
  const bounds = clamped ? selectionBounds(clamped, viewCount, colCount) : null;
  const size = bounds ? boundsSize(bounds) : { rows: 0, cols: 0, cells: 0 };
  const active = clamped?.anchor ?? null;
  const activeVisible = active ? visible[active.col] : undefined;

  // Geometry.
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const rowHeaderWidth = Math.max(44, 20 + String(rows.length).length * 8);
  const headerRows = hasGroups ? 2 : 1;
  const headerHeight = headerRows * rowHeight;
  const totalWidth = rowHeaderWidth + (offsets.at(-1) ?? 0);
  const totalHeight = headerHeight + viewCount * rowHeight;

  const pinnedRows = [active?.row, editing?.row].filter((row): row is number => row !== undefined);
  const pinnedCols = [active?.col, editing?.col].filter((col): col is number => col !== undefined);
  const withPinned = (range: Range, pinned: readonly number[]) => {
    const indexes = defaultRangeExtractor(range);
    const extra = pinned.filter((index) => index < range.count && !indexes.includes(index));
    return extra.length === 0 ? indexes : [...indexes, ...extra].sort((a, b) => a - b);
  };
  // TanStack Virtual returns functions the React Compiler can't memoise, so it skips this component (as it says).
  // eslint-disable-next-line react-hooks/incompatible-library -- expected; the grid re-renders on scroll anyway.
  const rowVirtualizer = useVirtualizer({
    count: viewCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
    paddingStart: headerHeight,
    scrollPaddingStart: headerHeight,
    rangeExtractor: (range) => withPinned(range, pinnedRows),
  });
  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: colCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => visible[index]?.width ?? 120,
    overscan: 3,
    paddingStart: rowHeaderWidth,
    scrollPaddingStart: rowHeaderWidth,
    isRtl,
    rangeExtractor: (range) => withPinned(range, pinnedCols),
  });
  useLayoutEffect(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer, rowHeight, headerHeight]);
  useLayoutEffect(() => {
    colVirtualizer.measure();
  }, [colVirtualizer, visible, rowHeaderWidth]);
  const virtualRows = rowVirtualizer.getVirtualItems();
  const colIndexes = useStableIndexes(colVirtualizer.getVirtualItems().map((item) => item.index));

  // Scrolls a cell into view after the render that puts it in the sheet (a new row may not be there yet).
  const pendingScroll = useRef<CellPosition | null>(null);
  useLayoutEffect(() => {
    const target = pendingScroll.current;
    if (target) {
      pendingScroll.current = null;
      if (target.row < viewCount) {
        rowVirtualizer.scrollToIndex(target.row, { align: 'auto' });
      }
      if (target.col < colCount) {
        colVirtualizer.scrollToIndex(target.col, { align: 'auto' });
      }
    }
  });
  const ensureVisible = (position: CellPosition) => {
    pendingScroll.current = position;
  };
  const focusGrid = () => {
    scrollRef.current?.focus({ preventScroll: true });
  };

  // ---- History: every change goes through here, so undo and redo see it. ----

  /** Applies a step to the rows and columns; `viewIds` updates the view's order (or recomputes it). */
  const applyEntry = (
    entry: HistoryEntry,
    viewIds: (current: readonly string[] | null) => readonly string[] | null | 'recompute',
  ) => {
    let nextRows = latestRows.current;
    let nextColumns = latestColumns.current;
    let rowsChanged = false;
    let columnsChanged = false;
    for (const change of entry.changes) {
      if (change.type === 'columns') {
        nextColumns = change.after;
        columnsChanged = true;
      } else {
        nextRows = applyRowChange(nextRows, change, getRowId);
        rowsChanged = true;
      }
    }
    latestRows.current = nextRows;
    latestColumns.current = nextColumns;
    if (columnsChanged) {
      onColumnsChange?.([...nextColumns]);
    }
    if (rowsChanged) {
      onChange?.(nextRows as SpreadsheetRow[]);
      setView((current) => {
        const next = viewIds(current.ids);
        return next === 'recompute'
          ? { ...current, rows: null }
          : { ...current, rows: nextRows, ids: next };
      });
    }
  };
  const syncHistory = () => {
    const stack = historyRef.current;
    setHistory({ canUndo: stack?.canUndo ?? false, canRedo: stack?.canRedo ?? false });
  };
  const commit = (
    changes: SheetChange[],
    viewIds: (current: readonly string[] | null) => readonly string[] | null | 'recompute' = (
      current,
    ) => current,
  ) => {
    if (changes.length === 0) {
      return;
    }
    const entry = { changes };
    historyRef.current ??= new SheetHistory();
    historyRef.current.push(entry);
    applyEntry(entry, viewIds);
    syncHistory();
  };
  const undoOrRedo = (isRedo: boolean) => {
    if (!canEditData) {
      return;
    }
    const entry = isRedo ? historyRef.current?.redo() : historyRef.current?.undo();
    if (!entry) {
      return;
    }
    const isStructural = entry.changes.some(
      (change) => change.type === 'insert' || change.type === 'remove',
    );
    applyEntry(entry, (current) => (isStructural && current !== null ? 'recompute' : current));
    syncHistory();
    announce(isRedo ? messages.spreadsheetRedone : messages.spreadsheetUndone);
  };

  /** Marks the view out of date when edits touch what it's sorted, filtered or searched by. */
  const noteEdits = (columnIds: Iterable<string>) => {
    if (!isActive || isStale) {
      return;
    }
    const touched = new Set(columnIds);
    if (
      search.trim() !== '' ||
      sorting.some((sort) => touched.has(sort.column)) ||
      Object.entries(filterValues).some(([id, value]) => touched.has(id) && isFilterActive(value))
    ) {
      setStale(true);
    }
  };

  /** Writes values (by view row and column id) as one undoable step. */
  const writeValues = (
    writes: readonly { row: number; columnId: string; value: SpreadsheetValue | undefined }[],
  ) => {
    const patches = new Map<number, Record<string, SpreadsheetValue | undefined>>();
    for (const { row, columnId, value } of writes) {
      const base = baseIndexAt(row);
      if (base === undefined) {
        continue;
      }
      const patch = patches.get(base) ?? {};
      patch[columnId] = value;
      patches.set(base, patch);
    }
    const entries = [...patches].flatMap(([base, patch]) => {
      const before = latestRows.current[base] ?? rows[base];
      return before ? [{ before, after: patchRow(before, patch) }] : [];
    });
    commit([{ type: 'replace', entries }]);
    noteEdits(writes.map((write) => write.columnId));
  };

  // ---- Selection and movement ----

  const select = (next: SheetSelection, shouldScroll = true) => {
    setSelection(next);
    if (shouldScroll) {
      ensureVisible(next.focus);
    }
  };
  const moveTo = (position: CellPosition, extend: boolean) => {
    const target = {
      row: clamp(position.row, 0, viewCount - 1),
      col: clamp(position.col, 0, colCount - 1),
    };
    if (extend && clamped) {
      const kind =
        clamped.kind === 'rows' && target.col === clamped.focus.col
          ? 'rows'
          : clamped.kind === 'columns' && target.row === clamped.focus.row
            ? 'columns'
            : 'cells';
      select({ anchor: clamped.anchor, focus: target, kind });
    } else {
      select(cellSelection(target.row, target.col));
    }
  };
  const isFilled = (row: number, col: number) => {
    const entry = visible[col];
    return entry !== undefined && !isEmptyValue(rowAt(row)?.[entry.column.id]);
  };
  /** Ctrl+arrow: to the edge of the block of filled cells, or to the next filled cell, or to the sheet's edge. */
  const jump = (from: CellPosition, rowStep: number, colStep: number): CellPosition => {
    const inside = (row: number, col: number) =>
      row >= 0 && row < viewCount && col >= 0 && col < colCount;
    let { row, col } = from;
    if (!inside(row + rowStep, col + colStep)) {
      return from;
    }
    if (isFilled(row, col) && isFilled(row + rowStep, col + colStep)) {
      while (inside(row + rowStep, col + colStep) && isFilled(row + rowStep, col + colStep)) {
        row += rowStep;
        col += colStep;
      }
      return { row, col };
    }
    row += rowStep;
    col += colStep;
    while (!isFilled(row, col) && inside(row + rowStep, col + colStep)) {
      row += rowStep;
      col += colStep;
    }
    return { row, col };
  };

  // ---- Editing ----

  const isCellReadOnly = (col: number) => visible[col]?.isReadOnly ?? true;
  const startEdit = (position: CellPosition, text?: string) => {
    const entry = visible[position.col];
    const row = rowAt(position.row);
    if (!entry || !row) {
      return;
    }
    if (entry.isReadOnly) {
      if (canEditData) {
        announce(messages.spreadsheetReadOnlyCell({ column: entry.column.label }));
      }
      return;
    }
    if (entry.format.type === 'boolean') {
      writeValues([
        { row: position.row, columnId: entry.column.id, value: row[entry.column.id] !== true },
      ]);
      return;
    }
    select(cellSelection(position.row, position.col));
    setEditing({
      row: position.row,
      col: position.col,
      text: text ?? entry.format.edit(row[entry.column.id]),
      isReplacing: text !== undefined,
    });
  };
  const moveAfterEdit = (from: CellPosition, move: EditorMove) => {
    const step = {
      down: { row: 1, col: 0 },
      up: { row: -1, col: 0 },
      right: { row: 0, col: 1 },
      left: { row: 0, col: -1 },
      none: { row: 0, col: 0 },
    }[move];
    moveTo({ row: from.row + step.row, col: from.col + step.col }, false);
  };
  const commitEdit = (move: EditorMove, chosenText?: string, isBlur = false) => {
    const current = editingRef.current;
    if (!current) {
      return;
    }
    const entry = visible[current.col];
    const row = rowAt(current.row);
    if (!entry || !row) {
      setEditing(null);
      return;
    }
    const text = chosenText ?? current.text;
    const parsed = parseForColumn(entry.format, text, row);
    if (parsed.error !== undefined) {
      if (isBlur) {
        setEditing(null);
        announce(messages.spreadsheetNotSaved({ error: parsed.error }));
        return;
      }
      setEditing({ ...current, text, error: parsed.error });
      return;
    }
    setEditing(null);
    if (!Object.is(parsed.value, row[entry.column.id] ?? null)) {
      writeValues([{ row: current.row, columnId: entry.column.id, value: parsed.value }]);
    }
    if (!isBlur) {
      focusGrid();
      moveAfterEdit(current, move);
    }
  };
  const cancelEdit = () => {
    setEditing(null);
    focusGrid();
  };

  // ---- Cell operations ----

  const eachSelectedCell = (callback: (row: number, col: number) => void) => {
    if (!bounds) {
      return;
    }
    for (let row = bounds.top; row <= bounds.bottom; row++) {
      for (let col = bounds.left; col <= bounds.right; col++) {
        callback(row, col);
      }
    }
  };
  const clearSelected = () => {
    const writes: { row: number; columnId: string; value: SpreadsheetValue }[] = [];
    eachSelectedCell((row, col) => {
      const entry = visible[col];
      const value = rowAt(row)?.[entry?.column.id ?? ''];
      if (
        entry &&
        !entry.isReadOnly &&
        !isEmptyValue(value) &&
        !(entry.format.type === 'boolean' && value === false)
      ) {
        writes.push({ row, columnId: entry.column.id, value: emptyValueFor(entry.column) });
      }
    });
    writeValues(writes);
    return writes.length;
  };
  const selectionText = (withHeaders: boolean) => {
    if (!bounds) {
      return '';
    }
    const cols = visible.slice(bounds.left, bounds.right + 1);
    const matrix: string[][] = withHeaders ? [cols.map((entry) => entry.column.label)] : [];
    for (let row = bounds.top; row <= bounds.bottom; row++) {
      const data = rowAt(row);
      matrix.push(cols.map((entry) => entry.format.copy(data?.[entry.column.id])));
    }
    return toTsv(matrix);
  };
  const copyToClipboard = async (cut: boolean, withHeaders = false) => {
    const text = selectionText(withHeaders);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    if (cut && canEditData) {
      clearSelected();
      announce(messages.spreadsheetCutDone({ count: size.cells }));
    } else {
      announce(messages.spreadsheetCopied({ count: size.cells }));
    }
  };

  /** Pastes tab-separated text at the selection: tiled over a larger selection, adding rows past the end. */
  const paste = (text: string) => {
    if (!canEditData || !clamped || !bounds) {
      return;
    }
    const matrix = parseTsv(text);
    const height = matrix.length;
    const width = matrix.reduce((widest, line) => Math.max(widest, line.length), 0);
    if (height === 0 || width === 0) {
      return;
    }
    const tiles = size.cells > 1 && size.rows % height === 0 && size.cols % width === 0;
    const targetRows = tiles ? size.rows : height;
    const targetCols = Math.min(tiles ? size.cols : width, colCount - bounds.left);
    const missing = Math.max(0, bounds.top + targetRows - viewCount);
    const added = makeRow ? Array.from({ length: missing }, () => makeRow()) : [];
    let count = 0;
    let skipped = 0;
    const writes: { row: number; columnId: string; value: SpreadsheetValue }[] = [];
    const addedPatches: Record<string, SpreadsheetValue>[] = added.map(() => ({}));
    for (let r = 0; r < targetRows; r++) {
      const line = matrix[r % height] ?? [];
      const viewRow = bounds.top + r;
      const addedIndex = viewRow - viewCount;
      const data = addedIndex >= 0 ? added[addedIndex] : rowAt(viewRow);
      if (!data) {
        continue;
      }
      for (let c = 0; c < targetCols; c++) {
        const entry = visible[bounds.left + c];
        const cell = line[c % width];
        if (!entry || cell === undefined) {
          continue;
        }
        if (entry.isReadOnly) {
          skipped++;
          continue;
        }
        const parsed = parseForColumn(entry.format, cell, data);
        if (parsed.error !== undefined) {
          skipped++;
          continue;
        }
        count++;
        if (addedIndex >= 0) {
          const patch = addedPatches[addedIndex];
          if (patch) {
            patch[entry.column.id] = parsed.value;
          }
        } else if (!Object.is(parsed.value, data[entry.column.id] ?? null)) {
          writes.push({ row: viewRow, columnId: entry.column.id, value: parsed.value });
        }
      }
    }
    // Existing cells and new rows go in one step.
    const patches = new Map<number, Record<string, SpreadsheetValue>>();
    for (const { row, columnId, value } of writes) {
      const base = baseIndexAt(row);
      if (base !== undefined) {
        patches.set(base, { ...patches.get(base), [columnId]: value });
      }
    }
    const replaced = [...patches].flatMap(([base, patch]) => {
      const before = latestRows.current[base];
      return before ? [{ before, after: patchRow(before, patch) }] : [];
    });
    const newRows = added.map((row, index) => patchRow(row, addedPatches[index] ?? {}));
    const changes: SheetChange[] = [];
    if (replaced.length > 0) {
      changes.push({ type: 'replace', entries: replaced });
    }
    if (newRows.length > 0) {
      const at = latestRows.current.length;
      changes.push({
        type: 'insert',
        entries: newRows.map((row, index) => ({ index: at + index, row })),
      });
    }
    commit(changes, (current) =>
      current === null ? null : [...current, ...newRows.map(getRowId)],
    );
    noteEdits(writes.map((write) => write.columnId));
    const lastRow = bounds.top + Math.min(targetRows, viewCount + newRows.length - bounds.top) - 1;
    select(
      {
        anchor: { row: bounds.top, col: bounds.left },
        focus: {
          row: Math.max(bounds.top, lastRow),
          col: bounds.left + Math.max(0, targetCols - 1),
        },
        kind: 'cells',
      },
      false,
    );
    announce(messages.spreadsheetPasted({ count, skipped }));
  };
  const pasteFromClipboard = async () => {
    try {
      paste(await navigator.clipboard.readText());
    } catch {
      announce(messages.spreadsheetPasteBlocked);
    }
  };
  const fill = (direction: 'down' | 'right') => {
    if (!canEditData || !bounds) {
      return;
    }
    const writes: { row: number; columnId: string; value: SpreadsheetValue }[] = [];
    if (direction === 'down') {
      const source = rowAt(bounds.top);
      for (let col = bounds.left; col <= bounds.right; col++) {
        const entry = visible[col];
        if (!entry || entry.isReadOnly || !source) {
          continue;
        }
        const value = source[entry.column.id] ?? null;
        for (let row = bounds.top + 1; row <= bounds.bottom; row++) {
          if (!Object.is(rowAt(row)?.[entry.column.id] ?? null, value)) {
            writes.push({ row, columnId: entry.column.id, value });
          }
        }
      }
    } else {
      const sourceEntry = visible[bounds.left];
      for (let row = bounds.top; row <= bounds.bottom; row++) {
        const data = rowAt(row);
        if (!sourceEntry || !data) {
          continue;
        }
        const text = sourceEntry.format.copy(data[sourceEntry.column.id]);
        for (let col = bounds.left + 1; col <= bounds.right; col++) {
          const entry = visible[col];
          if (!entry || entry.isReadOnly) {
            continue;
          }
          const parsed = parseForColumn(entry.format, text, data);
          if (
            parsed.error === undefined &&
            !Object.is(parsed.value, data[entry.column.id] ?? null)
          ) {
            writes.push({ row, columnId: entry.column.id, value: parsed.value });
          }
        }
      }
    }
    writeValues(writes);
  };

  // ---- Row operations ----

  const selectRows = (top: number, count: number) => {
    select({
      anchor: { row: top, col: clamped?.anchor.col ?? 0 },
      focus: { row: top + count - 1, col: clamped?.anchor.col ?? 0 },
      kind: 'rows',
    });
  };
  /** Inserts rows at a view position (and next to that row in the data). */
  const insertRowsAt = (viewPosition: number, made: SpreadsheetRow[]) => {
    if (made.length === 0) {
      return;
    }
    const below = baseIndexAt(viewPosition - 1);
    const at =
      viewPosition >= viewCount
        ? below === undefined
          ? latestRows.current.length
          : below + 1
        : (baseIndexAt(viewPosition) ?? latestRows.current.length);
    commit(
      [{ type: 'insert', entries: made.map((row, index) => ({ index: at + index, row })) }],
      (current) =>
        current === null
          ? null
          : [
              ...current.slice(0, viewPosition),
              ...made.map(getRowId),
              ...current.slice(viewPosition),
            ],
    );
    selectRows(viewPosition, made.length);
    announce(messages.spreadsheetRowsInserted({ count: made.length }));
  };
  const insertRows = (where: 'above' | 'below') => {
    if (!makeRow) {
      return;
    }
    const count = Math.max(1, size.rows);
    const position = bounds ? (where === 'above' ? bounds.top : bounds.bottom + 1) : viewCount;
    insertRowsAt(
      position,
      Array.from({ length: count }, () => makeRow()),
    );
  };
  const addRow = () => {
    if (!makeRow) {
      return;
    }
    insertRowsAt(viewCount, [makeRow()]);
    select(cellSelection(viewCount, 0));
  };
  const duplicateRows = () => {
    if (!makeRow || !bounds) {
      return;
    }
    const columnIds = new Set(columns.map((column) => column.id));
    const copies: SpreadsheetRow[] = [];
    for (let row = bounds.top; row <= bounds.bottom; row++) {
      const data = rowAt(row);
      if (data) {
        copies.push({
          ...makeRow(),
          ...Object.fromEntries(Object.entries(data).filter(([key]) => columnIds.has(key))),
        });
      }
    }
    insertRowsAt(bounds.bottom + 1, copies);
  };
  const deleteRows = () => {
    if (!canEditData || !bounds) {
      return;
    }
    const removed: { index: number; row: SpreadsheetRow }[] = [];
    const removedIds = new Set<string>();
    for (let row = bounds.top; row <= bounds.bottom; row++) {
      const base = baseIndexAt(row);
      const data = base === undefined ? undefined : latestRows.current[base];
      if (base !== undefined && data) {
        removed.push({ index: base, row: data });
        removedIds.add(getRowId(data));
      }
    }
    removed.sort((a, b) => a.index - b.index);
    commit([{ type: 'remove', entries: removed }], (current) =>
      current === null ? null : current.filter((id) => !removedIds.has(id)),
    );
    setSelection(
      cellSelection(Math.min(bounds.top, viewCount - removed.length - 1), clamped?.anchor.col ?? 0),
    );
    announce(messages.spreadsheetRowsDeleted({ count: removed.length }));
  };
  const canMoveRows = canEditData && sorting.length === 0;
  /** Moves the selected rows to before view row `target` (or to the end). */
  const moveRows = (target: number) => {
    if (!canMoveRows || !bounds || (target >= bounds.top && target <= bounds.bottom + 1)) {
      return;
    }
    const current = latestRows.current;
    const moving: { index: number; row: SpreadsheetRow }[] = [];
    for (let row = bounds.top; row <= bounds.bottom; row++) {
      const base = baseIndexAt(row);
      const data = base === undefined ? undefined : current[base];
      if (base !== undefined && data) {
        moving.push({ index: base, row: data });
      }
    }
    const movingRows = new Set(moving.map((entry) => entry.row));
    const remaining = current.filter((row) => !movingRows.has(row));
    const anchorRow = target < viewCount ? rowAt(target) : rowAt(viewCount - 1);
    const anchorIndex = anchorRow ? remaining.indexOf(anchorRow) : remaining.length - 1;
    const at = target < viewCount ? anchorIndex : anchorIndex + 1;
    const removed = [...moving].sort((a, b) => a.index - b.index);
    const count = moving.length;
    const newTop = target > bounds.bottom ? target - count : target;
    const movingIds = moving.map((entry) => getRowId(entry.row));
    commit(
      [
        { type: 'remove', entries: removed },
        {
          type: 'insert',
          entries: moving.map((entry, index) => ({ index: at + index, row: entry.row })),
        },
      ],
      (current) => {
        if (current === null) {
          return null;
        }
        const rest = current.filter((id) => !movingIds.includes(id));
        return [...rest.slice(0, newTop), ...movingIds, ...rest.slice(newTop)];
      },
    );
    selectRows(newTop, count);
    announce(messages.spreadsheetRowsMoved({ count }));
  };

  // ---- Column operations ----

  const setSorting = (next: readonly TableSort[]) => {
    setSortingState(next);
  };
  const sortBy = (col: number, direction: TableSort['direction'], isThen: boolean) => {
    const id = visible[col]?.column.id;
    if (id === undefined) {
      return;
    }
    const sort = { column: id, direction };
    setSorting(isThen ? [...sorting.filter((entry) => entry.column !== id), sort] : [sort]);
  };
  const clearFilter = (id: string) => {
    const { [id]: _, ...rest } = filterValues;
    setFilterValues(rest);
  };
  /** The columns an action on `col` applies to: the selected columns when `col` is among them. */
  const targetColumns = (col: number): number[] => {
    if (
      bounds &&
      (clamped?.kind === 'columns' || clamped?.kind === 'all') &&
      col >= bounds.left &&
      col <= bounds.right
    ) {
      return Array.from(
        { length: bounds.right - bounds.left + 1 },
        (_, index) => bounds.left + index,
      );
    }
    return [col];
  };
  const hideColumns = (col: number) => {
    const hide = targetColumns(col).flatMap((index) => visible[index]?.column.id ?? []);
    if (hide.length < colCount) {
      setHiddenColumns(new Set([...hiddenColumns, ...hide]));
    }
  };
  const commitColumns = (next: readonly SpreadsheetColumn[], extra: SheetChange[] = []) => {
    commit([{ type: 'columns', before: latestColumns.current, after: next }, ...extra]);
  };
  const resizeColumn = (columnId: string, width: number) => {
    if (canEditSchema && onColumnsChange) {
      commitColumns(
        latestColumns.current.map((column) =>
          column.id === columnId ? { ...column, width: `${String(width)}px` } : column,
        ),
      );
      setWidthOverrides(({ [columnId]: _, ...rest }) => rest);
    } else {
      setWidthOverrides((current) => ({ ...current, [columnId]: width }));
    }
  };
  /** Fits a column to its header and the values in view. */
  const fitWidth = (col: number) => {
    const entry = visible[col];
    const grid = scrollRef.current;
    if (!entry || !grid) {
      return;
    }
    const context = document.createElement('canvas').getContext('2d');
    if (!context) {
      return;
    }
    context.font = getComputedStyle(grid).font;
    let widest = context.measureText(entry.column.label).width + 48;
    for (const item of virtualRows) {
      const text = entry.format.display(rowAt(item.index)?.[entry.column.id]);
      widest = Math.max(widest, context.measureText(text).width + 24);
    }
    resizeColumn(entry.column.id, clampWidth(Math.ceil(widest)));
  };
  const newColumnId = () => {
    const taken = new Set(latestColumns.current.map((column) => column.id));
    for (const row of latestRows.current.slice(0, 100)) {
      for (const key of Object.keys(row)) {
        taken.add(key);
      }
    }
    let number = latestColumns.current.length + 1;
    while (taken.has(`column-${String(number)}`)) {
      number++;
    }
    return { id: `column-${String(number)}`, number };
  };
  const insertColumn = (col: number, after: boolean) => {
    if (!canEditSchema) {
      return;
    }
    const current = latestColumns.current;
    const neighbour = visible[col]?.column;
    const index = neighbour ? current.indexOf(neighbour) + (after ? 1 : 0) : current.length;
    const { id, number } = newColumnId();
    const column: SpreadsheetColumn = {
      id,
      label: messages.spreadsheetNewColumn({ number }),
      type: 'text',
      ...(neighbour?.group === undefined ? {} : { group: neighbour.group }),
    };
    commitColumns([...current.slice(0, index), column, ...current.slice(index)]);
    const newCol = neighbour ? col + (after ? 1 : 0) : colCount;
    select({
      anchor: { row: clamped?.anchor.row ?? 0, col: newCol },
      focus: { row: clamped?.anchor.row ?? 0, col: newCol },
      kind: 'columns',
    });
  };
  const deleteColumns = (col: number) => {
    if (!canEditSchema) {
      return;
    }
    const gone = new Set(targetColumns(col).flatMap((index) => visible[index]?.column.id ?? []));
    if (gone.size === 0 || gone.size >= colCount) {
      return;
    }
    const drop = Object.fromEntries([...gone].map((id) => [id, undefined]));
    const entries = latestRows.current.flatMap((row) =>
      [...gone].some((id) => id in row) ? [{ before: row, after: patchRow(row, drop) }] : [],
    );
    commitColumns(
      latestColumns.current.filter((column) => !gone.has(column.id)),
      entries.length > 0 ? [{ type: 'replace', entries }] : [],
    );
    if (Object.keys(filterValues).some((id) => gone.has(id))) {
      setFilterValues(
        Object.fromEntries(Object.entries(filterValues).filter(([id]) => !gone.has(id))),
      );
    }
    if (sorting.some((sort) => gone.has(sort.column))) {
      setSorting(sorting.filter((sort) => !gone.has(sort.column)));
    }
  };
  const moveColumn = (col: number, step: -1 | 1) => {
    const entry = visible[col];
    const neighbour = visible[col + step];
    if (!canEditSchema || !entry || !neighbour) {
      return;
    }
    const without = latestColumns.current.filter((column) => column !== entry.column);
    const at = without.indexOf(neighbour.column) + (step > 0 ? 1 : 0);
    commitColumns([...without.slice(0, at), entry.column, ...without.slice(at)]);
    select({
      anchor: { row: clamped?.anchor.row ?? 0, col: col + step },
      focus: { row: clamped?.anchor.row ?? 0, col: col + step },
      kind: 'columns',
    });
  };
  const saveColumnSettings = (next: SpreadsheetColumn) => {
    const previous = latestColumns.current.find((column) => column.id === next.id);
    if (!previous) {
      return;
    }
    const extra: SheetChange[] = [];
    if (typeOf(previous) !== typeOf(next)) {
      // Convert what fits the new type; keep the rest (it shows as a problem).
      const from = formats.get(previous.id);
      const to = columnFormat(next, locale, messages, collator);
      const entries = latestRows.current.flatMap((row) => {
        const value = row[next.id];
        if (!from || isEmptyValue(value)) {
          return [];
        }
        const parsed = to.parse(from.copy(value));
        return parsed.error === undefined && !Object.is(parsed.value, value)
          ? [{ before: row, after: patchRow(row, { [next.id]: parsed.value }) }]
          : [];
      });
      if (entries.length > 0) {
        extra.push({ type: 'replace', entries });
      }
    }
    commitColumns(
      latestColumns.current.map((column) => (column.id === next.id ? next : column)),
      extra,
    );
    setWidthOverrides(({ [next.id]: _, ...rest }) => rest);
    setSettingsOverlay(closeOverlay);
  };

  const openFilter = (col: number) => {
    const entry = visible[col];
    if (!entry) {
      return;
    }
    filterAnchor.current =
      scrollRef.current?.querySelector<HTMLElement>(`[data-header-col="${String(col)}"]`) ??
      scrollRef.current;
    setFilterOverlay({ id: entry.column.id, isOpen: true });
  };

  /** Moves to the next cell with a problem (the app's or the column's), in view order. */
  const nextProblem = () => {
    const start = active ? active.row * colCount + active.col + 1 : 0;
    const total = viewCount * colCount;
    for (let step = 0; step < total; step++) {
      const position = (start + step) % total;
      const row = Math.floor(position / colCount);
      const col = position % colCount;
      const data = rowAt(row);
      const entry = visible[col];
      if (!data || !entry) {
        continue;
      }
      const error =
        errors[getRowId(data)]?.[entry.column.id] ??
        entry.format.check(data[entry.column.id], data);
      if (error !== undefined) {
        select(cellSelection(row, col));
        focusGrid();
        announce(error);
        return;
      }
    }
    announce(messages.spreadsheetNoProblems);
  };

  // ---- Menus ----

  /** A shortcut hint with the platform's command key ("⌘C" or "Ctrl+C"). */
  const modHint = (key: string) => `${isApple ? '⌘' : 'Ctrl+'}${key}`;

  const columnMenuItems = (col: number): ReactNode[] => {
    const entry = visible[col];
    if (!entry) {
      return [];
    }
    const id = entry.column.id;
    const sortLevel = sorting.findIndex((sort) => sort.column === id);
    const count = targetColumns(col).length;
    const items: ReactNode[] = [
      <MenuItem key="sortAsc" id="sortAsc" icon={ArrowUpAZ}>
        {messages.spreadsheetSortAscending}
      </MenuItem>,
      <MenuItem key="sortDesc" id="sortDesc" icon={ArrowDownAZ}>
        {messages.spreadsheetSortDescending}
      </MenuItem>,
    ];
    if (sorting.length > 0 && sortLevel !== 0) {
      items.push(
        <MenuItem key="thenAsc" id="thenAsc" icon={ArrowUpNarrowWide}>
          {messages.spreadsheetThenSortAscending}
        </MenuItem>,
        <MenuItem key="thenDesc" id="thenDesc" icon={ArrowDownWideNarrow}>
          {messages.spreadsheetThenSortDescending}
        </MenuItem>,
      );
    }
    if (sortLevel >= 0) {
      items.push(
        <MenuItem key="clearSort" id="clearSort" icon={X}>
          {messages.spreadsheetClearSort}
        </MenuItem>,
      );
    }
    items.push(
      <MenuSeparator key="sep-filter" />,
      <MenuItem key="filter" id="filter" icon={ListFilter}>
        {messages.spreadsheetFilter}
      </MenuItem>,
    );
    if (isFilterActive(filterValues[id])) {
      items.push(
        <MenuItem key="clearFilter" id="clearFilter" icon={FunnelX}>
          {messages.spreadsheetClearFilter}
        </MenuItem>,
      );
    }
    items.push(
      <MenuSeparator key="sep-view" />,
      <MenuItem key="hide" id="hide" icon={EyeOff} isDisabled={count >= colCount}>
        {messages.spreadsheetHideColumns({ count })}
      </MenuItem>,
      <MenuItem key="fitWidth" id="fitWidth" icon={MoveHorizontal}>
        {messages.spreadsheetFitWidth}
      </MenuItem>,
    );
    if (canEditSchema) {
      items.push(
        <MenuSeparator key="sep-schema" />,
        <MenuItem key="insertColumnBefore" id="insertColumnBefore" icon={BetweenVerticalStart}>
          {messages.spreadsheetInsertColumnBefore}
        </MenuItem>,
        <MenuItem key="insertColumnAfter" id="insertColumnAfter" icon={BetweenVerticalEnd}>
          {messages.spreadsheetInsertColumnAfter}
        </MenuItem>,
        <MenuItem
          key="moveColumnEarlier"
          id="moveColumnEarlier"
          icon={isRtl ? ArrowRight : ArrowLeft}
          isDisabled={col === 0}
        >
          {messages.spreadsheetMoveColumnEarlier}
        </MenuItem>,
        <MenuItem
          key="moveColumnLater"
          id="moveColumnLater"
          icon={isRtl ? ArrowLeft : ArrowRight}
          isDisabled={col >= colCount - 1}
        >
          {messages.spreadsheetMoveColumnLater}
        </MenuItem>,
        <MenuItem key="columnSettings" id="columnSettings" icon={Settings2}>
          {messages.spreadsheetColumnSettings}
        </MenuItem>,
        <MenuItem
          key="deleteColumns"
          id="deleteColumns"
          icon={Trash2}
          tone="danger"
          isDisabled={count >= colCount}
        >
          {messages.spreadsheetDeleteColumns({ count })}
        </MenuItem>,
      );
    }
    return items;
  };

  const cellMenuItems = (): ReactNode[] => {
    if (!clamped || !bounds || !active) {
      return [];
    }
    if (clamped.kind === 'columns') {
      return columnMenuItems(active.col);
    }
    const isSingle = size.cells === 1;
    const items: ReactNode[] = [];
    if (canEditData) {
      items.push(
        <MenuItem key="cut" id="cut" icon={Scissors} shortcut={modHint('X')}>
          {messages.spreadsheetCut}
        </MenuItem>,
      );
    }
    items.push(
      <MenuItem key="copy" id="copy" icon={Copy} shortcut={modHint('C')}>
        {messages.copy}
      </MenuItem>,
      <MenuItem key="copyWithHeaders" id="copyWithHeaders" icon={ClipboardCopy}>
        {messages.spreadsheetCopyWithHeaders}
      </MenuItem>,
    );
    if (canEditData) {
      items.push(
        <MenuItem key="paste" id="paste" icon={ClipboardPaste} shortcut={modHint('V')}>
          {messages.spreadsheetPaste}
        </MenuItem>,
      );
    }
    items.push(<MenuSeparator key="sep-edit" />);
    if (isSingle && canEditData && !isCellReadOnly(active.col)) {
      items.push(
        <MenuItem key="edit" id="edit" icon={TextCursorInput} shortcut="F2">
          {messages.spreadsheetEditCell}
        </MenuItem>,
      );
    }
    items.push(
      <MenuItem key="editRow" id="editRow" icon={SquarePen}>
        {messages.spreadsheetEditRow}
      </MenuItem>,
    );
    if (canEditData) {
      items.push(
        <MenuItem key="clear" id="clear" icon={Eraser} shortcut={isApple ? '⌫' : 'Del'}>
          {messages.spreadsheetClearCells({ count: size.cells })}
        </MenuItem>,
      );
      if (size.rows > 1) {
        items.push(
          <MenuItem key="fillDown" id="fillDown" icon={ArrowDownToLine} shortcut={modHint('D')}>
            {messages.spreadsheetFillDown}
          </MenuItem>,
        );
      }
      if (size.cols > 1) {
        items.push(
          <MenuItem key="fillRight" id="fillRight" icon={ArrowRightToLine} shortcut={modHint('R')}>
            {messages.spreadsheetFillRight}
          </MenuItem>,
        );
      }
    }
    if (canEditData) {
      const count = size.rows;
      items.push(<MenuSeparator key="sep-rows" />);
      if (canAddRows) {
        items.push(
          <MenuItem key="insertAbove" id="insertAbove" icon={BetweenHorizontalStart}>
            {messages.spreadsheetInsertRowsAbove({ count })}
          </MenuItem>,
          <MenuItem key="insertBelow" id="insertBelow" icon={BetweenHorizontalEnd}>
            {messages.spreadsheetInsertRowsBelow({ count })}
          </MenuItem>,
          <MenuItem key="duplicate" id="duplicate" icon={CopyPlus}>
            {messages.spreadsheetDuplicateRows({ count })}
          </MenuItem>,
        );
      }
      if (canMoveRows) {
        items.push(
          <MenuItem key="moveUp" id="moveUp" icon={ArrowUp} isDisabled={bounds.top === 0}>
            {messages.spreadsheetMoveRowsUp({ count })}
          </MenuItem>,
          <MenuItem
            key="moveDown"
            id="moveDown"
            icon={ArrowDown}
            isDisabled={bounds.bottom >= viewCount - 1}
          >
            {messages.spreadsheetMoveRowsDown({ count })}
          </MenuItem>,
        );
      }
      items.push(
        <MenuItem key="deleteRows" id="deleteRows" icon={Trash2} tone="danger">
          {messages.spreadsheetDeleteRows({ count })}
        </MenuItem>,
      );
    }
    // The active column's actions, one level down.
    const columnLabel = activeVisible?.column.label ?? '';
    items.push(
      <MenuSeparator key="sep-column" />,
      <SubmenuTrigger key="column">
        <MenuItem id="column" icon={Columns3}>
          {messages.spreadsheetColumnOptions({ column: columnLabel })}
        </MenuItem>
        <Menu
          onAction={(key) => {
            runAction(key, active.col);
          }}
        >
          {columnMenuItems(active.col)}
        </Menu>
      </SubmenuTrigger>,
    );
    return items;
  };

  const runAction = (key: Key, colArg?: number) => {
    const col = colArg ?? active?.col ?? 0;
    const columnId = visible[col]?.column.id;
    switch (String(key)) {
      case 'cut':
        void copyToClipboard(true);
        break;
      case 'copy':
        void copyToClipboard(false);
        break;
      case 'copyWithHeaders':
        void copyToClipboard(false, true);
        break;
      case 'paste':
        void pasteFromClipboard();
        break;
      case 'edit':
        if (active) {
          startEdit(active);
        }
        break;
      case 'editRow':
        if (active) {
          const data = rowAt(active.row);
          if (data) {
            setRowOverlay({ id: getRowId(data), index: active.row, isOpen: true });
          }
        }
        break;
      case 'clear':
        announce(messages.spreadsheetCleared({ count: clearSelected() }));
        break;
      case 'fillDown':
        fill('down');
        break;
      case 'fillRight':
        fill('right');
        break;
      case 'insertAbove':
        insertRows('above');
        break;
      case 'insertBelow':
        insertRows('below');
        break;
      case 'duplicate':
        duplicateRows();
        break;
      case 'moveUp':
        if (bounds) {
          moveRows(bounds.top - 1);
        }
        break;
      case 'moveDown':
        if (bounds) {
          moveRows(bounds.bottom + 2);
        }
        break;
      case 'deleteRows':
        deleteRows();
        break;
      case 'sortAsc':
        sortBy(col, 'ascending', false);
        break;
      case 'sortDesc':
        sortBy(col, 'descending', false);
        break;
      case 'thenAsc':
        sortBy(col, 'ascending', true);
        break;
      case 'thenDesc':
        sortBy(col, 'descending', true);
        break;
      case 'clearSort':
        setSorting(sorting.filter((sort) => sort.column !== columnId));
        break;
      case 'filter':
        openFilter(col);
        break;
      case 'clearFilter':
        if (columnId !== undefined) {
          clearFilter(columnId);
        }
        break;
      case 'hide':
        hideColumns(col);
        break;
      case 'fitWidth':
        fitWidth(col);
        break;
      case 'insertColumnBefore':
        insertColumn(col, false);
        break;
      case 'insertColumnAfter':
        insertColumn(col, true);
        break;
      case 'moveColumnEarlier':
        moveColumn(col, -1);
        break;
      case 'moveColumnLater':
        moveColumn(col, 1);
        break;
      case 'columnSettings':
        if (columnId !== undefined) {
          setSettingsOverlay({ id: columnId, isOpen: true });
        }
        break;
      case 'deleteColumns':
        deleteColumns(col);
        break;
    }
  };

  const renderColumnMenu = useStableCallback(columnMenuItems);
  const onColumnAction = useStableCallback((key: string, col: number) => {
    runAction(key, col);
  });
  const columnOptionsLabel = useStableCallback((column: string) =>
    messages.spreadsheetColumnOptions({ column }),
  );
  const focusGridStable = useStableCallback(() => {
    // An action may have opened an overlay (a filter, column settings), which keeps focus.
    if (!filterOverlay?.isOpen && !settingsOverlay?.isOpen && !rowOverlay?.isOpen) {
      focusGrid();
    }
  });
  const selectAll = useStableCallback(() => {
    if (viewCount > 0 && colCount > 0) {
      select(
        {
          anchor: { row: 0, col: 0 },
          focus: { row: viewCount - 1, col: colCount - 1 },
          kind: 'all',
        },
        false,
      );
    }
    focusGrid();
  });

  // ---- Keyboard ----

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || viewCount === 0 || colCount === 0) {
      return;
    }
    const isMod = event.metaKey || event.ctrlKey;
    const key = event.key;
    const position = clamped?.anchor ?? { row: 0, col: 0 };
    const focus = clamped?.focus ?? position;
    const handled = () => {
      event.preventDefault();
    };
    if (!clamped && !isMod && key !== 'Tab') {
      handled();
      select(cellSelection(0, 0));
      return;
    }
    if (isMod && !event.altKey) {
      switch (key.toLowerCase()) {
        case 'a':
          handled();
          selectAll();
          return;
        case 'z':
          handled();
          undoOrRedo(event.shiftKey);
          return;
        case 'y':
          handled();
          undoOrRedo(true);
          return;
        case 'd':
          handled();
          fill('down');
          return;
        case 'r':
          handled();
          fill('right');
          return;
      }
    }
    const forward = isRtl ? -1 : 1;
    const page = Math.max(
      1,
      Math.floor(((scrollRef.current?.clientHeight ?? 0) - headerHeight) / rowHeight) - 1,
    );
    const arrow = (rowStep: number, colStep: number) => {
      handled();
      const from = event.shiftKey ? focus : position;
      moveTo(
        isMod ? jump(from, rowStep, colStep) : { row: from.row + rowStep, col: from.col + colStep },
        event.shiftKey,
      );
    };
    switch (key) {
      case 'ArrowDown':
        arrow(1, 0);
        return;
      case 'ArrowUp':
        arrow(-1, 0);
        return;
      case 'ArrowRight':
        arrow(0, forward);
        return;
      case 'ArrowLeft':
        arrow(0, -forward);
        return;
      case 'Home':
        handled();
        moveTo(
          { row: isMod ? 0 : (event.shiftKey ? focus : position).row, col: 0 },
          event.shiftKey,
        );
        return;
      case 'End':
        handled();
        moveTo(
          {
            row: isMod ? viewCount - 1 : (event.shiftKey ? focus : position).row,
            col: colCount - 1,
          },
          event.shiftKey,
        );
        return;
      case 'PageDown':
        arrow(page, 0);
        return;
      case 'PageUp':
        arrow(-page, 0);
        return;
      case 'Tab': {
        const col = position.col + (event.shiftKey ? -1 : 1);
        if (col >= 0 && col < colCount) {
          handled();
          moveTo({ row: position.row, col }, false);
        }
        return;
      }
      case 'Enter':
      case 'F2':
        handled();
        startEdit(position);
        return;
      case 'Escape':
        if (size.cells > 1) {
          handled();
          select(cellSelection(position.row, position.col), false);
        }
        return;
      case 'Delete':
      case 'Backspace':
        handled();
        if (canEditData) {
          clearSelected();
        }
        return;
      case ' ':
        handled();
        if (event.shiftKey) {
          select(
            { anchor: position, focus: { row: focus.row, col: position.col }, kind: 'rows' },
            false,
          );
        } else if (isMod) {
          select(
            { anchor: position, focus: { row: position.row, col: focus.col }, kind: 'columns' },
            false,
          );
        } else if (activeVisible?.format.type === 'boolean') {
          // Space toggles the selected checkboxes together, to the opposite of the active one.
          const value = rowAt(position.row)?.[activeVisible.column.id] !== true;
          const writes: { row: number; columnId: string; value: SpreadsheetValue }[] = [];
          eachSelectedCell((row, col) => {
            const entry = visible[col];
            if (entry?.format.type === 'boolean' && !entry.isReadOnly) {
              writes.push({ row, columnId: entry.column.id, value });
            }
          });
          writeValues(writes);
        } else {
          startEdit(position, ' ');
        }
        return;
    }
    if (key.length === 1 && !isMod && !event.altKey) {
      handled();
      startEdit(position, key);
    }
  };

  // ---- Clipboard: the system's copy, cut and paste events while the grid has focus ----

  const onClipboard = useStableCallback((event: ClipboardEvent) => {
    const grid = scrollRef.current;
    if (!grid || document.activeElement !== grid || !event.clipboardData || !clamped) {
      return;
    }
    event.preventDefault();
    if (event.type === 'paste') {
      paste(event.clipboardData.getData('text/plain'));
      return;
    }
    event.clipboardData.setData('text/plain', selectionText(false));
    if (event.type === 'cut' && canEditData) {
      clearSelected();
      announce(messages.spreadsheetCutDone({ count: size.cells }));
    } else {
      announce(messages.spreadsheetCopied({ count: size.cells }));
    }
  });
  useEffect(() => {
    document.addEventListener('copy', onClipboard);
    document.addEventListener('cut', onClipboard);
    document.addEventListener('paste', onClipboard);
    return () => {
      document.removeEventListener('copy', onClipboard);
      document.removeEventListener('cut', onClipboard);
      document.removeEventListener('paste', onClipboard);
    };
  }, [onClipboard]);

  // ---- Pointer ----

  /** The cell under a point, clamped to the sheet. */
  const hitTest = (clientX: number, clientY: number): CellPosition & { x: number; y: number } => {
    const grid = scrollRef.current;
    const rect = grid?.getBoundingClientRect();
    if (!grid || !rect) {
      return { row: 0, col: 0, x: 0, y: 0 };
    }
    const x =
      (isRtl
        ? rect.right - grid.clientLeft - clientX - grid.scrollLeft
        : clientX - rect.left - grid.clientLeft + grid.scrollLeft) - rowHeaderWidth;
    const y = clientY - rect.top - grid.clientTop + grid.scrollTop - headerHeight;
    return {
      row: clamp(Math.floor(y / rowHeight), 0, Math.max(0, viewCount - 1)),
      col: Math.max(0, columnAt(offsets, x)),
      x,
      y,
    };
  };

  const dragTo = (clientX: number, clientY: number) => {
    const drag = dragRef.current;
    if (!drag || !clamped) {
      return;
    }
    const hit = hitTest(clientX, clientY);
    switch (drag.kind) {
      case 'cells':
        setSelection({ ...clamped, focus: hit, kind: 'cells' });
        return;
      case 'rows':
        setSelection({ ...clamped, focus: { row: hit.row, col: clamped.focus.col }, kind: 'rows' });
        return;
      case 'columns':
        setSelection({
          ...clamped,
          focus: { row: clamped.focus.row, col: hit.col },
          kind: 'columns',
        });
        return;
      case 'move': {
        const target = clamp(Math.round(hit.y / rowHeight), 0, viewCount);
        drag.target = target;
        setMoveTarget(
          bounds && target >= bounds.top && target <= bounds.bottom + 1 ? null : target,
        );
        return;
      }
      case 'resize': {
        const delta = (clientX - drag.startX) * (isRtl ? -1 : 1);
        drag.width = clampWidth(drag.startWidth + delta);
        setWidthOverrides((current) => ({ ...current, [drag.columnId]: drag.width }));
        return;
      }
    }
  };

  /** Scrolls while a drag is held near the grid's edges. */
  const autoScroll = useStableCallback(() => {
    scrollFrame.current = null;
    const drag = dragRef.current;
    const grid = scrollRef.current;
    if (!drag || drag.kind === 'resize' || !grid) {
      return;
    }
    const rect = grid.getBoundingClientRect();
    const edge = (value: number, start: number, end: number) =>
      value < start + DRAG_SCROLL_EDGE
        ? value - start - DRAG_SCROLL_EDGE
        : value > end - DRAG_SCROLL_EDGE
          ? value - end + DRAG_SCROLL_EDGE
          : 0;
    const dy = edge(drag.y, rect.top + headerHeight, rect.bottom);
    const dx =
      drag.kind === 'rows' || drag.kind === 'move'
        ? 0
        : edge(
            drag.x,
            rect.left + (isRtl ? 0 : rowHeaderWidth),
            rect.right - (isRtl ? rowHeaderWidth : 0),
          );
    if (dx !== 0 || dy !== 0) {
      grid.scrollBy(dx / 2, dy / 2);
      dragTo(drag.x, drag.y);
      scrollFrame.current = requestAnimationFrame(autoScroll);
    }
  });
  useEffect(
    () => () => {
      if (scrollFrame.current !== null) {
        cancelAnimationFrame(scrollFrame.current);
      }
    },
    [],
  );

  /** A press on a cell, header or row number, from a mouse (with drag) or a tap. */
  const pressAt = (
    target: Element,
    clientX: number,
    clientY: number,
    isShift: boolean,
    pointerId: number | null,
  ) => {
    const startDrag = (kind: 'cells' | 'rows' | 'columns' | 'move') => {
      if (pointerId !== null) {
        dragRef.current =
          kind === 'move'
            ? { kind, pointerId, x: clientX, y: clientY, target: -1 }
            : { kind, pointerId, x: clientX, y: clientY };
      }
    };
    const header = target.closest<HTMLElement>('[data-header-col]');
    const rowHeader = target.closest<HTMLElement>('[data-row-header]');
    const cell = target.closest<HTMLElement>('[data-row][data-col]');
    if (header) {
      const col = Number(header.dataset.headerCol);
      const row = clamped?.anchor.row ?? 0;
      const anchor = isShift && clamped?.kind === 'columns' ? clamped.anchor : { row, col };
      select({ anchor, focus: { row, col }, kind: 'columns' }, false);
      startDrag('columns');
      return;
    }
    if (rowHeader) {
      const row = Number(rowHeader.dataset.rowHeader);
      if (
        canMoveRows &&
        !isShift &&
        clamped?.kind === 'rows' &&
        bounds &&
        row >= bounds.top &&
        row <= bounds.bottom &&
        pointerId !== null
      ) {
        startDrag('move');
        return;
      }
      const col = clamped?.anchor.col ?? 0;
      const anchor = isShift && clamped?.kind === 'rows' ? clamped.anchor : { row, col };
      select({ anchor, focus: { row, col }, kind: 'rows' }, false);
      startDrag('rows');
      return;
    }
    if (cell) {
      const position = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
      if (isShift && clamped) {
        select({ anchor: clamped.anchor, focus: position, kind: 'cells' }, false);
      } else {
        select(cellSelection(position.row, position.col), false);
        if (target.closest('[data-toggle]')) {
          startEdit(position);
          return;
        }
      }
      startDrag('cells');
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as Element;
    if (
      target.closest('input, [data-column-menu], button') ||
      !event.currentTarget.contains(target)
    ) {
      return;
    }
    if (editingRef.current) {
      commitEdit('none', undefined, true);
    }
    if (document.activeElement !== event.currentTarget) {
      event.currentTarget.focus({ preventScroll: true });
    }
    if (event.pointerType === 'touch') {
      touchRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      return;
    }
    if (event.button === 2) {
      // A right-click outside the selection selects what was clicked; inside, it keeps the selection.
      const cell = target.closest<HTMLElement>('[data-row][data-col]');
      const header = target.closest<HTMLElement>('[data-header-col]');
      const rowHeader = target.closest<HTMLElement>('[data-row-header]');
      const row = Number(cell?.dataset.row ?? rowHeader?.dataset.rowHeader ?? -1);
      const col = Number(cell?.dataset.col ?? header?.dataset.headerCol ?? -1);
      const isInside =
        bounds !== null &&
        (row < 0 || (row >= bounds.top && row <= bounds.bottom)) &&
        (col < 0 || (col >= bounds.left && col <= bounds.right));
      if (!isInside) {
        pressAt(target, event.clientX, event.clientY, false, null);
      }
      return;
    }
    if (event.button !== 0) {
      return;
    }
    const resize = target.closest<HTMLElement>('[data-resize-col]');
    if (resize) {
      const col = Number(resize.dataset.resizeCol);
      const entry = visible[col];
      if (entry) {
        event.preventDefault();
        dragRef.current = {
          kind: 'resize',
          pointerId: event.pointerId,
          col,
          columnId: entry.column.id,
          startX: event.clientX,
          startWidth: entry.width,
          width: entry.width,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      return;
    }
    pressAt(target, event.clientX, event.clientY, event.shiftKey, event.pointerId);
    if (dragRef.current) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) {
      return;
    }
    if (drag.kind !== 'resize') {
      drag.x = event.clientX;
      drag.y = event.clientY;
    }
    dragTo(event.clientX, event.clientY);
    if (scrollFrame.current === null && drag.kind !== 'resize') {
      scrollFrame.current = requestAnimationFrame(autoScroll);
    }
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const touch = touchRef.current;
    touchRef.current = null;
    if (touch?.pointerId === event.pointerId) {
      if (Math.hypot(event.clientX - touch.x, event.clientY - touch.y) < 10) {
        pressAt(event.target as Element, event.clientX, event.clientY, false, null);
      }
      return;
    }
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.pointerId !== event.pointerId) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (drag.kind === 'resize') {
      resizeColumn(drag.columnId, drag.width);
    } else if (drag.kind === 'move') {
      setMoveTarget(null);
      if (drag.target >= 0) {
        moveRows(drag.target);
      }
    }
  };
  const onDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    // A drag's pointer capture sends the double-click to the grid itself: find what's under the pointer.
    const target =
      (event.target === event.currentTarget
        ? document.elementFromPoint(event.clientX, event.clientY)
        : null) ?? (event.target as Element);
    if (target.closest('input, [data-column-menu], button')) {
      return;
    }
    const resize = target.closest<HTMLElement>('[data-resize-col]');
    if (resize) {
      fitWidth(Number(resize.dataset.resizeCol));
      return;
    }
    const header = target.closest<HTMLElement>('[data-header-col]');
    if (header && canEditSchema) {
      const columnId = visible[Number(header.dataset.headerCol)]?.column.id;
      if (columnId !== undefined) {
        setSettingsOverlay({ id: columnId, isOpen: true });
      }
      return;
    }
    const rowHeader = target.closest<HTMLElement>('[data-row-header]');
    if (rowHeader) {
      const index = Number(rowHeader.dataset.rowHeader);
      const data = rowAt(index);
      if (data) {
        setRowOverlay({ id: getRowId(data), index, isOpen: true });
      }
      return;
    }
    const cell = target.closest<HTMLElement>('[data-row][data-col]');
    if (cell && !target.closest('[data-toggle]')) {
      startEdit({ row: Number(cell.dataset.row), col: Number(cell.dataset.col) });
    }
  };
  const onContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    // Long presses on touch screens arrive here without a pointerdown selection: select what was pressed.
    const target = event.target as Element;
    const cell = target.closest<HTMLElement>('[data-row][data-col]');
    if (cell && bounds) {
      const row = Number(cell.dataset.row);
      const col = Number(cell.dataset.col);
      if (row < bounds.top || row > bounds.bottom || col < bounds.left || col > bounds.right) {
        select(cellSelection(row, col), false);
      }
    }
  };

  // ---- Status ----

  const boundsKey = bounds ? [bounds.top, bounds.bottom, bounds.left, bounds.right].join() : '';
  const stats = useMemo(() => {
    if (!bounds || size.cells <= 1) {
      return null;
    }
    if (size.cells > MAX_STATS_CELLS) {
      return { count: size.cells, sum: null as number | null, numbers: 0 };
    }
    let count = 0;
    let sum = 0;
    let numbers = 0;
    for (let row = bounds.top; row <= bounds.bottom; row++) {
      const base = ids ? idIndex?.get(ids[row] ?? '') : row;
      const data = base === undefined ? undefined : rows[base];
      for (let col = bounds.left; col <= bounds.right; col++) {
        const value = data?.[visible[col]?.column.id ?? ''];
        if (!isEmptyValue(value)) {
          count++;
          if (typeof value === 'number' && visible[col]?.format.type === 'number') {
            sum += value;
            numbers++;
          }
        }
      }
    }
    return { count, sum: numbers > 0 ? sum : null, numbers };
    // `boundsKey` stands for `bounds` and `size`, which are new objects every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsKey, ids, idIndex, rows, visible]);

  const activeRow = active ? rowAt(active.row) : undefined;
  const activeError =
    activeRow && activeVisible
      ? (errors[getRowId(activeRow)]?.[activeVisible.column.id] ??
        activeVisible.format.check(activeRow[activeVisible.column.id], activeRow))
      : undefined;

  const filterChips = useMemo(
    () =>
      activeFilters(
        columns.flatMap((column) => {
          const format = formats.get(column.id);
          return format ? [filterConfigFor(format)] : [];
        }),
        filterValues,
        messages,
        locale,
      ),
    [columns, formats, filterValues, messages, locale],
  );
  const sortText =
    sorting.length > 0
      ? messages.spreadsheetSortedBy({
          columns: sorting
            .map((sort) => {
              const label = formats.get(sort.column)?.column.label ?? sort.column;
              return `${label} ${sort.direction === 'ascending' ? '↑' : '↓'}`;
            })
            .join(', '),
        })
      : undefined;
  const filteredIds = useMemo(
    () =>
      new Set(
        Object.entries(filterValues)
          .filter(([, value]) => isFilterActive(value))
          .map(([id]) => id),
      ),
    [filterValues],
  );

  // ---- Render ----

  const editingVisible = editing ? visible[editing.col] : undefined;
  const editor =
    editing && editingVisible ? (
      <CellEditor
        format={editingVisible.format}
        text={editing.text}
        onTextChange={(text) => {
          const current = editingRef.current;
          if (current) {
            setEditing({ ...current, text, error: undefined });
          }
        }}
        onCommit={(move, text) => {
          commitEdit(move, text);
        }}
        onCancel={cancelEdit}
        onBlur={() => {
          commitEdit('none', undefined, true);
        }}
        isReplacing={editing.isReplacing}
        error={editing.error}
        errorId={editorErrorId}
        label={messages.spreadsheetCellLabel({
          column: editingVisible.column.label,
          row: numberFormat.format((baseIndexAt(editing.row) ?? editing.row) + 1),
        })}
        align={editingVisible.align}
        isRtl={isRtl}
      />
    ) : null;

  const overlay = bounds
    ? {
        top: headerHeight + bounds.top * rowHeight,
        height: (bounds.bottom - bounds.top + 1) * rowHeight,
        start: rowHeaderWidth + (offsets[bounds.left] ?? 0),
        width: (offsets[bounds.right + 1] ?? 0) - (offsets[bounds.left] ?? 0),
      }
    : null;
  const activeOverlay =
    active && activeVisible
      ? {
          top: headerHeight + active.row * rowHeight,
          start: rowHeaderWidth + activeVisible.offset,
          width: activeVisible.width,
        }
      : null;

  const filterEntry = filterOverlay ? formats.get(filterOverlay.id) : undefined;
  const settingsEntry = settingsOverlay
    ? visible.find((entry) => entry.column.id === settingsOverlay.id)
    : undefined;
  // Where the editor's row is now: usually where it was opened; otherwise (the rows changed underneath, which is
  // rare) found by id, while the editor is open. Closed, it keeps its place while it animates out.
  const rowEditorIndex = (() => {
    if (rowOverlay === null) {
      return -1;
    }
    const remembered = rowAt(rowOverlay.index);
    if (!rowOverlay.isOpen || (remembered && getRowId(remembered) === rowOverlay.id)) {
      return rowOverlay.index;
    }
    for (let index = 0; index < viewCount; index++) {
      const data = rowAt(index);
      if (data && getRowId(data) === rowOverlay.id) {
        return index;
      }
    }
    return -1;
  })();
  const rowEditorRow = rowEditorIndex >= 0 ? rowAt(rowEditorIndex) : undefined;

  const grid = (
    <div
      ref={scrollRef}
      role="grid"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={instructionsId}
      aria-rowcount={headerRows + viewCount}
      aria-colcount={colCount + 1}
      aria-multiselectable="true"
      aria-readonly={!canEditData || undefined}
      aria-activedescendant={
        active && !editing && viewCount > 0 ? cellId(idPrefix, active.row, active.col) : undefined
      }
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={(event) => {
        touchRef.current = null;
        if (dragRef.current?.pointerId === event.pointerId) {
          dragRef.current = null;
          setMoveTarget(null);
        }
      }}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onFocus={(event) => {
        if (event.target === event.currentTarget && !clamped && viewCount > 0 && colCount > 0) {
          setSelection(cellSelection(0, 0));
        }
      }}
      className="group/grid relative min-h-0 touch-manipulation overflow-auto overscroll-contain text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the app's maximum height.
      style={{ maxHeight }}
    >
      <div
        className="relative"
        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the sheet's full size.
        style={{ width: totalWidth, height: totalHeight }}
      >
        <div role="rowgroup" className="sticky top-0 z-[4]">
          {hasGroups && (
            <GroupRow
              ariaRowIndex={1}
              height={rowHeight}
              totalWidth={totalWidth}
              rowHeaderWidth={rowHeaderWidth}
              columns={visible}
              groups={groups}
              firstCol={colIndexes[0] ?? 0}
              lastCol={colIndexes.at(-1) ?? 0}
            />
          )}
          <HeaderRow
            idPrefix={idPrefix}
            ariaRowIndex={headerRows}
            height={rowHeight}
            totalWidth={totalWidth}
            rowHeaderWidth={rowHeaderWidth}
            columns={visible}
            colIndexes={colIndexes}
            sorting={sorting}
            filtered={filteredIds}
            selLeft={
              bounds && (clamped?.kind === 'columns' || clamped?.kind === 'all') ? bounds.left : -1
            }
            selRight={bounds ? bounds.right : -1}
            isAllSelected={clamped?.kind === 'all'}
            selectAllLabel={messages.spreadsheetSelectAll}
            columnOptionsLabel={columnOptionsLabel}
            renderColumnMenu={renderColumnMenu}
            onColumnAction={onColumnAction}
            onColumnMenuClose={focusGridStable}
            onSelectAll={selectAll}
            canResize
          />
        </div>
        <div role="rowgroup">
          {virtualRows.map((item) => {
            const data = rowAt(item.index);
            const isInRows =
              bounds !== null && item.index >= bounds.top && item.index <= bounds.bottom;
            const base = baseIndexAt(item.index);
            return (
              <SheetRow
                key={data ? getRowId(data) : `missing-${String(item.index)}`}
                idPrefix={idPrefix}
                viewIndex={item.index}
                ariaRowIndex={headerRows + item.index + 1}
                row={data}
                rowLabel={base === undefined ? '' : numberFormat.format(base + 1)}
                top={item.start}
                height={rowHeight}
                totalWidth={totalWidth}
                rowHeaderWidth={rowHeaderWidth}
                columns={visible}
                colIndexes={colIndexes}
                selLeft={isInRows ? bounds.left : -1}
                selRight={isInRows ? bounds.right : -1}
                isWholeRow={isInRows && (clamped?.kind === 'rows' || clamped?.kind === 'all')}
                activeCol={active?.row === item.index ? active.col : -1}
                activeErrorId={activeErrorId}
                errors={data ? errors[getRowId(data)] : undefined}
                editingCol={editing?.row === item.index ? editing.col : -1}
                editor={editing?.row === item.index ? editor : null}
              />
            );
          })}
        </div>
        {overlay && size.cells > 1 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-[1] border-2 border-border-strong group-focus-within/grid:border-accent-solid"
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the selection's outline.
            style={{
              top: overlay.top,
              height: overlay.height,
              insetInlineStart: overlay.start,
              width: overlay.width,
            }}
          />
        )}
        {activeOverlay && !editing && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-[1] border-2 border-border-strong group-focus-within/grid:border-accent-solid"
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the active cell's outline.
            style={{
              top: activeOverlay.top,
              height: rowHeight,
              insetInlineStart: activeOverlay.start,
              width: activeOverlay.width,
            }}
          />
        )}
        {moveTarget !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute start-0 z-[3] h-0.5 bg-accent-solid"
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: where the rows will land.
            style={{ top: headerHeight + moveTarget * rowHeight - 1, width: totalWidth }}
          />
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={ref}
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-surface-2 text-fg',
        className,
      )}
    >
      {hasToolbar && (
        <SpreadsheetToolbar
          search={search}
          onSearchChange={setSearch}
          canEdit={canEditData}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={() => {
            undoOrRedo(false);
          }}
          onRedo={() => {
            undoOrRedo(true);
          }}
          onAddRow={canAddRows ? addRow : undefined}
          onAddColumn={
            canEditSchema
              ? () => {
                  insertColumn(colCount - 1, true);
                }
              : undefined
          }
          columns={columns}
          hiddenColumns={hiddenColumns}
          onHiddenColumnsChange={(hidden) => {
            if (hidden.size < columns.length) {
              setHiddenColumns(hidden);
            }
          }}
          filterChips={filterChips}
          onRemoveFilter={clearFilter}
          sortText={sortText}
          onClearSort={() => {
            setSorting([]);
          }}
          onClearAll={() => {
            setSorting([]);
            setFilterValues({});
          }}
          isStale={isStale}
          onReapply={() => {
            setReapplyCount((count) => count + 1);
          }}
          renderActions={cellMenuItems}
          onAction={(key) => {
            runAction(key);
          }}
        />
      )}
      <ContextMenuTrigger isOpen={isContextOpen} onOpenChange={setContextOpen}>
        {grid}
        <Menu
          aria-label={messages.moreActions}
          onAction={(key) => {
            runAction(key);
          }}
        >
          {isContextOpen ? cellMenuItems() : []}
        </Menu>
      </ContextMenuTrigger>
      {viewCount === 0 && (
        <div className="flex items-center justify-center border-t border-border px-4 py-8 text-sm text-fg-muted">
          {isActive ? messages.noMatchingRows : messages.spreadsheetNoRows}
          {canAddRows && !isActive && (
            <Button variant="link" size="sm" icon={Plus} onPress={addRow} className="ms-2">
              {messages.spreadsheetAddRow}
            </Button>
          )}
        </div>
      )}
      {hasStatusBar && (
        <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-surface-1 px-3 py-1.5 text-xs text-fg-muted">
          {active && activeVisible && (
            <span className="font-medium text-fg">
              {messages.spreadsheetCellPosition({
                column: activeVisible.column.label,
                row: numberFormat.format((baseIndexAt(active.row) ?? active.row) + 1),
              })}
            </span>
          )}
          {activeError !== undefined && <span className="text-danger-fg">{activeError}</span>}
          {stats && (
            <span className="flex flex-wrap gap-x-3">
              <span>{messages.spreadsheetCount({ value: numberFormat.format(stats.count) })}</span>
              {stats.sum !== null && (
                <>
                  <span>{messages.spreadsheetSum({ value: numberFormat.format(stats.sum) })}</span>
                  <span>
                    {messages.spreadsheetAverage({
                      value: numberFormat.format(stats.sum / stats.numbers),
                    })}
                  </span>
                </>
              )}
            </span>
          )}
          <span className="ms-auto flex flex-wrap items-center gap-x-3">
            <span>
              {messages.spreadsheetRowCount({
                shown: viewCount,
                total: rows.length,
                shownText: numberFormat.format(viewCount),
                totalText: numberFormat.format(rows.length),
              })}
            </span>
            {problemCount > 0 && (
              <span className="text-danger-fg">
                {messages.spreadsheetProblemCount({ count: problemCount })}
              </span>
            )}
            <Button variant="link" size="sm" onPress={nextProblem}>
              {messages.spreadsheetNextProblem}
            </Button>
          </span>
        </div>
      )}
      <span id={instructionsId} className="sr-only">
        {messages.spreadsheetInstructions}
      </span>
      <LiveRegion ref={liveRef} />
      {filterEntry && (
        <Popover
          aria-label={messages.spreadsheetFilterTitle({ column: filterEntry.column.label })}
          triggerRef={filterAnchor}
          isOpen={filterOverlay?.isOpen ?? false}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setFilterOverlay(closeOverlay);
            }
          }}
          placement="bottom start"
          className="w-72"
        >
          <div className="flex flex-col gap-3">
            <Suspense fallback={null}>
              <FilterPanel
                filters={[filterConfigFor(filterEntry)]}
                values={filterValues}
                onChange={setFilterValues}
              />
            </Suspense>
            <div className="flex justify-end">
              <Button
                size="sm"
                onPress={() => {
                  setFilterOverlay(closeOverlay);
                }}
              >
                {messages.spreadsheetDone}
              </Button>
            </div>
          </div>
        </Popover>
      )}
      {settingsEntry && (
        <Suspense fallback={null}>
          <ColumnSettingsDialog
            column={settingsEntry.column}
            width={settingsEntry.width}
            isOpen={settingsOverlay?.isOpen ?? false}
            onSave={saveColumnSettings}
            onClose={() => {
              setSettingsOverlay(closeOverlay);
            }}
          />
        </Suspense>
      )}
      {rowEditorRow && (
        <Suspense fallback={null}>
          <RowEditorDialog
            isOpen={rowOverlay?.isOpen ?? false}
            row={rowEditorRow}
            rowNumber={numberFormat.format((baseIndexAt(rowEditorIndex) ?? rowEditorIndex) + 1)}
            fields={visible.map((entry) => ({
              format: entry.format,
              isReadOnly: entry.isReadOnly,
            }))}
            hasPrevious={rowEditorIndex > 0}
            hasNext={rowEditorIndex < viewCount - 1}
            onSave={(values, then) => {
              const writes = Object.entries(values).map(([columnId, value]) => ({
                row: rowEditorIndex,
                columnId,
                value,
              }));
              if (writes.length > 0) {
                writeValues(writes);
              }
              if (then === 'close') {
                setRowOverlay(closeOverlay);
                return;
              }
              const nextIndex = rowEditorIndex + (then === 'next' ? 1 : -1);
              const next = rowAt(nextIndex);
              setRowOverlay(
                next ? { id: getRowId(next), index: nextIndex, isOpen: true } : closeOverlay,
              );
              if (active) {
                select(cellSelection(nextIndex, active.col));
              }
            }}
            onClose={() => {
              setRowOverlay(closeOverlay);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
