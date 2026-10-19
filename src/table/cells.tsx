// Cell helpers for common column types.

import { Check, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLocale } from 'react-aria-components';
import { Badge } from '../components/Badge/Badge';
import { RelativeTime } from '../components/RelativeTime/RelativeTime';
import { StatusDot } from '../components/StatusDot/StatusDot';
import { Tooltip } from '../components/Tooltip/Tooltip';
import { cn } from '../utils/cn';
import { numberFormat } from '../utils/intl';
import type { Tone } from '../utils/types';
import { useIsClamped } from '../utils/useIsClamped';
import { RowLink } from './shared';
import { useTableMessages } from './messages';

const clampClasses = { 1: 'line-clamp-1', 2: 'line-clamp-2', 3: 'line-clamp-3' } as const;

export interface TwoLineCellProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /**
   * Makes the title the row's link (use it in the row header column, in place of the table's `getRowHref`): the
   * link's name is the title alone, and the clamp tooltip opens when it takes focus.
   */
  href?: string;
  /** Lines before the title is clamped with an ellipsis. Defaults to 1. */
  titleLines?: 1 | 2 | 3;
  /** Lines before the subtitle is clamped. Defaults to 1. */
  subtitleLines?: 1 | 2 | 3;
  /** Plain text for the tooltip shown while the title is clamped. Defaults to the title when it's a string. */
  titleText?: string;
}

/**
 * A title (optionally the row's link) over a muted subtitle, each clamped to a number of lines. The full text stays
 * in the page (screen readers read it all, and it's the link's name); while the title is clamped, a tooltip shows it
 * on hover and keyboard focus. Put it in the table's flexible column so it clamps instead of widening the table.
 */
export function TwoLineCell({
  title,
  subtitle,
  href,
  titleLines = 1,
  subtitleLines = 1,
  titleText,
}: TwoLineCellProps) {
  const [titleRef, isClamped] = useIsClamped();
  const fullText = titleText ?? (typeof title === 'string' ? title : undefined);
  const hasTooltip = isClamped && fullText !== undefined;
  const titleSpan = (
    <span
      ref={titleRef}
      title={href === undefined && hasTooltip ? fullText : undefined}
      className={cn('min-w-0 break-words', clampClasses[titleLines])}
    >
      {title}
    </span>
  );
  const link =
    href === undefined ? (
      titleSpan
    ) : (
      <RowLink href={href} className="block min-w-0">
        {titleSpan}
      </RowLink>
    );
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      {href !== undefined && hasTooltip ? (
        <Tooltip content={fullText} placement="top">
          {link}
        </Tooltip>
      ) : (
        link
      )}
      {subtitle !== undefined && (
        <span
          className={cn('min-w-0 break-words text-xs text-fg-muted', clampClasses[subtitleLines])}
        >
          {subtitle}
        </span>
      )}
    </span>
  );
}

/** A status: a coloured dot and its label (the label carries the meaning, not only the colour). */
export function StatusCell({ tone, label }: { tone: Tone; label: ReactNode }) {
  return <StatusDot tone={tone} label={label} />;
}

/**
 * A money amount in `currency`, with tabular figures (align the column `end`). The value is a decimal string or a
 * number in major units, or integer minor units with `isMinorUnits`.
 */
export function MoneyCell({
  value,
  currency,
  isMinorUnits = false,
  minorUnits,
}: {
  value: string | number | null | undefined;
  currency: string;
  isMinorUnits?: boolean;
  /** Digits after the decimal point. Defaults to the currency's standard. */
  minorUnits?: number;
}) {
  const { locale } = useLocale();
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const format = numberFormat(locale, {
    style: 'currency',
    currency,
    ...(minorUnits === undefined
      ? {}
      : { minimumFractionDigits: minorUnits, maximumFractionDigits: minorUnits }),
  });
  const digits = minorUnits ?? format.resolvedOptions().maximumFractionDigits ?? 2;
  const amount = isMinorUnits ? Number(value) / 10 ** digits : Number(value);
  return (
    <span className="tabular-nums">{Number.isFinite(amount) ? format.format(amount) : ''}</span>
  );
}

/** A number with an optional unit (align the column `end`). */
export function NumberCell({
  value,
  unit,
  formatOptions,
}: {
  value: number | null | undefined;
  /** Shown after the number, such as "kWh". */
  unit?: string;
  formatOptions?: Intl.NumberFormatOptions;
}) {
  const { locale } = useLocale();
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  const text = numberFormat(locale, formatOptions).format(value);
  return <span className="tabular-nums">{unit === undefined ? text : `${text} ${unit}`}</span>;
}

/** A time relative to now ("5 minutes ago"), with the exact time on hover or focus. */
export function RelativeTimeCell({
  value,
  timeZone,
}: {
  value: Date | number | string | null | undefined;
  timeZone?: string;
}) {
  return value === null || value === undefined ? null : (
    <RelativeTime value={value} timeZone={timeZone} />
  );
}

/** Tags as badges, with "+N" for the rest beyond `max`. */
export function TagsCell({
  tags,
  max = 3,
  tone = 'neutral',
}: {
  tags: readonly string[];
  max?: number;
  tone?: Tone;
}) {
  const shown = tags.slice(0, max);
  const rest = tags.length - shown.length;
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((tag) => (
        <Badge key={tag} tone={tone} size="sm">
          {tag}
        </Badge>
      ))}
      {rest > 0 && (
        <Badge tone="neutral" variant="outline" size="sm">
          {`+${String(rest)}`}
        </Badge>
      )}
    </span>
  );
}

/** Yes or no, as an icon and text. */
export function BooleanCell({
  isTrue,
  trueLabel,
  falseLabel,
}: {
  isTrue: boolean | null | undefined;
  trueLabel?: string;
  falseLabel?: string;
}) {
  const messages = useTableMessages();
  if (isTrue === null || isTrue === undefined) {
    return null;
  }
  const Icon = isTrue ? Check : Minus;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon
        aria-hidden="true"
        className={isTrue ? 'size-4 text-success-fg' : 'size-4 text-fg-muted'}
      />
      {isTrue ? (trueLabel ?? messages.yes) : (falseLabel ?? messages.no)}
    </span>
  );
}
