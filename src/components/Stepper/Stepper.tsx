// Stepper: progress through an ordered set of steps, horizontal or vertical, as numbered circles, dots, arrows or a
// compact "Step 2 of 5" bar. StepDialog (and so WizardForm) draws its progress with the compact variant. Vertical,
// with a progress bar and status badges, it's a standing checklist whose steps happen on different screens over days
// (setting up a site).
import { ArrowRight, Check, Lock, SkipForward, X } from 'lucide-react';
import { useMemo, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { stepperStrings } from '../../provider/coreStrings';
import type { StepperStatus } from '../../provider/messages';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { clamp } from '../../utils/math';
import { mergeRefs } from '../../utils/mergeRefs';
import type { HeadingLevel, Tone } from '../../utils/types';
import { useControllableState } from '../../utils/useControllableState';
import { useElementWidth } from '../../utils/useElementWidth';
import { Badge } from '../Badge/Badge';
import { ProgressBar } from '../ProgressBar/ProgressBar';
import { VisuallyHidden } from '../VisuallyHidden/VisuallyHidden';
import {
  arrowFillClasses,
  arrowShapeClasses,
  arrowTextClasses,
  dotMarkerBaseClasses,
  dotMarkerClasses,
  numberMarkerBaseClasses,
  numberMarkerClasses,
  pressableTitleClasses,
  segmentClasses,
  stepButtonClasses,
  titleToneClasses,
  type StepLook,
} from './styles';

export type { StepperStatus };

/**
 * How steps are drawn: `numbered` circles (the default), small `dot`s, `arrow`-shaped segments in a row, or
 * `compact`, a "Step 2 of 5" line over a segmented bar with the current step's title, for narrow containers.
 */
export type StepperVariant = 'numbered' | 'dot' | 'arrow' | 'compact';

export type StepperOrientation = 'horizontal' | 'vertical';

export interface StepperStep {
  /** Unique within the stepper. */
  id: string;
  title: ReactNode;
  /** A line under the title (not shown by the `arrow` and `compact` variants). */
  description?: ReactNode;
  /** Overrides the status that follows from the step's position, for example to mark a step with an error. */
  status?: StepperStatus;
  /** Shows "Optional" under the title. */
  isOptional?: boolean;
  /** The step can't be reached: it isn't pressable, and while upcoming it's drawn dashed with a lock. */
  isDisabled?: boolean;
  /** Shown in place of the step's number (done, error and skipped steps keep their status icons). */
  icon?: IconComponent;
  /**
   * Shown beside the title in place of the status badge (`hasStatusBadges`), for example a count. A step with a badge
   * leaves its status out of what screen readers hear after the title, so the badge should say it.
   */
  badge?: ReactNode;
  /**
   * Shown under the description in a vertical stepper: a link, a button or an inline form for the step (the action
   * of a checklist step).
   */
  content?: ReactNode;
}

export interface StepperProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'className' | 'style' | 'children' | 'onChange' | 'defaultValue'
> {
  steps: readonly StepperStep[];
  /** The accessible name. Defaults to the `steps` message. */
  label?: string;
  /** The current step's index, controlled. Use `steps.length` once every step is done. */
  currentStep?: number;
  /** The current step's index, uncontrolled. Defaults to 0. */
  defaultCurrentStep?: number;
  /**
   * Makes steps pressable, to move to a step. Called with the pressed step's index. Without it the stepper only
   * shows progress.
   */
  onCurrentStepChange?: (index: number) => void;
  /** With `onCurrentStepChange`, only steps before the current one, and done steps, can be pressed. */
  isLinear?: boolean;
  /** Defaults to `horizontal`. Vertical steppers have room for each step's description and content. */
  orientation?: StepperOrientation;
  /** Defaults to `numbered`. */
  variant?: StepperVariant;
  /** Renders each title as a heading at this level, to fit the page's outline. Not used while steps are pressable. */
  headingLevel?: HeadingLevel;
  /** In the compact variant, hides the current step's title (when the page shows it as a heading instead). */
  isCurrentTitleHidden?: boolean;
  /**
   * Shows an "N of M done" progress bar above the steps, named by `label` (the `stepProgress` message). It turns the
   * success colour once every step is done.
   */
  hasProgressBar?: boolean;
  /**
   * Shows each step's status in words, with an icon, in a Badge beside its title (the `stepStatus` message): Done,
   * Up next, To do, Needs attention, Skipped or Blocked. Not shown by the `arrow` variant.
   */
  hasStatusBadges?: boolean;
  /**
   * A horizontal stepper narrower than this (in CSS pixels) shows the compact variant instead. Defaults to 7 to 8 rem
   * per step, depending on the variant; 0 keeps the full stepper at every width.
   */
  compactBelow?: number;
  className?: string;
  ref?: Ref<HTMLElement>;
}

/** The narrowest each step of a horizontal stepper can be before it switches to compact. */
const minStepWidth: Record<Exclude<StepperVariant, 'compact'>, number> = {
  numbered: 112,
  dot: 96,
  arrow: 128,
};

interface ResolvedStep {
  step: StepperStep;
  index: number;
  status: StepperStatus;
  isCurrent: boolean;
  look: StepLook;
  isPressable: boolean;
}

function resolveSteps(
  steps: readonly StepperStep[],
  current: number,
  isInteractive: boolean,
  isLinear: boolean,
): ResolvedStep[] {
  return steps.map((step, index) => {
    const status =
      step.status ?? (index < current ? 'done' : index === current ? 'current' : 'upcoming');
    const isCurrent = index === current || status === 'current';
    const look: StepLook =
      status === 'error' && isCurrent
        ? 'currentError'
        : status === 'upcoming' && step.isDisabled
          ? 'disabled'
          : status;
    const isReachable = !isLinear || index < current || status === 'done';
    return {
      step,
      index,
      status,
      isCurrent,
      look,
      isPressable: isInteractive && !isCurrent && !step.isDisabled && isReachable,
    };
  });
}

/** A step's status as `stepStatus` words it: an upcoming step that can't be reached is `blocked`. */
type StatusWord = StepperStatus | 'blocked';

function statusWordOf(item: ResolvedStep): StatusWord {
  return item.look === 'disabled' ? 'blocked' : item.status;
}

const statusBadgeTone: Record<StatusWord, Tone> = {
  done: 'success',
  current: 'accent',
  upcoming: 'neutral',
  error: 'danger',
  skipped: 'neutral',
  blocked: 'neutral',
};

const statusBadgeIcon: Record<StatusWord, IconComponent | undefined> = {
  done: Check,
  current: ArrowRight,
  upcoming: undefined,
  error: X,
  skipped: SkipForward,
  blocked: Lock,
};

function StatusIcon({ item, className }: { item: ResolvedStep; className: string }) {
  const { status, step, look } = item;
  if (status === 'done') {
    return <Check aria-hidden="true" className={className} strokeWidth={3} />;
  }
  if (status === 'error') {
    return <X aria-hidden="true" className={className} strokeWidth={3} />;
  }
  if (status === 'skipped') {
    return <SkipForward aria-hidden="true" className={className} />;
  }
  const Icon = step.icon ?? (look === 'disabled' ? Lock : undefined);
  return Icon ? <Icon aria-hidden="true" className={className} /> : null;
}

/**
 * Progress through an ordered set of steps, as a list (`ol`) with the current step marked `aria-current="step"`.
 * Each step's status is in its marker, its colours and in words for screen readers. With `onCurrentStepChange`,
 * steps are buttons that move to them (all of them, or with `isLinear` only those already reached) inside a `nav`.
 * A horizontal stepper too narrow for its steps shows the compact variant; it fills its container's width.
 * `hasProgressBar` and `hasStatusBadges` add an "N of M done" bar and each status in words, for a checklist.
 */
export function Stepper({
  steps,
  label,
  currentStep,
  defaultCurrentStep = 0,
  onCurrentStepChange,
  isLinear = false,
  orientation = 'horizontal',
  variant = 'numbered',
  headingLevel,
  isCurrentTitleHidden = false,
  hasProgressBar = false,
  hasStatusBadges = false,
  compactBelow,
  className,
  ref,
  ...rest
}: StepperProps) {
  const messages = useEntryMessages(stepperStrings);
  const [current, setCurrent] = useControllableState(
    currentStep,
    defaultCurrentStep,
    onCurrentStepChange,
  );
  const [widthRef, width] = useElementWidth();
  const rootRef = useMemo(() => mergeRefs(ref, widthRef), [ref, widthRef]);
  const isInteractive = onCurrentStepChange !== undefined;
  const name = label ?? messages.steps;
  const items = resolveSteps(steps, current, isInteractive, isLinear);

  const threshold =
    variant === 'compact' ? 0 : (compactBelow ?? steps.length * minStepWidth[variant]);
  const isCompact =
    variant === 'compact' ||
    (orientation === 'horizontal' && width !== undefined && width < threshold);
  const isVertical = orientation === 'vertical' && !isCompact;
  const shape = isCompact ? 'compact' : variant === 'arrow' && !isVertical ? 'arrow' : variant;

  const Root = isInteractive ? 'nav' : 'div';
  // Inside a button, only phrasing content (spans) is allowed; headings need a block wrapper.
  const Box = isInteractive ? 'span' : 'div';
  const Title = headingLevel !== undefined && !isInteractive ? (`h${headingLevel}` as const) : Box;

  /** The step's own badge, or its status badge with `hasStatusBadges` (the arrow variant has no room for either). */
  const badgeOf = (item: ResolvedStep): ReactNode => {
    if (item.step.badge !== undefined || !hasStatusBadges) {
      return item.step.badge;
    }
    const word = statusWordOf(item);
    return (
      <Badge tone={statusBadgeTone[word]} icon={statusBadgeIcon[word]}>
        {messages.stepStatus({ status: word })}
      </Badge>
    );
  };

  /** Done, error and skipped in words after the title, unless a badge says it. */
  const statusText = (item: ResolvedStep) => {
    const isWorded = item.status === 'done' || item.status === 'error' || item.status === 'skipped';
    if (!isWorded || (shape !== 'arrow' && badgeOf(item) !== undefined)) {
      return null;
    }
    return (
      <>
        {' '}
        <VisuallyHidden>{messages.stepStatus({ status: item.status })}</VisuallyHidden>
      </>
    );
  };

  const optionalText = (item: ResolvedStep, extra?: string) =>
    item.step.isOptional ? (
      <span className={cn('text-xs text-fg-muted', extra)}>{messages.stepOptional}</span>
    ) : null;

  /** A step's marker, title and status words, as a button when pressable (or a disabled one while interactive). */
  const pressable = (item: ResolvedStep, classes: string, children: ReactNode) => {
    if (!isInteractive || item.isCurrent) {
      return <Box className={classes}>{children}</Box>;
    }
    return (
      <AriaButton
        className={cn('group/step', stepButtonClasses, classes)}
        isDisabled={!item.isPressable}
        onPress={() => {
          setCurrent(item.index);
        }}
      >
        {children}
      </AriaButton>
    );
  };

  const title = (item: ResolvedStep, classes: string) => (
    <Title
      className={cn(
        'min-w-0 break-words',
        classes,
        titleToneClasses[item.look],
        item.isPressable && pressableTitleClasses,
      )}
    >
      {item.step.title}
      {statusText(item)}
    </Title>
  );

  const marker = (item: ResolvedStep) =>
    shape === 'dot' ? (
      <span
        aria-hidden="true"
        className={cn(dotMarkerBaseClasses, dotMarkerClasses[item.look], isVertical && 'mt-1.5')}
      />
    ) : (
      <span
        aria-hidden="true"
        className={cn(numberMarkerBaseClasses, numberMarkerClasses[item.look])}
      >
        <StatusIcon item={item} className="size-4" />
        {!item.step.icon &&
          item.look !== 'disabled' &&
          item.status !== 'done' &&
          item.status !== 'error' &&
          item.status !== 'skipped' &&
          item.index + 1}
      </span>
    );

  const connectorTone = (item: ResolvedStep) =>
    item.status === 'done' ? 'bg-success-border' : 'bg-border';

  let body: ReactNode;
  if (shape === 'compact') {
    const shown = clamp(current, 0, Math.max(items.length - 1, 0));
    const item = items[shown];
    body = (
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs font-medium text-fg-muted">
          {messages.stepOf({ step: shown + 1, total: items.length })}
        </p>
        <div aria-hidden="true" className="flex gap-1">
          {items.map((entry) => (
            <span
              key={entry.step.id}
              className={cn('h-1 flex-1 rounded-full', segmentClasses[entry.look])}
            />
          ))}
        </div>
        {item && !isCurrentTitleHidden && (
          <div className="flex min-w-0 flex-col">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              {title(item, 'text-base font-semibold')}
              {badgeOf(item)}
            </div>
            {optionalText(item)}
          </div>
        )}
      </div>
    );
  } else if (shape === 'arrow') {
    const last = items.length - 1;
    body = (
      <ol aria-label={isInteractive ? undefined : name} className="flex min-w-0">
        {items.map((item) => {
          const position =
            last === 0
              ? 'only'
              : item.index === 0
                ? 'first'
                : item.index === last
                  ? 'last'
                  : 'middle';
          return (
            <li
              key={item.step.id}
              aria-current={item.isCurrent ? 'step' : undefined}
              data-status={item.status}
              className={cn('relative flex min-w-0 flex-1', item.index > 0 && '-ms-2')}
            >
              {pressable(
                item,
                cn(
                  'relative isolate flex min-h-12 w-full min-w-0 items-center gap-2 py-1.5 text-sm',
                  position === 'first' || position === 'only' ? 'ps-3' : 'ps-6',
                  position === 'last' || position === 'only' ? 'pe-3' : 'pe-5',
                  arrowTextClasses[item.look],
                ),
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-0 -z-10',
                      arrowShapeClasses[position],
                      arrowFillClasses[item.look],
                    )}
                  />
                  <span aria-hidden="true" className="flex shrink-0 tabular-nums">
                    <StatusIcon item={item} className="size-4" />
                    {!item.step.icon &&
                      item.status !== 'done' &&
                      item.status !== 'error' &&
                      item.status !== 'skipped' &&
                      item.look !== 'disabled' &&
                      item.index + 1}
                  </span>
                  <Box className="flex min-w-0 flex-col">
                    <Title className={cn('truncate', item.isPressable && pressableTitleClasses)}>
                      {item.step.title}
                      {statusText(item)}
                    </Title>
                    {optionalText(item, 'text-current')}
                  </Box>
                </>,
              )}
            </li>
          );
        })}
      </ol>
    );
  } else if (isVertical) {
    const isDot = shape === 'dot';
    body = (
      <ol aria-label={isInteractive ? undefined : name} className="flex min-w-0 flex-col">
        {items.map((item) => {
          const isLast = item.index === items.length - 1;
          const hasBody = item.step.description !== undefined || item.step.content !== undefined;
          return (
            <li
              key={item.step.id}
              aria-current={item.isCurrent ? 'step' : undefined}
              data-status={item.status}
              className={cn(
                'relative flex min-w-0 flex-col gap-2',
                !isLast && (isDot ? 'pb-6' : 'pb-8'),
              )}
            >
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute bottom-1 w-px -translate-x-1/2 rtl:translate-x-1/2',
                    isDot ? 'start-1.5 top-6' : 'start-4 top-9',
                    connectorTone(item),
                  )}
                />
              )}
              {pressable(
                item,
                cn(
                  'flex min-w-0 items-start gap-3 self-start sm:gap-4',
                  isInteractive && 'min-h-hit',
                ),
                <>
                  {marker(item)}
                  <Box className={cn('flex min-w-0 flex-1 flex-col', !isDot && 'pt-1')}>
                    <Box className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      {title(item, 'text-base font-semibold tracking-tight')}
                      {badgeOf(item)}
                    </Box>
                    {optionalText(item)}
                  </Box>
                </>,
              )}
              {hasBody && (
                <div
                  className={cn(
                    'flex min-w-0 flex-col gap-2',
                    isDot ? 'ps-6 sm:ps-7' : 'ps-11 sm:ps-12',
                  )}
                >
                  {item.step.description !== undefined && (
                    <div className="text-sm text-fg-muted">{item.step.description}</div>
                  )}
                  {item.step.content !== undefined && (
                    <div className="min-w-0 pt-1">{item.step.content}</div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    );
  } else {
    const isDot = shape === 'dot';
    body = (
      <ol aria-label={isInteractive ? undefined : name} className="flex min-w-0">
        {items.map((item) => {
          const isLast = item.index === items.length - 1;
          return (
            <li
              key={item.step.id}
              aria-current={item.isCurrent ? 'step' : undefined}
              data-status={item.status}
              className="relative flex min-w-0 flex-1 flex-col items-start gap-1"
            >
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute end-2 h-0.5 rounded-full',
                    isDot ? 'start-5 top-[5px]' : 'start-10 top-[15px]',
                    connectorTone(item),
                  )}
                />
              )}
              {pressable(
                item,
                cn(
                  'flex max-w-full min-w-0 flex-col items-start gap-2 pe-4',
                  isInteractive && 'min-h-hit',
                ),
                <>
                  {marker(item)}
                  <Box className="flex min-w-0 flex-col">
                    {title(item, cn('text-sm', item.isCurrent ? 'font-semibold' : 'font-medium'))}
                    {badgeOf(item) !== undefined && <Box className="pt-1">{badgeOf(item)}</Box>}
                    {optionalText(item)}
                  </Box>
                </>,
              )}
              {item.step.description !== undefined && (
                <div className="min-w-0 pe-4 text-xs text-fg-muted">{item.step.description}</div>
              )}
            </li>
          );
        })}
      </ol>
    );
  }

  const done = items.filter((item) => item.status === 'done').length;

  return (
    <Root
      // The compact variant has no list to carry the name, so a non-interactive one is a named group.
      role={!isInteractive && shape === 'compact' ? 'group' : undefined}
      aria-label={isInteractive || shape === 'compact' ? name : undefined}
      {...rest}
      ref={rootRef}
      data-variant={shape}
      data-orientation={isVertical ? 'vertical' : 'horizontal'}
      className={cn('min-w-0', hasProgressBar && 'flex flex-col gap-6', className)}
    >
      {hasProgressBar && (
        <ProgressBar
          label={name}
          value={done}
          minValue={0}
          maxValue={Math.max(items.length, 1)}
          valueLabel={messages.stepProgress({ done, total: items.length })}
          tone={items.length > 0 && done === items.length ? 'success' : 'accent'}
        />
      )}
      {body}
    </Root>
  );
}
