import {
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type Ref,
} from 'react';
import {
  OverlayArrow,
  Tooltip as AriaTooltip,
  TooltipTriggerStateContext,
  useLocale,
} from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { useDeadlineTimer } from '../../utils/timers';
import { defaultUptimeBarMessages } from './messages';

// How long a tooltip opened by a touch tap stays up (touch has no hover to keep it open).
const TOUCH_DISPLAY_MS = 3000;

/** One day's uptime. */
export interface UptimeDay {
  /** The day as an ISO date, `YYYY-MM-DD`. */
  date: string;
  /** Uptime from 0 to 100, or null for no data. */
  uptime: number | null;
  /** How many incidents the day had. */
  incidents?: number;
}

/** Uptime below `warning` is a warning day and below `danger` a danger day (both 0–100). */
export interface UptimeThresholds {
  warning: number;
  danger: number;
}

export interface UptimeBarProps {
  /** The service's or region's name. It heads the bar and names the list of days. */
  label: string;
  /** The days, oldest first (typically 90). */
  days: readonly UptimeDay[];
  /** Defaults to a warning below 99.9 and danger below 99. */
  thresholds?: UptimeThresholds;
  /** Called with a day's date when it's clicked or chosen with Enter (on touch, the first tap shows its details). */
  onDayPress?: (date: string) => void;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

export type UptimeStatus = 'ok' | 'warning' | 'danger' | 'none';

export const DEFAULT_UPTIME_THRESHOLDS: UptimeThresholds = { warning: 99.9, danger: 99 };

/** A day's status by the thresholds: `none` when it has no data. */
export function uptimeStatus(
  uptime: number | null,
  thresholds: UptimeThresholds = DEFAULT_UPTIME_THRESHOLDS,
): UptimeStatus {
  if (uptime === null || !Number.isFinite(uptime)) {
    return 'none';
  }
  if (uptime < thresholds.danger) {
    return 'danger';
  }
  return uptime < thresholds.warning ? 'warning' : 'ok';
}

/** The period's uptime (the mean of the days with data, or null) and how many days fell below the warning line. */
export function summarizeUptime(
  days: readonly UptimeDay[],
  thresholds: UptimeThresholds = DEFAULT_UPTIME_THRESHOLDS,
): { uptime: number | null; belowCount: number } {
  let sum = 0;
  let count = 0;
  let belowCount = 0;
  for (const day of days) {
    if (day.uptime !== null && Number.isFinite(day.uptime)) {
      sum += day.uptime;
      count += 1;
      if (day.uptime < thresholds.warning) {
        belowCount += 1;
      }
    }
  }
  return { uptime: count === 0 ? null : sum / count, belowCount };
}

const statusClasses: Record<UptimeStatus, string> = {
  ok: 'bg-success-solid',
  warning: 'bg-warning-solid',
  danger: 'bg-danger-solid',
  none: 'bg-border-strong',
};

/** An ISO date as a UTC Date, so formatting it in UTC gives back the same calendar day anywhere. */
function parseDay(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/**
 * Daily uptime as a row of thin bars coloured by threshold, with the overall uptime for the period and a summary
 * ("99.95% over 90 days, 2 days below 99.9%"). Hover, focus or tap a day for its date, uptime and incidents. The
 * days are a list of buttons with full names; arrow keys, Home and End move between them.
 */
export function UptimeBar({
  label,
  days,
  thresholds = DEFAULT_UPTIME_THRESHOLDS,
  onDayPress,
  className,
  ref,
}: UptimeBarProps) {
  const messages = useEntryMessages(defaultUptimeBarMessages);
  const { locale, direction } = useLocale();
  const labelId = useId();
  const summaryId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // The day that's in the tab order (the latest, until another is focused) and the day the tooltip describes.
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isOpen, setOpen] = useState(false);
  const pointerRef = useRef<{ type: string; isRepeat: boolean }>({ type: '', isRepeat: false });
  const touchTimer = useDeadlineTimer(() => {
    setOpen(false);
  });

  // One tooltip for the whole bar, anchored to the active day. React Aria's Tooltip reads its open state from the
  // trigger context, which a TooltipTrigger would provide; here the bar provides it.
  const isTooltipOpen = isOpen && activeIndex !== null && activeIndex < days.length;
  const tooltipState = useMemo(
    () => ({
      isOpen: isTooltipOpen,
      shouldSkipAnimation: true,
      open: () => {
        setOpen(true);
      },
      close: () => {
        setOpen(false);
      },
    }),
    [isTooltipOpen],
  );

  const formats = useMemo(
    () => ({
      percent: new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 }),
      day: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }),
      short: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    }),
    [locale],
  );
  // Rounds down to hundredths of a percent, so 99.996% shows as 99.99% rather than a perfect-looking 100%. (The inner
  // rounding drops floating-point noise first: 99.95 * 10000 isn't exactly 999500.)
  const percent = (value: number) =>
    formats.percent.format(Math.floor(Math.round(value * 10_000) / 100) / 10_000);

  const summary = summarizeUptime(days, thresholds);
  const uptimeText = summary.uptime === null ? null : percent(summary.uptime);
  const tabIndex = focusIndex ?? days.length - 1;
  const firstDay = days[0];
  const lastDay = days.at(-1);
  const active = activeIndex === null ? undefined : days[activeIndex];

  const dayName = (day: UptimeDay) =>
    messages.uptimeDay({
      date: formats.day.format(parseDay(day.date)),
      uptime: day.uptime === null ? null : percent(day.uptime),
      incidents: day.incidents ?? 0,
    });

  /** The day button an event came from, if any. */
  const dayAt = (
    target: EventTarget | null,
  ): { index: number; button: HTMLButtonElement } | null => {
    const button =
      target instanceof Element ? target.closest<HTMLButtonElement>('button[data-index]') : null;
    return button ? { index: Number(button.dataset.index), button } : null;
  };

  const show = ({ index, button }: { index: number; button: HTMLButtonElement }) => {
    triggerRef.current = button;
    setActiveIndex(index);
    setOpen(true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLOListElement>) => {
    const target = dayAt(event.target);
    if (!target) {
      return;
    }
    if (event.key === 'Escape') {
      if (isOpen) {
        event.preventDefault();
        setOpen(false);
      }
      return;
    }
    const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    let next: number | null = null;
    if (event.key === forward) {
      next = Math.min(days.length - 1, target.index + 1);
    } else if (event.key === backward) {
      next = Math.max(0, target.index - 1);
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = days.length - 1;
    }
    if (next !== null) {
      event.preventDefault();
      listRef.current
        ?.querySelector<HTMLButtonElement>(`button[data-index="${String(next)}"]`)
        ?.focus();
    }
  };

  const onFocus = (event: FocusEvent<HTMLOListElement>) => {
    const target = dayAt(event.target);
    if (target) {
      setFocusIndex(target.index);
      show(target);
    }
  };

  const onBlur = (event: FocusEvent<HTMLOListElement>) => {
    if (!(
      event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)
    )) {
      setOpen(false);
    }
  };

  const onPointerOver = (event: PointerEvent<HTMLOListElement>) => {
    const target = dayAt(event.target);
    if (event.pointerType === 'mouse' && target) {
      show(target);
    }
  };

  const onPointerLeave = (event: PointerEvent<HTMLOListElement>) => {
    if (event.pointerType === 'mouse' && !event.currentTarget.contains(document.activeElement)) {
      setOpen(false);
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLOListElement>) => {
    const target = dayAt(event.target);
    pointerRef.current = {
      type: event.pointerType,
      isRepeat: isOpen && target !== null && target.index === activeIndex,
    };
  };

  const onClick = (event: MouseEvent<HTMLOListElement>) => {
    const target = dayAt(event.target);
    const day = target ? days[target.index] : undefined;
    if (!target || !day) {
      return;
    }
    const { type, isRepeat } = pointerRef.current;
    pointerRef.current = { type: '', isRepeat: false };
    if (type === 'touch') {
      touchTimer.start(TOUCH_DISPLAY_MS);
      // The first tap on a day shows its details; a second tap presses it.
      if (!isRepeat || !onDayPress) {
        show(target);
        return;
      }
    }
    onDayPress?.(day.date);
  };

  return (
    <div ref={ref} className={cn('@container flex min-w-0 flex-col gap-1.5', className)}>
      <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
        <span id={labelId} className="min-w-0 truncate font-medium text-fg">
          {label}
        </span>
        <span className="shrink-0 text-fg-muted tabular-nums">{uptimeText ?? messages.noData}</span>
      </div>
      {/* Keyboard and pointer handling is delegated to the list: each day is a real button in the roving tab order. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the events come from the day buttons */}
      <ol
        ref={listRef}
        aria-labelledby={labelId}
        aria-describedby={summaryId}
        className="flex h-8 min-w-0 list-none gap-px pointer-coarse:h-10 @lg:gap-0.5"
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        onPointerOver={onPointerOver}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onClick={onClick}
      >
        {days.map((day, index) => (
          <li key={day.date} className="flex min-w-0 flex-1">
            <button
              type="button"
              data-index={index}
              tabIndex={index === tabIndex ? 0 : -1}
              aria-label={dayName(day)}
              className={cn(
                'min-w-0 flex-1 rounded-[1px] outline-none focus-visible:focus-ring',
                'hover:opacity-75',
                onDayPress ? 'cursor-pointer' : 'cursor-default',
                statusClasses[uptimeStatus(day.uptime, thresholds)],
              )}
            />
          </li>
        ))}
      </ol>
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 text-xs text-fg-muted">
        <p id={summaryId} className="min-w-0">
          {messages.uptimeSummary({
            uptime: uptimeText,
            dayCount: days.length,
            belowCount: summary.belowCount,
            threshold: percent(thresholds.warning),
          })}
        </p>
        {firstDay && lastDay && (
          // The list's day names carry the dates; this range is a visual cue only.
          <span aria-hidden="true" className="shrink-0 tabular-nums">
            {formats.short.formatRange(parseDay(firstDay.date), parseDay(lastDay.date))}
          </span>
        )}
      </div>
      <TooltipTriggerStateContext.Provider value={tooltipState}>
        <AriaTooltip
          triggerRef={triggerRef}
          placement="top"
          offset={8}
          className={cn(
            'group/tooltip z-toast max-w-xs rounded-control bg-fg px-2 py-1 text-xs text-fg-inverse shadow-overlay',
            'pointer-events-none',
          )}
        >
          <OverlayArrow>
            <svg
              width={8}
              height={8}
              viewBox="0 0 8 8"
              className="block fill-fg group-data-[placement=bottom]/tooltip:rotate-180"
            >
              <path d="M0 0 L4 4 L8 0" />
            </svg>
          </OverlayArrow>
          {active && (
            // The day's button is already named with all of this, so nothing points screen readers here.
            <span className="flex flex-col">
              <span className="font-semibold">{formats.day.format(parseDay(active.date))}</span>
              <span>
                {active.uptime === null
                  ? messages.noData
                  : messages.uptimeValue({ uptime: percent(active.uptime) })}
              </span>
              {active.uptime !== null && (
                <span>{messages.uptimeIncidents({ count: active.incidents ?? 0 })}</span>
              )}
            </span>
          )}
        </AriaTooltip>
      </TooltipTriggerStateContext.Provider>
    </div>
  );
}
