import { useCallback } from 'react';
import { useLatest } from './useLatest';

/**
 * A function that keeps its identity across renders and always calls the latest `callback`, for memoized children
 * and listeners set up once. Call it from events and effects, never during render.
 */
export function useStableCallback<Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
): (...args: Args) => Result {
  const ref = useLatest(callback);
  return useCallback((...args: Args) => ref.current(...args), [ref]);
}
