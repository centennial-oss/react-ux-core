// EventCalendar's keyboard model. Every view is a grid of days (a month's weeks, or one row of day columns), and each
// day holds a list of focusable things from top to bottom: the day itself (its cell, or its column header), its events
// in the order they're drawn, and its "+N more" button. Up and Down move through a day's list and on into the day
// below; Left and Right move to the same place in the neighbouring day. Events drawn across several days are in each
// of their days' lists.
import type { BarSegment, CalendarEntry, DayRowLayout, TimedSegment } from './layout';

/** What a focusable thing in the grid is. */
export interface KeyTarget {
  kind: 'day' | 'event' | 'more';
  /** The day's index in the visible days (for events, the first day it's drawn on). */
  day: number;
  entry?: CalendarEntry;
  /** How Alt and the arrow keys edit an event: by whole days (month, all-day row), or by snaps of time. */
  mode?: 'days' | 'time';
}

export interface NavPosition {
  row: number;
  column: number;
  index: number;
}

export interface NavModel {
  /** `cells[row][column]`: the keys in a day, top to bottom, the day's own key first. */
  cells: string[][][];
  targets: Map<string, KeyTarget>;
  /** Where each key first appears. */
  positions: Map<string, NavPosition>;
  /** Each drawn event segment's key. */
  segmentKeys: Map<BarSegment | TimedSegment, string>;
}

export const dayCellKey = (day: number) => `day:${String(day)}`;
export const moreKey = (day: number) => `more:${String(day)}`;
/** The key of an event's first drawn segment; later segments add their place. */
export const eventKey = (id: string, segment = 0) =>
  segment === 0 ? `event:${id}` : `event:${id}:${String(segment)}`;

class NavBuilder {
  readonly cells: string[][][] = [];
  readonly targets = new Map<string, KeyTarget>();
  readonly positions = new Map<string, NavPosition>();
  readonly segmentKeys = new Map<BarSegment | TimedSegment, string>();
  private readonly segmentCounts = new Map<string, number>();

  constructor(rows: number, columns: number) {
    for (let row = 0; row < rows; row += 1) {
      this.cells.push(Array.from({ length: columns }, () => []));
    }
  }

  add(row: number, column: number, key: string, target: KeyTarget) {
    const cell = this.cells[row]?.[column];
    if (!cell) {
      return;
    }
    if (!this.positions.has(key)) {
      this.positions.set(key, { row, column, index: cell.length });
      this.targets.set(key, target);
    }
    cell.push(key);
  }

  keyFor(segment: BarSegment | TimedSegment): string {
    let key = this.segmentKeys.get(segment);
    if (key === undefined) {
      const count = this.segmentCounts.get(segment.entry.id) ?? 0;
      this.segmentCounts.set(segment.entry.id, count + 1);
      key = eventKey(segment.entry.id, count);
      this.segmentKeys.set(segment, key);
    }
    return key;
  }

  /** Adds a row of days' bars (by stacked row) and "+N more" buttons, starting at `firstDay`. */
  addBars(row: number, layout: DayRowLayout, firstDay: number) {
    const byRow = [...layout.segments].sort((a, b) => a.row - b.row || a.first - b.first);
    for (const segment of byRow) {
      const key = this.keyFor(segment);
      for (let column = segment.first; column <= segment.last; column += 1) {
        this.add(row, column, key, {
          kind: 'event',
          day: firstDay + segment.first,
          entry: segment.entry,
          mode: 'days',
        });
      }
    }
    layout.hidden.forEach((hidden, column) => {
      if (hidden > 0) {
        this.add(row, column, moreKey(firstDay + column), {
          kind: 'more',
          day: firstDay + column,
        });
      }
    });
  }

  build(): NavModel {
    return {
      cells: this.cells,
      targets: this.targets,
      positions: this.positions,
      segmentKeys: this.segmentKeys,
    };
  }
}

/** The month: a row per week of `columns` days. */
export function buildMonthNav(rows: readonly DayRowLayout[], columns: number): NavModel {
  const builder = new NavBuilder(rows.length, columns);
  rows.forEach((layout, row) => {
    for (let column = 0; column < columns; column += 1) {
      const day = row * columns + column;
      builder.add(row, column, dayCellKey(day), { kind: 'day', day });
    }
    builder.addBars(row, layout, row * columns);
  });
  return builder.build();
}

/** The week or day: one row of day columns, each its header, all-day events, then timed events by start. */
export function buildTimeGridNav(
  allDay: DayRowLayout,
  timed: readonly (readonly TimedSegment[])[],
): NavModel {
  const columns = timed.length;
  const builder = new NavBuilder(1, columns);
  for (let day = 0; day < columns; day += 1) {
    builder.add(0, day, dayCellKey(day), { kind: 'day', day });
  }
  builder.addBars(0, allDay, 0);
  timed.forEach((segments, day) => {
    for (const segment of segments) {
      builder.add(0, day, builder.keyFor(segment), {
        kind: 'event',
        day,
        entry: segment.entry,
        mode: 'time',
      });
    }
  });
  return builder.build();
}
