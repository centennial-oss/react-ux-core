import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '../../utils/cn';

export interface KbdProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'className' | 'style' | 'children'
> {
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLElement>;
}

/** A keyboard key or shortcut, for example in a menu item or a hint. */
export function Kbd({ className, children, ...rest }: KbdProps) {
  return (
    <kbd
      {...rest}
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface-2 px-1',
        'font-mono text-xs text-fg-muted shadow-[inset_0_-1px_0_var(--color-border)]',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
