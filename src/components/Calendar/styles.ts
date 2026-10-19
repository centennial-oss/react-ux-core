// Styling for Calendar, RangeCalendar and the calendars inside the date pickers. Every class is a complete static
// string (Tailwind scans for them).

import {
  disabledClasses,
  hoverSurfaceClasses,
  selectedSolidClasses,
} from '../../utils/stateClasses';

/** Previous/next buttons in a calendar header. */
export const calendarNavButtonClasses = [
  'hit-area inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-control text-fg max-sm:size-11',
  hoverSurfaceClasses,
  'data-focus-visible:focus-ring',
  disabledClasses,
].join(' ');

/** Holds a header's place where a month has no previous or next button, so its heading stays centred. */
export const calendarNavSpacerClasses = 'size-8 shrink-0 max-sm:size-11';

/** States every day shares, in single and range calendars. */
const dayStateClasses = [
  'relative cursor-pointer text-sm text-fg tabular-nums outline-none select-none max-sm:text-base',
  'data-disabled:cursor-default data-disabled:opacity-50',
  'data-unavailable:cursor-not-allowed data-unavailable:text-fg-muted data-unavailable:line-through',
].join(' ');

/** A day in a single-date (or multiple-date) calendar. */
export const calendarCellClasses = [
  dayStateClasses,
  'flex items-center justify-center',
  hoverSurfaceClasses,
  'data-focus-visible:focus-ring',
  selectedSolidClasses,
  'data-invalid:data-selected:bg-danger-solid data-invalid:data-selected:text-danger-on-solid',
].join(' ');

/** Day sizes: `md` is a circle; `lg` is a taller rounded box with room for a line of content under the number. */
export const calendarCellSizeClasses = {
  md: 'size-9 rounded-full max-sm:size-11',
  lg: 'h-12 w-11 flex-col justify-start gap-0.5 rounded-control pt-1.5 max-sm:h-14 max-sm:pt-2',
} as const;

/**
 * A day in a range calendar: a band across the selected range, with the start and end drawn by the inner
 * `rangeDayClasses` element.
 */
export const rangeCellClasses = [
  dayStateClasses,
  'group/day flex items-center justify-center',
  'data-selected:bg-accent-bg data-selected:text-accent-fg',
].join(' ');

export const rangeCellSizeClasses = {
  md: 'h-9 w-10 data-selection-start:rounded-s-full data-selection-end:rounded-e-full max-sm:h-11 max-sm:w-11',
  lg: 'h-12 w-11 data-selection-start:rounded-s-control data-selection-end:rounded-e-control max-sm:h-14',
} as const;

export const rangeDayClasses = [
  'relative flex items-center justify-center',
  'group-data-hovered/day:bg-surface-3 group-data-pressed/day:bg-surface-4 group-data-focus-visible/day:focus-ring',
  'group-data-selection-start/day:bg-accent-solid group-data-selection-start/day:text-accent-on-solid',
  'group-data-selection-end/day:bg-accent-solid group-data-selection-end/day:text-accent-on-solid',
  'group-data-invalid/day:group-data-selected/day:bg-danger-solid group-data-invalid/day:group-data-selected/day:text-danger-on-solid',
].join(' ');

export const rangeDaySizeClasses = {
  md: 'size-9 rounded-full max-sm:size-11',
  lg: 'h-12 w-10 flex-col justify-start gap-0.5 rounded-control pt-1.5 max-sm:h-14 max-sm:w-11 max-sm:pt-2',
} as const;

/** Today: bold with a dot under the number, so it isn't marked by colour alone. */
export const todayClasses =
  'font-bold after:absolute after:bottom-1 after:size-1 after:rounded-full after:bg-current';

/** Today on a day with its own content, where the dot would collide with it: bold with a ring instead. */
export const todayRingClasses = 'font-bold ring-1 ring-current ring-inset';

/** The app's content on a day: tucked along the bottom of an `md` day, a line under the number on an `lg` one. */
export const dayContentClasses = {
  md: 'pointer-events-none absolute inset-x-0 bottom-0.5 flex justify-center text-[0.625rem] leading-none',
  lg: 'pointer-events-none flex max-w-full justify-center truncate px-0.5 text-xs leading-none font-normal',
} as const;
