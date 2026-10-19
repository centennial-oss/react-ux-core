// The dashboard's load scheduler (§8.4), without React: identical requests in flight at the same moment share one
// call (DATA-10), at most `maxConcurrentLoads` run at once with the rest queued, widgets in view first (DATA-11), and
// every caller can abort its own interest without disturbing the others (DATA-08).

import { sortKeysDeep } from '../../utils/collections';

/** An identity for a request: a stable serialization of its parts, independent of key order (DATA-10). */
export function requestKey(parts: Record<string, unknown>): string {
  return JSON.stringify(sortKeysDeep(parts));
}

function abortError(): DOMException {
  return new DOMException('The load was superseded or its widget went away.', 'AbortError');
}

interface Entry {
  key: string;
  start: (signal: AbortSignal) => Promise<unknown>;
  controller: AbortController;
  priority: number;
  /** Order of arrival, for first-in first-out among equal priorities. */
  order: number;
  isRunning: boolean;
  /** The callers still waiting for this load. */
  waiters: Set<{ resolve: (value: unknown) => void; reject: (error: unknown) => void }>;
}

export interface DataRuntime {
  /**
   * Starts the load for `key`, or joins the one already queued or running, and resolves with its result. Aborting
   * `signal` rejects this caller's promise straight away; the load itself is aborted (and its slot freed) only once
   * no caller waits for it. A higher `priority` (widgets in view) runs first.
   */
  request: <T>(
    key: string,
    start: (signal: AbortSignal) => Promise<T>,
    options: { signal: AbortSignal; priority?: number },
  ) => Promise<T>;
  /** Changes how many loads may run at once. */
  setMaxConcurrent: (count: number) => void;
  /** How many loads are running and queued, for tests and progress. */
  readonly stats: { running: number; queued: number };
}

/** A load scheduler with at most `maxConcurrentLoads` loads running at once (default 6). */
export function createDataRuntime(maxConcurrentLoads = 6): DataRuntime {
  const entries = new Map<string, Entry>();
  let maxRunning = Math.max(1, maxConcurrentLoads);
  let running = 0;
  let arrivals = 0;

  const queued = () => [...entries.values()].filter((entry) => !entry.isRunning);

  const finish = (entry: Entry) => {
    if (entries.get(entry.key) === entry) {
      entries.delete(entry.key);
    }
    if (entry.isRunning) {
      entry.isRunning = false;
      running -= 1;
    }
  };

  const pump = () => {
    while (running < maxRunning) {
      const next = queued().sort((a, b) => b.priority - a.priority || a.order - b.order)[0];
      if (!next) {
        return;
      }
      next.isRunning = true;
      running += 1;
      Promise.resolve()
        .then(() => next.start(next.controller.signal))
        .then(
          (value) => {
            const waiters = [...next.waiters];
            finish(next);
            for (const waiter of waiters) {
              waiter.resolve(value);
            }
          },
          (error: unknown) => {
            const waiters = [...next.waiters];
            finish(next);
            for (const waiter of waiters) {
              waiter.reject(error);
            }
          },
        )
        .finally(pump);
    }
  };

  return {
    request<T>(
      key: string,
      start: (signal: AbortSignal) => Promise<T>,
      { signal, priority = 0 }: { signal: AbortSignal; priority?: number },
    ): Promise<T> {
      if (signal.aborted) {
        return Promise.reject(abortError());
      }
      let entry = entries.get(key);
      if (!entry) {
        entry = {
          key,
          start,
          controller: new AbortController(),
          priority,
          order: arrivals++,
          isRunning: false,
          waiters: new Set(),
        };
        entries.set(key, entry);
      } else {
        entry.priority = Math.max(entry.priority, priority);
      }
      const joined = entry;
      const promise = new Promise<T>((resolve, reject) => {
        const waiter = {
          resolve: (value: unknown) => {
            signal.removeEventListener('abort', onAbort);
            resolve(value as T);
          },
          reject: (error: unknown) => {
            signal.removeEventListener('abort', onAbort);
            // The loader's own rejection, passed on as it is.
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            reject(error);
          },
        };
        function onAbort() {
          joined.waiters.delete(waiter);
          reject(abortError());
          if (joined.waiters.size === 0) {
            // Nobody wants it any more: abort it, and free its slot even if the loader ignores the signal.
            joined.controller.abort();
            finish(joined);
            pump();
          }
        }
        joined.waiters.add(waiter);
        signal.addEventListener('abort', onAbort, { once: true });
      });
      pump();
      return promise;
    },
    setMaxConcurrent(count) {
      maxRunning = Math.max(1, count);
      pump();
    },
    get stats() {
      return { running, queued: queued().length };
    },
  };
}
