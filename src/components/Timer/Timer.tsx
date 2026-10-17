// Timer: a countdown (an exam clock) or count-up (time on a question) from useTimer, as inline text, a badge for a
// page header, or a tile that matches StatTile. Its tone turns to warning and danger at the thresholds, which are
// announced (politely, then assertively) along with expiry; the clock itself doesn't announce every second.

import { Timer as TimerIcon } from 'lucide-react';
import { useId, useMemo, type ReactNode, type Ref } from 'react';
import { useLocale } from 'react-aria-components';
import { useMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { Size } from '../../utils/types';
import { useTimer, type TimerLevel, type UseTimerOptions } from './useTimer';

/** A duration as a clock: `1:05:09` from an hour, otherwise `05:09`. */
export function formatClock(ms: number, roundUp: boolean): string {
  const seconds = Math.max(0, roundUp ? Math.ceil(ms / 1000) : Math.floor(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0
    ? `${String(hours)}:${pad(minutes)}:${pad(rest)}`
    : `${pad(minutes)}:${pad(rest)}`;
}

/** A duration in words in the locale, such as "1 hr 5 min" (`short`) or "5 minutes" (`long`). */
export function formatDurationWords(
  ms: number,
  locale: string,
  unitDisplay: 'short' | 'long' = 'short',
  roundUp = false,
): string {
  const seconds = Math.max(0, roundUp ? Math.ceil(ms / 1000) : Math.floor(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const unit = (value: number, name: 'hour' | 'minute' | 'second') =>
    new Intl.NumberFormat(locale, { style: 'unit', unit: name, unitDisplay }).format(value);
  const parts =
    hours > 0
      ? [unit(hours, 'hour'), ...(minutes > 0 ? [unit(minutes, 'minute')] : [])]
      : minutes > 0
        ? [unit(minutes, 'minute'), ...(rest > 0 && minutes < 10 ? [unit(rest, 'second')] : [])]
        : [unit(rest, 'second')];
  return new Intl.ListFormat(locale, { type: 'unit', style: 'narrow' }).format(parts);
}

export interface TimerProps extends UseTimerOptions {
  /** `clock` shows `1:05:09` or `05:09`; `words` shows "1 hr 5 min". Defaults to `clock`. */
  format?: 'clock' | 'words';
  /** `inline` (the default) text; a `badge` for a page header; or a `tile` that matches StatTile. */
  variant?: 'inline' | 'badge' | 'tile';
  /** Names the timer, such as "Time left" or "Time on this question". */
  label?: ReactNode;
  /** Defaults to `md`. */
  size?: Size;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const toneClasses: Record<TimerLevel, string> = {
  normal: 'text-fg',
  warning: 'text-warning-fg',
  danger: 'text-danger-fg',
};

const badgeClasses: Record<TimerLevel, string> = {
  normal: 'border-border bg-surface-2',
  warning: 'border-warning-border bg-warning-bg',
  danger: 'border-danger-border bg-danger-bg',
};

const valueSizeClasses: Record<'inline' | 'badge' | 'tile', Record<Size, string>> = {
  inline: { sm: 'text-sm', md: 'text-base', lg: 'text-xl' },
  badge: { sm: 'text-xs', md: 'text-sm', lg: 'text-base' },
  tile: { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl' },
};

/**
 * A countdown or count-up clock that doesn't drift, with warning and danger tones at its thresholds. It's a `timer`
 * that doesn't announce every second; crossing a threshold and running out are announced.
 */
export function Timer({
  format = 'clock',
  variant = 'inline',
  label,
  size = 'md',
  className,
  ref,
  ...options
}: TimerProps) {
  const messages = useMessages();
  const { locale } = useLocale();
  const labelId = useId();
  const state = useTimer(options);
  const isDown = (options.direction ?? 'down') === 'down';
  const shown = isDown ? state.remainingMs : state.elapsedMs;
  const text =
    shown === undefined
      ? '--:--'
      : format === 'clock'
        ? formatClock(shown, isDown)
        : formatDurationWords(shown, locale, 'short', isDown);

  // What to announce: the threshold just reached, or expiry. Set once per level, so it's read once.
  const { warningMs, dangerMs } = options.thresholds ?? {};
  const announcement = useMemo(() => {
    const at = (ms: number | undefined) => formatDurationWords(ms ?? 0, locale, 'long');
    const say = (ms: number | undefined) =>
      isDown ? messages.timeLeft({ time: at(ms) }) : messages.timeElapsed({ time: at(ms) });
    return {
      polite: state.level === 'warning' ? say(warningMs) : '',
      assertive: state.isExpired ? messages.timeUp : state.level === 'danger' ? say(dangerMs) : '',
    };
  }, [state.level, state.isExpired, isDown, warningMs, dangerMs, locale, messages]);

  const value = (
    <span
      className={cn(
        'font-semibold tabular-nums',
        valueSizeClasses[variant][size],
        toneClasses[state.level],
      )}
    >
      {text}
    </span>
  );
  const labelText =
    label !== undefined ? (
      <span
        id={labelId}
        className={cn('text-fg-muted', variant === 'tile' ? 'text-sm' : 'text-xs')}
      >
        {label}
      </span>
    ) : null;
  const paused = state.isPaused && (
    <span className="text-xs text-fg-muted">{messages.timerPaused}</span>
  );

  return (
    <div
      ref={ref}
      className={cn(
        variant === 'tile'
          ? 'flex min-w-0 flex-col gap-1 rounded-card border border-border bg-surface-1 p-4'
          : 'inline-flex min-w-0 items-center gap-2',
        variant === 'badge' && cn('rounded-full border px-3 py-1', badgeClasses[state.level]),
        className,
      )}
    >
      <div
        role="timer"
        aria-live="off"
        aria-atomic="true"
        aria-labelledby={label !== undefined ? labelId : undefined}
        className={cn(
          'flex min-w-0 gap-2',
          variant === 'tile' ? 'flex-col items-start gap-1' : 'items-baseline',
        )}
      >
        {variant === 'badge' && (
          <TimerIcon
            aria-hidden="true"
            className={cn('size-4 self-center', toneClasses[state.level])}
          />
        )}
        {labelText}
        {value}
        {paused}
      </div>
      <span className="sr-only" aria-live="polite">
        {announcement.polite}
      </span>
      <span className="sr-only" aria-live="assertive">
        {announcement.assertive}
      </span>
    </div>
  );
}
