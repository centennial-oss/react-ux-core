// A recurring timer built on the deadline timer (timers.ts): auto-refresh, rotating tiles and slides, page cycling.

import { useCallback, useEffect, useRef } from 'react';
import { useDeadlineTimer } from './timers';
import { useLatest } from './useLatest';

export interface RecurringTimerOptions {
  /** The timer runs only while this is true (not hidden, not editing, not hovered…). Defaults to true. */
  isRunning?: boolean;
  /**
   * When it starts running again after a stop, a tick that fell due meanwhile fires straight away and the schedule
   * carries on from there (auto-refresh). Without it, every start waits a whole interval (rotation).
   */
  shouldCatchUp?: boolean;
}

/**
 * Calls `onTick` every `intervalMs` while running; no interval (undefined or 0 or less) means no ticks. `restart`
 * starts the interval over from now, such as after a manual refresh or advance.
 */
export function useRecurringTimer(
  onTick: () => void,
  intervalMs: number | undefined,
  { isRunning = true, shouldCatchUp = false }: RecurringTimerOptions = {},
): { restart: () => void } {
  const latest = useLatest({ onTick, intervalMs });
  // When the last tick (or the first start) happened, for catching up.
  const lastTickRef = useRef<number | null>(null);
  const timer = useDeadlineTimer(() => {
    const interval = latest.current.intervalMs;
    lastTickRef.current = performance.now();
    latest.current.onTick();
    if (interval !== undefined && interval > 0) {
      timer.start(interval);
    }
  });
  const isActive = isRunning && intervalMs !== undefined && intervalMs > 0;

  useEffect(() => {
    if (!isActive) {
      timer.clear();
      return;
    }
    const now = performance.now();
    const last = lastTickRef.current;
    if (!shouldCatchUp || last === null) {
      lastTickRef.current ??= now;
      timer.start(intervalMs);
    } else if (now - last >= intervalMs) {
      // A tick fell due while stopped (NAV-10).
      lastTickRef.current = now;
      latest.current.onTick();
      timer.start(intervalMs);
    } else {
      timer.start(intervalMs - (now - last));
    }
    return () => {
      timer.clear();
    };
  }, [isActive, intervalMs, shouldCatchUp, timer, latest]);

  const restart = useCallback(() => {
    lastTickRef.current = performance.now();
    const interval = latest.current.intervalMs;
    if (isActive && interval !== undefined) {
      timer.start(interval);
    }
  }, [isActive, timer, latest]);
  return { restart };
}
