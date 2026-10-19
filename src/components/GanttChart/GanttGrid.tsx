// GanttChart's task grid: a virtualized treegrid of the rows in view (name, start, end, duration and progress), with
// expand and collapse buttons on summary tasks. Rows are memoized, so scrolling renders only the rows that arrive.
import { ChevronRight, Diamond } from 'lucide-react';
import { memo, type KeyboardEvent, type MouseEvent, type Ref, type UIEvent } from 'react';
import type { CoreMessages } from '../../provider/messages';
import { cn } from '../../utils/cn';
import type { GanttFormat } from './format';
import { isDated, type TaskNode } from './schedule';
import type { GanttColumn } from './types';

type GridMessages = Pick<
  CoreMessages,
  | 'ganttTasks'
  | 'ganttTaskColumn'
  | 'ganttDuration'
  | 'ganttProgress'
  | 'ganttExpand'
  | 'ganttCollapse'
  | 'ganttNoDates'
  | 'start'
  | 'end'
>;

/** Column widths in pixels. */
export const COLUMN_WIDTHS: Readonly<Record<GanttColumn, number>> = {
  start: 92,
  end: 92,
  duration: 76,
  progress: 72,
};
/** Wider date columns, for the times shown at the hour zoom. */
export const TIMED_COLUMN_WIDTH = 132;
/** The task name column's narrowest; the other columns only show while they fit beside it. */
export const NAME_MIN_WIDTH = 128;

// Indent per level, as complete class strings so Tailwind finds them (deeper levels share the last).
const indentClasses = ['ps-2', 'ps-6', 'ps-10', 'ps-14', 'ps-18', 'ps-22', 'ps-26'] as const;

interface GridRowProps {
  node: TaskNode;
  index: number;
  top: number;
  height: number;
  /** The row with the tab stop, highlighted in both panes. */
  isActive: boolean;
  isExpanded: boolean;
  columns: readonly GanttColumn[];
  dateWidth: number;
  format: GanttFormat;
  messages: GridMessages;
  onToggle: (id: string) => void;
}

function cellText(column: GanttColumn, node: TaskNode, format: GanttFormat, noDates: string) {
  const hasDates = isDated(node);
  switch (column) {
    case 'start':
      return hasDates ? format.date(node.start) : noDates;
    case 'end':
      return hasDates ? format.endDate(node.start, node.end) : '';
    case 'duration':
      return hasDates ? format.duration(node.start, node.end) : '';
    default:
      return node.kind === 'milestone' ? '' : format.percent(node.progress);
  }
}

const GridRow = memo(function GridRow({
  node,
  index,
  top,
  height,
  isActive,
  isExpanded,
  columns,
  dateWidth,
  format,
  messages,
  onToggle,
}: GridRowProps) {
  const isSummary = node.kind === 'summary';
  return (
    <div
      role="row"
      aria-rowindex={index + 2}
      aria-level={node.level + 1}
      aria-posinset={node.position}
      aria-setsize={node.siblingCount}
      aria-expanded={isSummary ? isExpanded : undefined}
      data-task-id={node.id}
      tabIndex={isActive ? 0 : -1}
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the row's place in the virtual list.
      style={{ top, height }}
      className={cn(
        'absolute inset-x-0 flex items-center border-b border-border text-sm outline-none',
        'focus-visible:focus-ring focus-visible:-outline-offset-2',
        isActive ? 'bg-surface-3' : 'bg-surface-1',
      )}
    >
      <div
        role="gridcell"
        className={cn(
          'flex min-w-0 flex-1 items-center gap-1 pe-2',
          indentClasses[Math.min(node.level, indentClasses.length - 1)],
        )}
      >
        {isSummary ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label={(isExpanded ? messages.ganttCollapse : messages.ganttExpand)({
              task: node.task.label,
            })}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(node.id);
            }}
            className="hit-area flex size-5 shrink-0 items-center justify-center rounded-control text-fg-muted hover:bg-surface-4 hover:text-fg"
          >
            <ChevronRight
              aria-hidden="true"
              className={cn(
                'size-4 transition-transform duration-fast motion-reduce:transition-none rtl:-scale-x-100',
                isExpanded && 'rotate-90 rtl:-rotate-90',
              )}
            />
          </button>
        ) : (
          <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center">
            {node.kind === 'milestone' && <Diamond className="size-3 text-fg-muted" />}
          </span>
        )}
        <span className={cn('truncate', isSummary ? 'font-semibold text-fg' : 'text-fg')}>
          {node.task.label}
        </span>
      </div>
      {columns.map((column) => (
        <div
          key={column}
          role="gridcell"
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the column's width.
          style={{
            width: column === 'start' || column === 'end' ? dateWidth : COLUMN_WIDTHS[column],
          }}
          className="shrink-0 truncate px-2 text-end text-fg-muted tabular-nums"
        >
          {cellText(column, node, format, messages.ganttNoDates)}
        </div>
      ))}
    </div>
  );
});

export interface GanttGridProps {
  rows: readonly TaskNode[];
  /** The indexes of the rows to render, in order. */
  indexes: readonly number[];
  tabStopId: string | null;
  expandedIds: ReadonlySet<string>;
  columns: readonly GanttColumn[];
  dateWidth: number;
  rowHeight: number;
  headerHeight: number;
  /** Room under the last row, matching the timeline's horizontal scrollbar, so both scroll the same distance. */
  bottomSpace: number;
  format: GanttFormat;
  messages: GridMessages;
  onToggle: (id: string) => void;
  /** Clicks on rows, delegated. */
  onClick: (event: MouseEvent<HTMLDivElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onFocus: (event: { target: EventTarget }) => void;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
  bodyRef: Ref<HTMLDivElement>;
}

export function GanttGrid({
  rows,
  indexes,
  tabStopId,
  expandedIds,
  columns,
  dateWidth,
  rowHeight,
  headerHeight,
  bottomSpace,
  format,
  messages,
  onToggle,
  onClick,
  onKeyDown,
  onFocus,
  onScroll,
  bodyRef,
}: GanttGridProps) {
  const columnLabels: Record<GanttColumn, string> = {
    start: messages.start,
    end: messages.end,
    duration: messages.ganttDuration,
    progress: messages.ganttProgress,
  };
  return (
    <div
      ref={bodyRef}
      onScroll={onScroll}
      // The timeline beside it shows the scrollbars; this one scrolls with it.
      className="relative h-full overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* Focus moves through the rows (a roving tabindex), not the grid itself. */}
      {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- see above. */}
      <div
        role="treegrid"
        aria-label={messages.ganttTasks}
        aria-rowcount={rows.length + 1}
        aria-colcount={columns.length + 1}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onClick={onClick}
        className="min-w-0"
      >
        <div
          role="row"
          aria-rowindex={1}
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: matches the time scale's height.
          style={{ height: headerHeight }}
          className="sticky top-0 z-[3] flex items-end border-b border-border bg-surface-2 text-xs font-semibold text-fg-muted"
        >
          <div role="columnheader" className="min-w-0 flex-1 truncate px-2 pb-1.5">
            {messages.ganttTaskColumn}
          </div>
          {columns.map((column) => (
            <div
              key={column}
              role="columnheader"
              // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the column's width.
              style={{
                width: column === 'start' || column === 'end' ? dateWidth : COLUMN_WIDTHS[column],
              }}
              className="shrink-0 truncate px-2 pb-1.5 text-end"
            >
              {columnLabels[column]}
            </div>
          ))}
        </div>
        <div
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the virtual list's full height.
          style={{ height: rows.length * rowHeight + bottomSpace }}
          className="relative"
        >
          {indexes.map((index) => {
            const node = rows[index];
            if (!node) {
              return null;
            }
            return (
              <GridRow
                key={node.id}
                node={node}
                index={index}
                top={index * rowHeight}
                height={rowHeight}
                isActive={node.id === tabStopId}
                isExpanded={expandedIds.has(node.id)}
                columns={columns}
                dateWidth={dateWidth}
                format={format}
                messages={messages}
                onToggle={onToggle}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
