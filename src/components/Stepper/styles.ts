// Styling for Stepper, and through it StepDialog and WizardForm. Every class is a complete static string
// (Tailwind scans for them). Where a state uses a tone's shared style exactly, it comes from `utils/toneClasses`.

import { toneFillClasses, toneSoftBorderedClasses, toneTextClasses } from '../../utils/toneClasses';

/** How a step is drawn: its status, or `disabled` for a step that can't be reached (drawn locked). */
export type StepLook =
  'done' | 'current' | 'upcoming' | 'error' | 'currentError' | 'skipped' | 'disabled';

/** The numbered circle of the `numbered` variant. */
export const numberMarkerClasses: Record<StepLook, string> = {
  done: toneSoftBorderedClasses.success,
  current: 'border-accent-solid bg-accent-solid text-accent-on-solid',
  upcoming: 'border-border-strong bg-surface-1 text-fg-muted',
  error: toneSoftBorderedClasses.danger,
  currentError: 'border-danger-solid bg-danger-solid text-danger-on-solid',
  skipped: 'border-border bg-surface-2 text-fg-muted',
  disabled: 'border-dashed border-border-strong bg-surface-3 text-fg-muted',
};

export const numberMarkerBaseClasses =
  'relative flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold tabular-nums';

/** The small dot of the `dot` variant. The current step's dot has a halo, so it isn't marked by colour alone. */
export const dotMarkerClasses: Record<StepLook, string> = {
  done: 'border-success-solid bg-success-solid',
  current: 'border-accent-solid bg-accent-solid ring-4 ring-accent-bg',
  upcoming: 'border-border-strong bg-surface-1',
  error: 'border-danger-solid bg-danger-solid',
  currentError: 'border-danger-solid bg-danger-solid ring-4 ring-danger-bg',
  skipped: 'border-border-strong bg-surface-3',
  disabled: 'border-dashed border-border-strong bg-surface-3',
};

export const dotMarkerBaseClasses = 'relative size-3 shrink-0 rounded-full border-2';

/** The fill of the `arrow` variant's arrow-shaped segment. */
export const arrowFillClasses: Record<StepLook, string> = {
  done: 'bg-accent-bg',
  current: toneFillClasses.accent,
  upcoming: 'bg-surface-3',
  error: 'bg-danger-bg',
  currentError: toneFillClasses.danger,
  skipped: 'bg-surface-2',
  disabled: 'bg-surface-2',
};

/** The text on an arrow, matched to its fill. */
export const arrowTextClasses: Record<StepLook, string> = {
  done: toneTextClasses.accent,
  current: 'font-semibold text-accent-on-solid',
  upcoming: 'text-fg',
  error: toneTextClasses.danger,
  currentError: 'font-semibold text-danger-on-solid',
  skipped: 'text-fg-muted',
  disabled: 'text-fg-muted',
};

/**
 * The arrow's shape, by position: the first has a flat start, the last a flat end, and the ones between a notch that
 * the previous arrow's point sits in. Mirrored right to left.
 */
export const arrowShapeClasses = {
  first:
    '[clip-path:polygon(0_0,calc(100%_-_0.75rem)_0,100%_50%,calc(100%_-_0.75rem)_100%,0_100%)] rtl:[clip-path:polygon(100%_0,0.75rem_0,0_50%,0.75rem_100%,100%_100%)]',
  middle:
    '[clip-path:polygon(0_0,calc(100%_-_0.75rem)_0,100%_50%,calc(100%_-_0.75rem)_100%,0_100%,0.75rem_50%)] rtl:[clip-path:polygon(100%_0,0.75rem_0,0_50%,0.75rem_100%,100%_100%,calc(100%_-_0.75rem)_50%)]',
  last: '[clip-path:polygon(0_0,100%_0,100%_100%,0_100%,0.75rem_50%)] rtl:[clip-path:polygon(100%_0,0_0,0_100%,100%_100%,calc(100%_-_0.75rem)_50%)]',
  only: 'rounded-control',
} as const;

/** A segment of the compact variant's bar. */
export const segmentClasses: Record<StepLook, string> = {
  done: toneFillClasses.accent,
  current: toneFillClasses.accent,
  upcoming: 'bg-surface-4',
  error: toneFillClasses.danger,
  currentError: toneFillClasses.danger,
  skipped: 'bg-surface-4',
  disabled: 'bg-surface-4',
};

/** A step's title. Unreachable and skipped steps are muted; an error is in the danger colour. */
export const titleToneClasses: Record<StepLook, string> = {
  done: 'text-fg',
  current: 'text-fg',
  upcoming: 'text-fg',
  error: toneTextClasses.danger,
  currentError: toneTextClasses.danger,
  skipped: 'text-fg-muted',
  disabled: 'text-fg-muted',
};

/** A pressable step (a React Aria Button). */
export const stepButtonClasses = [
  'flex min-w-0 cursor-pointer rounded-control text-start outline-none',
  'data-focus-visible:focus-ring data-disabled:cursor-not-allowed',
].join(' ');

/** Hover and press feedback on a pressable step's title (the marker keeps its status colours). */
export const pressableTitleClasses =
  'underline-offset-2 group-data-hovered/step:underline group-data-pressed/step:underline';
