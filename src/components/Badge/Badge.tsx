import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import type { Tone } from '../../utils/types';

export type BadgeVariant = 'solid' | 'soft' | 'outline';
export type BadgeSize = 'sm' | 'md';

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'h-5 gap-1 px-1.5 text-xs',
  md: 'h-6 gap-1 px-2 text-sm',
};

const variantToneClasses: Record<BadgeVariant, Record<Tone, string>> = {
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
};

export interface BadgeProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  'className' | 'style' | 'children'
> {
  /** Defaults to `soft`. */
  variant?: BadgeVariant;
  /** Defaults to `neutral`. */
  tone?: Tone;
  /** Defaults to `sm`. */
  size?: BadgeSize;
  icon?: IconComponent;
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLSpanElement>;
}

/** A short, non-interactive label: a count, a status or a category. */
export function Badge({
  variant = 'soft',
  tone = 'neutral',
  size = 'sm',
  icon: Icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      {...rest}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full font-medium whitespace-nowrap',
        sizeClasses[size],
        variantToneClasses[variant][tone],
        className,
      )}
    >
      {Icon && <Icon aria-hidden="true" className="size-3.5 shrink-0" />}
      {children}
    </span>
  );
}
