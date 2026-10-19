// HeatmapChart: values in a grid of rows by columns (task statements by weeks), coloured by a sequential or diverging
// scale from the theme's heat tokens. It's a keyboard grid: one cell takes focus at a time, arrow keys move, and each
// cell is named by its row, column and value, which a tooltip also shows. Cells without data are hatched. On narrow
// screens the plot (not the page) scrolls sideways with the row labels pinned. It sits in the shared chart frame, so
// it has a title, a generated summary, "View as table", PNG and CSV export and full screen.

import { ArrowLeft, ArrowRight } from 'lucide-react';
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useLocale } from 'react-aria-components';
import type { DataTableColumn } from '../table/types';
import { cn } from '../utils/cn';
import { isRightToLeft } from '../utils/direction';
import { mergeRefs } from '../utils/mergeRefs';
import { useElementWidth } from '../utils/useElementWidth';
import { useMediaQuery } from '../utils/useMediaQuery';
import { ChartFrame, type ChartFrameOptions, type ChartTable } from './ChartFrame';
import { formatValue } from './format';
import { downloadSvgAsPng } from './svgImage';
import { numberColumn, withUnit } from './tableColumns';
import {
  heatColor,
  heatLegendStops,
  isFlatScale,
  resolveHeatScale,
  useHeatLook,
  type HeatLook,
  type HeatScale,
  type ResolvedHeatScale,
} from './heat';
import {
  heatCellSize,
  rowLabelEvery,
  rowLabelWidth,
  visibleColumnLabels,
  type HeatCellSize,
} from './heatLayout';
import { useChartMessages } from './messages';

export interface HeatmapAxisItem {
  id: string;
  label: string;
  /**
   * A column's visible label in the compact layout (with `cellSize`), such as CalendarHeatmap's month names; `label`
   * still names the column for screen readers. When any column has one, columns without one show no label.
   */
  mark?: string;
}

export interface HeatmapChartProps extends Omit<ChartFrameOptions, 'height'> {
  /** The rows, such as task statements. */
  rows: readonly HeatmapAxisItem[];
  /** The columns, such as weeks. */
  columns: readonly HeatmapAxisItem[];
  /** Values by [row][column]. `null` is no data (hatched, not drawn as 0); `undefined` leaves no cell at all. */
  values: readonly (readonly (number | null | undefined)[])[];
  /** Defaults to a sequential accent scale from the data's lowest to highest value. */
  scale?: HeatScale;
  /** The values' unit ("%"). */
  unit?: string;
  /** Shows each cell's value inside it. Defaults to false. */
  hasCellLabels?: boolean;
  /** Called when a cell is pressed (or Enter), such as opening a drill for that row. */
  onCellPress?: (rowId: string, columnId: string) => void;
  /** Names a cell from its row, column and formatted value. Defaults to the `heatmapCell` message. */
  cellLabel?: (row: HeatmapAxisItem, column: HeatmapAxisItem, value: string) => string;
  /** Text under the grid, such as CalendarHeatmap's "No activity yet". */
  notice?: ReactNode;
  /**
   * Square cells in a compact layout: `fit` shrinks them (down to 10 px, or 24 px on touch screens) so every column
   * fits the width before scrolling; `sm`, `md` and `lg` are fixed sizes. Column labels thin out on small cells. By
   * default cells stretch to fill the width, at least 28 px wide.
   */
  cellSize?: HeatCellSize;
  /** Where a plot that scrolls sideways starts. Defaults to `start`. */
  initialScroll?: 'start' | 'end';
}

interface Cell {
  row: number;
  column: number;
}

function isCell(values: HeatmapChartProps['values'], cell: Cell): boolean {
  return values[cell.row]?.[cell.column] !== undefined;
}

/** The grid's columns: the row labels, then one per data column (stretching, or the compact cell size). */
const rowColumns = {
  fill: 'grid-cols-[minmax(6rem,12rem)_repeat(var(--heat-columns),minmax(var(--heat-cell),1fr))]',
  compact: 'grid-cols-[var(--heat-label)_repeat(var(--heat-columns),var(--heat-cell))]',
};

const hatched =
  'bg-[repeating-linear-gradient(45deg,var(--color-border-strong)_0,var(--color-border-strong)_1px,transparent_1px,transparent_5px)]';

/** The heatmap as an SVG image, for PNG export. */
function toSvg(props: {
  title: string;
  rows: readonly HeatmapAxisItem[];
  columns: readonly HeatmapAxisItem[];
  values: HeatmapChartProps['values'];
  scale: ResolvedHeatScale;
  look: HeatLook;
}): { svg: string; width: number; height: number } {
  const { title, rows, columns, values, scale, look } = props;
  const labelWidth = 220;
  const cell = 28;
  const top = 56;
  const width = labelWidth + columns.length * cell + 16;
  const height = top + rows.length * cell + 16;
  const escape = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}" font-family="${escape(look.font)}" font-size="12">`,
    `<rect width="100%" height="100%" fill="${look.surface}"/>`,
    `<text x="8" y="20" font-size="14" font-weight="600" fill="${look.text}">${escape(title)}</text>`,
  ];
  columns.forEach((column, index) => {
    parts.push(
      `<text x="${String(labelWidth + index * cell + cell / 2)}" y="${String(top - 8)}" text-anchor="end" transform="rotate(-45 ${String(labelWidth + index * cell + cell / 2)} ${String(top - 8)})" font-size="10" fill="${look.mutedText}">${escape(column.label)}</text>`,
    );
  });
  rows.forEach((row, rowIndex) => {
    const y = top + rowIndex * cell;
    parts.push(
      `<text x="${String(labelWidth - 8)}" y="${String(y + cell / 2 + 4)}" text-anchor="end" fill="${look.text}">${escape(row.label.length > 32 ? `${row.label.slice(0, 31)}…` : row.label)}</text>`,
    );
    columns.forEach((_, columnIndex) => {
      const value = values[rowIndex]?.[columnIndex];
      if (value === undefined) {
        return;
      }
      const x = labelWidth + columnIndex * cell;
      parts.push(
        value === null
          ? `<rect x="${String(x + 1)}" y="${String(y + 1)}" width="${String(cell - 2)}" height="${String(cell - 2)}" rx="3" fill="none" stroke="${look.border}"/>`
          : `<rect x="${String(x + 1)}" y="${String(y + 1)}" width="${String(cell - 2)}" height="${String(cell - 2)}" rx="3" fill="${heatColor(value, scale, look)}"/>`,
      );
    });
  });
  parts.push('</svg>');
  return { svg: parts.join(''), width, height };
}

/** A grid of values coloured by a scale, navigable cell by cell, with a legend, summary and table view. */
export function HeatmapChart({
  rows,
  columns,
  values,
  scale: scaleProp,
  unit,
  hasCellLabels = false,
  onCellPress,
  cellLabel,
  notice,
  cellSize,
  initialScroll = 'start',
  ...frame
}: HeatmapChartProps) {
  const messages = useChartMessages();
  const { locale } = useLocale();
  const look = useHeatLook();
  const numbers = useMemo(
    () =>
      values.flatMap((row) => row.flatMap((value) => (typeof value === 'number' ? [value] : []))),
    [values],
  );
  const scale = useMemo(() => resolveHeatScale(numbers, scaleProp), [numbers, scaleProp]);
  const hasMissing = values.some((row) => row.some((value) => value === null));
  const isEmpty = numbers.length === 0;

  const format = (value: number | null | undefined) =>
    value === null || value === undefined ? messages.noData : formatValue(value, locale, unit);
  const nameOf = (rowIndex: number, columnIndex: number) => {
    const row = rows[rowIndex] ?? { id: '', label: '' };
    const column = columns[columnIndex] ?? { id: '', label: '' };
    const value = format(values[rowIndex]?.[columnIndex]);
    return cellLabel
      ? cellLabel(row, column, value)
      : messages.heatmapCell({ row: row.label, column: column.label, value });
  };

  // The generated summary: the grid's size, and its lowest and highest cells.
  const summary = (() => {
    let low: Cell | null = null;
    let high: Cell | null = null;
    values.forEach((row, rowIndex) => {
      row.forEach((value, columnIndex) => {
        if (typeof value !== 'number') {
          return;
        }
        if (!low || value < (values[low.row]?.[low.column] ?? Infinity)) {
          low = { row: rowIndex, column: columnIndex };
        }
        if (!high || value > (values[high.row]?.[high.column] ?? -Infinity)) {
          high = { row: rowIndex, column: columnIndex };
        }
      });
    });
    const parts = [messages.heatmapSummary({ rows: rows.length, columns: columns.length })];
    const lowest = low as Cell | null;
    const highest = high as Cell | null;
    if (lowest) {
      parts.push(messages.heatmapLowest({ cell: nameOf(lowest.row, lowest.column) }));
    }
    if (highest) {
      parts.push(messages.heatmapHighest({ cell: nameOf(highest.row, highest.column) }));
    }
    return parts.join(' ');
  })();

  const first = ((): Cell => {
    for (let row = 0; row < rows.length; row++) {
      for (let column = 0; column < columns.length; column++) {
        if (isCell(values, { row, column })) {
          return { row, column };
        }
      }
    }
    return { row: 0, column: 0 };
  })();
  const [active, setActive] = useState<Cell | null>(null);
  const current = active && isCell(values, active) ? active : first;
  const [hovered, setHovered] = useState<Cell | null>(null);
  const [isFocusWithin, setFocusWithin] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [widthRef, plotWidth] = useElementWidth();
  const isCoarse = useMediaQuery('(pointer: coarse)');
  const [scroll, setScroll] = useState({ isScrollable: false, isAtStart: true, isAtEnd: false });

  // The compact layout's geometry: the row labels' width, the cell size, and which labels show.
  const isCompact = cellSize !== undefined;
  const labelWidth = rowLabelWidth(rows.map((row) => row.label));
  const cell = heatCellSize({
    size: cellSize ?? 'lg',
    width: plotWidth,
    columns: columns.length,
    labelWidth,
    isCoarse,
  });
  const hasMarks = columns.some((column) => column.mark !== undefined);
  const shownMarks = isCompact
    ? visibleColumnLabels(
        columns.map((column) => (hasMarks ? column.mark : column.label)),
        cell,
      )
    : [];
  const rowEvery = isCompact ? rowLabelEvery(cell) : 1;

  useLayoutEffect(() => {
    const area = scrollRef.current;
    if (!area) {
      return;
    }
    const measure = () => {
      const overflow = area.scrollWidth - area.clientWidth;
      // In right-to-left layouts scrollLeft runs from 0 to negative values.
      const offset = Math.abs(area.scrollLeft);
      const next = {
        isScrollable: overflow > 1,
        isAtStart: offset <= 1,
        isAtEnd: offset >= overflow - 1,
      };
      setScroll((previous) =>
        previous.isScrollable === next.isScrollable &&
        previous.isAtStart === next.isAtStart &&
        previous.isAtEnd === next.isAtEnd
          ? previous
          : next,
      );
    };
    if (initialScroll === 'end') {
      // Open on the latest columns; the browser clamps the offset in either direction.
      const isRtl = isRightToLeft(area);
      area.scrollLeft = isRtl ? -area.scrollWidth : area.scrollWidth;
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    area.addEventListener('scroll', measure, { passive: true });
    return () => {
      observer.disconnect();
      area.removeEventListener('scroll', measure);
    };
  }, [isEmpty, initialScroll, cell, columns.length]);

  const focusCell = (cell: Cell) => {
    setActive(cell);
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-cell="${String(cell.row)}-${String(cell.column)}"]`)
      ?.focus();
  };

  /** The next real cell from `from` in a direction, skipping places with no cell. */
  const step = (from: Cell, rowStep: number, columnStep: number): Cell => {
    let next = { row: from.row + rowStep, column: from.column + columnStep };
    while (
      next.row >= 0 &&
      next.row < rows.length &&
      next.column >= 0 &&
      next.column < columns.length
    ) {
      if (isCell(values, next)) {
        return next;
      }
      next = { row: next.row + rowStep, column: next.column + columnStep };
    }
    return from;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const isRtl = isRightToLeft(event.currentTarget);
    const moves: Record<string, () => Cell> = {
      ArrowRight: () => step(current, 0, isRtl ? -1 : 1),
      ArrowLeft: () => step(current, 0, isRtl ? 1 : -1),
      ArrowDown: () => step(current, 1, 0),
      ArrowUp: () => step(current, -1, 0),
      Home: () => (event.ctrlKey ? first : step({ row: current.row, column: -1 }, 0, 1)),
      End: () =>
        event.ctrlKey
          ? step({ row: rows.length - 1, column: columns.length }, 0, -1)
          : step({ row: current.row, column: columns.length }, 0, -1),
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      focusCell(move());
    } else if ((event.key === 'Enter' || event.key === ' ') && onCellPress) {
      event.preventDefault();
      onCellPress(rows[current.row]?.id ?? '', columns[current.column]?.id ?? '');
    }
  };

  const table = (): ChartTable => {
    const tableColumns: DataTableColumn<Record<string, unknown>>[] = [
      {
        id: '__row',
        header: '',
        label: '',
        isRowHeader: true,
        value: (row) => row.__label,
      },
      ...columns.map((column) =>
        numberColumn(
          column.id,
          withUnit(column.label, unit),
          (value) => formatValue(value, locale),
          {
            mobile: true,
          },
        ),
      ),
    ];
    return {
      columns: tableColumns,
      rows: rows.map((row, rowIndex) => {
        const record: Record<string, unknown> = { __key: row.id, __label: row.label };
        columns.forEach((column, columnIndex) => {
          record[column.id] = values[rowIndex]?.[columnIndex] ?? null;
        });
        return record;
      }),
    };
  };

  // Show every column label when they fit; otherwise every nth (all stay for screen readers).
  const labelEvery = Math.max(1, Math.ceil(columns.length / 16));
  const tooltipCell = isFocusWithin ? current : hovered;
  const stops = heatLegendStops(scale, look);
  const isFlat = isFlatScale(scale);

  return (
    <ChartFrame
      {...frame}
      height="auto"
      summary={summary}
      isEmpty={isEmpty}
      table={table}
      exportPng={(name) => {
        downloadSvgAsPng(toSvg({ title: frame.title, rows, columns, values, scale, look }), name);
      }}
      defaultExportName="heatmap"
      plot={({ titleId, summaryId }) => (
        <div className="flex min-w-0 flex-col gap-2">
          <div ref={mergeRefs(scrollRef, widthRef)} className="min-w-0 overflow-x-auto pt-9 pb-1">
            <div
              ref={gridRef}
              role="grid"
              // Focus sits on one cell at a time (roving tabindex); the grid itself isn't a tab stop.
              tabIndex={-1}
              aria-labelledby={titleId}
              aria-describedby={summaryId}
              aria-rowcount={rows.length + 1}
              aria-colcount={columns.length + 1}
              onKeyDown={onKeyDown}
              onFocus={() => {
                setFocusWithin(true);
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setFocusWithin(false);
                }
              }}
              // Dynamic geometry: one column per data column; each at least the cell width, filling the space
              // (or, compact, exactly the computed cell size after a row-label column sized to the labels).
              // eslint-disable-next-line no-restricted-syntax
              style={
                {
                  '--heat-columns': String(columns.length),
                  ...(isCompact
                    ? {
                        '--heat-cell': `${String(cell)}px`,
                        '--heat-label': `${String(labelWidth)}px`,
                      }
                    : {}),
                } as CSSProperties
              }
              // Positioned, so the visually hidden column labels stay inside the scroll area instead of widening the page.
              className={cn(
                'relative flex w-max flex-col gap-px',
                isCompact
                  ? ''
                  : 'min-w-full [--heat-cell:1.75rem] pointer-coarse:[--heat-cell:var(--hit-size)]',
              )}
            >
              <div
                role="row"
                className={cn('grid gap-px', rowColumns[isCompact ? 'compact' : 'fill'])}
              >
                <div role="columnheader" className="sticky start-0 z-[1] bg-surface-1">
                  <span className="sr-only">{frame.title}</span>
                </div>
                {columns.map((column, index) =>
                  isCompact ? (
                    // Labels start at their column and run over the next ones (thinned so they never overlap).
                    <div
                      key={column.id}
                      role="columnheader"
                      className="relative h-4 text-xs text-fg-muted"
                    >
                      <span className="sr-only">{column.label}</span>
                      {shownMarks[index] && (
                        <span
                          aria-hidden="true"
                          className="absolute start-0 top-0 whitespace-nowrap"
                        >
                          {hasMarks ? column.mark : column.label}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div
                      key={column.id}
                      role="columnheader"
                      className="truncate px-0.5 text-center text-xs text-fg-muted"
                    >
                      <span className={index % labelEvery === 0 ? undefined : 'sr-only'}>
                        {column.label}
                      </span>
                    </div>
                  ),
                )}
              </div>
              {rows.map((row, rowIndex) => (
                <div
                  key={row.id}
                  role="row"
                  className={cn('grid gap-px', rowColumns[isCompact ? 'compact' : 'fill'])}
                >
                  <div
                    role="rowheader"
                    title={row.label}
                    className="sticky start-0 z-[1] flex min-w-0 items-center bg-surface-1 pe-2 text-xs text-fg"
                  >
                    <span
                      className={
                        rowIndex % rowEvery === rowEvery - 1
                          ? cn('truncate', isCompact && 'leading-none')
                          : 'sr-only'
                      }
                    >
                      {row.label}
                    </span>
                  </div>
                  {columns.map((column, columnIndex) => {
                    const value = values[rowIndex]?.[columnIndex];
                    if (value === undefined) {
                      return <div key={column.id} role="gridcell" aria-hidden="true" />;
                    }
                    const isActive = current.row === rowIndex && current.column === columnIndex;
                    const name = nameOf(rowIndex, columnIndex);
                    const background = value === null ? undefined : heatColor(value, scale, look);
                    const isTooltip =
                      tooltipCell?.row === rowIndex && tooltipCell.column === columnIndex;
                    return (
                      // The grid handles the keyboard for every cell (arrows, Home, End, Enter, Space).
                      // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                      <div
                        key={column.id}
                        role="gridcell"
                        aria-label={name}
                        data-cell={`${String(rowIndex)}-${String(columnIndex)}`}
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => {
                          setActive({ row: rowIndex, column: columnIndex });
                          onCellPress?.(row.id, column.id);
                        }}
                        onPointerEnter={() => {
                          setHovered({ row: rowIndex, column: columnIndex });
                        }}
                        onPointerLeave={() => {
                          setHovered(null);
                        }}
                        // Dynamic data: the cell's colour on the scale.
                        // eslint-disable-next-line no-restricted-syntax
                        style={
                          background === undefined ? undefined : { backgroundColor: background }
                        }
                        className={cn(
                          'relative flex items-center justify-center rounded-[3px] text-[0.625rem] font-medium tabular-nums outline-none',
                          isCompact ? 'size-(--heat-cell)' : 'h-8 pointer-coarse:h-hit',
                          'focus-visible:z-[2] focus-visible:focus-ring',
                          value === null && cn('border border-border', hatched),
                          onCellPress && 'cursor-pointer',
                        )}
                      >
                        {hasCellLabels && value !== null && (
                          // On a chip, so the small figure reads on every colour of the scale.
                          <span
                            aria-hidden="true"
                            className="truncate rounded-[2px] bg-surface-1 px-0.5 text-fg"
                          >
                            {formatValue(value, locale)}
                          </span>
                        )}
                        {isTooltip && (
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute bottom-full start-1/2 z-10 mb-1 -translate-x-1/2 rounded-control bg-fg px-2 py-1 text-xs font-normal whitespace-nowrap text-fg-inverse shadow-overlay rtl:translate-x-1/2"
                          >
                            {name}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {notice !== undefined && <p className="text-sm text-fg-muted">{notice}</p>}
          {scroll.isScrollable && (
            // The arrows point where there's more: back toward the start, on toward the end, or both.
            <p className="inline-flex items-center gap-1 text-xs text-fg-muted">
              {!scroll.isAtStart && (
                <ArrowLeft aria-hidden="true" className="size-3.5 rtl:-scale-x-100" />
              )}
              {messages.heatmapScrollHint}
              {!scroll.isAtEnd && (
                <ArrowRight aria-hidden="true" className="size-3.5 rtl:-scale-x-100" />
              )}
            </p>
          )}
          <div
            role="group"
            aria-label={messages.heatmapScale}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-muted"
          >
            {isFlat ? (
              // Every value is equal: one swatch and one label, not a gradient from a value to itself.
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-3 rounded-[3px] border border-border"
                  // Dynamic data: the scale's colour.
                  // eslint-disable-next-line no-restricted-syntax
                  style={{ backgroundColor: stops[0] }}
                />
                <span className="tabular-nums">{formatValue(scale.min, locale, unit)}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <span className="tabular-nums">{formatValue(scale.min, locale, unit)}</span>
                <span
                  aria-hidden="true"
                  className="flex h-3 w-32 overflow-hidden rounded-[3px] border border-border"
                >
                  {stops.map((stop, index) => (
                    <span
                      key={index}
                      className="h-full flex-1"
                      // Dynamic data: the scale's colours.
                      // eslint-disable-next-line no-restricted-syntax
                      style={{ backgroundColor: stop }}
                    />
                  ))}
                </span>
                <span className="tabular-nums">{formatValue(scale.max, locale, unit)}</span>
              </span>
            )}
            {scale.type === 'diverging' && !isFlat && (
              <span className="tabular-nums">
                {messages.heatmapMidpoint({ value: formatValue(scale.midpoint, locale, unit) })}
              </span>
            )}
            {hasMissing && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={cn('size-3 rounded-[3px] border border-border', hatched)}
                />
                {messages.noData}
              </span>
            )}
          </div>
        </div>
      )}
    />
  );
}
