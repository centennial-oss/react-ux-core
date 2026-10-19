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
