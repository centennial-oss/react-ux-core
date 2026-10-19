import { CircleAlert, RotateCw } from 'lucide-react';
import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { useCommonMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import type { HeadingLevel } from '../../utils/types';
import { Button } from '../Button/Button';
import { Disclosure } from '../Disclosure/Disclosure';

export interface ErrorStateProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className' | 'style' | 'title' | 'children'
> {
  /** What went wrong, for example "Couldn't load customers". */
  title: ReactNode;
  /** What the user can do about it. */
  description?: ReactNode;
  /**
   * Technical details (an error code, a request id, a message from the server), shown in a collapsed "Details"
   * disclosure. A string is shown as preformatted text.
   */
  details?: ReactNode;
  /** Shows a "Retry" button that calls this. */
  onRetry?: () => void;
  /** Shows the retry button as pending (spinner, `aria-busy`, presses blocked) while a retry is in flight. */
  isRetrying?: boolean;
  /** Defaults to a circled exclamation mark. */
  icon?: IconComponent;
  /** The heading element for `title`. Defaults to 3; the details disclosure uses the next level down. */
  headingLevel?: HeadingLevel;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Shown in place of content that failed to load. The message is announced (`role="alert"`) when it appears, the
 * optional retry button shows its own pending state, and technical details stay out of the way in a disclosure.
 */
export function ErrorState({
  title,
  description,
  details,
  onRetry,
  isRetrying = false,
  icon: Icon = CircleAlert,
  headingLevel = 3,
  className,
  ...rest
}: ErrorStateProps) {
  const messages = useCommonMessages();
  const Heading = `h${headingLevel}` as const;
  const detailsLevel = Math.min(headingLevel + 1, 6) as HeadingLevel;

  return (
    <div
      {...rest}
      className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-danger-bg text-danger-fg">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      {/* Only the message is a live region, so the retry button's pending state and the details aren't re-read. */}
      <div role="alert" className="flex max-w-sm flex-col gap-1">
        <Heading className="text-base font-semibold text-fg">{title}</Heading>
        {description !== undefined && <div className="text-sm text-fg-muted">{description}</div>}
      </div>
      {onRetry && (
        <div className="mt-1">
          <Button variant="outline" icon={RotateCw} isPending={isRetrying} onPress={onRetry}>
            {messages.retry}
          </Button>
        </div>
      )}
      {details !== undefined && (
        <Disclosure
          title={messages.details}
          headingLevel={detailsLevel}
          className="w-full max-w-sm text-start"
          classNames={{ trigger: 'justify-center gap-1.5 text-fg-muted' }}
        >
          {typeof details === 'string' ? (
            // Wraps rather than scrolls, so long lines never widen the page and no scroll region needs focus.
            <pre className="rounded-control bg-surface-3 p-3 font-mono text-xs break-words whitespace-pre-wrap text-fg">
              {details}
            </pre>
          ) : (
            details
          )}
        </Disclosure>
      )}
    </div>
  );
}
