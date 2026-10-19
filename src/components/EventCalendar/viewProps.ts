// What EventCalendar hands each of its views, and the sizes they share.
import type { FocusEvent, KeyboardEvent, RefObject } from 'react';
import type { CommonMessages, eventCalendarStrings } from '../../provider/coreStrings';
import type { ScheduleTimelineMessages } from '../ScheduleTimeline/messages';
import type { EventCalendarFormat } from './format';
import type { CalendarEntry } from './layout';

export type EventCalendarMessages = CommonMessages &
  ScheduleTimelineMessages &
  typeof eventCalendarStrings;

/** A bar's or chip's height in a row of days, and the step between stacked rows. */
export const BAR_HEIGHT = 20;
export const BAR_STEP = 22;
/** The month day's number, above its events. */
export const DAY_NUMBER_HEIGHT = 28;
export const HOUR_HEIGHT = 48;
export const PX_PER_MINUTE = HOUR_HEIGHT / 60;
/** Timed events are drawn at least this many minutes tall (and overlap by that much). */
export const MIN_EVENT_MINUTES = 25;
/** Day columns narrower than this scroll sideways instead. */
export const MIN_DAY_WIDTH = 72;

/** An event's text, worked out once per change of the events or strings. */
export interface EntryText {
  /** Its accessible name. */
  name: string;
  /** Its times, such as "14:00 to 15:30". */
  time: string;
  /** Its start time, such as "14:00". */
  startTime: string;
}

export interface CalendarViewProps {
  /** The visible days' boundaries (n days, n + 1 midnights). */
  days: readonly number[];
  /** Each visible day's long name ("Wednesday 14 October"). */
  dayNames: readonly string[];
  /** Today's index in the days, or -1. */
  todayIndex: number;
  entryById: ReadonlyMap<string, CalendarEntry>;
  texts: ReadonlyMap<string, EntryText>;
  format: EventCalendarFormat;
  messages: EventCalendarMessages;
  timeZone: string;
  snapMinutes: number;
  isEditable: boolean;
  canCreate: boolean;
  isNarrow: boolean;
  /** The roving Tab stop's key. */
  tabKey: string | null;
  /** Ids of the hidden keyboard-help descriptions. */
  editHelpId: string;
  createHelpId: string;
  gridRef: RefObject<HTMLDivElement | null>;
  gridLabel: string;
  onGridKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onGridFocus: (event: FocusEvent<HTMLDivElement>) => void;
  onCommit: (entry: CalendarEntry, start: number, end: number) => void;
  onCreate: (start: number, end: number, isAllDay: boolean) => void;
  /** Opens the details of the event drawn by the element with this key. */
  onOpenDetails: (key: string) => void;
  /** Opens a day's full list from its "+N more" button. */
  onOpenDay: (day: number, button: HTMLElement) => void;
  maxHeight: string | undefined;
}
