import { useEffect, type RefObject } from 'react';
import { useLatest } from './useLatest';

/**
 * Listens for wheel events on `target` with a non-passive listener, so `handler` can call `preventDefault()` to stop
 * the page scrolling (or a trackpad pinch zooming the page). The listener is added once and always calls the latest
 * `handler`. A new `remountKey` re-attaches it, for an element that remounts (for example after a retry).
 */
export function useWheel(
  target: RefObject<HTMLElement | null>,
  handler: (event: WheelEvent) => void,
  remountKey?: unknown,
): void {
  const latest = useLatest(handler);
  useEffect(() => {
    const element = target.current;
    if (!element) {
      return;
    }
    const listener = (event: WheelEvent) => {
      latest.current(event);
    };
    element.addEventListener('wheel', listener, { passive: false });
    return () => {
      element.removeEventListener('wheel', listener);
    };
  }, [target, latest, remountKey]);
}
