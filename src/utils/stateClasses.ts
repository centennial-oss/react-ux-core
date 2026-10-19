// Class strings for interaction states (hover, press, selection, disabled), shared so every control gives the same
// feedback. Written as complete static strings: Tailwind finds classes by scanning the built files, so a class built at
// runtime would never be generated. Where a component overrides one of these, put its own classes after the constant:
// `cn` keeps the last of two conflicting classes.

import type { Size } from './types';

/**
 * A tint overlay in the text colour, faint on hover and stronger on press, so feedback works for every variant, tone and
 * theme. The element needs `relative` (or `hit-area`) positioning for the overlay. Buttons, icon buttons, pills.
 */
export const pressTintClasses =
  'after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-current after:opacity-0 data-hovered:after:opacity-[0.08] data-pressed:after:opacity-[0.14]';

/** A disabled control: dimmed, with the not-allowed cursor. */
export const disabledClasses = 'data-disabled:cursor-not-allowed data-disabled:opacity-50';

/** A raised surface on hover and a stronger one on press: ghost buttons, grid cells and options. */
export const hoverSurfaceClasses = 'data-hovered:bg-surface-3 data-pressed:bg-surface-4';

/**
 * `hoverSurfaceClasses` for collection items (menu items, list box options), which React Aria marks focused on hover as
 * well as on keyboard focus.
 */
export const focusedSurfaceClasses = 'data-focused:bg-surface-3 data-pressed:bg-surface-4';

/** A selected option or day: the solid accent fill with its on-solid text. */
export const selectedSolidClasses =
  'data-selected:bg-accent-solid data-selected:text-accent-on-solid';

/** The height of a small or medium single-line control: inputs, cyclers. */
export const controlHeightClasses: Record<Exclude<Size, 'lg'>, string> = { sm: 'h-8', md: 'h-10' };
