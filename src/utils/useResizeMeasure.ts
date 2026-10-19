import { useLayoutEffect, useState, type RefCallback } from 'react';

/** Reads a value from an element; `entry` is the ResizeObserver's, or undefined for the first measure. */
export type ResizeMeasure<T> = (element: HTMLElement, entry?: ResizeObserverEntry) => T;

/**
 * A value measured from an element when it's attached and whenever it resizes, with a ResizeObserver. The shared
 * core of `useElementSize`, `useElementWidth` and `useIsOverflowing`. `measure` and `isEqual` should be stable
 * (module-level or memoized); `isEqual` skips the re-render for an unchanged reading. `box` is the box whose resizes
 * re-measure, and `shouldObserveContent` also re-measures when the first child resizes (for overflow). Returns the
 * ref callback to attach and the value, `undefined` until measured.
 *
 * The ref only records the element, and the observer lives in a layout effect keyed on it. A caller that merges the
 * ref inline (`ref={mergeRefs(ref, measureRef)}`) gives React a new ref every render, which detaches and re-attaches
 * it in the same commit; the element doesn't change, so neither does the observer, and nothing is re-measured.
 */
export function useResizeMeasure<T>(
  measure: ResizeMeasure<T>,
  isEqual: (a: T, b: T) => boolean = Object.is,
  box: ResizeObserverBoxOptions = 'content-box',
  shouldObserveContent = false,
): [RefCallback<HTMLElement>, T | undefined] {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [value, setValue] = useState<T>();
  useLayoutEffect(() => {
    if (!element) {
      return;
    }
    const update = (entry?: ResizeObserverEntry) => {
      const next = measure(element, entry);
      setValue((current) => (current !== undefined && isEqual(current, next) ? current : next));
    };
    update();
    const observer = new ResizeObserver(([entry]) => {
      update(entry?.target === element ? entry : undefined);
    });
    observer.observe(element, { box });
    if (shouldObserveContent && element.firstElementChild) {
      observer.observe(element.firstElementChild);
    }
    return () => {
      observer.disconnect();
    };
  }, [element, measure, isEqual, box, shouldObserveContent]);
  return [setElement, value];
}
