// Class tables for Button. Every class is a complete static string so Tailwind can find it when scanning dist/.
// Never build class names dynamically (for example `bg-${tone}-solid`).

import { disabledClasses, pressTintClasses } from '../../utils/stateClasses';
import {
  toneOutlineClasses,
  toneSolidClasses,
  toneSoftClasses,
  toneTextClasses,
} from '../../utils/toneClasses';

export type ButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost' | 'link';
export type ButtonTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export const baseClasses = [
  'hit-area inline-flex items-center justify-center rounded-control font-medium whitespace-nowrap select-none',
  'cursor-pointer transition-[background-color,border-color,color] duration-(--duration-fast) ease-standard',
  'data-focus-visible:focus-ring',
  disabledClasses,
  'data-pending:cursor-wait',
  // A tint overlay in the text colour gives hover and pressed feedback for every variant, tone and theme.
  pressTintClasses,
].join(' ');

export const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-sm',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-5 text-base',
};

/** The link variant sits inline with text, so it has no fixed height or padding. */
export const linkSizeClasses: Record<ButtonSize, string> = {
  sm: 'gap-1.5 text-sm',
  md: 'gap-2 text-sm',
  lg: 'gap-2 text-base',
};

export const iconSizeClasses: Record<ButtonSize, string> = {
  sm: 'size-4',
  md: 'size-4',
  lg: 'size-5',
};

/** An icon-only button is square, with a larger icon than a labelled button's: IconButton, icon-only ToggleButton. */
export const iconOnlySizeClasses: Record<ButtonSize, string> = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
};

export const iconOnlyIconSizeClasses: Record<ButtonSize, string> = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
};

export const variantToneClasses: Record<ButtonVariant, Record<ButtonTone, string>> = {
  solid: toneSolidClasses,
  soft: toneSoftClasses,
  outline: toneOutlineClasses,
  ghost: toneTextClasses,
  link: {
    neutral: 'text-neutral-fg underline underline-offset-2 after:hidden',
    accent: 'text-accent-fg underline underline-offset-2 after:hidden',
    success: 'text-success-fg underline underline-offset-2 after:hidden',
    warning: 'text-warning-fg underline underline-offset-2 after:hidden',
    danger: 'text-danger-fg underline underline-offset-2 after:hidden',
  },
};
