// ProbabilityBar: a prediction market's split between YES and NO, as a two-part bar with both percentages written
// out, so the split never depends on colour alone.

import type { Ref } from 'react';
import { useLocale } from 'react-aria-components';
import { cn } from '../utils/cn';
import { numberFormat } from '../utils/intl';
import { clamp } from '../utils/math';
import { useFinanceMessages } from './messages';

export interface ProbabilityBarProps {
  /** The YES probability, from 0 to 1 (values outside are clamped). NO is the rest. */
  yes: number;
  /** The two sides' labels. Defaults to the `yes` and `no` messages. */
  labels?: { yes: string; no: string };
  /** `sm` puts the labels beside a thin bar, on one line; `md` (the default) puts them above it. */
  size?: 'sm' | 'md';
  /** Names the bar as a group, such as the market's question. */
  'aria-label'?: string;
  className?: string;
  /** The root element. */
  ref?: Ref<HTMLDivElement>;
}

const sizeClasses = {
  sm: { root: 'flex-row items-center gap-2 text-xs', bar: 'h-1.5 min-w-8 flex-1' },
  md: { root: 'flex-col gap-1 text-sm', bar: 'h-2 w-full' },
} as const;

/**
 * A YES/NO split bar with both percentages labelled ("Yes 62%", "No 38%"). The percentages are whole numbers that
 * add up to 100.
 */
export function ProbabilityBar({
  yes,
  labels,
  size = 'md',
  'aria-label': ariaLabel,
  className,
  ref,
}: ProbabilityBarProps) {
  const messages = useFinanceMessages();
  const { locale } = useLocale();
  const clamped = Number.isFinite(yes) ? clamp(yes, 0, 1) : 0;
  const yesPercent = Math.round(clamped * 100);
  const noPercent = 100 - yesPercent;
  const percent = numberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
  const yesText = messages.probabilityValue({
    label: labels?.yes ?? messages.yes,
    percent: percent.format(yesPercent / 100),
  });
  const noText = messages.probabilityValue({
    label: labels?.no ?? messages.no,
    percent: percent.format(noPercent / 100),
  });
  const yesLabel = <span className="shrink-0 font-medium text-success-fg">{yesText}</span>;
  const noLabel = <span className="shrink-0 font-medium text-danger-fg">{noText}</span>;
  const bar = (
    <div
      aria-hidden="true"
      className={cn('flex gap-0.5 overflow-hidden rounded-full', sizeClasses[size].bar)}
    >
      {yesPercent > 0 && (
        <span
          className="h-full rounded-s-full bg-success-solid"
          // Each part's width is its share (dynamic geometry).
          // eslint-disable-next-line no-restricted-syntax -- see above.
          style={{ width: `${String(yesPercent)}%` }}
        />
      )}
      {noPercent > 0 && <span className="h-full flex-1 rounded-e-full bg-danger-solid" />}
    </div>
  );

  return (
    <div
      ref={ref}
      role={ariaLabel === undefined ? undefined : 'group'}
      aria-label={ariaLabel}
      data-size={size}
      className={cn('flex min-w-0 tabular-nums', sizeClasses[size].root, className)}
    >
      {size === 'sm' ? (
        <>
          {yesLabel}
          {bar}
          {noLabel}
        </>
      ) : (
        <>
          <div className="flex justify-between gap-2">
            {yesLabel}
            {noLabel}
          </div>
          {bar}
        </>
      )}
    </div>
  );
}
