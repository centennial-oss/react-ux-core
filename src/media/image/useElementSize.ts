import { useCallback, useState } from 'react';
import type { Size } from './geometry';

/**
 * The width and height of an element in CSS pixels, kept current with a ResizeObserver. Attach the returned ref
 * callback to the element. The size is `undefined` until measured.
 */
export function useElementSize(): [(element: HTMLElement | null) => void, Size | undefined] {
  const [size, setSize] = useState<Size | undefined>(undefined);
  const ref = useCallback((element: HTMLElement | null) => {
    if (!element) {
      return;
    }
    const update = (width: number, height: number) => {
      setSize((current) =>
        current?.width === width && current.height === height ? current : { width, height },
      );
    };
    const rect = element.getBoundingClientRect();
    update(rect.width, rect.height);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        update(entry.contentRect.width, entry.contentRect.height);
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);
  return [ref, size];
}
