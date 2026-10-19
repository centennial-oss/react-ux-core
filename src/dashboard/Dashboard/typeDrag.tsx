// Dragging a widget type from the picker onto the grid (EDIT-11). The picker notices a drag starting on one of its
// options (`useDragOut`: past the tap slop with a mouse or pen, after a long press on a touch screen) and closes; the
// shell then follows the pointer (`useTypeDrag`) with a chip under it, while the grid shows where the widget would
// land. Only the grid's placeholder and the cells that make room re-render as the pointer moves. Picking with a click
// or the keyboard stays the non-drag way (WCAG 2.5.7).

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import type { DashboardGridHandle } from '../DashboardGrid/DashboardGrid';
import type { GridRect } from '../layout/engine';
import { isPastTapSlop, LONG_PRESS_MS } from '../../utils/pointer';
import { useDeadlineTimer } from '../../utils/timers';
import { useLatest } from '../../utils/useLatest';
import type { IconComponent } from '../../utils/icon';

/** Where a drag out of a list began: the pointer, which is still down. */
export interface DragStartPoint {
  clientX: number;
  clientY: number;
  pointerId: number;
}

/**
 * Notices a drag starting on a list's option (an element with `data-key`): give the returned handler to the list's
 * container as `onPointerDownCapture` (React Aria's press handling stops the event bubbling).
 */
export function useDragOut(
  onDragStart: ((key: string, point: DragStartPoint) => void) | undefined,
): ((event: ReactPointerEvent<HTMLElement>) => void) | undefined {
  const latest = useLatest({ onDragStart });
  const tracking = useRef<{
    key: string;
    pointerId: number;
    pointerType: string;
    x: number;
    y: number;
    isArmed: boolean;
    stop: () => void;
  } | null>(null);
  const longPress = useDeadlineTimer(() => {
    if (tracking.current) {
      tracking.current.isArmed = true;
    }
  });
  useEffect(
    () => () => {
      tracking.current?.stop();
    },
    [],
  );
  if (!onDragStart) {
    return undefined;
  }
  return (event) => {
    const key = (event.target as Element).closest('[data-key]')?.getAttribute('data-key');
    if (key === null || key === undefined || event.button !== 0) {
      return;
    }
    tracking.current?.stop();
    const onMove = (move: PointerEvent) => {
      const at = tracking.current;
      if (at?.pointerId !== move.pointerId) {
        return;
      }
      if (!isPastTapSlop(move.clientX - at.x, move.clientY - at.y, at.pointerType)) {
        return;
      }
      at.stop();
      // A touch that moves before its long press is a scroll.
      if (at.isArmed) {
        latest.current.onDragStart?.(at.key, {
          clientX: move.clientX,
          clientY: move.clientY,
          pointerId: at.pointerId,
        });
      }
    };
    const onEnd = (end: PointerEvent) => {
      if (end.pointerId === tracking.current?.pointerId) {
        tracking.current.stop();
      }
    };
    // Once a touch is held, its moves drag rather than scroll.
    const onTouchMove = (touch: TouchEvent) => {
      if (tracking.current?.isArmed) {
        touch.preventDefault();
      }
    };
    const stop = () => {
      longPress.clear();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      tracking.current = null;
    };
    tracking.current = {
      key,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      x: event.clientX,
      y: event.clientY,
      isArmed: event.pointerType !== 'touch',
      stop,
    };
    if (event.pointerType === 'touch') {
      longPress.start(LONG_PRESS_MS);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
  };
}

/** What's being dragged: what the chip shows, and the size the grid places. */
export interface TypeDragItem<T> {
  value: T;
  label: string;
  icon?: IconComponent;
  size: { w: number; h: number };
}

/**
 * Follows a drag that began outside the grid: a chip under the pointer, the grid's preview while it's over the grid,
 * and `onDrop` with the place when it's let go there. Escape, or letting go elsewhere, cancels it.
 */
export function useTypeDrag<T>({
  gridRef,
  onDrop,
}: {
  gridRef: RefObject<DashboardGridHandle | null>;
  onDrop: (value: T, rect: GridRect) => void;
}) {
  const [item, setItem] = useState<(TypeDragItem<T> & { start: DragStartPoint }) | null>(null);
  const session = useRef<{ pointerId: number; x: number; y: number; rect: GridRect | null } | null>(
    null,
  );
  const chip = useRef<HTMLDivElement | null>(null);
  const latest = useLatest({ onDrop });

  useEffect(() => {
    const at = session.current;
    if (!item || !at) {
      return;
    }
    const grid = gridRef.current;
    const follow = (x: number, y: number) => {
      at.x = x;
      at.y = y;
      // The chip moves without a render.
      if (chip.current) {
        chip.current.style.transform = `translate(${String(x + 12)}px, ${String(y + 12)}px)`;
      }
      at.rect = grid?.previewDrop(item.size, x, y) ?? null;
    };
    const finish = () => {
      grid?.clearDrop();
      session.current = null;
      setItem(null);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerId === at.pointerId) {
        follow(event.clientX, event.clientY);
      }
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== at.pointerId) {
        return;
      }
      follow(event.clientX, event.clientY);
      const rect = at.rect;
      finish();
      if (rect) {
        latest.current.onDrop(item.value, rect);
      }
    };
    const onCancel = (event: PointerEvent) => {
      if (event.pointerId === at.pointerId) {
        finish();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Before anything else hears it (full screen, an expanded widget).
        event.preventDefault();
        event.stopPropagation();
        finish();
      }
    };
    const onTouchMove = (event: TouchEvent) => {
      event.preventDefault();
    };
    follow(at.x, at.y);
    const root = document.documentElement;
    root.style.cursor = 'grabbing';
    root.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      root.style.cursor = '';
      root.style.userSelect = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [item, gridRef, latest]);

  const startDrag = (next: TypeDragItem<T>, point: DragStartPoint) => {
    session.current = {
      pointerId: point.pointerId,
      x: point.clientX,
      y: point.clientY,
      rect: null,
    };
    setItem({ ...next, start: point });
  };

  const Icon = item?.icon;
  const ghost = item && (
    <div
      ref={chip}
      aria-hidden="true"
      // Dynamic geometry: under the pointer (moves update it without a render).
      // eslint-disable-next-line no-restricted-syntax -- see above.
      style={{
        transform: `translate(${String(item.start.clientX + 12)}px, ${String(item.start.clientY + 12)}px)`,
      }}
      className="pointer-events-none fixed top-0 left-0 z-overlay flex items-center gap-2 rounded-control border border-accent-border bg-surface-1 px-3 py-2 text-sm font-medium text-fg shadow-overlay"
    >
      {Icon && <Icon aria-hidden="true" className="size-4 text-fg-muted" />}
      {item.label}
    </div>
  );
  return { startDrag, ghost, isDragging: item !== null };
}
