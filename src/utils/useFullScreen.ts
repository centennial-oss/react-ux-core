import { useCallback, useEffect, useState } from 'react';

export interface FullScreen {
  /** Whether `target` is the full-screen element. */
  isFullScreen: boolean;
  /** Whether the browser allows the Fullscreen API here (false during server rendering). */
  canFullScreen: boolean;
  /** Leaves full screen if anything is full screen, else takes `target` full screen. */
  toggle: () => void;
}

/**
 * Takes one element full screen with the Fullscreen API and follows whether it is, including exits with Escape or
 * the browser's own controls. Requests that the browser refuses are ignored.
 */
export function useFullScreen(target: Element | null): FullScreen {
  const [isFullScreen, setFullScreen] = useState(false);
  useEffect(() => {
    const update = () => {
      setFullScreen(target !== null && document.fullscreenElement === target);
    };
    document.addEventListener('fullscreenchange', update);
    return () => {
      document.removeEventListener('fullscreenchange', update);
    };
  }, [target]);
  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else if (target && document.fullscreenEnabled) {
      void target.requestFullscreen().catch(() => undefined);
    }
  }, [target]);
  const canFullScreen = typeof document !== 'undefined' && document.fullscreenEnabled;
  return { isFullScreen, canFullScreen, toggle };
}
