// A pointer drag session for editing things by drag (ScheduleTimeline's and EventCalendar's items): a press that turns
// into a drag once the pointer passes a threshold, with the pointer captured, a preview of where the drag would land
// (set only when that changes, so a drag doesn't re-render on every pixel), and a drop, or a press when the pointer
// went up without dragging.

import { useRef, useState, type PointerEvent } from 'react';
import { capturePointer, isPastTapSlop } from './pointer';

/** A drag in progress: the state it began with, and where and how the pointer went down. */
export interface PointerDrag<S> {
  state: S;
  originX: number;
  originY: number;
  pointerType: string;
  /** Whether the pointer passed the threshold, making this a drag rather than a press. */
  hasMoved: boolean;
  /** A press that never becomes a drag (a locked or read-only item can still be pressed). */
  isPressOnly: boolean;
}

export interface PointerDragOptions<S, P extends object> {
  /** Where the drag would land with the pointer at (`clientX`, `clientY`): the preview, and what `onDrop` gets. */
  resolve: (drag: PointerDrag<S>, clientX: number, clientY: number) => P;
  /** Called when the pointer goes up after dragging. */
  onDrop: (drag: PointerDrag<S>, result: P) => void;
  /** Called when the pointer goes up without having dragged: a click or a tap. */
  onPress?: (drag: PointerDrag<S>) => void;
  /** Pixels the pointer must travel before a press becomes a drag. Defaults to the tap slop of its pointer type. */
  threshold?: number;
}

export interface PointerDragHandlers<S, P> {
  /** Where the current drag would land, or null when nothing is being dragged. */
  preview: P | null;
  /**
   * Starts a press with the primary button. Unless `isPressOnly`, the pointer is captured by the handler's element,
   * so its moves keep coming to that element's `move` handler while it's off the element.
   */
  begin: (event: PointerEvent, state: S, isPressOnly?: boolean) => void;
  move: (event: PointerEvent) => void;
  end: (event: PointerEvent) => void;
  cancel: () => void;
}

function isSameShape(a: object, b: object): boolean {
  const aKeys = Object.keys(a);
  return (
    aKeys.length === Object.keys(b).length &&
    aKeys.every((key) =>
      Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
    )
  );
}

/** Pointer handlers for a drag that previews, then drops (or presses). */
export function usePointerDrag<S, P extends object>({
  resolve,
  onDrop,
  onPress,
  threshold,
}: PointerDragOptions<S, P>): PointerDragHandlers<S, P> {
  const dragRef = useRef<PointerDrag<S> | null>(null);
  const [preview, setPreview] = useState<P | null>(null);

  const begin = (event: PointerEvent, state: S, isPressOnly = false) => {
    if (event.button !== 0) {
      return;
    }
    dragRef.current = {
      state,
      originX: event.clientX,
      originY: event.clientY,
      pointerType: event.pointerType,
      hasMoved: false,
      isPressOnly,
    };
    if (!isPressOnly) {
      capturePointer(event.currentTarget, event.pointerId);
    }
  };
  const move = (event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.isPressOnly) {
      return;
    }
    if (!drag.hasMoved) {
      const dx = event.clientX - drag.originX;
      const dy = event.clientY - drag.originY;
      const isDragging =
        threshold === undefined
          ? isPastTapSlop(dx, dy, drag.pointerType)
          : Math.hypot(dx, dy) >= threshold;
      if (!isDragging) {
        return;
      }
      drag.hasMoved = true;
    }
    const next = resolve(drag, event.clientX, event.clientY);
    setPreview((current) => (current !== null && isSameShape(current, next) ? current : next));
  };
  const end = (event: PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setPreview(null);
    if (!drag) {
      return;
    }
    if (drag.hasMoved) {
      onDrop(drag, resolve(drag, event.clientX, event.clientY));
    } else {
      onPress?.(drag);
    }
  };
  const cancel = () => {
    dragRef.current = null;
    setPreview(null);
  };
  return { preview, begin, move, end, cancel };
}
