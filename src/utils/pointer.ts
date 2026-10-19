// Pointer gesture helpers for drags, pans and pinches.

export interface PointerPoint {
  x: number;
  y: number;
}

/**
 * Captures a pointer on an element, so moves keep coming while it's off the element. The pointer can already be gone
 * by the time a handler runs (a very quick tap, or a synthetic event), and then the browser throws; the gesture
 * simply works without capture.
 */
export function capturePointer(element: Element | null | undefined, pointerId: number): void {
  try {
    element?.setPointerCapture(pointerId);
  } catch {
    // The pointer is no longer active.
  }
}

/** A pointer's position relative to the element's top-left corner, in CSS pixels. */
export function pointInElement(
  event: { clientX: number; clientY: number },
  element: Element | null | undefined,
): PointerPoint {
  const rect = element?.getBoundingClientRect();
  return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
}

/** The distance (at least 1) between the first two points and their midpoint, for pinch gestures. */
export function pinchOf(points: readonly PointerPoint[]): { distance: number; mid: PointerPoint } {
  const [a = { x: 0, y: 0 }, b = a] = points;
  return {
    distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
    mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  };
}

/** How far a pointer may move, in CSS pixels, and still count as a tap rather than a drag. */
const TAP_SLOP: Readonly<Record<string, number>> = { mouse: 4, pen: 6, touch: 10 };

/** How long a touch is held, in milliseconds, before it counts as a long press. */
export const LONG_PRESS_MS = 500;

/** Whether a pointer that has moved by (dx, dy) since it went down is dragging rather than tapping. */
export function isPastTapSlop(dx: number, dy: number, pointerType: string): boolean {
  return Math.hypot(dx, dy) > (TAP_SLOP[pointerType] ?? 4);
}

/** A horizontal drag at least this long, in CSS pixels, is a swipe. */
export const SWIPE_DISTANCE = 50;

/**
 * Which way a drag of (dx, dy) swipes: `next`, `previous`, or undefined when it's too short or too steep. Swiping left
 * brings the next item in left-to-right layouts, and the previous one in right-to-left.
 */
export function swipeDirection(
  dx: number,
  dy: number,
  isRtl: boolean,
): 'previous' | 'next' | undefined {
  if (Math.abs(dx) <= SWIPE_DISTANCE || Math.abs(dx) <= 1.5 * Math.abs(dy)) {
    return undefined;
  }
  return dx < 0 === !isRtl ? 'next' : 'previous';
}

/**
 * Whether a click is a plain primary-button click, which a page may handle itself. A click with a modifier key or
 * another button opens a link in a new tab or window, so it's left to the browser.
 */
export function isPlainClick(
  event: Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>,
): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
