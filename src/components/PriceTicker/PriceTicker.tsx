// PriceTicker: a live figure (a price, a viewer count, a probability) with its change against a reference, shown with
// ▲ or ▼ as well as tone, so direction never depends on colour. Figures are tabular, so updates don't shift the
// layout. A change briefly tints the value (the Web Animations API, so there's no timer; off with reduced motion).
// When `updatedAt` is older than `staleAfterMs` the value greys out and shows when it last updated. It isn't a live
// region by default; `announceThreshold` announces moves of at least that size, politely.
import { Clock } from 'lucide-react';
import { createContext, useContext, useEffect, useId, useRef, useState, type Ref } from 'react';
import { useLocale } from 'react-aria-components';
import { useEntryMessages, useTimeZone } from '../../provider/context';
import { trendStrings } from '../../provider/coreStrings';
import { cn } from '../../utils/cn';
import { dateTimeFormat, numberFormat } from '../../utils/intl';
import { toEpochMsOrUndefined } from '../../utils/time';
import { toneTextClasses } from '../../utils/toneClasses';
import { useDeadlineTimer, useNow } from '../../utils/timers';
import type { Size, Tone } from '../../utils/types';
import { useIsReducedMotion } from '../../utils/useMediaQuery';
import { LiveRegion } from '../LiveRegion/LiveRegion';
import { Sparkline } from '../Sparkline/Sparkline';
import { defaultPriceTickerMessages } from './messages';

// Its own defaults plus the core change words (up, down, unchanged).
const priceTickerStrings = { ...trendStrings, ...defaultPriceTickerMessages };

/** True inside TickerTape's repeated (hidden) copy, which must not announce anything. */
export const TickerCopyContext = createContext(false);

export interface PriceTickerProps {
  /** Names the figure, such as "Solar wind (km/s)". */
  label: string;
  /** The current value. A string that isn't a number is shown as it is, without a change. */
  value: number | string;
  /** The reference value for the change (previous close, or 24 h ago). */
  reference?: number | string;
  /** Number formatting for the value and the change. */
  formatOptions?: Intl.NumberFormatOptions;
  /** Formats the value as this currency (ISO 4217 code, such as `EUR`). */
  currency?: string;
  /** Shows the absolute and percent change against `reference` with an arrow and tone. Defaults to true. */
  hasChange?: boolean;
  /** Briefly tints the value up or down when it changes. Defaults to true; off with reduced motion. */
  hasFlash?: boolean;
  /** Up is bad (latency, an error rate, a comet's magnitude): rises take the danger tone and falls success. */
  isUpBad?: boolean;
  /** A small trend of recent values. */
  sparkline?: readonly number[];
  /** Defaults to `md`. */
  size?: Size;
  /** `tile` (the default) stacks label, value and change; `inline` keeps them on one line, as in a TickerTape. */
  variant?: 'tile' | 'inline';
  /** When the value last updated: a Date, epoch milliseconds or an ISO 8601 string. */
  updatedAt?: Date | number | string;
  /** After this long without an update (since `updatedAt`), the value is shown as stale. */
  staleAfterMs?: number;
  /**
   * Announces the value (politely) when it has moved at least this much, in the value's units, since the last
   * announcement. Leave it out (the default) for no announcements.
   */
  announceThreshold?: number;
  /** IANA time zone for the last-update time. Defaults to UIProvider's `timeZone`. */
  timeZone?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

type Direction = 'up' | 'down' | 'flat';

const glyphs: Record<Direction, string> = { up: '▲', down: '▼', flat: '' };

const toneClasses: Record<Tone, string> = { ...toneTextClasses, neutral: 'text-fg-muted' };

const valueSizeClasses: Record<'tile' | 'inline', Record<Size, string>> = {
  tile: { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' },
  inline: { sm: 'text-sm', md: 'text-base', lg: 'text-lg' },
};

const detailSizeClasses: Record<Size, string> = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };

/** The number in a value, or undefined for text that isn't one. */
function toNumber(value: number | string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  const trimmed = value.trim();
  const parsed = trimmed === '' ? NaN : Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function directionOf(delta: number): Direction {
  return delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
}

/** Whether the feed has stopped: from the shared clock, or exactly at the deadline when that comes first. */
function useIsStale(updatedMs: number | undefined, staleAfterMs: number | undefined): boolean {
  const now = useNow();
  const [expiredFor, setExpiredFor] = useState<number | undefined>(undefined);
  const timer = useDeadlineTimer(() => {
    setExpiredFor(updatedMs);
  });
  useEffect(() => {
    if (updatedMs === undefined || staleAfterMs === undefined) {
      timer.clear();
      return;
    }
    timer.start(Math.max(0, updatedMs + staleAfterMs - Date.now()));
  }, [updatedMs, staleAfterMs, timer]);
  if (updatedMs === undefined || staleAfterMs === undefined) {
    return false;
  }
  return now - updatedMs >= staleAfterMs || expiredFor === updatedMs;
}

/**
 * A live value with its change (▲/▼ and tone), a brief tint when it changes, an optional sparkline and a stale state.
 * Not a live region unless `announceThreshold` is set.
 */
export function PriceTicker({
  label,
  value,
  reference,
  formatOptions: format,
  currency,
  hasChange = true,
  hasFlash = true,
  isUpBad = false,
  sparkline,
  size = 'md',
  variant = 'tile',
  updatedAt,
  staleAfterMs,
  announceThreshold,
  timeZone,
  className,
  ref,
}: PriceTickerProps) {
  const messages = useEntryMessages(priceTickerStrings);
  const { locale } = useLocale();
  const defaultTimeZone = useTimeZone();
  const labelId = useId();
  const isCopy = useContext(TickerCopyContext);
  const isReducedMotion = useIsReducedMotion();

  const numeric = toNumber(value);
  const referenceValue = toNumber(reference);
  const updatedMs = toEpochMsOrUndefined(updatedAt);
  const isStale = useIsStale(updatedMs, staleAfterMs);

  const options: Intl.NumberFormatOptions =
    currency === undefined ? { ...format } : { style: 'currency', currency, ...format };
  const valueText =
    numeric === undefined ? String(value) : numberFormat(locale, options).format(numeric);

  // The change against the reference, in words for screen readers and with a glyph on screen.
  const delta =
    numeric !== undefined && referenceValue !== undefined ? numeric - referenceValue : undefined;
  const direction = delta === undefined ? 'flat' : directionOf(delta);
  const changeTone: Tone =
    direction === 'flat' ? 'neutral' : (direction === 'up') !== isUpBad ? 'success' : 'danger';
  let changeText = '';
  if (delta !== undefined && referenceValue !== undefined) {
    const amount = numberFormat(locale, { ...options, signDisplay: 'never' }).format(delta);
    changeText =
      referenceValue === 0
        ? amount
        : messages.priceTickerChange({
            amount,
            percent: numberFormat(locale, {
              style: 'percent',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
              signDisplay: 'never',
            }).format(delta / Math.abs(referenceValue)),
          });
  }
  const changeWords =
    changeText === ''
      ? ''
      : { up: messages.deltaUp, down: messages.deltaDown, flat: messages.deltaFlat }[direction]({
          value: changeText,
        });

  // Announce moves of at least `announceThreshold` since the last announcement ("adjust state while rendering").
  const [announced, setAnnounced] = useState<{ value: number | undefined; text: string }>({
    value: numeric,
    text: '',
  });
  if (
    announceThreshold !== undefined &&
    !isCopy &&
    numeric !== undefined &&
    numeric !== announced.value
  ) {
    if (announced.value === undefined) {
      setAnnounced({ value: numeric, text: '' });
    } else if (Math.abs(numeric - announced.value) >= announceThreshold) {
      setAnnounced({
        value: numeric,
        text: messages.priceTickerAnnouncement({
          label,
          value: valueText,
          change: hasChange ? changeWords : '',
        }),
      });
    }
  }

  // Tint the value as it changes: up or down against the previous value, not the reference.
  const upFlashRef = useRef<HTMLSpanElement>(null);
  const downFlashRef = useRef<HTMLSpanElement>(null);
  const previousRef = useRef(numeric);
  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = numeric;
    if (
      !hasFlash ||
      isReducedMotion ||
      previous === undefined ||
      numeric === undefined ||
      previous === numeric
    ) {
      return;
    }
    const element = (numeric > previous ? upFlashRef : downFlashRef).current;
    element?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' });
  }, [numeric, hasFlash, isReducedMotion]);

  const flashUpClass = isUpBad ? 'bg-danger-bg' : 'bg-success-bg';
  const flashDownClass = isUpBad ? 'bg-success-bg' : 'bg-danger-bg';
  const isInline = variant === 'inline';

  const valueNode = (
    <span
      data-value=""
      className={cn(
        'relative isolate font-semibold whitespace-nowrap tabular-nums',
        valueSizeClasses[variant][size],
        isStale ? 'text-fg-muted' : 'text-fg',
      )}
    >
      <span
        ref={upFlashRef}
        aria-hidden="true"
        data-flash="up"
        className={cn('absolute -inset-x-1 inset-y-0 -z-10 rounded-sm opacity-0', flashUpClass)}
      />
      <span
        ref={downFlashRef}
        aria-hidden="true"
        data-flash="down"
        className={cn('absolute -inset-x-1 inset-y-0 -z-10 rounded-sm opacity-0', flashDownClass)}
      />
      {valueText}
    </span>
  );

  const changeNode = hasChange && changeText !== '' && (
    <span
      data-change={direction}
      className={cn(
        'inline-flex items-baseline gap-1 font-medium whitespace-nowrap tabular-nums',
        isInline ? valueSizeClasses.inline.sm : detailSizeClasses[size],
        isStale ? 'text-fg-muted' : toneClasses[changeTone],
      )}
    >
      <span aria-hidden="true">
        {glyphs[direction] === '' ? changeText : `${glyphs[direction]} ${changeText}`}
      </span>
      <span className="sr-only">{changeWords}</span>
    </span>
  );

  const updatedText =
    updatedMs === undefined
      ? ''
      : messages.priceTickerUpdatedAt({
          time: dateTimeFormat(locale, {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            timeZone: timeZone ?? defaultTimeZone,
          }).format(updatedMs),
        });
  const staleNode = isStale && (
    <span
      data-stale-note=""
      className="inline-flex items-center gap-1 text-xs whitespace-nowrap text-fg-muted"
    >
      <Clock aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="font-medium">{messages.priceTickerStale}</span>
      {updatedText !== '' && (
        <span className={cn(isInline && 'sr-only')}>
          <span aria-hidden="true">· </span>
          {updatedText}
        </span>
      )}
    </span>
  );

  const sparklineNode = sparkline && sparkline.length > 0 && (
    <Sparkline
      data={sparkline}
      tone={isStale ? 'neutral' : hasChange && delta !== undefined ? changeTone : 'accent'}
      height={isInline ? 18 : 28}
      formatOptions={options}
      className={cn(isInline && 'w-14 shrink-0 self-center')}
    />
  );

  const liveRegion = announceThreshold !== undefined && !isCopy && (
    <LiveRegion isAtomic>{announced.text}</LiveRegion>
  );

  if (isInline) {
    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={labelId}
        data-stale={isStale || undefined}
        className={cn('inline-flex max-w-full items-baseline gap-2 text-fg', className)}
      >
        <span id={labelId} className="truncate text-sm text-fg-muted">
          {label}
        </span>
        {valueNode}
        {changeNode}
        {sparklineNode}
        {staleNode}
        {liveRegion}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={labelId}
      data-stale={isStale || undefined}
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-card border border-border bg-surface-2 p-4 text-fg',
        className,
      )}
    >
      <span id={labelId} className={cn('truncate text-fg-muted', detailSizeClasses[size])}>
        {label}
      </span>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {valueNode}
        {changeNode}
      </div>
      {sparklineNode}
      {staleNode}
      {liveRegion}
    </div>
  );
}
