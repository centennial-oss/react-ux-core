// Instants as components accept them (a Date, epoch milliseconds or an ISO string), reduced to epoch milliseconds.

/** Milliseconds in a day (24 hours; calendar days in a time zone can be shorter or longer). */
export const DAY_MS = 86_400_000;

/** A value components accept as an instant. */
export type Instant = Date | number | string;

/** Milliseconds since the epoch from a Date, a number or an ISO string. Unparseable text gives NaN. */
export function toEpochMs(value: Instant): number {
  return value instanceof Date
    ? value.getTime()
    : typeof value === 'number'
      ? value
      : Date.parse(value);
}

/** Like `toEpochMs`, but `undefined` for a missing value or one that isn't a valid instant. */
export function toEpochMsOrUndefined(value: Instant | null | undefined): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const time = toEpochMs(value);
  return Number.isNaN(time) ? undefined : time;
}

/**
 * An ISO calendar day ("2026-10-17") as midnight UTC, so formatting it with `timeZone: 'UTC'` gives back the same day
 * anywhere. Invalid text gives an Invalid Date (see `isValidDate`).
 */
export function utcDay(isoDay: string): Date {
  return new Date(`${isoDay}T00:00:00Z`);
}

/** Whether `date` is a real instant (not an Invalid Date). */
export function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}
