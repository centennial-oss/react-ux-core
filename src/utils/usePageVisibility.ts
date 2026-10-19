import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => {
    document.removeEventListener('visibilitychange', onChange);
  };
}

/** True while the page is hidden (another tab is in front, or the window is minimised), kept current as it changes. */
export function useIsPageHidden(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.visibilityState === 'hidden',
    () => false,
  );
}
