// WorldClock: the current time in several IANA time zones, digital or analog, as a row, a grid or a compact list.
// Every clock on the page reads one shared clock that ticks on the second (or the minute when seconds are hidden) and
// stops while the page is hidden. Dates, offsets and differences are worked out once a minute; a tick only formats the
// time or turns the analog hands (CSS transforms). It's a labelled group, never a live region, so screen readers
// aren't read every tick; each clock is named in full, to the minute.

import { Moon, Sun } from 'lucide-react';
import { useMemo, type Ref } from 'react';
import { useLocale } from 'react-aria-components';
import { useEntryMessages, useTimeZone } from '../../provider/context';
import { cn } from '../../utils/cn';
import { toEpochMs } from '../../utils/time';
import { useWallClock } from '../../utils/timers';
import type { Size } from '../../utils/types';
import type { GanttWorkingHours } from '../GanttChart/scale';
import { Grid, Inline, Stack, type MinItemWidth } from '../Layout/Layout';
import { MINUTE_MS } from '../ScheduleTimeline/zone';
import { StatusDot } from '../StatusDot/StatusDot';
import { clockInfos, formatClockTime, type ClockInfo, type WorldClockItem } from './clockInfo';
import { defaultWorldClockMessages } from './messages';

export type WorldClockLayout = 'row' | 'grid' | 'list';

export interface WorldClockProps {
  /** The clocks, in order. */
  items: readonly WorldClockItem[];
  /** `digital` (the default) shows the time as text; `analog` as a clock face. */
  variant?: 'digital' | 'analog';
  /** 12- or 24-hour times. Defaults to the locale's. */
  hourCycle?: 12 | 24;
  /** The smallest unit shown. Defaults to `minute`; `second` ticks every second. */
  granularity?: 'minute' | 'second';
  /** `grid` (the default) fits as many clocks as the width allows; `row` sets them side by side, wrapping; `list` is
   *  a compact list, one clock per line. */
  layout?: WorldClockLayout;
  /** Defaults to `md`. */
  size?: Size;
  /** Shows each clock's weekday and date. Defaults to true. */
  hasDate?: boolean;
  /** Shows each clock's offset from UTC ("GMT+1"). Defaults to false. */
  hasOffset?: boolean;
  /** Shows how far each clock is from the local zone (UIProvider's `timeZone` or the browser's): "+5h · Tomorrow".
   *  Defaults to true. */
  hasDifference?: boolean;
  /** Shows whether it's day (6 AM to 6 PM) or night there. Defaults to true. */
  hasDayNight?: boolean;
  /** The working hours; with them, each clock shows whether it's within them there on a working day. */
  workingHours?: GanttWorkingHours;
  /** The working days of the week (0 = Sunday), with `workingHours`. Defaults to Monday to Friday. */
  workingDays?: readonly number[];
  /** The current instant, instead of the shared clock (for tests, stories and replays). */
  now?: Date | number;
  /** Names the group. Defaults to "World clock". */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const WEEKDAYS = [1, 2, 3, 4, 5];

const digitalSizeClasses: Record<WorldClockLayout, Record<Size, string>> = {
  row: { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' },
  grid: { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' },
  list: { sm: 'text-sm', md: 'text-base', lg: 'text-lg' },
};

const faceSizeClasses: Record<WorldClockLayout, Record<Size, string>> = {
  row: { sm: 'size-16', md: 'size-24', lg: 'size-32' },
  grid: { sm: 'size-16', md: 'size-24', lg: 'size-32' },
  list: { sm: 'size-8', md: 'size-10', lg: 'size-12' },
};

const gridItemWidths: Record<Size, MinItemWidth> = { sm: '8rem', md: '12rem', lg: '16rem' };

// The face's hour marks never change, so they're built once.
const HOUR_MARKS = Array.from({ length: 12 }, (_, hour) => (
  <line
    key={hour}
    x1="50"
    y1="7"
    x2="50"
    y2={hour % 3 === 0 ? 15 : 11}
    transform={`rotate(${String(hour * 30)} 50 50)`}
    strokeWidth={hour % 3 === 0 ? 3 : 1.5}
  />
));

interface HandProps {
  degrees: number;
  length: number;
  width: number;
  className?: string;
}

/** A hand from the centre, turned by a CSS transform so a tick changes one style and nothing else. */
function Hand({ degrees, length, width, className }: HandProps) {
  return (
    <line
      x1="50"
      y1="50"
      x2="50"
      y2={50 - length}
      strokeWidth={width}
      strokeLinecap="round"
      className={cn('[transform-origin:50px_50px]', className)}
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the hand's angle, changed on every tick.
      style={{ transform: `rotate(${String(degrees)}deg)` }}
    />
  );
}

interface FaceProps {
  info: ClockInfo;
  second: number;
  hasSeconds: boolean;
  className: string;
}

// Day faces are light and night faces dark, in every theme: the neutral solid colour is dark in the light themes and
// light in the dark one.
const faceClasses = {
  day: 'fill-surface-1 text-fg dark:fill-neutral-solid dark:text-neutral-on-solid',
  night: 'fill-neutral-solid text-neutral-on-solid dark:fill-surface-1 dark:text-fg',
};

/** An analog face: one SVG whose hands turn with CSS transforms. An image named to the minute. */
function AnalogFace({ info, second, hasSeconds, className }: FaceProps) {
  const { hour = 0, minute = 0 } = info.parts ?? {};
  return (
    <svg
      role="img"
      aria-label={info.name}
      viewBox="0 0 100 100"
      className={cn(
        'shrink-0 stroke-current',
        info.isDay ? faceClasses.day : faceClasses.night,
        className,
      )}
    >
      <circle cx="50" cy="50" r="47" strokeWidth="2" className="stroke-border" />
      <g className="opacity-60">{HOUR_MARKS}</g>
      <Hand degrees={((hour % 12) + minute / 60) * 30} length={24} width={5} />
      <Hand degrees={(minute + (hasSeconds ? second / 60 : 0)) * 6} length={36} width={3.5} />
      {hasSeconds && (
        <Hand degrees={second * 6} length={40} width={1.5} className="stroke-danger-solid" />
      )}
      <circle cx="50" cy="50" r="3.5" className="fill-current stroke-none" />
    </svg>
  );
}

interface DigitalTimeProps {
  ms: number;
  info: ClockInfo;
  locale: string;
  hourCycle?: 12 | 24;
  hasSeconds: boolean;
  className: string;
}

/** The time as text, with the day period ("PM") smaller wherever the locale puts it. */
function DigitalTime({ ms, info, locale, hourCycle, hasSeconds, className }: DigitalTimeProps) {
  return (
    <span aria-hidden="true" className={cn('font-semibold tabular-nums text-fg', className)}>
      {formatClockTime(ms, info.timeZone, locale, hourCycle, hasSeconds).map((part, index) =>
        part.type === 'dayPeriod' ? (
          <span key={index} className="text-[0.6em] font-medium text-fg-muted">
            {part.value}
          </span>
        ) : (
          part.value
        ),
      )}
    </span>
  );
}

/** The current time in several time zones, digital or analog, from a list of IANA zones. */
export function WorldClock({
  items,
  variant = 'digital',
  hourCycle,
  granularity = 'minute',
  layout = 'grid',
  size = 'md',
  hasDate = true,
  hasOffset = false,
  hasDifference = true,
  hasDayNight = true,
  workingHours,
  workingDays = WEEKDAYS,
  now,
  'aria-label': ariaLabel,
  className,
  ref,
}: WorldClockProps) {
  const messages = useEntryMessages(defaultWorldClockMessages);
  const { locale } = useLocale();
  const localZone = useTimeZone();
  const hasSeconds = granularity === 'second';
  const clockNow = useWallClock(granularity, now === undefined);
  const ms = now === undefined ? clockNow : toEpochMs(now);
  const minuteMs = ms - (((ms % MINUTE_MS) + MINUTE_MS) % MINUTE_MS);
  const second = Math.floor((ms - minuteMs) / 1000);

  // Everything but the time itself changes at most once a minute. Working days and hours are compared by value, so
  // arrays and objects written inline don't redo it every render.
  const workingDayKey = workingDays.join();
  const hoursStart = workingHours?.start;
  const hoursEnd = workingHours?.end;
  const infos = useMemo(
    () =>
      clockInfos(items, minuteMs, {
        locale,
        localZone,
        hourCycle,
        hasDate,
        hasOffset,
        hasDifference,
        hasDayNight,
        workingHours:
          hoursStart === undefined || hoursEnd === undefined
            ? undefined
            : { start: hoursStart, end: hoursEnd },
        workingDays: workingDayKey === '' ? [] : workingDayKey.split(',').map(Number),
        messages,
      }),
    [
      items,
      minuteMs,
      locale,
      localZone,
      hourCycle,
      hasDate,
      hasOffset,
      hasDifference,
      hasDayNight,
      hoursStart,
      hoursEnd,
      workingDayKey,
      messages,
    ],
  );

  const isList = layout === 'list';
  const clocks = infos.map((info) => {
    const details = (
      <>
        {info.error === undefined ? (
          <>
            {info.date !== undefined && <span>{info.date}</span>}
            {info.offset !== undefined && <span>{info.offset}</span>}
            {info.difference !== undefined && <span>{info.difference}</span>}
          </>
        ) : (
          <span className="text-danger-fg">{info.error}</span>
        )}
      </>
    );
    const labelRow = (
      <span
        aria-hidden="true"
        className={cn(
          'flex min-w-0 max-w-full items-center gap-1.5',
          variant === 'analog' && !isList && 'justify-center',
        )}
      >
        {hasDayNight && info.error === undefined && (
          <span className="shrink-0 text-fg-muted">
            {info.isDay ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </span>
        )}
        <span className="truncate font-medium text-fg">{info.label}</span>
      </span>
    );
    const status = info.isWorking !== undefined && (
      <StatusDot
        size="sm"
        tone={info.isWorking ? 'success' : 'neutral'}
        label={info.isWorking ? messages.worldClockWorking : messages.worldClockNotWorking}
      />
    );
    const face =
      info.error !== undefined ? null : variant === 'analog' ? (
        <AnalogFace
          info={info}
          second={second}
          hasSeconds={hasSeconds}
          className={faceSizeClasses[layout][size]}
        />
      ) : (
        <DigitalTime
          ms={ms}
          info={info}
          locale={locale}
          hourCycle={hourCycle}
          hasSeconds={hasSeconds}
          className={digitalSizeClasses[layout][size]}
        />
      );
    // The analog face is the named image; otherwise the name is read from hidden text and the visible parts are
    // hidden from screen readers, so each clock is read once, in full.
    const name =
      variant === 'analog' && face !== null ? null : <span className="sr-only">{info.name}</span>;

    return isList ? (
      <div key={info.id} className="flex min-w-0 items-center gap-3 py-2">
        {name}
        <div aria-hidden="true" className="flex min-w-0 flex-1 flex-col gap-0.5">
          {labelRow}
          <span className="flex flex-wrap gap-x-2 text-xs text-fg-muted">{details}</span>
          {status}
        </div>
        {face}
      </div>
    ) : (
      <div
        key={info.id}
        className={cn(
          'flex h-full min-w-0 flex-col gap-1 rounded-card border border-border bg-surface-1 p-3',
          variant === 'analog' && 'items-center text-center',
          layout === 'row' && 'min-w-32',
        )}
      >
        {name}
        {labelRow}
        {face}
        <div
          aria-hidden="true"
          className={cn(
            'flex flex-wrap gap-x-2 text-xs text-fg-muted',
            variant === 'analog' && 'justify-center',
          )}
        >
          {details}
        </div>
        {status && <div aria-hidden="true">{status}</div>}
      </div>
    );
  });

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel ?? messages.worldClockLabel}
      className={cn('min-w-0', className)}
    >
      {layout === 'grid' ? (
        <Grid as="ul" gap="sm" minItemWidth={gridItemWidths[size]}>
          {clocks}
        </Grid>
      ) : layout === 'row' ? (
        <Inline as="ul" gap="sm" align="stretch">
          {clocks}
        </Inline>
      ) : (
        <Stack as="ul" gap="none" className="divide-y divide-border">
          {clocks}
        </Stack>
      )}
    </div>
  );
}
