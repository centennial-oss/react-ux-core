import type { RefCallback } from 'react';
import { useResizeMeasure } from './useResizeMeasure';

export interface ElementSize {
  width: number;
  height: number;
}

const sizeOf = ({ width, height }: ElementSize): ElementSize => ({ width, height });
const sameSize = (a: ElementSize, b: ElementSize) => a.width === b.width && a.height === b.height;
const contentSize = (element: HTMLElement, entry?: ResizeObserverEntry) =>
  sizeOf(entry ? entry.contentRect : element.getBoundingClientRect());
const borderSize = (element: HTMLElement) => sizeOf(element.getBoundingClientRect());

export interface UseElementSizeOptions {
  /**
   * Which box to report as it resizes: `content` (the default) excludes padding and borders, `border` includes them
   * (`getBoundingClientRect`, so transforms count too).
   */
  box?: 'content' | 'border';
}

/**
 * The width and height of an element in CSS pixels, kept current with a ResizeObserver (so layouts follow the
 * element's own size, not the screen's). Attach the returned ref callback to the element. The size is `undefined`
 * until measured.
 */
export function useElementSize({ box = 'content' }: UseElementSizeOptions = {}): [
  RefCallback<HTMLElement>,
  ElementSize | undefined,
] {
  const isBorder = box === 'border';
  return useResizeMeasure(
    isBorder ? borderSize : contentSize,
    sameSize,
    isBorder ? 'border-box' : 'content-box',
  );
}
