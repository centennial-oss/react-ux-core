// Class tables for Button. Every class is a complete static string so Tailwind can find it when scanning dist/.
// Never build class names dynamically (for example `bg-${tone}-solid`).

export type ButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost' | 'link';
export type ButtonTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export const baseClasses = [
  'hit-area inline-flex items-center justify-center rounded-control font-medium whitespace-nowrap select-none',
  'cursor-pointer transition-[background-color,border-color,color] duration-(--duration-fast) ease-standard',
  'data-focus-visible:focus-ring',
  'data-disabled:cursor-not-allowed data-disabled:opacity-50 data-pending:cursor-wait',
  // A tint overlay in the text colour gives hover and pressed feedback for every variant, tone and theme.
  'after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-current after:opacity-0',
  'data-hovered:after:opacity-[0.08] data-pressed:after:opacity-[0.14]',
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

export const variantToneClasses: Record<ButtonVariant, Record<ButtonTone, string>> = {
  solid: {
    neutral: 'bg-neutral-solid text-neutral-on-solid',
    accent: 'bg-accent-solid text-accent-on-solid',
    success: 'bg-success-solid text-success-on-solid',
    warning: 'bg-warning-solid text-warning-on-solid',
    danger: 'bg-danger-solid text-danger-on-solid',
  },
  soft: {
    neutral: 'bg-neutral-bg text-neutral-fg',
    accent: 'bg-accent-bg text-accent-fg',
    success: 'bg-success-bg text-success-fg',
    warning: 'bg-warning-bg text-warning-fg',
    danger: 'bg-danger-bg text-danger-fg',
  },
  outline: {
    neutral: 'border border-neutral-border text-neutral-fg',
    accent: 'border border-accent-border text-accent-fg',
    success: 'border border-success-border text-success-fg',
    warning: 'border border-warning-border text-warning-fg',
    danger: 'border border-danger-border text-danger-fg',
  },
  ghost: {
    neutral: 'text-neutral-fg',
    accent: 'text-accent-fg',
    success: 'text-success-fg',
    warning: 'text-warning-fg',
    danger: 'text-danger-fg',
  },
  link: {
    neutral: 'text-neutral-fg underline underline-offset-2 after:hidden',
    accent: 'text-accent-fg underline underline-offset-2 after:hidden',
    success: 'text-success-fg underline underline-offset-2 after:hidden',
    warning: 'text-warning-fg underline underline-offset-2 after:hidden',
    danger: 'text-danger-fg underline underline-offset-2 after:hidden',
  },
};
