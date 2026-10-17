import { useCallback, useState } from 'react';

/**
 * Whether an element's text is cut off (clamped or truncated), kept current as its size changes. Attach the returned
 * ref callback to the element.
 */
export function useIsClamped(): [(element: HTMLElement | null) => void, boolean] {
  const [isClamped, setClamped] = useState(false);
  const ref = useCallback((element: HTMLElement | null) => {
    if (!element) {
      return;
    }
    const measure = () => {
      setClamped(
        element.scrollHeight > element.clientHeight + 1 ||
          element.scrollWidth > element.clientWidth + 1,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);
  return [ref, isClamped];
}
