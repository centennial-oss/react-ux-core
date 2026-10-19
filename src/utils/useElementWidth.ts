import type { RefCallback } from 'react';
import { useResizeMeasure } from './useResizeMeasure';

function contentWidth(element: HTMLElement, entry: ResizeObserverEntry | undefined): number {
  return entry ? entry.contentRect.width : element.getBoundingClientRect().width;
}

/**
 * The width of an element in CSS pixels, kept current with a ResizeObserver (so layouts follow the element's own
 * width, not the screen's). Attach the returned ref callback to the element. The width is `undefined` until measured.
 * Height changes don't re-render; use `useElementSize` for both.
 */
export function useElementWidth(): [RefCallback<HTMLElement>, number | undefined] {
  const [ref, width] = useResizeMeasure(contentWidth);
  return [ref, width];
}
