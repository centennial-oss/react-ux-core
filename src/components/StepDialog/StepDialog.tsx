import { useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { OverlayTriggerStateContext } from 'react-aria-components';
import { useCommonMessages } from '../../provider/context';
import { errorMessageOf } from '../../utils/errors';
import { Banner } from '../Banner/Banner';
import { Button } from '../Button/Button';
import { ButtonGroup } from '../ButtonGroup/ButtonGroup';
import { Dialog, type DialogSize } from '../Dialog/Dialog';
import { Stepper } from '../Stepper/Stepper';

export interface DialogStepSummaryItem {
  label: ReactNode;
  value: ReactNode;
}

export interface DialogStep {
  /** Stable id for the step. */
  id: string;
  title: ReactNode;
  content: ReactNode;
  /** When false, Next is disabled. Defaults to true. */
  canAdvance?: boolean;
  /**
   * Runs when the user presses Next (or Confirm on the last step). Return `true` to continue, or an error message to
   * stay on the step and show it. May be async; Next shows a pending state meanwhile.
   */
  validate?: () => boolean | string | Promise<boolean | string>;
  /** Values this step collected, listed on the summary step. */
  summary?: DialogStepSummaryItem[];
}

export interface StepDialogProps {
  title: ReactNode;
  steps: DialogStep[];
  /** Adds a final summary step listing every step's `summary` before Confirm. */
  hasSummaryStep?: boolean;
  /** Called on the final Confirm. A returned promise shows a pending state; a rejection shows its message inline. */
  onConfirm: () => void | Promise<void>;
  /** Defaults to the `confirm` message. */
  confirmLabel?: string;
  /** Defaults to `md`. */
  size?: DialogSize;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * The current step's index, controlled (for example to return to a step with a problem). Uncontrolled, the dialog
   * starts at the first step each time it opens.
   */
  currentStep?: number;
  onStepChange?: (step: number) => void;
}

/**
 * A dialog that walks through steps with per-step validation and an optional summary. Progress is a compact Stepper
 * ("Step 2 of 4" over a segmented bar, the current segment in the danger colour while the step shows an error).
 */
export function StepDialog({
  title,
  steps,
  hasSummaryStep = false,
  onConfirm,
  confirmLabel,
  size = 'md',
  isOpen,
  defaultOpen,
  onOpenChange,
  currentStep: stepProp,
  onStepChange,
}: StepDialogProps) {
  const messages = useCommonMessages();
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const triggerState = useContext(OverlayTriggerStateContext);
  const isShown = isOpen ?? triggerState?.isOpen ?? defaultOpen ?? false;

  const [internalIndex, setInternalIndex] = useState(0);
  const index = stepProp ?? internalIndex;
  const setIndex = (next: number) => {
    setInternalIndex(next);
    onStepChange?.(next);
  };
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start at the first step each time the dialog opens.
  const [wasShown, setWasShown] = useState(isShown);
  if (isShown !== wasShown) {
    setWasShown(isShown);
    if (isShown) {
      // A controlled step is the parent's to reset.
      setInternalIndex(0);
      setPending(false);
      setError(null);
    }
  }

  const allSteps: DialogStep[] = hasSummaryStep
    ? [...steps, { id: '__summary', title: messages.summary, content: null }]
    : steps;
  const total = allSteps.length;
  const step = allSteps[Math.min(index, total - 1)];
  const isLast = index >= total - 1;
  const isSummary = hasSummaryStep && isLast;

  // Move focus to the new step's heading so screen readers announce it.
  const previousIndex = useRef(index);
  useEffect(() => {
    if (previousIndex.current !== index) {
      previousIndex.current = index;
      headingRef.current?.focus();
    }
  }, [index]);

  if (!step) {
    return null;
  }

  const advance = async (close: () => void) => {
    if (isPending || step.canAdvance === false) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = step.validate ? await step.validate() : true;
      if (result !== true) {
        setPending(false);
        setError(typeof result === 'string' ? result : messages.genericError);
        return;
      }
      if (isLast) {
        await onConfirm();
        setPending(false);
        close();
      } else {
        setPending(false);
        setIndex(index + 1);
      }
    } catch (reason) {
      setPending(false);
      setError(errorMessageOf(reason, messages.genericError));
    }
  };

  return (
    <Dialog
      title={title}
      size={size}
      isBusy={isPending}
      isOpen={isOpen}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      footer={(close) => (
        <ButtonGroup layout="between">
          <Button
            variant="ghost"
            isDisabled={index === 0 || isPending}
            onPress={() => {
              setError(null);
              setIndex(index - 1);
            }}
          >
            {messages.back}
          </Button>
          <Button
            tone="accent"
            isPending={isPending}
            isDisabled={step.canAdvance === false}
            onPress={() => void advance(close)}
          >
            {isLast ? (confirmLabel ?? messages.confirm) : messages.next}
          </Button>
        </ButtonGroup>
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Stepper
            variant="compact"
            steps={allSteps.map((item, position) => ({
              id: item.id,
              title: item.title,
              // A failed validation or confirm marks the current step.
              status: position === index && error !== null ? 'error' : undefined,
            }))}
            currentStep={index}
            isCurrentTitleHidden
          />
          <h3
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="text-base font-semibold outline-none"
          >
            {step.title}
          </h3>
        </div>
        <section aria-labelledby={headingId}>
          {isSummary ? (
            <div className="flex flex-col gap-4">
              {steps
                .filter((item) => item.summary && item.summary.length > 0)
                .map((item) => (
                  <div key={item.id} className="flex flex-col gap-1">
                    <h4 className="text-xs font-semibold text-fg-muted">{item.title}</h4>
                    <dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 gap-y-1">
                      {item.summary?.map((entry, position) => (
                        <div key={position} className="contents">
                          <dt className="text-fg-muted">{entry.label}</dt>
                          <dd className="min-w-0 wrap-anywhere">{entry.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
            </div>
          ) : (
            step.content
          )}
        </section>
        {error !== null && <Banner tone="danger">{error}</Banner>}
      </div>
    </Dialog>
  );
}
