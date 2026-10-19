import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import type { HeadingLevel } from '../../utils/types';

export interface EmptyStateProps {
  icon?: IconComponent;
  /** What's empty, for example "No customers yet". */
  title: ReactNode;
  /** What to do about it. */
  hint?: ReactNode;
  /** A call to action, usually a Button. */
  action?: ReactNode;
  /** The heading element for `title`. Defaults to 3. */
  headingLevel?: HeadingLevel;
  className?: string;
}

/** Shown in place of content that has nothing to show yet. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  headingLevel = 3,
  className,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      {Icon && (
        <span className="flex size-12 items-center justify-center rounded-full bg-surface-3 text-fg-muted">
          <Icon aria-hidden="true" className="size-6" />
        </span>
      )}
      <div className="flex max-w-sm flex-col gap-1">
        <Heading className="text-base font-semibold text-fg">{title}</Heading>
        {hint !== undefined && <div className="text-sm text-fg-muted">{hint}</div>}
      </div>
      {action !== undefined && <div className="mt-1">{action}</div>}
    </div>
  );
}
