// The only module allowed to use setTimeout (enforced by ESLint). Layout, theme and position never use timers; these
// are for behaviour that is inherently timed: toast auto-dismiss, press-and-hold repeat, debouncing, and the shared
// clock behind relative times.

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

/** A single timer measured against a deadline, so pausing and resuming keep the remaining time exact. */
export interface DeadlineTimer {
  /** Starts (or restarts) the timer to fire after `ms`. */
  start: (ms: number) => void;
  /** Stops the clock, remembering the time left. */
  pause: () => void;
  /** Continues from where `pause` stopped. */
  resume: () => void;
  /** Cancels the timer. */
  clear: () => void;
  /** Milliseconds left, or 0 when not running. */
  remaining: () => number;
}

export function createDeadlineTimer(onExpire: () => void): DeadlineTimer {
  let handle: ReturnType<typeof setTimeout> | undefined;
  let deadline = 0;
  let left = 0;
  let isPaused = false;

  const cancel = () => {
    if (handle !== undefined) {
      clearTimeout(handle);
      handle = undefined;
    }
  };
  const schedule = (ms: number) => {
    cancel();
    deadline = performance.now() + ms;
    handle = setTimeout(() => {
      handle = undefined;
      left = 0;
      onExpire();
    }, ms);
  };

  return {
    start(ms) {
      isPaused = false;
      left = ms;
      schedule(ms);
    },
    pause() {
      if (handle === undefined || isPaused) {
        return;
      }
      isPaused = true;
      left = Math.max(0, deadline - performance.now());
      cancel();
    },
    resume() {
      if (!isPaused) {
        return;
      }
      isPaused = false;
      schedule(left);
    },
    clear() {
      isPaused = false;
      left = 0;
      cancel();
    },
    remaining() {
      if (isPaused) {
        return left;
      }
      return handle === undefined ? 0 : Math.max(0, deadline - performance.now());
    },
  };
}

/** A deadline timer owned by a component and cleared when it unmounts. `onExpire` may change between renders. */
export function useDeadlineTimer(onExpire: () => void): DeadlineTimer {
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const timerRef = useRef<DeadlineTimer | null>(null);
  timerRef.current ??= createDeadlineTimer(() => {
    onExpireRef.current();
  });
  const timer = timerRef.current;

  useEffect(
    () => () => {
      timer.clear();
    },
    [timer],
  );
  return timer;
}

/**
 * Returns a debounced version of `callback` that runs `delayMs` after the last call. Pending calls are cancelled on
 * unmount, and `flush`/`cancel` are available for immediate or abandoned runs.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): { run: (...args: Args) => void; cancel: () => void; flush: () => void } {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const pendingArgs = useRef<Args | null>(null);
  const timer = useDeadlineTimer(() => {
    const args = pendingArgs.current;
    pendingArgs.current = null;
    if (args) {
      callbackRef.current(...args);
    }
  });

  const run = useCallback(
    (...args: Args) => {
      pendingArgs.current = args;
      timer.start(delayMs);
    },
    [timer, delayMs],
  );
  const cancel = useCallback(() => {
    pendingArgs.current = null;
    timer.clear();
  }, [timer]);
  const flush = useCallback(() => {
    const args = pendingArgs.current;
    pendingArgs.current = null;
    timer.clear();
    if (args) {
      callbackRef.current(...args);
    }
  }, [timer]);

  return { run, cancel, flush };
}

// The shared clock: one timer for every subscriber, ticking every CLOCK_TICK_MS while anyone is subscribed and the
// page is visible. Relative times ("5 min ago") read it, so a page full of them costs one timer.

const CLOCK_TICK_MS = 15_000;
const clockListeners = new Set<() => void>();
let clockNow = Date.now();
let clockHandle: ReturnType<typeof setTimeout> | undefined;

function scheduleClockTick() {
  if (
    clockHandle !== undefined ||
    clockListeners.size === 0 ||
    document.visibilityState === 'hidden'
  ) {
    return;
  }
  const delay = CLOCK_TICK_MS - (Date.now() % CLOCK_TICK_MS);
  clockHandle = setTimeout(() => {
    clockHandle = undefined;
    tickClock();
  }, delay);
}

function tickClock() {
  clockNow = Date.now();
  for (const listener of clockListeners) {
    listener();
  }
  scheduleClockTick();
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    tickClock();
  } else if (clockHandle !== undefined) {
    clearTimeout(clockHandle);
    clockHandle = undefined;
  }
}

function subscribeClock(listener: () => void): () => void {
  if (clockListeners.size === 0) {
    document.addEventListener('visibilitychange', onVisibilityChange);
    clockNow = Date.now();
  }
  clockListeners.add(listener);
  scheduleClockTick();
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0) {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (clockHandle !== undefined) {
        clearTimeout(clockHandle);
        clockHandle = undefined;
      }
    }
  };
}

/** The current time in milliseconds from the shared clock, updated every 15 seconds while the page is visible. */
export function useNow(): number {
  return useSyncExternalStore(
    subscribeClock,
    () => clockNow,
    () => clockNow,
  );
}
