// Scrolling helpers.

import { isRightToLeft } from './direction';
import { prefersReducedMotion } from './useMediaQuery';

const AXES = {
  inline: { start: 'left', end: 'right', scroll: 'scrollLeft' },
  block: { start: 'top', end: 'bottom', scroll: 'scrollTop' },
} as const;

/** Scrolls `container` along one axis, as little as needed, so `element` (inside it) is fully in view. */
function scrollIntoViewAlong(axis: keyof typeof AXES, container: Element, element: Element): void {
  const { start, end, scroll } = AXES[axis];
  const outer = container.getBoundingClientRect();
  const inner = element.getBoundingClientRect();
  if (inner[start] < outer[start]) {
    container[scroll] -= outer[start] - inner[start];
  } else if (inner[end] > outer[end]) {
    container[scroll] += Math.min(inner[end] - outer[end], inner[start] - outer[start]);
  }
}

/**
 * Scrolls `container` sideways, as little as needed, so `element` (inside it) is fully in view. Unlike
 * `scrollIntoView`, it never scrolls the page or any other ancestor, so it's safe to call while the container is off
 * screen. Works in right-to-left layouts too.
 */
export function scrollIntoViewInline(container: Element, element: Element): void {
  scrollIntoViewAlong('inline', container, element);
}

/** Like `scrollIntoViewInline`, but up and down: `container` scrolls vertically, and nothing else does. */
export function scrollIntoViewBlock(container: Element, element: Element): void {
  scrollIntoViewAlong('block', container, element);
}

/**
 * Scrolls the page, or `container`, so the top of `element` sits `offset` pixels below the top of the viewport or
 * container (clear of sticky headers): smoothly, or at once when the user prefers reduced motion.
 */
export function scrollElementToTop(
  element: Element,
  { container, offset = 0 }: { container?: Element | null; offset?: number } = {},
): void {
  const behavior: ScrollBehavior = prefersReducedMotion() ? 'instant' : 'smooth';
  const top = element.getBoundingClientRect().top - offset;
  if (container) {
    const box = container.getBoundingClientRect();
    container.scrollTo({
      top: container.scrollTop + top - box.top - container.clientTop,
      behavior,
    });
    return;
  }
  const view = element.ownerDocument.defaultView;
  view?.scrollTo({ top: view.scrollY + top, behavior });
}

/**
 * Scrolls `container` sideways, as little as needed, so the span from `start` to `start + size` (in CSS pixels from
 * the start of its content, along the line: from the left, or from the right in right-to-left layouts) is in view.
 * For content that isn't all in the DOM, such as a virtualized list, where only the geometry is known.
 */
export function scrollSpanIntoView(container: Element, start: number, size: number): void {
  // Right to left, scrollLeft runs from 0 down to negative values.
  const sign = isRightToLeft(container) ? -1 : 1;
  const scrolled = container.scrollLeft * sign;
  const visible = container.clientWidth;
  let next = scrolled;
  if (start < scrolled) {
    next = start;
  } else if (start + size > scrolled + visible) {
    next = Math.min(start, start + size - visible);
  }
  if (next !== scrolled) {
    container.scrollLeft = next * sign;
  }
}
