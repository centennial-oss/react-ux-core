// Shared styling for the date and time inputs. Every class is a complete static string (Tailwind scans for them).

import { inputGroupClasses } from '../Field/Field';

/**
 * The bordered box around date segments and the calendar button: the standard input group, plus a focus ring while
 * a segment has focus (segments are editable spans, not inputs, so the group's `input:focus-visible` rule misses
 * them).
 */
export const dateGroupClasses = `${inputGroupClasses} has-[[data-type]:focus-visible]:focus-ring`;

/** The row of segments inside a date group. Text is 16px on phones so iOS doesn't zoom. */
export const dateInputClasses =
  'flex min-w-0 flex-1 items-center px-3 text-base whitespace-nowrap sm:text-sm';

/** One editable part of a date or time (month, hour…) or a literal separator. */
export const segmentClasses = [
  'rounded-sm px-0.5 text-fg tabular-nums caret-transparent outline-none',
  'data-placeholder:text-fg-muted data-[type=literal]:px-0 data-[type=literal]:text-fg-muted',
  'data-focused:bg-accent-solid data-focused:text-accent-on-solid',
  'data-invalid:text-danger-fg data-invalid:data-focused:bg-danger-solid data-invalid:data-focused:text-danger-on-solid',
  'data-disabled:cursor-not-allowed',
].join(' ');

/**
 * Larger segments for "large segmented time entry" on phones: each editable segment is at least the minimum touch
 * target wide and the text grows.
 */
export const largeSegmentClasses =
  'max-sm:inline-flex max-sm:min-w-hit max-sm:justify-center max-sm:py-1.5 max-sm:data-[type=literal]:min-w-0';

/** Previous/next month buttons in a calendar header. */
export const calendarNavButtonClasses = [
  'hit-area inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-control text-fg max-sm:size-11',
  'data-hovered:bg-surface-3 data-pressed:bg-surface-4 data-focus-visible:focus-ring',
  'data-disabled:cursor-not-allowed data-disabled:opacity-50',
].join(' ');

/** A day in a single-date calendar. */
export const calendarCellClasses = [
  'relative flex size-9 cursor-pointer items-center justify-center rounded-full text-sm text-fg tabular-nums outline-none select-none max-sm:size-11 max-sm:text-base',
  'data-hovered:bg-surface-3 data-pressed:bg-surface-4 data-focus-visible:focus-ring',
  'data-selected:bg-accent-solid data-selected:text-accent-on-solid',
  'data-invalid:data-selected:bg-danger-solid data-invalid:data-selected:text-danger-on-solid',
  'data-disabled:cursor-default data-disabled:opacity-50',
  'data-unavailable:cursor-not-allowed data-unavailable:text-fg-muted data-unavailable:line-through',
  'data-outside-month:invisible',
].join(' ');

/**
 * A day in a range calendar: a band across the selected range, with the start and end drawn as solid circles by the
 * inner `rangeDayClasses` element.
 */
export const rangeCellClasses = [
  'group/day relative flex h-9 w-10 cursor-pointer items-center justify-center text-sm text-fg tabular-nums outline-none select-none max-sm:h-11 max-sm:w-11 max-sm:text-base',
  'data-selected:bg-accent-bg data-selected:text-accent-fg',
  'data-selection-start:rounded-s-full data-selection-end:rounded-e-full',
  'data-disabled:cursor-default data-disabled:opacity-50',
  'data-unavailable:cursor-not-allowed data-unavailable:text-fg-muted data-unavailable:line-through',
  'data-outside-month:invisible',
].join(' ');

export const rangeDayClasses = [
  'relative flex size-9 items-center justify-center rounded-full max-sm:size-11',
  'group-data-hovered/day:bg-surface-3 group-data-pressed/day:bg-surface-4 group-data-focus-visible/day:focus-ring',
  'group-data-selection-start/day:bg-accent-solid group-data-selection-start/day:text-accent-on-solid',
  'group-data-selection-end/day:bg-accent-solid group-data-selection-end/day:text-accent-on-solid',
  'group-data-invalid/day:group-data-selected/day:bg-danger-solid group-data-invalid/day:group-data-selected/day:text-danger-on-solid',
].join(' ');

/** Today: bold with a dot under the number, so it isn't marked by colour alone. */
export const todayClasses =
  'font-bold after:absolute after:bottom-1 after:size-1 after:rounded-full after:bg-current';
