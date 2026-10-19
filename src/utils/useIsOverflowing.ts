import { useMemo, type RefCallback } from 'react';
import { useResizeMeasure } from './useResizeMeasure';

export interface UseIsOverflowingOptions {
  /** Which direction to check. Defaults to both. */
  axis?: 'x' | 'y' | 'both';
  /**
   * Pixels of overflow to ignore, for sub-pixel rounding (1 for clamped text, whose line box can poke out a fraction
   * of a pixel). Defaults to 0.
   */
  tolerance?: number;
  /** Also re-check when the first child resizes, for scroll areas whose content changes size. */
  shouldObserveContent?: boolean;
}

/**
 * Whether an element's content is bigger than the element (it scrolls, or its text is cut off), kept current as
 * its size changes. Attach the returned ref callback to the element.
 */
export function useIsOverflowing({
  axis = 'both',
  tolerance = 0,
  shouldObserveContent = false,
}: UseIsOverflowingOptions = {}): [RefCallback<HTMLElement>, boolean] {
  const measure = useMemo(
    () => (element: HTMLElement) =>
      (axis !== 'y' && element.scrollWidth > element.clientWidth + tolerance) ||
      (axis !== 'x' && element.scrollHeight > element.clientHeight + tolerance),
    [axis, tolerance],
  );
  const [ref, isOverflowing] = useResizeMeasure(
    measure,
    Object.is,
    'content-box',
    shouldObserveContent,
  );
  return [ref, isOverflowing === true];
}
