// Events for EventCalendar stories and tests: October 2026 (UTC) of a small team's calendar, deterministic, with a
// frozen "now". Weekday stand-ups, meetings, a few overlapping ones, all-day and multi-day events, a locked one, a
// busy day with more than fit, and a trip that runs across midnight and weeks.
import type { EventCalendarItem } from '../src/components/EventCalendar';
import type { TimelineRange } from '../src/components/ScheduleTimeline';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** "Now": Wednesday 14 October 2026, 10:30 UTC. */
export const EVENTS_NOW = Date.UTC(2026, 9, 14, 10, 30);
/** Monday 12 October 2026, the week holding now (weeks start on Monday). */
export const EVENTS_WEEK_START = Date.UTC(2026, 9, 12);

/** The month view of October 2026: five weeks, Monday 28 September to Sunday 1 November. */
export const octoberGrid: TimelineRange = {
  start: new Date(Date.UTC(2026, 8, 28)),
  end: new Date(Date.UTC(2026, 10, 2)),
};

export const eventsWeek: TimelineRange = {
  start: new Date(EVENTS_WEEK_START),
  end: new Date(EVENTS_WEEK_START + 7 * DAY),
};

export const eventsDay: TimelineRange = {
  start: new Date(EVENTS_WEEK_START + 2 * DAY),
  end: new Date(EVENTS_WEEK_START + 3 * DAY),
};

const at = (day: number, hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 9, day, hour, minute));

/** The hand-picked events the tests talk about. */
export const keyEvents: EventCalendarItem[] = [
  {
    id: 'offsite',
    label: 'Team offsite',
    start: '2026-10-05',
    end: '2026-10-08',
    isAllDay: true,
    tone: 'success',
    detail: 'Lakeside lodge; bring a laptop.',
  },
  { id: 'holiday', label: 'Holiday', start: '2026-10-12', end: '2026-10-13', isAllDay: true },
  {
    id: 'design',
    label: 'Design review',
    start: at(14, 9, 30),
    end: at(14, 11),
    tone: 'accent',
  },
  { id: 'budget', label: 'Budget sync', start: at(14, 10), end: at(14, 11, 30), tone: 'warning' },
  { id: 'hiring', label: 'Hiring panel', start: at(14, 10, 30), end: at(14, 12), tone: 'neutral' },
  {
    id: 'release',
    label: 'Release freeze',
    start: at(15, 14),
    end: at(15, 16),
    tone: 'danger',
    isLocked: true,
  },
  { id: 'late', label: 'Server migration', start: at(16, 22), end: at(17, 2), tone: 'neutral' },
  { id: 'trip', label: 'Conference trip', start: at(20, 15), end: at(23, 11), tone: 'success' },
  {
    id: 'sprint',
    label: 'Sprint 42',
    start: '2026-10-15',
    end: '2026-10-29',
    isAllDay: true,
    tone: 'accent',
  },
];

const meetingNames = [
  'Product sync',
  'One-to-one',
  'Customer call',
  'Architecture forum',
  'Lunch and learn',
  'Roadmap review',
] as const;

const tones = ['accent', 'neutral', 'success', 'warning'] as const;

/** Stand-ups every weekday, two or three meetings a day, and a busy Thursday 8 October. */
function routine(): EventCalendarItem[] {
  const items: EventCalendarItem[] = [];
  for (let day = 1; day <= 31; day += 1) {
    const weekday = new Date(Date.UTC(2026, 9, day)).getUTCDay();
    if (weekday === 0 || weekday === 6) {
      continue;
    }
    items.push({
      id: `standup-${String(day)}`,
      label: 'Stand-up',
      start: at(day, 8, 45),
      end: at(day, 9),
      tone: 'neutral',
    });
    const meetings = day === 8 ? 7 : 2 + (day % 2);
    for (let index = 0; index < meetings; index += 1) {
      const hour = 13 + index;
      items.push({
        id: `meeting-${String(day)}-${String(index)}`,
        label: meetingNames[(day + index) % meetingNames.length] ?? 'Meeting',
        start: at(day, hour, index % 2 === 0 ? 0 : 30),
        end: at(day, hour + 1),
        tone: tones[(day + index) % tones.length],
      });
    }
  }
  return items;
}

/** About 90 events across October 2026. */
export const octoberEvents: EventCalendarItem[] = [...keyEvents, ...routine()];

/** A busier month for performance: each weekday gets `perDay` more events, spread through the day. */
export function busyMonth(perDay: number): EventCalendarItem[] {
  const items = [...octoberEvents];
  for (let day = 1; day <= 31; day += 1) {
    for (let index = 0; index < perDay; index += 1) {
      const start = Date.UTC(2026, 9, day, 7) + index * 50 * 60_000;
      items.push({
        id: `busy-${String(day)}-${String(index)}`,
        label: `Session ${String(index + 1)}`,
        start: new Date(start),
        end: new Date(start + 45 * 60_000),
        tone: tones[index % tones.length],
      });
    }
  }
  return items;
}
