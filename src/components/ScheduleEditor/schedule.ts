// Daily schedules: rows of `start → end → value` over one day, as "HH:mm" strings ("24:00" is the end of the day).

/** One period of a daily schedule. */
export interface ScheduleRow<V = number> {
  /** "HH:mm", from "00:00". */
  start: string;
  /** "HH:mm", up to "24:00" (the end of the day). */
  end: string;
  value: V;
}

export type Schedule<V = number> = readonly ScheduleRow<V>[];

export const MINUTES_PER_DAY = 1440;

/** Minutes since midnight for "HH:mm" ("24:00" is 1440). Invalid strings give NaN. */
export function toMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) {
    return Number.NaN;
  }
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes <= MINUTES_PER_DAY ? minutes : Number.NaN;
}

/** "HH:mm" for minutes since midnight (1440 is "24:00"). */
export function fromMinutes(minutes: number): string {
  const clamped = Math.max(0, Math.min(MINUTES_PER_DAY, Math.round(minutes)));
  const hours = Math.floor(clamped / 60);
  return `${String(hours).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

/** A row's span in minutes. An end of "00:00" means midnight at the end of the day. */
export function spanOf(row: Pick<ScheduleRow<unknown>, 'start' | 'end'>): [number, number] {
  const start = toMinutes(row.start);
  const end = toMinutes(row.end);
  return [start, end === 0 ? MINUTES_PER_DAY : end];
}

/** The rows ordered by start (then end), keeping each row's original index. */
export function sortSchedule<V>(rows: Schedule<V>): ScheduleRow<V>[] {
  return [...rows].sort((a, b) => {
    const [aStart, aEnd] = spanOf(a);
    const [bStart, bEnd] = spanOf(b);
    return aStart - bStart || aEnd - bEnd;
  });
}

export function isSorted<V>(rows: Schedule<V>): boolean {
  let previous = Number.NEGATIVE_INFINITY;
  for (const row of rows) {
    const [start] = spanOf(row);
    if (start < previous) {
      return false;
    }
    previous = start;
  }
  return true;
}

/** A problem with one row: its end isn't after its start, or it overlaps another row. */
export type RowIssue = { kind: 'endBeforeStart' } | { kind: 'overlap'; with: [number, number] };

/** A problem with the whole schedule: a gap (when gaps aren't allowed) or time it doesn't cover. */
export type ScheduleIssue =
  { kind: 'gap'; span: [number, number] } | { kind: 'uncovered'; span: [number, number] };

export interface ScheduleValidation {
  /** Issues by row index (in the given order). */
  rows: ReadonlyMap<number, readonly RowIssue[]>;
  schedule: readonly ScheduleIssue[];
  isValid: boolean;
}

/** The parts of the day the rows don't cover, in order. */
export function uncoveredSpans<V>(rows: Schedule<V>): [number, number][] {
  const spans = rows
    .map(spanOf)
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);
  const free: [number, number][] = [];
  let cursor = 0;
  for (const [start, end] of spans) {
    if (start > cursor) {
      free.push([cursor, start]);
    }
    cursor = Math.max(cursor, end);
  }
  if (cursor < MINUTES_PER_DAY) {
    free.push([cursor, MINUTES_PER_DAY]);
  }
  return free;
}

/**
 * Checks a schedule: every row ends after it starts and overlaps no other; with `allowsGaps: false`, there's no
 * time between the first row and the last that no row covers; with `isFullDayRequired`, the rows cover the whole day.
 */
export function validateSchedule<V>(
  rows: Schedule<V>,
  {
    allowsGaps = true,
    isFullDayRequired = false,
  }: { allowsGaps?: boolean; isFullDayRequired?: boolean } = {},
): ScheduleValidation {
  const issues = new Map<number, RowIssue[]>();
  const add = (index: number, issue: RowIssue) => {
    issues.set(index, [...(issues.get(index) ?? []), issue]);
  };
  const spans = rows.map(spanOf);
  spans.forEach(([start, end], index) => {
    if (!(end > start)) {
      add(index, { kind: 'endBeforeStart' });
    }
  });
  spans.forEach(([start, end], index) => {
    spans.forEach(([otherStart, otherEnd], other) => {
      if (
        other !== index &&
        end > start &&
        otherEnd > otherStart &&
        start < otherEnd &&
        otherStart < end
      ) {
        add(index, { kind: 'overlap', with: [otherStart, otherEnd] });
      }
    });
  });
  const schedule: ScheduleIssue[] = [];
  const free = uncoveredSpans(rows);
  if (isFullDayRequired) {
    schedule.push(...free.map((span): ScheduleIssue => ({ kind: 'uncovered', span })));
  } else if (!allowsGaps && rows.length > 0) {
    // Only the gaps between rows; the time before the first and after the last isn't a gap.
    const valid = spans.filter(([start, end]) => end > start);
    const first = Math.min(...valid.map(([start]) => start));
    const last = Math.max(...valid.map(([, end]) => end));
    schedule.push(
      ...free
        .filter(([start, end]) => start >= first && end <= last)
        .map((span): ScheduleIssue => ({ kind: 'gap', span })),
    );
  }
  return { rows: issues, schedule, isValid: issues.size === 0 && schedule.length === 0 };
}

/**
 * The value for each hour (0–23): the time-weighted average of the rows covering it, or null where no row does.
 * Overlapping rows both count.
 */
export function scheduleToHourly<V>(
  rows: Schedule<V>,
  toNumber: (value: V) => number,
): (number | null)[] {
  return Array.from({ length: 24 }, (_, hour) => {
    const from = hour * 60;
    const to = from + 60;
    let weighted = 0;
    let covered = 0;
    for (const row of rows) {
      const [start, end] = spanOf(row);
      const overlap = Math.min(end, to) - Math.max(start, from);
      const value = toNumber(row.value);
      if (overlap > 0 && Number.isFinite(value)) {
        weighted += value * overlap;
        covered += overlap;
      }
    }
    return covered === 0 ? null : weighted / covered;
  });
}
