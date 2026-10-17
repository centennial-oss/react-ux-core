// A number property's label that scrubs the value: drag it sideways (mouse, pen or touch) and the number moves one
// step per few pixels, ten with Shift held. A press without a drag puts focus in the field. It's a pointer shortcut
// only; the field's own ArrowUp/ArrowDown (and PageUp/PageDown) are the keyboard equivalent, so the label isn't a
// tab stop.

import { useRef, type PointerEvent, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { scrubValue } from './values';

/** Pixels of pointer travel per step. */
const PIXELS_PER_STEP = 4;
/** Travel before a press counts as a drag. */
const DRAG_THRESHOLD = 3;

export interface ScrubLabelProps {
  children: ReactNode;
  /** The value when the drag starts (`null` starts from `min` or 0). */
  value: number | null;
  step?: number;
  min?: number;
  max?: number;
  onScrub: (value: number) => void;
  /** Focuses the field after a press without a drag. */
  onPress: () => void;
  isDisabled?: boolean;
  className?: string;
}

export function ScrubLabel({
  children,
  value,
  step = 1,
  min,
  max,
  onScrub,
  onPress,
  isDisabled = false,
  className,
}: ScrubLabelProps) {
  const drag = useRef<{ x: number; start: number; last: number; isDragging: boolean } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    if (isDisabled || event.button !== 0) {
      return;
    }
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone; the drag simply ends at the next pointerup.
    }
    const start = value ?? min ?? 0;
    drag.current = { x: event.clientX, start, last: start, isDragging: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    const current = drag.current;
    if (!current) {
      return;
    }
    const dx = event.clientX - current.x;
    if (!current.isDragging && Math.abs(dx) < DRAG_THRESHOLD) {
      return;
    }
    current.isDragging = true;
    const steps = Math.round(dx / PIXELS_PER_STEP) * (event.shiftKey ? 10 : 1);
    const next = scrubValue(current.start, steps, { step, min, max });
    if (next !== current.last) {
      current.last = next;
      onScrub(next);
    }
  };
  const end = (event: PointerEvent<HTMLSpanElement>, isCancelled: boolean) => {
    const current = drag.current;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (current && !current.isDragging && !isCancelled) {
      onPress();
    }
  };

  return (
    // A pointer-only shortcut: the field it labels takes the arrow keys, so this needs no role or tab stop.
    <span
      aria-hidden="true"
      data-scrub=""
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => {
        end(event, false);
      }}
      onPointerCancel={(event) => {
        end(event, true);
      }}
      className={cn(
        'touch-none select-none',
        isDisabled ? 'cursor-default' : 'cursor-ew-resize',
        className,
      )}
    >
      {children}
    </span>
  );
}
