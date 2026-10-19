import { useId, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import type { HeadingLevel } from '../../utils/types';

export interface CardProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'className' | 'style' | 'title' | 'children'
> {
  /** The card's heading. When set, the card is a labelled region. */
  title?: ReactNode;
  /** Supporting text under the title. */
  description?: ReactNode;
  icon?: IconComponent;
  /** Controls at the end of the header, such as buttons or an overflow menu. */
  actions?: ReactNode;
  footer?: ReactNode;
  /** The heading element for `title`. Defaults to 3. */
  headingLevel?: HeadingLevel;
  className?: string;
  /** Classes for inner parts. */
  classNames?: { header?: string; body?: string; footer?: string };
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

/** A surface that groups related content, with an optional header (title, icon, actions) and footer. */
export function Card({
  title,
  description,
  icon: Icon,
  actions,
  footer,
  headingLevel = 3,
  className,
  classNames,
  children,
  ...rest
}: CardProps) {
  const titleId = useId();
  const Heading = `h${headingLevel}` as const;
  const hasHeader = title !== undefined || actions !== undefined || Icon !== undefined;

  return (
    <section
      {...rest}
      aria-labelledby={title !== undefined ? titleId : rest['aria-labelledby']}
      className={cn(
        'flex min-w-0 flex-col rounded-card border border-border bg-surface-2 text-fg shadow-raised',
        className,
      )}
    >
      {hasHeader && (
        <div className={cn('flex items-start gap-3 px-4 pt-4', classNames?.header)}>
          {Icon && <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-fg-muted" />}
          <div className="min-w-0 flex-1">
            {title !== undefined && (
              <Heading id={titleId} className="text-base font-semibold">
                {title}
              </Heading>
            )}
            {description !== undefined && (
              <div className="mt-0.5 text-sm text-fg-muted">{description}</div>
            )}
          </div>
          {actions !== undefined && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </div>
      )}
      {children !== undefined && (
        <div className={cn('min-w-0 flex-1 p-4', classNames?.body)}>{children}</div>
      )}
      {footer !== undefined && (
        <div className={cn('border-t border-border px-4 py-3', classNames?.footer)}>{footer}</div>
      )}
    </section>
  );
}
