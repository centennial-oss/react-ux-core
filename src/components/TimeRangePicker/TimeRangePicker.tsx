import { ChevronDown, Clock } from 'lucide-react';
import { useId, useMemo, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { Button as AriaButton, DialogTrigger, useLocale } from 'react-aria-components';
import { useMessages, useTimeZone } from '../../provider/context';
import { cn } from '../../utils/cn';
import { useNow } from '../../utils/timers';
import { useControllableState } from '../../utils/useControllableState';
import { PickerOverlay } from '../DatePicker/PickerOverlay';
import { inputGroupClasses, inputHeightClasses } from '../Field/Field';
import { formatTimeRange, getDefaultTimeRangePresets, type TimeRangePreset } from './labels';
import type { TimeRange } from './resolveTimeRange';
import { TimeRangePanel } from './TimeRangePanel';

export interface TimeRangePickerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  | 'className'
  | 'style'
  | 'children'
  | 'onChange'
  | 'defaultValue'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
> {
  /** The range, controlled. `null` shows a placeholder. */
  value?: TimeRange | null;
  /** The initial range, uncontrolled. */
  defaultValue?: TimeRange | null;
  /** Called with the new range when a preset is chosen or Apply is pressed. */
  onChange?: (value: TimeRange) => void;
  /** Ready-made ranges listed first. Defaults to last hour, 24 hours, 7 days, 30 days and this month. */
  presets?: readonly TimeRangePreset[];
  /**
   * IANA time zone that absolute dates are entered and shown in, and that relative ranges resolve in for labels.
   * Defaults to `UIProvider`'s `timeZone`, or the browser's zone.
   */
  timeZone?: string;
  /** 12- or 24-hour times. Defaults to the locale's. */
  hourCycle?: 12 | 24;
  /** A visible label above the trigger. Without one, pass `aria-label`. */
  label?: ReactNode;
  /** Names the trigger (followed by the current range) when there's no visible label. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  isDisabled?: boolean;
  /** Whether the popover is open, controlled. */
  isOpen?: boolean;
  /** Whether the popover starts open, uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** Defaults to `md`. On touch screens the trigger grows to the minimum touch target. */
  size?: 'sm' | 'md';
  className?: string;
  /** The root element. */
  ref?: Ref<HTMLDivElement>;
}

const triggerClasses = [
  inputGroupClasses,
  // Sized to the range's label (it usually sits in a toolbar), never wider than its container.
  'w-auto max-w-full cursor-pointer gap-2 px-3 text-start text-base sm:text-sm',
  'data-focus-visible:focus-ring data-hovered:bg-surface-3 data-pressed:bg-surface-4',
  'data-disabled:cursor-not-allowed data-disabled:opacity-50',
].join(' ');

/**
 * Picks a time range for dashboards and charts: presets (configurable), a relative range ("last 3 hours") or an
 * absolute range between two date-times. The value is a plain object (`TimeRange`) that apps can keep in the URL and
 * turn into instants with `resolveTimeRange`. The trigger shows the range's label; the choices open in a popover, or
 * a full-screen sheet with the presets first on phones. Presets apply at once; the other entries apply with Apply.
 */
export function TimeRangePicker({
  value: valueProp,
  defaultValue,
  onChange,
  presets: presetsProp,
  timeZone: timeZoneProp,
  hourCycle,
  label,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  isDisabled = false,
  isOpen,
  defaultOpen,
  onOpenChange,
  size = 'md',
  className,
  ...rest
}: TimeRangePickerProps) {
  const messages = useMessages();
  const { locale } = useLocale();
  const defaultTimeZone = useTimeZone();
  const timeZone = timeZoneProp ?? defaultTimeZone;
  const [value, setValue] = useControllableState<TimeRange | null>(valueProp, defaultValue ?? null);
  const presets = useMemo(
    () => presetsProp ?? getDefaultTimeRangePresets(messages),
    [presetsProp, messages],
  );
  // Ranges shown as dates (not presets or "last N") resolve against the shared clock, so they stay current.
  const now = useNow();
  const labelId = useId();
  const buttonId = useId();
  const valueId = useId();

  // A malformed range formats as '' and shows the placeholder too.
  const formatted = value
    ? formatTimeRange(value, { messages, locale, timeZone, presets, hourCycle, now })
    : '';
  const text = formatted === '' ? messages.selectPlaceholder : formatted;

  // Without a visible or given name, the trigger and dialog fall back to the "Time range" message.
  const name =
    ariaLabel ??
    (label === undefined && ariaLabelledBy === undefined ? messages.timeRange : undefined);
  const labelledBy = [
    ariaLabelledBy,
    label !== undefined ? labelId : undefined,
    name !== undefined ? buttonId : undefined,
    valueId,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      {...rest}
      className={cn('flex min-w-0 flex-col items-start gap-1.5 text-sm text-fg', className)}
    >
      {label !== undefined && (
        <span id={labelId} className="font-medium text-fg">
          {label}
        </span>
      )}
      <DialogTrigger isOpen={isOpen} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        <AriaButton
          id={buttonId}
          aria-label={name}
          aria-labelledby={labelledBy}
          aria-describedby={ariaDescribedBy}
          isDisabled={isDisabled}
          className={cn(triggerClasses, inputHeightClasses[size])}
        >
          <Clock aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
          <span id={valueId} className="min-w-0 flex-1 truncate">
            {text}
          </span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
        </AriaButton>
        <PickerOverlay
          title={label ?? ariaLabel ?? messages.timeRange}
          aria-labelledby={label !== undefined ? labelId : undefined}
          aria-label={label === undefined ? (ariaLabel ?? messages.timeRange) : undefined}
        >
          <TimeRangePanel
            value={value}
            presets={presets}
            timeZone={timeZone}
            hourCycle={hourCycle}
            onApply={(next) => {
              setValue(next);
              onChange?.(next);
            }}
          />
        </PickerOverlay>
      </DialogTrigger>
    </div>
  );
}
