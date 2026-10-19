import type { RefCallback } from 'react';
import { useIsOverflowing } from './useIsOverflowing';

/**
 * Whether an element's text is cut off (clamped or truncated), kept current as its size changes. Attach the returned
 * ref callback to the element.
 */
export function useIsClamped(): [RefCallback<HTMLElement>, boolean] {
  return useIsOverflowing({ tolerance: 1 });
}
