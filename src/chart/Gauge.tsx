import type { Ref } from 'react';
import { Label, Meter, useLocale } from 'react-aria-components';
import { StatusDot } from '../components/StatusDot/StatusDot';

import { cn } from '../utils/cn';
import type { Tone } from '../utils/types';
import { clamp } from '../utils/math';
import { numberFormat } from '../utils/intl';
import { useChartMessages } from './messages';

/** Where a gauge turns to warning and danger. */
export interface GaugeThresholds {
  warning?: number;
  danger?: number;
}

export interface GaugeProps {
  /** Names the gauge (visible). */
  label: string;
  value: number;
  /** Defaults to 0. */
  minValue?: number;
  maxValue: number;
  thresholds?: GaugeThresholds;
  /** `high` (default): values at or above a threshold are bad. `low`: values at or below are (a battery, say). */
  badWhen?: 'high' | 'low';
  /** `arc` (default) or `bar`. */
  variant?: 'arc' | 'bar';
  /** `Intl.NumberFormat` options for the value. */
  formatOptions?: Intl.NumberFormatOptions;
  /** The value's unit ("kW"). */
  unit?: string;
  /** Words for each status on this gauge. Defaults to the `gaugeNormal`, `gaugeWarning` and `gaugeDanger` messages. */
  statusLabels?: Partial<Record<GaugeStatus, string>>;
  /** Shows the status dot and word. Defaults to true; without, the meter's text is just the value. */
  hasStatus?: boolean;
  /**
   * Replaces the status worked out from the thresholds, fill colour included, for example
   * `{ tone: 'neutral', label: 'Not started' }`.
   */
  status?: { tone: Tone; label: string };
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** A gauge's status by its thresholds. */
export type GaugeStatus = 'normal' | 'warning' | 'danger';
type Status = GaugeStatus;

const statusTone: Record<Status, Tone> = {
  normal: 'success',
  warning: 'warning',
  danger: 'danger',
};
const fillClasses: Record<Tone, string> = {
  neutral: 'stroke-neutral-solid bg-neutral-solid',
  accent: 'stroke-accent-solid bg-accent-solid',
  success: 'stroke-success-solid bg-success-solid',
  warning: 'stroke-warning-solid bg-warning-solid',
  danger: 'stroke-danger-solid bg-danger-solid',
};

function statusOf(value: number, thresholds: GaugeThresholds, badWhen: 'high' | 'low'): Status {
  const past = (threshold: number | undefined) =>
    threshold !== undefined && (badWhen === 'high' ? value >= threshold : value <= threshold);
  return past(thresholds.danger) ? 'danger' : past(thresholds.warning) ? 'warning' : 'normal';
}

// The arc runs over the top half of a circle, from the left (minimum) to the right (maximum).
const RADIUS = 40;
const CENTRE = { x: 50, y: 50 };

function pointAt(fraction: number) {
  const angle = Math.PI * (1 - fraction);
  return { x: CENTRE.x + RADIUS * Math.cos(angle), y: CENTRE.y - RADIUS * Math.sin(angle) };
}

function arcPath(from: number, to: number): string {
  const start = pointAt(from);
  const end = pointAt(to);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${String(RADIUS)} ${String(RADIUS)} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

/**
 * A value against a maximum, with warning and danger thresholds, as an arc or a bar (MeterBar). It's a `meter` whose
 * text gives the value and its status; the status also shows as a shaped dot and a word, not colour alone.
 */
export function Gauge({
  label,
  value,
  minValue = 0,
  maxValue,
  thresholds = {},
  badWhen = 'high',
  variant = 'arc',
  formatOptions,
  unit,
  statusLabels,
  hasStatus = true,
  status: statusOverride,
  className,
  ref,
}: GaugeProps) {
  const messages = useChartMessages();
  const { locale } = useLocale();
  const status = statusOf(value, thresholds, badWhen);
  const tone = statusOverride?.tone ?? statusTone[status];
  const statusText =
    statusOverride?.label ??
    statusLabels?.[status] ??
    {
      normal: messages.gaugeNormal,
      warning: messages.gaugeWarning,
      danger: messages.gaugeDanger,
    }[status];
  const number = numberFormat(locale, formatOptions).format(value);
  const valueText = unit === undefined ? number : `${number} ${unit}`;
  const span = maxValue - minValue;
  const fraction = (amount: number) => (span <= 0 ? 0 : clamp((amount - minValue) / span, 0, 1));
  const marks = [thresholds.warning, thresholds.danger].filter(
    (mark): mark is number => mark !== undefined,
  );
  return (
    <Meter
      ref={ref}
      value={value}
      minValue={minValue}
      maxValue={maxValue}
      valueLabel={
        hasStatus ? messages.gaugeValue({ value: valueText, status: statusText }) : valueText
      }
      className={cn(
        'flex min-w-0 flex-col gap-2 text-sm text-fg',
        variant === 'arc' && 'items-center',
        className,
      )}
    >
      {({ percentage }) => {
        const filled = percentage / 100;
        return (
          <>
            <Label className="font-medium">{label}</Label>
            {variant === 'arc' ? (
              <svg viewBox="0 0 100 56" aria-hidden="true" className="w-full max-w-56">
                <path
                  d={arcPath(0, 1)}
                  className="fill-none stroke-surface-3"
                  strokeWidth={10}
                  strokeLinecap="round"
                />
                {filled > 0 && (
                  <path
                    d={arcPath(0, filled)}
                    className={cn('fill-none', fillClasses[tone])}
                    strokeWidth={10}
                    strokeLinecap="round"
                  />
                )}
                {marks.map((mark) => {
                  const inner = pointAt(fraction(mark));
                  const outerX = CENTRE.x + (inner.x - CENTRE.x) * 1.22;
                  const outerY = CENTRE.y + (inner.y - CENTRE.y) * 1.22;
                  const innerX = CENTRE.x + (inner.x - CENTRE.x) * 0.78;
                  const innerY = CENTRE.y + (inner.y - CENTRE.y) * 0.78;
                  return (
                    <line
                      key={mark}
                      x1={innerX}
                      y1={innerY}
                      x2={outerX}
                      y2={outerY}
                      className="stroke-fg"
                      strokeWidth={1.5}
                    />
                  );
                })}
              </svg>
            ) : (
              <div aria-hidden="true" className="relative h-3 w-full rounded-full bg-surface-3">
                <div
                  className={cn('h-full rounded-full', fillClasses[tone])}
                  // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the filled share.
                  style={{ width: `${String(percentage)}%` }}
                />
                {marks.map((mark) => (
                  <span
                    key={mark}
                    className="absolute -inset-y-1 w-0.5 bg-fg"
                    // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the threshold's position.
                    style={{ insetInlineStart: `${String(fraction(mark) * 100)}%` }}
                  />
                ))}
              </div>
            )}
            <div
              className={cn(
                'flex items-center gap-2',
                variant === 'arc' ? '-mt-6' : 'justify-between',
              )}
            >
              <span className="text-lg font-semibold tabular-nums">{valueText}</span>
              {hasStatus && <StatusDot tone={tone} label={statusText} size="sm" />}
            </div>
          </>
        );
      }}
    </Meter>
  );
}

/** A Gauge drawn as a horizontal bar. */
export function MeterBar(props: Omit<GaugeProps, 'variant'>) {
  return <Gauge {...props} variant="bar" />;
}
