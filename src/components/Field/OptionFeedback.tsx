// Feedback on one option of a choice (a Radio, a Checkbox, a reorderable item): a tone on the option's row, the tone's
// icon at the row's end, and a short message under the label, such as "Correct answer" or "Your answer". The icon's
// name and the message sit in the option's description, so screen readers hear them with the option.

import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEntryMessages } from '../../provider/context';
import { feedbackStrings } from '../../provider/coreStrings';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import type { FeedbackTone } from '../../utils/types';

/** Feedback on one option, for example after checking a quiz answer. */
export interface OptionFeedback {
  tone: FeedbackTone;
  /** A short word or sentence under the option's label, such as "Correct answer" or "Your answer". */
  message?: ReactNode;
  /** Replaces the tone's icon; `null` hides it. */
  icon?: IconComponent | null;
}

/** The option row's border and background for each tone (the Banner's feedback colours). */
export const optionFeedbackRowClasses: Record<FeedbackTone, string> = {
  neutral: 'border-neutral-border bg-neutral-bg',
  info: 'border-info-border bg-info-bg',
  success: 'border-success-border bg-success-bg',
  warning: 'border-warning-border bg-warning-bg',
  danger: 'border-danger-border bg-danger-bg',
};

/** Classes for an option's root when it has feedback: a padded, bordered row with room for the icon. */
export function optionFeedbackClasses(feedback: OptionFeedback | undefined): string | undefined {
  return feedback
    ? cn(
        'relative rounded-control border px-3 py-0.5',
        feedback.icon !== null && 'pe-10',
        optionFeedbackRowClasses[feedback.tone],
      )
    : undefined;
}

const toneIcons: Record<FeedbackTone, IconComponent> = {
  neutral: Info,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleX,
};

const toneIconClasses: Record<FeedbackTone, string> = {
  neutral: 'text-neutral-fg',
  info: 'text-info-fg',
  success: 'text-success-fg',
  warning: 'text-warning-fg',
  danger: 'text-danger-fg',
};

function toneWord(tone: FeedbackTone, messages: typeof feedbackStrings): string {
  switch (tone) {
    case 'success':
      return messages.feedbackCorrect;
    case 'danger':
      return messages.feedbackIncorrect;
    case 'warning':
      return messages.feedbackWarning;
    case 'info':
    case 'neutral':
      return messages.feedbackNote;
  }
}

/**
 * The feedback's icon (named by its tone, drawn at the row's end) and message, for inside the option's description
 * so they're announced with it.
 */
export function OptionFeedbackContent({ feedback }: { feedback: OptionFeedback }) {
  const messages = useEntryMessages(feedbackStrings);
  const Icon = feedback.icon === undefined ? toneIcons[feedback.tone] : feedback.icon;
  const word = toneWord(feedback.tone, messages);
  return (
    <>
      {Icon ? (
        <span
          role="img"
          aria-label={word}
          className={cn(
            'absolute end-3 top-[calc(0.125rem+var(--hit-size)/2)] -translate-y-1/2',
            toneIconClasses[feedback.tone],
          )}
        >
          <Icon aria-hidden="true" className="size-5" />
        </span>
      ) : (
        <span className="sr-only">{word}</span>
      )}
      {feedback.message !== undefined && (
        <span className="block font-medium text-fg">{feedback.message}</span>
      )}
    </>
  );
}

/** An option's description and feedback together, as the one description its field links to. */
export function optionDescription(
  description: ReactNode,
  feedback: OptionFeedback | undefined,
): ReactNode {
  if (!feedback) {
    return description;
  }
  return (
    <>
      {description !== undefined && <span className="block">{description}</span>}
      <OptionFeedbackContent feedback={feedback} />
    </>
  );
}
