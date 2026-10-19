// One cell of the dashboard grid: the positioned box, the item drawn in it, and in edit mode the drag handle and resize
// handles. Memoized on primitive props, so a drag re-renders only the cells that move, and moving a cell never
// re-renders the item inside it (PERF-02): the item re-renders only when its size or surroundings change.

import { GripVertical } from 'lucide-react';
import {
  memo,
  useCallback,
  useMemo,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { Button as AriaButton, type KeyboardEvent } from 'react-aria-components';
import { cn } from '../../utils/cn';
import type { ResizeAnchor } from '../layout/engine';
import type { DashboardMode, WidgetSize } from '../types';

/** What an item's render function gets besides the item (ARCH-02). */
export interface DashboardGridItemEnv {
  /** The cell's size in grid units at the active breakpoint and in pixels, and the content scale. */
  cell: Omit<WidgetSize, 'sizeClass'>;
  breakpoint: string;
  /** `edit` while the grid is editable. */
  mode: DashboardMode;
  /** Moving and resizing are available: edit mode at the canonical breakpoint, on an unlocked item (RESP-06). */
  canArrange: boolean;
  /** The item has come within a viewport height of view, so it may load (WID-16). */
  isNearViewport: boolean;
  /** Whether the item is in view now, for load priority (DATA-11). */
  isInViewport: () => boolean;
  isExpanded: boolean;
  /** Expands the item to fill the grid, or closes it again (WID-08). */
  onExpandChange: (isExpanded: boolean) => void;
  /** Opens the Move/Resize dialog (EDIT-18), when the item can be arranged. */
  onMoveResize?: () => void;
}

/** The grid's handlers, shared by every cell. Their identity never changes. */
export interface GridCellHandlers {
  observe: (id: string, element: HTMLElement) => () => void;
  onHandlePointerDown: (id: string, event: PointerEvent<HTMLElement>) => void;
  onResizePointerDown: (id: string, anchor: ResizeAnchor, event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: () => void;
  onHandlePress: (id: string, pointerType: string) => void;
  onHandleKeyDown: (id: string, event: KeyboardEvent | ReactKeyboardEvent) => void;
  onHandleFocusChange: (id: string, isFocused: boolean) => void;
  onExpandChange: (id: string, isExpanded: boolean) => void;
  onMoveResize: (id: string) => void;
  isInView: (id: string) => boolean;
}

/** The resize handles (EDIT-16): the end and bottom edges and their corner, plus the start and top edges and the
 * bottom-start corner. The top corners are left out: the drag handle and the action menu sit there. */
const ANCHORS: readonly ResizeAnchor[] = ['e', 's', 'se', 'w', 'n', 'sw'];

const anchorClasses: Record<ResizeAnchor, string> = {
  e: 'top-12 bottom-3 -end-[calc(var(--hit-size)/2)] w-(--hit-size) after:inset-y-0 after:start-1/2 after:w-0.5',
  w: 'top-12 bottom-3 -start-[calc(var(--hit-size)/2)] w-(--hit-size) after:inset-y-0 after:start-1/2 after:w-0.5',
  s: 'start-3 end-12 -bottom-[calc(var(--hit-size)/2)] h-(--hit-size) after:inset-x-0 after:top-1/2 after:h-0.5',
  n: 'start-12 end-12 -top-[calc(var(--hit-size)/2)] h-(--hit-size) after:inset-x-0 after:top-1/2 after:h-0.5',
  se: '-end-[calc(var(--hit-size)/2)] -bottom-[calc(var(--hit-size)/2)] size-(--hit-size)',
  sw: '-start-[calc(var(--hit-size)/2)] -bottom-[calc(var(--hit-size)/2)] size-(--hit-size)',
  ne: '',
  nw: '',
};

const cursorClasses: Record<ResizeAnchor, string> = {
  e: 'cursor-ew-resize',
  w: 'cursor-ew-resize',
  n: 'cursor-ns-resize',
  s: 'cursor-ns-resize',
  se: 'cursor-nwse-resize',
  nw: 'cursor-nwse-resize',
  sw: 'cursor-nesw-resize',
  ne: 'cursor-nesw-resize',
};

/** The CSS cursors, for the whole page while a resize drag runs (EDIT-16). */
const cursorValues: Record<ResizeAnchor, string> = {
  e: 'ew-resize',
  w: 'ew-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  se: 'nwse-resize',
  nw: 'nwse-resize',
  sw: 'nesw-resize',
  ne: 'nesw-resize',
};

const mirrored: Partial<Record<ResizeAnchor, ResizeAnchor>> = {
  se: 'sw',
  sw: 'se',
  ne: 'nw',
  nw: 'ne',
};

/** The anchor whose cursor fits: the diagonal ones swap in right-to-left layouts, where `e` is on the left. */
function cursorAnchor(anchor: ResizeAnchor, isRtl: boolean): ResizeAnchor {
  return isRtl ? (mirrored[anchor] ?? anchor) : anchor;
}

/** The CSS cursor for a resize anchor. */
export function resizeCursor(anchor: ResizeAnchor, isRtl: boolean): string {
  return cursorValues[cursorAnchor(anchor, isRtl)];
}

interface CellContentProps<T> {
  item: T;
  env: DashboardGridItemEnv;
  renderItem: (item: T, env: DashboardGridItemEnv) => ReactNode;
}

/** The item itself: re-rendered only when the item, its surroundings or the render function change. */
const CellContent = memo(function CellContent<T>({ item, env, renderItem }: CellContentProps<T>) {
  return renderItem(item, env);
}) as <T>(props: CellContentProps<T>) => ReactNode;

export interface GridCellProps<T extends { id: string }> {
  item: T;
  renderItem: (item: T, env: DashboardGridItemEnv) => ReactNode;
  handlers: GridCellHandlers;
  /** The cell's box in pixels from the content's inline-start and top edges, or a stacked cell's height. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Stacked (one column): the cell flows in a column, `height` pixels tall, or as tall as its content. */
  isStacked: boolean;
  isContentHeight: boolean;
  w: number;
  h: number;
  scale: number;
  breakpoint: string;
  mode: DashboardMode;
  /** The handles show: edit mode at the canonical breakpoint, and the item isn't locked. */
  canArrange: boolean;
  isResizable: boolean;
  isNear: boolean;
  isExpanded: boolean;
  /** Another cell is expanded: this one is hidden from assistive technology and inert. */
  isCovered: boolean;
  /** The pointer is dragging this cell: it follows the pointer, raised, without transitions. */
  isDragging: boolean;
  /** Keyboard manipulation is on for this cell (EDIT-32). */
  isManipulating: boolean;
  /** A size badge, such as "6 × 4" (WID-10). */
  badge: string | undefined;
  handleLabel: string;
  handleHintId: string;
  isRtl: boolean;
}

function GridCellInner<T extends { id: string }>({
  item,
  renderItem,
  handlers,
  left,
  top,
  width,
  height,
  isStacked,
  isContentHeight,
  w,
  h,
  scale,
  breakpoint,
  mode,
  canArrange,
  isResizable,
  isNear,
  isExpanded,
  isCovered,
  isDragging,
  isManipulating,
  badge,
  handleLabel,
  handleHintId,
  isRtl,
}: GridCellProps<T>) {
  const { id } = item;
  const cellRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (element) {
        return handlers.observe(id, element);
      }
      return undefined;
    },
    [handlers, id],
  );

  const env = useMemo(
    (): DashboardGridItemEnv => ({
      cell: { w, h, width, height, scale },
      breakpoint,
      mode,
      canArrange,
      isNearViewport: isNear,
      isInViewport: () => handlers.isInView(id),
      isExpanded,
      onExpandChange: (next) => {
        handlers.onExpandChange(id, next);
      },
      onMoveResize: canArrange
        ? () => {
            handlers.onMoveResize(id);
          }
        : undefined,
    }),
    [w, h, width, height, scale, breakpoint, mode, canArrange, isNear, isExpanded, handlers, id],
  );

  const style: CSSProperties =
    isStacked && !isExpanded
      ? { height: isContentHeight ? undefined : height }
      : { insetInlineStart: left, top, width, height };

  return (
    <div
      ref={cellRef}
      data-item-id={id}
      inert={isCovered || undefined}
      aria-hidden={isCovered || undefined}
      // Dynamic geometry: the cell's place and size on the grid.
      // eslint-disable-next-line no-restricted-syntax -- see above.
      style={style}
      className={cn(
        'flex min-w-0 flex-col',
        isStacked && !isExpanded ? 'relative w-full' : 'absolute',
        !isDragging &&
          !isStacked &&
          'motion-safe:transition-[inset-inline-start,top,width,height] motion-safe:duration-(--duration-normal) motion-safe:ease-(--ease-standard)',
        isDragging && 'z-[3] opacity-90 shadow-overlay',
        isExpanded && 'z-[4]',
        isManipulating && 'z-[3] rounded-card ring-2 ring-accent-solid',
      )}
    >
      <CellContent item={item} env={env} renderItem={renderItem} />
      {canArrange && (
        <>
          <AriaButton
            aria-label={handleLabel}
            aria-describedby={handleHintId}
            data-grid-handle
            data-manipulating={isManipulating || undefined}
            onPress={(event) => {
              handlers.onHandlePress(id, event.pointerType);
            }}
            onPointerDown={(event) => {
              handlers.onHandlePointerDown(id, event);
            }}
            onPointerMove={handlers.onPointerMove}
            onPointerUp={handlers.onPointerUp}
            onPointerCancel={handlers.onPointerCancel}
            onKeyDown={(event) => {
              handlers.onHandleKeyDown(id, event);
            }}
            onFocusChange={(isFocused) => {
              handlers.onHandleFocusChange(id, isFocused);
            }}
            className={cn(
              'absolute start-1 top-1 z-[3] flex size-9 cursor-grab touch-none items-center justify-center rounded-control text-fg-muted outline-none hit-area',
              'bg-surface-3 data-hovered:bg-surface-4 data-pressed:cursor-grabbing data-focus-visible:focus-ring',
              'data-manipulating:bg-accent-solid data-manipulating:text-accent-on-solid',
            )}
          >
            <GripVertical aria-hidden="true" className="size-4" />
          </AriaButton>
          {isResizable &&
            ANCHORS.map((anchor) => (
              <div
                key={anchor}
                aria-hidden="true"
                data-resize-anchor={anchor}
                onPointerDown={(event) => {
                  handlers.onResizePointerDown(id, anchor, event);
                }}
                onPointerMove={handlers.onPointerMove}
                onPointerUp={handlers.onPointerUp}
                onPointerCancel={handlers.onPointerCancel}
                className={cn(
                  'absolute z-[2] touch-none',
                  'after:pointer-events-none after:absolute after:rounded-full after:bg-accent-solid after:opacity-0 hover:after:opacity-100',
                  anchorClasses[anchor],
                  cursorClasses[cursorAnchor(anchor, isRtl)],
                )}
              />
            ))}
          {isResizable && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute end-1.5 bottom-1.5 z-[2] size-2.5 rounded-ee-sm border-e-2 border-b-2 border-fg-muted"
            />
          )}
        </>
      )}
      {badge !== undefined && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute end-2 bottom-2 z-[3] rounded-control bg-neutral-solid px-1.5 py-0.5 text-xs font-medium text-neutral-on-solid tabular-nums shadow-raised"
        >
          {badge}
        </span>
      )}
    </div>
  );
}

/** A grid cell, memoized on its props. */
export const GridCell = memo(GridCellInner) as typeof GridCellInner;
