import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../utils/cn';

export interface VisuallyHiddenProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  'className' | 'style'
> {
  /** Shows the content while it, or something inside it, has keyboard focus (for skip links). */
  isFocusable?: boolean;
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLSpanElement>;
}

/** Content that's available to assistive technology but not shown on screen. */
export function VisuallyHidden({
  isFocusable = false,
  className,
  children,
  ...rest
}: VisuallyHiddenProps) {
  return (
    <span {...rest} className={cn('sr-only', isFocusable && 'focus-within:not-sr-only', className)}>
      {children}
    </span>
  );
}
