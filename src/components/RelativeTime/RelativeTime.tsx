import { useMemo } from 'react';
import { Focusable, useLocale } from 'react-aria-components';
import { useTimeZone } from '../../provider/context';
import { cn } from '../../utils/cn';
import { useNow } from '../../utils/timers';
import { Tooltip } from '../Tooltip/Tooltip';

const UNITS: [unit: Intl.RelativeTimeFormatUnit, seconds: number, threshold: number][] = [
  ['second', 1, 45],
  ['minute', 60, 45 * 60],
  ['hour', 3600, 22 * 3600],
  ['day', 86_400, 26 * 86_400],
  ['month', 2_629_800, 320 * 86_400],
  ['year', 31_557_600, Infinity],
];

/** Formats the distance between two instants, for example "5 minutes ago" or "in 2 days". */
export function formatRelativeTime(date: Date, now: number, locale: string): string {
  const seconds = (date.getTime() - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const absolute = Math.abs(seconds);
  const [unit, size] = UNITS.find(([, , threshold]) => absolute < threshold) ?? [
    'year',
    31_557_600,
  ];
  if (unit === 'second') {
    return rtf.format(0, 'second');
  }
  return rtf.format(Math.round(seconds / size), unit);
}

export interface RelativeTimeProps {
  /** The instant: a Date, epoch milliseconds or an ISO 8601 string. */
  value: Date | number | string;
  /** IANA time zone for the exact timestamp. Defaults to UIProvider's `timeZone`. */
  timeZone?: string;
  /** Format of the exact timestamp. Defaults to date, time and time zone name. */
  formatOptions?: Intl.DateTimeFormatOptions;
  className?: string;
}

/**
 * A relative time ("5 minutes ago") that keeps itself current from a shared clock (one timer for the whole page).
 * The exact timestamp, in the given time zone, shows in a tooltip and is read by screen readers.
 */
export function RelativeTime({ value, timeZone, formatOptions, className }: RelativeTimeProps) {
  const { locale } = useLocale();
  const defaultTimeZone = useTimeZone();
  const now = useNow();
  const date = useMemo(() => new Date(value), [value]);
  const zone = timeZone ?? defaultTimeZone;

  const exact = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
        ...formatOptions,
        timeZone: zone,
      }).format(date),
    [date, formatOptions, locale, zone],
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return (
    <Tooltip content={exact}>
      <Focusable>
        {/* Focusable so keyboard users can reveal the exact-timestamp tooltip (React Aria's Focusable pattern); screen
            readers get the exact time from the visually hidden text instead. */}
        <time
          dateTime={date.toISOString()}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see the comment above
          tabIndex={0}
          className={cn(
            'rounded-sm underline decoration-dotted underline-offset-2 outline-none focus-visible:focus-ring',
            className,
          )}
        >
          <span aria-hidden="true">{formatRelativeTime(date, now, locale)}</span>
          <span className="sr-only">{`${formatRelativeTime(date, now, locale)} (${exact})`}</span>
        </time>
      </Focusable>
    </Tooltip>
  );
}
