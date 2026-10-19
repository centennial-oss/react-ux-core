import { useCallback, useSyncExternalStore } from 'react';

/** Whether a CSS media query matches, kept current with a `matchMedia` change listener (never polling). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => {
        list.removeEventListener('change', onChange);
      };
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Phone layout: viewport narrower than 640 px. Overlays become sheets, tables become card lists. */
export const PHONE_QUERY = '(max-width: 639.98px)';

/** True when the viewport is phone-sized (under 640 px). */
export function useIsPhone(): boolean {
  return useMediaQuery(PHONE_QUERY);
}

/** The user asked the operating system for less motion. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** True when the user prefers reduced motion, kept current as the setting changes. */
export function useIsReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}

/** Whether the user prefers reduced motion right now, for code outside render (an animation about to start). */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
