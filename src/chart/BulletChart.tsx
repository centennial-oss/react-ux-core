// BulletChart: a compact bar for one measure against a target, over qualitative ranges (poor, satisfactory, good), as
// Stephen Few designed it for dashboards. The measure is a dark bar, the target a perpendicular line, and the ranges
// grey bands from darkest (the first) to lightest. It's a `meter` whose text gives the value, the target and the
// range it's in; the range's name also shows beside the value, so the bands' shades aren't the only signal. Stack
// several for a KPI list.

import type { Ref } from 'react';
import { Label, Meter, useLocale } from 'react-aria-components';
import { cn } from '../utils/cn';
import { clamp } from '../utils/math';
import { numberFormat } from '../utils/intl';
import { useChartMessages } from './messages';
import { bulletStrings } from './plotStrings';

/** A qualitative range, from the previous range's end (or `minValue`) to `to`. */
export interface BulletRange {
  to: number;
  /** Names the range ("Satisfactory"); shown beside the value when the value is in it. */
  label: string;
}

export interface BulletChartProps {
  /** Names the chart (visible). */
  label: string;
  value: number;
  /** The target, drawn as a line across the bar. */
  target?: number;
  /** Qualitative ranges in ascending order, the first drawn darkest. */
  ranges?: readonly BulletRange[];
  /** Defaults to 0. */
  minValue?: number;
  /** Defaults to the last range's end, or the larger of the value and the target. */
  maxValue?: number;
  /** `Intl.NumberFormat` options for the value, the target and the scale. */
  formatOptions?: Intl.NumberFormatOptions;
  /** The values' unit ("kW"). */
  unit?: string;
  /** Shows the scale's numbers under the bar. Defaults to true. */
  hasScale?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

// Range shades from darkest to lightest (the theme's neutral heat ramp, which dark themes reverse).
const bandClasses = [
  'bg-heat-neutral-4',
  'bg-heat-neutral-3',
  'bg-heat-neutral-2',
  'bg-heat-neutral-1',
] as const;

/** Each range's shade: the last range is always the lightest, and earlier ones step darker. */
function bandClass(index: number, count: number): string {
  const fromLightest = Math.min(bandClasses.length - 1, count - 1 - index);
  return bandClasses[bandClasses.length - 1 - fromLightest] ?? 'bg-heat-neutral-1';
}

/** About `count` evenly spaced round numbers from `min` to `max`, both ends included. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min;
  if (!(span > 0) || !Number.isFinite(span)) {
    return [min];
  }
  const rough = span / Math.max(1, count - 1);
  const power = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough) ??
    10 * power;
  const ticks: number[] = [];
  for (let tick = Math.ceil(min / step) * step; tick <= max + step * 1e-9; tick += step) {
    ticks.push(Math.round(tick / step) * step);
  }
  if (ticks[0] !== min) {
    ticks.unshift(min);
  }
  if (ticks.at(-1) !== max) {
    ticks.push(max);
  }
  // Drop an inner tick that would crowd an end.
  return ticks.filter(
    (tick, index) =>
      index === 0 ||
      index === ticks.length - 1 ||
      (tick - min >= step * 0.4 && max - tick >= step * 0.4),
  );
}

/**
 * A measure against a target over qualitative ranges: a `meter` whose text gives the value, the target and the
 * range the value is in.
 */
export function BulletChart({
  label,
  value,
  target,
  ranges = [],
  minValue = 0,
  maxValue: maxProp,
  formatOptions,
  unit,
  hasScale = true,
  className,
  ref,
}: BulletChartProps) {
  const messages = useChartMessages(bulletStrings);
  const { locale } = useLocale();
  const maxValue =
    maxProp ?? ranges.at(-1)?.to ?? Math.max(value, target ?? Number.NEGATIVE_INFINITY);
  const span = maxValue - minValue;
  const percent = (amount: number) =>
    span <= 0 ? 0 : clamp(((amount - minValue) / span) * 100, 0, 100);
  const formatter = numberFormat(locale, formatOptions);
  const withUnit = (amount: number) => {
    const number = formatter.format(amount);
    return unit === undefined ? number : `${number} ${unit}`;
  };
  const valueText = withUnit(value);
  const targetText = target === undefined ? undefined : withUnit(target);
  const rangeLabel = (ranges.find((entry) => value <= entry.to) ?? ranges.at(-1))?.label;
  const ticks = hasScale ? niceTicks(minValue, maxValue) : [];

  return (
    <Meter
      ref={ref}
      value={value}
      minValue={minValue}
      maxValue={maxValue}
      valueLabel={messages.bulletValue({
        value: valueText,
        target: targetText,
        range: rangeLabel,
      })}
      className={cn('flex min-w-0 flex-col gap-1.5 text-sm text-fg', className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <Label className="font-medium">{label}</Label>
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-lg font-semibold tabular-nums">{valueText}</span>
          {targetText !== undefined && (
            <span className="text-fg-muted tabular-nums">
              {messages.bulletTarget({ target: targetText })}
            </span>
          )}
          {rangeLabel !== undefined && <span className="text-fg-muted">{rangeLabel}</span>}
        </span>
      </div>
      <div aria-hidden="true" className="flex flex-col gap-0.5">
        <div
          className={cn(
            'relative h-6 w-full overflow-hidden rounded-sm',
            ranges.length === 0 && 'bg-surface-3',
          )}
        >
          {ranges.map((entry, index) => {
            const from = index === 0 ? minValue : (ranges[index - 1]?.to ?? minValue);
            return (
              <span
                key={`${String(index)}-${entry.label}`}
                className={cn('absolute inset-y-0', bandClass(index, ranges.length))}
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the range's span.
                style={{
                  insetInlineStart: `${String(percent(from))}%`,
                  width: `${String(percent(entry.to) - percent(from))}%`,
                }}
              />
            );
          })}
          <span
            className="absolute inset-y-[35%] start-0 rounded-e-sm bg-fg"
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the measure's length.
            style={{ width: `${String(percent(value))}%` }}
          />
          {target !== undefined && (
            <span
              className="absolute inset-y-1 -ms-0.5 w-1 rounded-full bg-fg"
              // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the target's position.
              style={{ insetInlineStart: `${String(percent(target))}%` }}
            />
          )}
        </div>
        {ticks.length > 1 && (
          <div className="relative h-4 text-xs text-fg-muted tabular-nums">
            {ticks.map((tick, index) => (
              <span
                key={tick}
                className={cn(
                  'absolute top-0 whitespace-nowrap',
                  index === 0
                    ? ''
                    : index === ticks.length - 1
                      ? '-translate-x-full rtl:translate-x-full'
                      : '-translate-x-1/2 rtl:translate-x-1/2',
                )}
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the tick's position.
                style={{ insetInlineStart: `${String(percent(tick))}%` }}
              >
                {formatter.format(tick)}
              </span>
            ))}
          </div>
        )}
      </div>
    </Meter>
  );
}
