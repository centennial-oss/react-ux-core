// SegmentedMeter: one bar split into stacked parts of a whole (used, reserved and free of a quota; spent, committed
// and remaining of a budget), with limit markers such as a soft quota. Passing a marker turns it to a warning;
// passing the maximum hatches the overflow. The bar is a `meter` whose value text reads every part ("Used 62 GiB,
// Reserved 10 GiB, of 100 GiB"), and a legend lists each part's value, so nothing depends on colour.
import { AlertTriangle } from 'lucide-react';
import type { Ref } from 'react';
import { Label, Meter, useLocale } from 'react-aria-components';
import type { ChartColor } from '../../chart/colors';
import { useEntryMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { Size } from '../../utils/types';
import { defaultSegmentedMeterMessages } from './messages';

export interface MeterSegment {
  /** Unique within the meter. */
  id: string;
  label: string;
  value: number;
  /** A chart palette slot or tone. Defaults to the palette in order (`chart-1`, `chart-2`, …). */
  color?: ChartColor;
}

export interface SegmentedMeterMarker {
  value: number;
  /** Names the limit, such as "Soft limit". */
  label: string;
}

export interface SegmentedMeterProps {
  /** Names the meter, such as "Storage quota". */
  label: string;
  /** The stacked parts, in order from the start of the bar. What's left of `maxValue` shows as free. */
  segments: readonly MeterSegment[];
  /** The capacity. A total above it shows as hatched overflow. */
  maxValue: number;
  /** Marks a limit inside the bar, such as a soft quota. Passing one turns it to a warning. */
  markers?: readonly SegmentedMeterMarker[];
  /** A unit shown after each number, such as "GiB". Leave it out when `formatOptions` has a style that adds one. */
  unit?: string;
  formatOptions?: Intl.NumberFormatOptions;
  /** Shows a legend with each segment's value. Defaults to true. */
  hasLegend?: boolean;
  /** Adds what's left (the maximum minus the total) to the legend. Defaults to true. */
  hasFree?: boolean;
  /** The bar's thickness. Defaults to `md`. */
  size?: Size;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const colorClasses: Record<ChartColor, string> = {
  'chart-1': 'bg-chart-1',
  'chart-2': 'bg-chart-2',
  'chart-3': 'bg-chart-3',
  'chart-4': 'bg-chart-4',
  'chart-5': 'bg-chart-5',
  'chart-6': 'bg-chart-6',
  'chart-7': 'bg-chart-7',
  'chart-8': 'bg-chart-8',
  'chart-9': 'bg-chart-9',
  'chart-10': 'bg-chart-10',
  accent: 'bg-accent-solid',
  success: 'bg-success-solid',
  warning: 'bg-warning-solid',
  danger: 'bg-danger-solid',
  neutral: 'bg-neutral-solid',
};

const paletteOrder: readonly ChartColor[] = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'chart-6',
  'chart-7',
  'chart-8',
  'chart-9',
  'chart-10',
];

const barSizeClasses: Record<Size, string> = { sm: 'h-2', md: 'h-3', lg: 'h-4' };

/** The colour a segment draws with: its own, or the next palette slot. */
function segmentColor(segment: MeterSegment, index: number): ChartColor {
  return segment.color ?? paletteOrder[index % paletteOrder.length] ?? 'chart-1';
}

/** Where a marker's caption sits against its line, so captions near the ends stay inside the bar's width. */
function captionAlignment(percent: number): string {
  if (percent < 30) {
    return '';
  }
  if (percent > 70) {
    return '-translate-x-full rtl:translate-x-full';
  }
  return '-translate-x-1/2 rtl:translate-x-1/2';
}

/**
 * A bar of stacked parts against a maximum, with limit markers, overflow hatching and a legend. It's a `meter` whose
 * value text names every part.
 */
export function SegmentedMeter({
  label,
  segments,
  maxValue,
  markers = [],
  unit,
  formatOptions,
  hasLegend = true,
  hasFree = true,
  size = 'md',
  className,
  ref,
}: SegmentedMeterProps) {
  const messages = useEntryMessages(defaultSegmentedMeterMessages);
  const { locale } = useLocale();
  const numberFormat = new Intl.NumberFormat(locale, formatOptions);
  const quantity = (value: number) => {
    const text = numberFormat.format(value);
    return unit === undefined ? text : messages.segmentedMeterQuantity({ value: text, unit });
  };

  const parts = segments.map((segment) => ({ ...segment, value: Math.max(0, segment.value) }));
  const total = parts.reduce((sum, segment) => sum + segment.value, 0);
  const capacity = Math.max(0, maxValue);
  const scale = Math.max(capacity, total) || 1;
  const percentOf = (value: number) => Math.min(100, Math.max(0, (value / scale) * 100));
  const isOverCapacity = total > capacity;
  const passedMarkers = markers.filter((marker) => total > marker.value);

  const warnings = [
    ...(isOverCapacity
      ? [messages.segmentedMeterOverCapacity({ amount: quantity(total - capacity) })]
      : []),
    ...passedMarkers.map((marker) =>
      messages.segmentedMeterOverMarker({ label: marker.label, value: quantity(marker.value) }),
    ),
  ];
  const summary = [
    messages.segmentedMeterSummary({
      parts: new Intl.ListFormat(locale, { type: 'unit', style: 'short' }).format(
        parts.map((segment) =>
          messages.segmentedMeterPart({ label: segment.label, value: quantity(segment.value) }),
        ),
      ),
      max: quantity(capacity),
    }),
    ...warnings,
  ].join('. ');

  const bars = parts.map((segment, index) => {
    const before = parts.slice(0, index).reduce((sum, previous) => sum + previous.value, 0);
    return {
      segment,
      color: segmentColor(segment, index),
      from: percentOf(before),
      to: percentOf(before + segment.value),
    };
  });

  return (
    <div ref={ref} className={cn('flex min-w-0 flex-col gap-2 text-sm text-fg', className)}>
      <Meter
        value={Math.min(total, capacity)}
        minValue={0}
        maxValue={capacity || 1}
        valueLabel={summary}
        data-over-capacity={isOverCapacity || undefined}
        data-warning={passedMarkers.length > 0 || undefined}
        className="flex min-w-0 flex-col gap-1.5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <Label className="font-medium">{label}</Label>
          <span
            className={cn(
              'tabular-nums',
              isOverCapacity
                ? 'font-medium text-danger-fg'
                : passedMarkers.length > 0
                  ? 'font-medium text-warning-fg'
                  : 'text-fg-muted',
            )}
          >
            {messages.segmentedMeterTotal({
              value: numberFormat.format(total),
              max: quantity(capacity),
            })}
          </span>
        </div>
        {markers.length > 0 && (
          <div aria-hidden="true" className="relative h-4 text-xs leading-4 text-fg-muted">
            {markers.map((marker) => {
              const percent = percentOf(marker.value);
              return (
                <span
                  key={`${marker.label}-${String(marker.value)}`}
                  className={cn(
                    'absolute top-0 whitespace-nowrap',
                    captionAlignment(percent),
                    total > marker.value && 'font-medium text-warning-fg',
                  )}
                  // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the marker's position
                  style={{ insetInlineStart: `${String(percent)}%` }}
                >
                  {marker.label}
                </span>
              );
            })}
          </div>
        )}
        <div className="relative">
          <div
            className={cn(
              'relative w-full overflow-hidden rounded-full bg-surface-4',
              barSizeClasses[size],
            )}
          >
            {bars.map(({ segment, color, from, to }) =>
              to > from ? (
                <div
                  key={segment.id}
                  data-segment={segment.id}
                  className={cn(
                    'absolute inset-y-0',
                    colorClasses[color],
                    // A gap in the track's colour keeps neighbouring segments apart without relying on colour.
                    to < 100 && 'border-e-2 border-surface-1',
                  )}
                  // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the segment's extent
                  style={{ insetInlineStart: `${String(from)}%`, width: `${String(to - from)}%` }}
                />
              ) : null,
            )}
            {isOverCapacity && (
              <div
                data-overflow=""
                className="absolute inset-y-0 end-0 bg-[repeating-linear-gradient(135deg,var(--color-danger-solid)_0_3px,var(--color-surface-1)_3px_6px)]"
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the share past capacity
                style={{ width: `${String(100 - percentOf(capacity))}%` }}
              />
            )}
          </div>
          {isOverCapacity && (
            <span
              aria-hidden="true"
              className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-fg rtl:translate-x-1/2"
              // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the capacity line
              style={{ insetInlineStart: `${String(percentOf(capacity))}%` }}
            />
          )}
          {markers.map((marker) => (
            <span
              key={`${marker.label}-${String(marker.value)}`}
              aria-hidden="true"
              data-marker={marker.label}
              className={cn(
                'absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full rtl:translate-x-1/2',
                total > marker.value ? 'bg-warning-solid' : 'bg-fg',
              )}
              // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the marker's position
              style={{ insetInlineStart: `${String(percentOf(marker.value))}%` }}
            />
          ))}
        </div>
      </Meter>
      {warnings.length > 0 && (
        <ul className="flex flex-col gap-0.5">
          {warnings.map((warning, index) => (
            <li
              key={warning}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium',
                isOverCapacity && index === 0 ? 'text-danger-fg' : 'text-warning-fg',
              )}
            >
              <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
              {warning}
            </li>
          ))}
        </ul>
      )}
      {hasLegend && (
        <ul
          aria-label={messages.segmentedMeterLegend({ label })}
          className="flex flex-wrap gap-x-4 gap-y-1 text-xs"
        >
          {bars.map(({ segment, color }) => (
            <li key={segment.id} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cn('size-2.5 shrink-0 rounded-sm', colorClasses[color])}
              />
              <span className="text-fg-muted">{segment.label}</span>
              <span className="font-medium tabular-nums">{quantity(segment.value)}</span>
            </li>
          ))}
          {hasFree && !isOverCapacity && (
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-sm border border-border-strong bg-surface-4"
              />
              <span className="text-fg-muted">{messages.segmentedMeterFree}</span>
              <span className="font-medium tabular-nums">{quantity(capacity - total)}</span>
            </li>
          )}
          {markers.map((marker) => (
            <li
              key={`${marker.label}-${String(marker.value)}`}
              className="flex items-center gap-1.5"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'h-3 w-0.5 shrink-0 rounded-full',
                  total > marker.value ? 'bg-warning-solid' : 'bg-fg',
                )}
              />
              <span className="text-fg-muted">{marker.label}</span>
              <span className="font-medium tabular-nums">{quantity(marker.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
