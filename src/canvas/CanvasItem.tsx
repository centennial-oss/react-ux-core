// CanvasItem: positions a child in world units and makes it selectable, draggable and keyboard-movable. Items are
// options in the canvas's list of items, focusable in document order: arrow keys nudge (Shift + arrows by a grid step),
// Delete asks the app to delete, Enter runs the item's action and Space selects (Shift + Space adds or removes). A
// drag moves the whole selection when the item is in it, snapping to the grid unless Alt is held. While dragging the
// item draws itself at the dragged position, so it works whether the app updates positions live (`onMove`) or once at
// the end (`onMoveEnd`).

import {
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { cn } from '../utils/cn';
import { mergeRefs } from '../utils/mergeRefs';
import { capturePointer } from '../utils/pointer';
import { useLatest } from '../utils/useLatest';
import { useCanvasInternals, useIsSelected, type CanvasItemEntry } from './context';
import { snapValue, type CanvasPoint } from './geometry';
import { useCanvasMessages } from './messages';

export interface CanvasItemProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className' | 'style' | 'children' | 'role' | 'id' | 'tabIndex'
> {
  /** Identifies the item in the canvas's selection. */
  id: string;
  /** World position of the item's top-left corner. */
  x: number;
  y: number;
  /** World size. Defaults to the child's own size. */
  width?: number;
  height?: number;
  /** Called with the new position while the item is dragged, and when a drag or nudge ends. */
  onMove?: (position: CanvasPoint) => void;
  /** Called once with the final position when a drag or keyboard nudge ends. */
  onMoveEnd?: (position: CanvasPoint) => void;
  /** Enter or a double-click, such as opening the item's details. */
  onAction?: () => void;
  /** Can be dragged and nudged. Defaults to true. */
  isMovable?: boolean;
  /** Describes the keys that move it (when it can move). Turn off to describe them yourself. Defaults to true. */
  hasInstructions?: boolean;
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const nudges: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

interface Drag {
  pointerId: number;
  start: CanvasPoint;
  origin: CanvasPoint;
  dx: number;
  dy: number;
  hasMoved: boolean;
  isAlreadySelected: boolean;
  isToggle: boolean;
}

/** A selectable, draggable shape on a `Canvas`, positioned in world units. */
export function CanvasItem({
  id,
  x,
  y,
  width,
  height,
  onMove,
  onMoveEnd,
  onAction,
  isMovable = true,
  hasInstructions = true,
  children,
  className,
  ref,
  onKeyDown,
  onKeyUp,
  onFocus,
  onDoubleClick,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: CanvasItemProps) {
  const internals = useCanvasInternals();
  const messages = useCanvasMessages();
  const isSelected = useIsSelected(internals.selection, id);
  const elementRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState<{ origin: CanvasPoint; dx: number; dy: number } | null>(
    null,
  );
  const drag = useRef<Drag | null>(null);
  const isPointerFocus = useRef(false);
  const moveOrigin = useRef<CanvasPoint | null>(null);
  const latest = useLatest({ x, y, width, height, onMove, onMoveEnd });

  // Tell the canvas where the item is and how to move it with the rest of the selection.
  useLayoutEffect(() => {
    const entry: CanvasItemEntry = {
      getRect: () => {
        const current = latest.current;
        const element = elementRef.current;
        return {
          x: current.x,
          y: current.y,
          width: current.width ?? element?.offsetWidth ?? 0,
          height: current.height ?? element?.offsetHeight ?? 0,
        };
      },
      onGroupMove: (dx, dy, phase) => {
        const current = latest.current;
        const origin = moveOrigin.current ?? { x: current.x, y: current.y };
        if (phase === 'cancel') {
          moveOrigin.current = null;
          setOffset(null);
          return;
        }
        const next = { x: origin.x + dx, y: origin.y + dy };
        if (phase === 'move') {
          moveOrigin.current = origin;
          setOffset({ origin, dx, dy });
          current.onMove?.(next);
        } else {
          moveOrigin.current = null;
          setOffset(null);
          current.onMove?.(next);
          current.onMoveEnd?.(next);
        }
      },
    };
    const unregister = internals.registerItem(id, entry);
    internals.itemChanged();
    return () => {
      unregister();
      internals.itemChanged();
    };
  }, [id, internals, latest]);

  useLayoutEffect(() => {
    internals.itemChanged();
  }, [internals, x, y, width, height]);

  const cancelDrag = () => {
    if (drag.current?.hasMoved) {
      internals.moveGroup(id, 0, 0, 'cancel');
    }
    drag.current = null;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // Pan presses (Space held, middle button) and other buttons go on to the canvas.
    if (event.button !== 0 || internals.isPanPress(event)) {
      return;
    }
    event.stopPropagation();
    isPointerFocus.current = true;
    elementRef.current?.focus({ preventScroll: true });
    isPointerFocus.current = false;
    const isToggle = (event.shiftKey || event.metaKey || event.ctrlKey) && internals.isMultiple();
    const isAlreadySelected = internals.selection.has(id);
    if (isToggle) {
      internals.select(id, 'toggle');
    } else if (!isAlreadySelected) {
      internals.select(id, 'replace');
    }
    drag.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: { x, y },
      dx: 0,
      dy: 0,
      hasMoved: false,
      isAlreadySelected,
      isToggle,
    };
    if (isMovable && !(isToggle && isAlreadySelected)) {
      capturePointer(event.currentTarget, event.pointerId);
      internals.setItemDrag(cancelDrag);
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (current?.pointerId !== event.pointerId || !isMovable || current.isToggle) {
      return;
    }
    const screenDx = event.clientX - current.start.x;
    const screenDy = event.clientY - current.start.y;
    if (!current.hasMoved && Math.hypot(screenDx, screenDy) <= 3) {
      return;
    }
    current.hasMoved = true;
    const { zoom } = internals.getViewport();
    let dx = screenDx / zoom;
    let dy = screenDy / zoom;
    if (internals.isSnapping() && !event.altKey) {
      const step = internals.gridSize();
      dx = snapValue(current.origin.x + dx, step) - current.origin.x;
      dy = snapValue(current.origin.y + dy, step) - current.origin.y;
    }
    if (dx !== current.dx || dy !== current.dy) {
      current.dx = dx;
      current.dy = dy;
      internals.moveGroup(id, dx, dy, 'move');
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (current?.pointerId !== event.pointerId) {
      return;
    }
    if (current.hasMoved) {
      internals.moveGroup(id, current.dx, current.dy, 'end');
    } else if (!current.isToggle && current.isAlreadySelected) {
      // A click on an item in a multiple selection selects just that item.
      internals.select(id, 'replace');
    }
    drag.current = null;
    internals.setItemDrag(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }
    const nudge = nudges[event.key];
    if (nudge && isMovable && !event.altKey && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      const step = event.shiftKey ? internals.gridSize() || 10 : 1;
      const dx = nudge[0] * step;
      const dy = nudge[1] * step;
      internals.moveGroup(id, dx, dy, 'end');
      internals.announce(
        messages.canvasItemMoved({
          x: internals.formatNumber(x + dx),
          y: internals.formatNumber(y + dy),
        }),
      );
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      internals.requestDelete(id);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (onAction) {
        onAction();
      } else {
        internals.select(id, 'replace');
      }
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyUp?.(event);
    // Space selects on release, unless it was held to pan.
    if (event.key === ' ' && !event.defaultPrevented && !internals.hasSpacePanned()) {
      internals.select(id, event.shiftKey || event.metaKey || event.ctrlKey ? 'toggle' : 'replace');
    }
  };

  const position = offset
    ? { x: offset.origin.x + offset.dx, y: offset.origin.y + offset.dy }
    : { x, y };
  const describedBy = [
    ariaDescribedBy,
    isMovable && hasInstructions ? internals.itemInstructionsId : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      {...rest}
      ref={mergeRefs(ref, elementRef)}
      role="option"
      aria-selected={isSelected}
      aria-describedby={describedBy || undefined}
      tabIndex={0}
      data-canvas-item={id}
      data-selected={isSelected || undefined}
      data-dragging={offset ? true : undefined}
      className={cn(
        'absolute top-0 left-0 outline-none focus-visible:focus-ring',
        'aria-selected:ring-2 aria-selected:ring-accent-solid',
        isMovable && 'cursor-grab data-dragging:cursor-grabbing',
        className,
      )}
      // Dynamic geometry: the item's world position and size.
      // eslint-disable-next-line no-restricted-syntax -- see above.
      style={{
        transform: `translate(${String(position.x)}px, ${String(position.y)}px)`,
        width,
        height,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        cancelDrag();
        internals.setItemDrag(null);
      }}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onFocus={(event) => {
        onFocus?.(event);
        // Keyboard focus pans the item into view; a press already has it under the pointer.
        if (event.target === event.currentTarget && !isPointerFocus.current) {
          internals.reveal({
            x,
            y,
            width: width ?? event.currentTarget.offsetWidth,
            height: height ?? event.currentTarget.offsetHeight,
          });
        }
      }}
      onDoubleClick={(event) => {
        onDoubleClick?.(event);
        onAction?.();
      }}
    >
      {children}
    </div>
  );
}
