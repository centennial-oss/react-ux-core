import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../utils/cn';
import { toneTextClasses } from '../../utils/toneClasses';
import type { Tone } from '../../utils/types';

// Each tone has its own shape as well as its own colour, so status never depends on colour alone.
const shapes: Record<Tone, ReactNode> = {
  neutral: <circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />,
  accent: (
    <>
      <circle cx="6" cy="6" r="5" fill="currentColor" opacity="0.35" />
      <circle cx="6" cy="6" r="2.5" fill="currentColor" />
    </>
  ),
  success: <circle cx="6" cy="6" r="5" fill="currentColor" />,
  warning: <path d="M6 0.8 11.4 10.8H0.6Z" fill="currentColor" />,
  danger: (
    <rect x="2.2" y="2.2" width="7.6" height="7.6" transform="rotate(45 6 6)" fill="currentColor" />
  ),
};

export interface StatusDotProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  'className' | 'style' | 'children'
> {
  /** Defaults to `neutral`. */
  tone?: Tone;
  /** The status in words. Always required, so the status never relies on colour or shape alone. */
  label: ReactNode;
  /** Hides the label visually but keeps it for assistive technology. */
  isLabelHidden?: boolean;
  /** Defaults to `md`. */
  size?: 'sm' | 'md';
  className?: string;
  ref?: Ref<HTMLSpanElement>;
}

/** A small status indicator: a coloured shape plus a text label. */
export function StatusDot({
  tone = 'neutral',
  label,
  isLabelHidden = false,
  size = 'md',
  className,
  ...rest
}: StatusDotProps) {
  return (
    <span
      {...rest}
      className={cn(
        'inline-flex items-center gap-1.5 text-fg',
        size === 'sm' ? 'text-xs' : 'text-sm',
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        className={cn('shrink-0', size === 'sm' ? 'size-2.5' : 'size-3', toneTextClasses[tone])}
      >
        {shapes[tone]}
      </svg>
      <span className={cn(isLabelHidden && 'sr-only')}>{label}</span>
    </span>
  );
}
