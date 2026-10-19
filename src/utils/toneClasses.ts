// The class strings for each tone, shared so every component colours a tone the same way. Written as complete static
// strings: Tailwind finds classes by scanning the built files, so `bg-${tone}-solid` would never be generated.

import type { Tone } from './types';

/** Solid fill with its on-solid text: solid buttons and badges, markers. */
export const toneSolidClasses: Record<Tone, string> = {
  neutral: 'bg-neutral-solid text-neutral-on-solid',
  accent: 'bg-accent-solid text-accent-on-solid',
  success: 'bg-success-solid text-success-on-solid',
  warning: 'bg-warning-solid text-warning-on-solid',
  danger: 'bg-danger-solid text-danger-on-solid',
};

/** Subtle tinted background with tone text: soft buttons and badges, avatars, marked days. */
export const toneSoftClasses: Record<Tone, string> = {
  neutral: 'bg-neutral-bg text-neutral-fg',
  accent: 'bg-accent-bg text-accent-fg',
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  danger: 'bg-danger-bg text-danger-fg',
};

/** `toneSoftClasses` with a matching border (no width; the component sets it): chips, timeline items. */
export const toneSoftBorderedClasses: Record<Tone, string> = {
  neutral: 'border-neutral-border bg-neutral-bg text-neutral-fg',
  accent: 'border-accent-border bg-accent-bg text-accent-fg',
  success: 'border-success-border bg-success-bg text-success-fg',
  warning: 'border-warning-border bg-warning-bg text-warning-fg',
  danger: 'border-danger-border bg-danger-bg text-danger-fg',
};

/** A 1 px tone border with tone text: outline buttons and badges. */
export const toneOutlineClasses: Record<Tone, string> = {
  neutral: 'border border-neutral-border text-neutral-fg',
  accent: 'border border-accent-border text-accent-fg',
  success: 'border border-success-border text-success-fg',
  warning: 'border border-warning-border text-warning-fg',
  danger: 'border border-danger-border text-danger-fg',
};

/** A selected toggle (`data-selected`) shows as the solid version of its tone: toggle buttons and icon buttons. */
export const toneSelectedClasses: Record<Tone, string> = {
  neutral:
    'data-selected:border-transparent data-selected:bg-neutral-solid data-selected:text-neutral-on-solid',
  accent:
    'data-selected:border-transparent data-selected:bg-accent-solid data-selected:text-accent-on-solid',
  success:
    'data-selected:border-transparent data-selected:bg-success-solid data-selected:text-success-on-solid',
  warning:
    'data-selected:border-transparent data-selected:bg-warning-solid data-selected:text-warning-on-solid',
  danger:
    'data-selected:border-transparent data-selected:bg-danger-solid data-selected:text-danger-on-solid',
};

/** Tone text (and `currentColor` icons) alone: ghost buttons, trends, status dots. */
export const toneTextClasses: Record<Tone, string> = {
  neutral: 'text-neutral-fg',
  accent: 'text-accent-fg',
  success: 'text-success-fg',
  warning: 'text-warning-fg',
  danger: 'text-danger-fg',
};

/** Solid fill alone: progress fills, dots and bars. */
export const toneFillClasses: Record<Tone, string> = {
  neutral: 'bg-neutral-solid',
  accent: 'bg-accent-solid',
  success: 'bg-success-solid',
  warning: 'bg-warning-solid',
  danger: 'bg-danger-solid',
};
