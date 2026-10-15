// Checklist: an ordered list of steps, each with a status (done, current, to do, blocked), a title, a description
// and an action slot, under a progress summary. StepDialog and WizardForm guide a flow inside one dialog or form;
// this is for a standing checklist whose steps happen on different screens over days (setting up a site).
import { ArrowRight, Check, Lock } from 'lucide-react';
import type { ReactNode, Ref } from 'react';
import { useEntryMessages } from '../../provider/context';
import type { ChecklistMessages, ChecklistStatus } from '../../provider/messages';
import { cn } from '../../utils/cn';
import type { HeadingLevel, Tone } from '../../utils/types';
import { Badge } from '../Badge/Badge';
import { ProgressBar } from '../ProgressBar/ProgressBar';

export type { ChecklistStatus };

const statusWords: Record<ChecklistStatus, string> = {
  done: 'Done',
  current: 'Up next',
  todo: 'To do',
  blocked: 'Blocked',
};

/** English defaults of Checklist's strings (see `Messages`). */
export const defaultChecklistMessages: ChecklistMessages = {
  checklistStatus: ({ status }) => statusWords[status],
  checklistProgress: ({ done, total }) => `${done} of ${total} done`,
};

export interface ChecklistStep {
  /** Unique within the list. */
  id: string;
  title: ReactNode;
  /** What the step involves, or (for a blocked step) what it's waiting for. */
  description?: ReactNode;
  status: ChecklistStatus;
  /** Controls for the step: a link or button, or an inline form for the current step. */
  action?: ReactNode;
}

export interface ChecklistProps {
  /** Names the list and labels the progress bar, for example "Site setup". */
  label: string;
  steps: readonly ChecklistStep[];
  /** The heading element of each step's title. Defaults to 3. */
  headingLevel?: HeadingLevel;
  /** Hides the progress summary (when the page shows progress elsewhere). */
  isProgressHidden?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const statusTone: Record<ChecklistStatus, Tone> = {
  done: 'success',
  current: 'accent',
  todo: 'neutral',
  blocked: 'neutral',
};

const markerClasses: Record<ChecklistStatus, string> = {
  done: 'border-success-border bg-success-bg text-success-fg',
  current: 'border-accent-solid bg-accent-solid text-accent-on-solid',
  todo: 'border-border-strong bg-surface-1 text-fg-muted',
  blocked: 'border-dashed border-border-strong bg-surface-3 text-fg-muted',
};

/** Steps in order, each with its status in words and an icon, under an "N of M done" progress bar. */
export function Checklist({
  label,
  steps,
  headingLevel = 3,
  isProgressHidden,
  className,
  ref,
}: ChecklistProps) {
  const messages = useEntryMessages(defaultChecklistMessages);
  const done = steps.filter((s) => s.status === 'done').length;
  const total = steps.length;
  const Title = `h${headingLevel}` as const;

  return (
    <div ref={ref} className={cn('flex min-w-0 flex-col gap-6', className)}>
      {!isProgressHidden && (
        <ProgressBar
          label={label}
          value={done}
          minValue={0}
          maxValue={Math.max(total, 1)}
          valueLabel={messages.checklistProgress({ done, total })}
          tone={total > 0 && done === total ? 'success' : 'accent'}
        />
      )}
      <ol aria-label={label} className="flex min-w-0 flex-col">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li
              key={step.id}
              aria-current={step.status === 'current' ? 'step' : undefined}
              className={cn('relative flex min-w-0 gap-3 sm:gap-4', !isLast && 'pb-8')}
            >
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="absolute start-4 top-9 bottom-1 w-px -translate-x-1/2 bg-border"
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  'relative flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold tabular-nums',
                  markerClasses[step.status],
                )}
              >
                {step.status === 'done' ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : step.status === 'blocked' ? (
                  <Lock className="size-3.5" />
                ) : (
                  index + 1
                )}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <Title
                    className={cn(
                      'min-w-0 text-base font-semibold tracking-tight break-words',
                      step.status === 'done' ? 'text-fg-muted' : 'text-fg',
                    )}
                  >
                    {step.title}
                  </Title>
                  <Badge
                    tone={statusTone[step.status]}
                    icon={
                      step.status === 'done'
                        ? Check
                        : step.status === 'current'
                          ? ArrowRight
                          : step.status === 'blocked'
                            ? Lock
                            : undefined
                    }
                  >
                    {messages.checklistStatus({ status: step.status })}
                  </Badge>
                </div>
                {step.description && (
                  <div className="text-sm text-fg-muted">{step.description}</div>
                )}
                {step.action && <div className="min-w-0 pt-1">{step.action}</div>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
