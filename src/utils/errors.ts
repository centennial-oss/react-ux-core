// Turning thrown values into what components show or ignore.

/** Whether `error` is the rejection of an aborted fetch or other `AbortSignal` work, which is never shown. */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** The message of a thrown `Error`, or `fallback` for anything else or a blank message. */
export function errorMessageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() !== '' ? error.message : fallback;
}
