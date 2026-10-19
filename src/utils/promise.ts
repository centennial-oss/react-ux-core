// Telling a callback's promise from a plain result, so a component shows a pending state only for real async work.

/** Whether `value` is a promise (a native one, as async functions return). */
export function isPromise<T>(value: unknown): value is Promise<T> {
  return value instanceof Promise;
}
