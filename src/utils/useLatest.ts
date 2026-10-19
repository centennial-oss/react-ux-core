import { useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * A ref that always holds the latest `value`, for listeners and timers set up once that must call the current
 * callback or read the current props. Updated in a layout effect, so it's current before any effect or event runs.
 * Read it in handlers and effects, never during render.
 */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
