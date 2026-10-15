import { useCallback, useState } from 'react';

/**
 * The width of an element in CSS pixels, kept current with a ResizeObserver (so layouts follow the element's own
 * width, not the screen's). Attach the returned ref callback to the element. The width is `undefined` until measured.
 */
export function useElementWidth(): [(element: HTMLElement | null) => void, number | undefined] {
  const [width, setWidth] = useState<number | undefined>(undefined);
  const ref = useCallback((element: HTMLElement | null) => {
    if (!element) {
      return;
    }
    setWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);
  return [ref, width];
}
