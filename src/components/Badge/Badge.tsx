import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { toneOutlineClasses, toneSolidClasses, toneSoftClasses } from '../../utils/toneClasses';
import type { Tone } from '../../utils/types';

export type BadgeVariant = 'solid' | 'soft' | 'outline';
export type BadgeSize = 'sm' | 'md';

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'h-5 gap-1 px-1.5 text-xs',
  md: 'h-6 gap-1 px-2 text-sm',
};

const variantToneClasses: Record<BadgeVariant, Record<Tone, string>> = {
  solid: toneSolidClasses,
  soft: toneSoftClasses,
  outline: toneOutlineClasses,
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
