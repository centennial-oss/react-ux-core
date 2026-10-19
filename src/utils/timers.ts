// The only module allowed to use setTimeout (enforced by ESLint). Layout, theme and position never use timers; these
// are for behaviour that is inherently timed: toast auto-dismiss, press-and-hold repeat, debouncing, and the shared
// clocks behind relative times and world clocks.

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

// Shared clocks: one timer per tick interval for every subscriber, ticking on the interval's boundaries (whole
// seconds, minutes…) while anyone is subscribed and the page is visible. Relative times ("5 min ago") read the
// 15-second clock, so a page full of them costs one timer; clocks that show the time read the second or minute one.

interface SharedClock {
  subscribe: (listener: () => void) => () => void;
  getNow: () => number;
}

function createSharedClock(tickMs: number): SharedClock {
  const listeners = new Set<() => void>();
  let now = Date.now();
  let handle: ReturnType<typeof setTimeout> | undefined;

  const cancel = () => {
    if (handle !== undefined) {
      clearTimeout(handle);
      handle = undefined;
    }
  };
  const schedule = () => {
    if (handle !== undefined || listeners.size === 0 || document.visibilityState === 'hidden') {
      return;
    }
    handle = setTimeout(
      () => {
        handle = undefined;
        tick();
      },
      tickMs - (Date.now() % tickMs),
    );
  };
  const tick = () => {
    now = Date.now();
    for (const listener of listeners) {
      listener();
    }
    schedule();
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      tick();
    } else {
      cancel();
    }
  };

  return {
    subscribe(listener) {
      if (listeners.size === 0) {
        document.addEventListener('visibilitychange', onVisibilityChange);
        now = Date.now();
      }
      listeners.add(listener);
      schedule();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          document.removeEventListener('visibilitychange', onVisibilityChange);
          cancel();
        }
      };
    },
    getNow: () => now,
  };
}

const relativeClock = createSharedClock(15_000);
const wallClocks = { second: createSharedClock(1000), minute: createSharedClock(60_000) };
const subscribeNever = () => () => undefined;

/** The current time in milliseconds from the shared clock, updated every 15 seconds while the page is visible. */
export function useNow(): number {
  return useSyncExternalStore(relativeClock.subscribe, relativeClock.getNow, relativeClock.getNow);
}

/**
 * A value worked out from the shared clock, such as today's date or the current minute. The component re-renders
 * only when it changes, not on every tick. `select` must return a primitive (compared with `Object.is`).
 */
export function useNowSelector<T extends string | number | boolean>(select: (now: number) => T): T {
  const snapshot = () => select(relativeClock.getNow());
  return useSyncExternalStore(relativeClock.subscribe, snapshot, snapshot);
}

/**
 * The current time from a shared clock that ticks on every whole second or minute while the page is visible, for
 * clocks that show the time. Every caller with the same `unit` shares one timer. With `isEnabled` false (such as
 * when the time comes from a prop) it doesn't subscribe or re-render.
 */
export function useWallClock(unit: 'second' | 'minute', isEnabled = true): number {
  const clock = wallClocks[unit];
  return useSyncExternalStore(
    isEnabled ? clock.subscribe : subscribeNever,
    clock.getNow,
    clock.getNow,
  );
}
