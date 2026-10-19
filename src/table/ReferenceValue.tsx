// ReferenceValue: a measured value with its unit and an abnormal flag worked out from reference and critical ranges
// (or given by the source). Flags show as letters with a tone, an icon when critical, and words for screen readers.

import { TriangleAlert } from 'lucide-react';
import type { Ref } from 'react';
import { useLocale } from 'react-aria-components';
import { cn } from '../utils/cn';
import { useTableMessages } from './messages';
import {
  flagName,
  flagSeverity,
  numericValue,
  rangeText,
  resolveFlag,
  valueFormatter,
  type CriticalRange,
  type FlagSeverity,
  type ObservationFlag,
  type ReferenceRange,
} from './reference';

export interface ReferenceValueProps {
  /** The value: a number, or text from the source ("<0.3", "Positive"). Empty shows a dash. */
  value: number | string | null | undefined;
  unit?: string;
  referenceRange?: ReferenceRange;
  criticalRange?: CriticalRange;
  /** An explicit flag from the source system (HL7-style); it takes priority over the ranges. */
  flag?: ObservationFlag;
  /** A note on the value, marked with an asterisk and read by screen readers. */
  note?: string;
  /** How numeric values are written, such as `{ maximumFractionDigits: 1 }`. */
  formatOptions?: Intl.NumberFormatOptions;
  /** Shows the reference range under the value. */
  hasRange?: boolean;
  /** Leaves the unit out (when a row or column header already says it). */
  isUnitHidden?: boolean;
  className?: string;
  ref?: Ref<HTMLSpanElement>;
}

/** The value's text colour by severity. */
export const valueToneClasses: Record<FlagSeverity, string> = {
  normal: 'text-fg',
  abnormal: 'font-semibold text-warning-fg',
  critical: 'font-semibold text-danger-fg',
};

const flagClasses: Record<FlagSeverity, string> = {
  normal: '',
  abnormal: 'border border-warning-border bg-warning-bg text-warning-fg',
  critical: 'bg-danger-solid text-danger-on-solid',
};

/**
 * A value with its unit and flag: out-of-range values show a flag letter (H, L, A) in the warning tone, critical
 * ones (HH, LL) a stronger tone and an icon, and screen readers hear the flag in words ("Critically low"), so it
 * never relies on colour. The source's own flag takes priority over the ranges. Use it on its own, in a DataTable
 * cell or a DescriptionList; Flowsheet uses it for every cell.
 *
 * CCUX provides display and accessibility only: validating units, ranges and flags stays the app's (and its data
 * source's) job.
 */
export function ReferenceValue({
  value,
  unit,
  referenceRange,
  criticalRange,
  flag: sourceFlag,
  note,
  formatOptions,
  hasRange = false,
  isUnitHidden = false,
  className,
  ref,
}: ReferenceValueProps) {
  const messages = useTableMessages();
  const { locale } = useLocale();
  const format = valueFormatter(locale, unit, formatOptions);
  const flag = resolveFlag({ value, referenceRange, criticalRange, flag: sourceFlag });
  const severity = flagSeverity(flag);
  const number = numericValue(value);
  const isEmpty = value === null || value === undefined || value === '';
  const text = isEmpty
    ? ''
    : number !== null && typeof value === 'number'
      ? format.number(number)
      : String(value);
  const range = hasRange ? rangeText(referenceRange, format.withUnit, messages) : undefined;
  const isFlagShown = flag !== undefined && flag !== 'N';

  return (
    <span ref={ref} className={cn('inline-flex min-w-0 flex-col gap-0.5', className)}>
      <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 tabular-nums">
        {isEmpty ? (
          <>
            <span aria-hidden="true" className="text-fg-muted">
              —
            </span>
            <span className="sr-only">{messages.notSet}</span>
          </>
        ) : (
          <span className={valueToneClasses[severity]}>{text}</span>
        )}
        {!isEmpty && unit !== undefined && !isUnitHidden && (
          <span className="text-xs text-fg-muted">{unit}</span>
        )}
        {isFlagShown && (
          <>
            <span
              aria-hidden="true"
              data-flag={flag}
              className={cn(
                'inline-flex h-4.5 items-center gap-0.5 rounded-sm px-1 text-[0.6875rem] leading-none font-bold',
                flagClasses[severity],
              )}
            >
              {severity === 'critical' && <TriangleAlert className="size-3" />}
              {flag}
            </span>
            <span className="sr-only">{flagName(flag, messages)}</span>
          </>
        )}
        {note !== undefined && (
          <>
            <span aria-hidden="true" className="text-fg-muted">
              *
            </span>
            <span className="sr-only">{messages.referenceNote({ note })}</span>
          </>
        )}
      </span>
      {range !== undefined && <span className="text-xs text-fg-muted">{range}</span>}
    </span>
  );
}
