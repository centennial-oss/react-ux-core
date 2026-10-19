// GanttChart's timeline: the two-row time scale, gridlines, non-working shading and the today line for the part of
// the track in view, a grid of the rows in view with each task's bar (memoized, so scrolling renders only the rows
// that arrive), the dependency arrows between them, and the previews drawn while dragging.
import { Lock, TriangleAlert } from 'lucide-react';
import { memo, useId, type KeyboardEvent, type PointerEvent, type Ref, type UIEvent } from 'react';
import type { CoreMessages } from '../../provider/messages';
import { cn } from '../../utils/cn';
import { toneFillClasses, toneSoftBorderedClasses } from '../../utils/toneClasses';
import type { Tone } from '../../utils/types';
import type { GanttFormat } from './format';
import {
  BAR_HEIGHTS,
  barAnchor,
  barBox,
  dependencyEnds,
  dependencyPath,
  type BarEnd,
} from './geometry';
import type { TimeUnit } from './scale';
import type { PlacedDependency, TaskNode } from './schedule';
import type { GanttTaskKind } from './types';

type TimelineMessages = Pick<CoreMessages, 'ganttTimeline' | 'ganttEditHelp'>;

/** Pointer handlers shared by every bar (stable, so memoized rows don't re-render for them). */
export interface BarHandlers {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
}

/** What a drag would do, drawn over the timeline until the pointer is released. */
export type DragPreview =
  | {
      kind: 'move' | 'start' | 'end' | 'progress';
      taskId: string;
      start: number;
      end: number;
      progress: number;
    }
  | {
      kind: 'link';
      taskId: string;
      fromEnd: BarEnd;
      /** The pointer, in track pixels. */
      x: number;
      y: number;
      targetId?: string;
      toEnd?: BarEnd;
    };

/** The time scale for the part of the track in view. */
export interface TimeScale {
  unit: TimeUnit;
  majorUnit: TimeUnit;
  /** Column starts, the first at or before the view, and one past it. */
  minor: readonly number[];
  major: readonly number[];
  shading: readonly (readonly [number, number])[];
}

// Revealed on hover, focus or while the task is the active one (the only way on touch screens).
const handleRevealClasses =
  'opacity-0 group-hover/bar:opacity-100 group-focus-visible/bar:opacity-100 group-data-active/bar:opacity-100';

interface BarRowProps {
  node: TaskNode;
  index: number;
  top: number;
  rowHeight: number;
  /** The bar's start along the track, or null without dates, and its width. */
  x: number | null;
  width: number;
  name: string;
  isActive: boolean;
  canEdit: boolean;
  isCritical: boolean;
  hasViolation: boolean;
  isDragged: boolean;
  isLinkTarget: boolean;
  editHelpId: string;
  handlers: BarHandlers;
}

function BarShape({
  kind,
  tone,
  progress,
  isCritical,
}: {
  kind: GanttTaskKind;
  tone: Tone;
  progress: number;
  isCritical: boolean;
}) {
  if (kind === 'milestone') {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-0.5 rotate-45 rounded-[2px]',
          toneFillClasses[tone],
          isCritical && 'outline-2 outline-offset-1 outline-danger-solid',
        )}
      />
    );
  }
  if (kind === 'summary') {
    return (
      <span aria-hidden="true" className="absolute inset-0">
        <span className="absolute inset-x-0 top-0 h-1.5 overflow-hidden rounded-t-[2px] bg-neutral-border">
          <span
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the share done.
            style={{ width: `${String(progress)}%` }}
            className="block h-full bg-neutral-solid"
          />
        </span>
        <span className="absolute start-0 top-0 h-full w-1 rounded-b-[2px] bg-neutral-solid" />
        <span className="absolute end-0 top-0 h-full w-1 rounded-b-[2px] bg-neutral-solid" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute inset-0 overflow-hidden rounded-control border',
        toneSoftBorderedClasses[tone],
        isCritical && 'border-2 border-danger-solid',
      )}
    >
      <span
        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the share done.
        style={{ width: `${String(progress)}%` }}
        className={cn('block h-full opacity-70', toneFillClasses[tone])}
      />
    </span>
  );
}

const BarRow = memo(function BarRow({
  node,
  index,
  top,
  rowHeight,
  x,
  width,
  name,
  isActive,
  canEdit,
  isCritical,
  hasViolation,
  isDragged,
  isLinkTarget,
  editHelpId,
  handlers,
}: BarRowProps) {
  const isDated = x !== null;
  const height = BAR_HEIGHTS[node.kind];
  const canResize = canEdit && node.kind === 'task';
  return (
    <div
      role="row"
      aria-rowindex={index + 2}
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the row's place in the virtual list.
      style={{ top, height: rowHeight }}
      className={cn('absolute inset-x-0 border-b border-border', isActive && 'bg-surface-3/60')}
    >
      <div
        role="gridcell"
        data-task-id={node.id}
        data-kind={node.kind}
        data-active={isActive || undefined}
        data-critical={isCritical || undefined}
        data-violation={hasViolation || undefined}
        tabIndex={isActive ? 0 : -1}
        aria-label={name}
        aria-describedby={canEdit ? editHelpId : undefined}
        aria-readonly={!canEdit || undefined}
        aria-haspopup="dialog"
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerCancel={handlers.onPointerCancel}
        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the bar's place on the time axis.
        style={{
          insetInlineStart: x ?? 0,
          width: isDated ? width : 1,
          top: (rowHeight - height) / 2,
          height,
        }}
        className={cn(
          'group/bar absolute select-none outline-none',
          'focus-visible:z-[1] focus-visible:focus-ring',
          canEdit ? 'cursor-grab' : 'cursor-pointer',
          // The active bar takes touch drags; the others leave them to scrolling.
          canEdit && isActive && 'touch-none',
          isDragged && 'opacity-50',
          isLinkTarget && 'ring-2 ring-accent-solid ring-offset-2 ring-offset-surface-1',
        )}
      >
        {isDated && (
          <BarShape
            kind={node.kind}
            tone={node.tone}
            progress={node.progress}
            isCritical={isCritical}
          />
        )}
        {canResize && (
          <>
            <span
              aria-hidden="true"
              data-handle="start"
              className="hit-area absolute inset-y-0 start-0 w-2 cursor-ew-resize"
            />
            <span
              aria-hidden="true"
              data-handle="end"
              className="hit-area absolute inset-y-0 end-0 w-2 cursor-ew-resize"
            />
            <span
              aria-hidden="true"
              data-handle="progress"
              // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: where the done part ends.
              style={{ insetInlineStart: `${String(node.progress)}%` }}
              className={cn(
                'hit-area absolute -bottom-1.5 size-2.5 -translate-x-1/2 rotate-45 cursor-ew-resize rounded-[1px] border border-border-strong bg-surface-1 rtl:translate-x-1/2',
                handleRevealClasses,
              )}
            />
          </>
        )}
        {canEdit && isDated && (
          <>
            <span
              aria-hidden="true"
              data-handle="link-start"
              className={cn(
                'hit-area absolute top-1/2 -start-3.5 size-2.5 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-accent-solid bg-surface-1',
                handleRevealClasses,
              )}
            />
            <span
              aria-hidden="true"
              data-handle="link-finish"
              className={cn(
                'hit-area absolute top-1/2 -end-3.5 size-2.5 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-accent-solid bg-surface-1',
                handleRevealClasses,
              )}
            />
          </>
        )}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute start-full top-1/2 flex max-w-60 -translate-y-1/2 items-center gap-1 text-xs whitespace-nowrap text-fg',
            canEdit ? 'ms-5' : 'ms-2',
          )}
        >
          {hasViolation && <TriangleAlert className="size-3.5 shrink-0 text-warning-fg" />}
          {node.isLocked && <Lock className="size-3 shrink-0 text-fg-muted" />}
          <span className={cn('truncate', node.kind === 'summary' && 'font-semibold')}>
            {node.task.label}
          </span>
        </span>
      </div>
    </div>
  );
});

export interface GanttTimelineProps {
  rows: readonly TaskNode[];
  indexes: readonly number[];
  tabStopId: string | null;
  rangeStart: number;
  pxPerMs: number;
  trackWidth: number;
  rowHeight: number;
  headerHeight: number;
  scale: TimeScale;
  nowX: number | null;
  /** The dependencies to draw (those between rows near the view). */
  links: readonly PlacedDependency[];
  rowIndex: ReadonlyMap<string, number>;
  criticalTaskIds: ReadonlySet<string>;
  criticalLinkIds: ReadonlySet<string>;
  violatedTaskIds: ReadonlySet<string>;
  nameOf: (node: TaskNode) => string;
  canEditTask: (node: TaskNode) => boolean;
  preview: DragPreview | null;
  format: GanttFormat;
  messages: TimelineMessages;
  handlers: BarHandlers;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onFocus: (event: { target: EventTarget }) => void;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
  bodyRef: Ref<HTMLDivElement>;
  rowsRef: Ref<HTMLDivElement>;
}

/** The arrows' colours: an ordinary link, a broken one and one on the critical path. */
const ARROW_TONES = {
  normal: 'text-fg-muted',
  violated: 'text-warning-fg',
  critical: 'text-danger-fg',
} as const;

export function GanttTimeline({
  rows,
  indexes,
  tabStopId,
  rangeStart,
  pxPerMs,
  trackWidth,
  rowHeight,
  headerHeight,
  scale,
  nowX,
  links,
  rowIndex,
  criticalTaskIds,
  criticalLinkIds,
  violatedTaskIds,
  nameOf,
  canEditTask,
  preview,
  format,
  messages,
  handlers,
  onKeyDown,
  onFocus,
  onScroll,
  bodyRef,
  rowsRef,
}: GanttTimelineProps) {
  const id = useId();
  const editHelpId = `${id}-edit`;
  const markerId = (tone: keyof typeof ARROW_TONES) => `${id}-arrow-${tone}`;
  const xOf = (ms: number) => (ms - rangeStart) * pxPerMs;
  const rowsHeight = rows.length * rowHeight;
  const boxOf = (node: TaskNode) => {
    if (preview && preview.kind !== 'link' && preview.taskId === node.id) {
      return barBox({ ...node, start: preview.start, end: preview.end }, rangeStart, pxPerMs);
    }
    return barBox(node, rangeStart, pxPerMs);
  };

  const arrows = links.flatMap((link) => {
    const fromRow = rowIndex.get(link.from.id);
    const toRow = rowIndex.get(link.to.id);
    const fromBox = boxOf(link.from);
    const toBox = boxOf(link.to);
    if (fromRow === undefined || toRow === undefined || !fromBox || !toBox) {
      return [];
    }
    const [fromEnd, toEnd] = dependencyEnds(link.type);
    const tone = link.isViolated
      ? 'violated'
      : criticalLinkIds.has(link.id)
        ? 'critical'
        : 'normal';
    return [
      <path
        key={link.id}
        data-dependency-id={link.id}
        data-violation={link.isViolated || undefined}
        d={dependencyPath(
          barAnchor(fromBox, fromEnd, fromRow * rowHeight, rowHeight),
          fromEnd,
          barAnchor(toBox, toEnd, toRow * rowHeight, rowHeight),
          toEnd,
          rowHeight,
        )}
        markerEnd={`url(#${markerId(tone)})`}
        strokeDasharray={link.isViolated ? '4 3' : undefined}
        className={cn('fill-none stroke-current', ARROW_TONES[tone])}
        strokeWidth={tone === 'normal' ? 1.25 : 1.75}
      />,
    ];
  });

  const previewNode = preview ? rows[rowIndex.get(preview.taskId) ?? -1] : undefined;
  const previewRow = preview ? rowIndex.get(preview.taskId) : undefined;
  let previewContent = null;
  if (preview && previewNode && previewRow !== undefined) {
    if (preview.kind === 'link') {
      const box = barBox(previewNode, rangeStart, pxPerMs);
      if (box) {
        const from = barAnchor(box, preview.fromEnd, previewRow * rowHeight, rowHeight);
        previewContent = (
          <svg
            aria-hidden="true"
            width={trackWidth}
            height={rowsHeight}
            className="pointer-events-none absolute inset-0 overflow-visible rtl:-scale-x-100"
          >
            <line
              data-link-preview=""
              x1={from.x}
              y1={from.y}
              x2={preview.x}
              y2={preview.y}
              strokeDasharray="4 3"
              strokeWidth={1.75}
              className="stroke-current text-accent-fg"
            />
          </svg>
        );
      }
    } else {
      const box = barBox(
        { start: preview.start, end: preview.end, kind: previewNode.kind },
        rangeStart,
        pxPerMs,
      );
      if (box) {
        const height = BAR_HEIGHTS[previewNode.kind];
        previewContent = (
          <span
            data-preview=""
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: where the drag would land.
            style={{
              insetInlineStart: box.x,
              width: box.width,
              top: previewRow * rowHeight + (rowHeight - height) / 2,
              height,
            }}
            className="pointer-events-none absolute rounded-control border-2 border-dashed border-accent-border bg-accent-bg/60"
          >
            <span className="absolute start-0 bottom-full mb-1 rounded-control bg-fg px-1.5 py-0.5 text-xs whitespace-nowrap text-fg-inverse tabular-nums shadow-overlay">
              {preview.kind === 'progress'
                ? format.percent(preview.progress)
                : format.span(preview.start, preview.end)}
            </span>
          </span>
        );
      }
    }
  }

  const linkTargetId = preview?.kind === 'link' ? preview.targetId : undefined;

  return (
    <div ref={bodyRef} onScroll={onScroll} className="relative h-full overflow-auto">
      <span id={editHelpId} className="sr-only">
        {messages.ganttEditHelp}
      </span>
      {/* Focus moves through the bars (a roving tabindex), not the grid itself. */}
      {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- see above. */}
      <div
        role="grid"
        aria-label={messages.ganttTimeline}
        aria-rowcount={rows.length + 1}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the time track's width.
        style={{ width: trackWidth }}
        className="relative overflow-x-clip text-sm"
      >
        <div
          role="row"
          aria-rowindex={1}
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the time scale's height.
          style={{ height: headerHeight }}
          className="sticky top-0 z-[3] border-b border-border bg-surface-2"
        >
          <div role="columnheader" className="relative size-full text-xs text-fg-muted">
            <span className="sr-only">{messages.ganttTimeline}</span>
            <div aria-hidden="true">
              {scale.major.slice(0, -1).map((tick, position) => {
                const left = Math.max(0, xOf(tick));
                const right = Math.min(trackWidth, xOf(scale.major[position + 1] ?? tick));
                return right > left ? (
                  <span
                    key={tick}
                    // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the period's place.
                    style={{ insetInlineStart: left, width: right - left }}
                    // Clipped (not hidden), so the label still sticks to the start of the view.
                    className="absolute top-0 h-1/2 overflow-clip border-s border-border-strong"
                  >
                    <span className="sticky start-0 inline-block max-w-full truncate px-1.5 pt-1 font-semibold text-fg">
                      {format.tick(tick, scale.majorUnit, true)}
                    </span>
                  </span>
                ) : null;
              })}
              {scale.minor.slice(0, -1).map((tick, position) => {
                const left = Math.max(0, xOf(tick));
                const right = Math.min(trackWidth, xOf(scale.minor[position + 1] ?? tick));
                return right > left ? (
                  <span
                    key={tick}
                    // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the column's place.
                    style={{ insetInlineStart: left, width: right - left }}
                    className="absolute bottom-0 flex h-1/2 items-center justify-center overflow-hidden border-s border-t border-border whitespace-nowrap tabular-nums"
                  >
                    {format.tick(tick, scale.unit, false)}
                  </span>
                ) : null;
              })}
              {nowX !== null && (
                <span
                  // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: today's position.
                  style={{ insetInlineStart: nowX }}
                  className="absolute bottom-0 h-2 w-0.5 -translate-x-1/2 bg-danger-solid rtl:translate-x-1/2"
                />
              )}
            </div>
          </div>
        </div>

        <div
          ref={rowsRef}
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the virtual list's full height.
          style={{ height: rowsHeight }}
          className="relative"
        >
          {/* Shading, gridlines and the today line, behind the bars */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {scale.shading.map(([from, to]) => (
              <span
                key={from}
                data-non-working=""
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the non-working stretch.
                style={{ insetInlineStart: xOf(from), width: (to - from) * pxPerMs }}
                className="absolute inset-y-0 bg-surface-2"
              />
            ))}
            {scale.minor.map((tick) => (
              <span
                key={tick}
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the gridline's position.
                style={{ insetInlineStart: xOf(tick) }}
                className="absolute inset-y-0 border-s border-border"
              />
            ))}
            {nowX !== null && (
              <span
                data-now-line=""
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: today's position.
                style={{ insetInlineStart: nowX }}
                className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-danger-solid rtl:translate-x-1/2"
              />
            )}
          </div>

          <svg
            aria-hidden="true"
            width={trackWidth}
            height={rowsHeight}
            className="pointer-events-none absolute inset-0 overflow-visible rtl:-scale-x-100"
          >
            <defs>
              {(Object.keys(ARROW_TONES) as (keyof typeof ARROW_TONES)[]).map((tone) => (
                <marker
                  key={tone}
                  id={markerId(tone)}
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                  className={ARROW_TONES[tone]}
                >
                  <path d="M0 0L8 4L0 8Z" className="fill-current" />
                </marker>
              ))}
            </defs>
            {arrows}
          </svg>

          {indexes.map((index) => {
            const node = rows[index];
            if (!node) {
              return null;
            }
            const box = barBox(node, rangeStart, pxPerMs);
            return (
              <BarRow
                key={node.id}
                node={node}
                index={index}
                top={index * rowHeight}
                rowHeight={rowHeight}
                x={box?.x ?? null}
                width={box?.width ?? 0}
                name={nameOf(node)}
                isActive={node.id === tabStopId}
                canEdit={canEditTask(node)}
                isCritical={criticalTaskIds.has(node.id)}
                hasViolation={violatedTaskIds.has(node.id)}
                isDragged={
                  preview !== null && preview.kind !== 'link' && preview.taskId === node.id
                }
                isLinkTarget={linkTargetId === node.id}
                editHelpId={editHelpId}
                handlers={handlers}
              />
            );
          })}

          {previewContent}
        </div>
      </div>
    </div>
  );
}
