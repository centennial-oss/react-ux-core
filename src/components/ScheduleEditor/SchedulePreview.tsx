import { useLocale } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { rangeEditorStrings } from '../../provider/coreStrings';
import { cn } from '../../utils/cn';
import { dateTimeFormat, listFormat } from '../../utils/intl';
import { clamp } from '../../utils/math';
import { MINUTES_PER_DAY, spanOf, sortSchedule, uncoveredSpans, type Schedule } from './schedule';

/** Formats minutes since midnight as a time in the locale ("06:00", "6:00 AM"); 1440 is midnight. */
export function useFormatMinutes(): (minutes: number) => string {
  const { locale } = useLocale();
  const format = dateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  return (minutes) => format.format(Date.UTC(2000, 0, 1, 0, minutes % MINUTES_PER_DAY));
}

// Shades for values from low to high (complete class strings, so Tailwind finds them).
const shades = [
  'bg-accent-solid/35',
  'bg-accent-solid/50',
  'bg-accent-solid/65',
  'bg-accent-solid/80',
  'bg-accent-solid',
] as const;

const TICKS = [0, 6, 12, 18, 24];

/**
 * A bar across one day showing each period, shaded by its value, with hatched gaps and striped overlaps. It's an
 * image named by a text summary of the periods.
 */
export function SchedulePreview<V>({
  rows,
  formatValue,
  toNumber,
  className,
}: {
  rows: Schedule<V>;
  formatValue: (value: V) => string;
  /** For shading; without it, every period has the same shade. */
  toNumber?: (value: V) => number;
  className?: string;
}) {
  const messages = useEntryMessages(rangeEditorStrings);
  const { locale } = useLocale();
  const formatMinutes = useFormatMinutes();
  // Axis labels are hours only ("6 AM", "06"), so five fit across a phone.
  const hourFormat = dateTimeFormat(locale, { hour: 'numeric', timeZone: 'UTC' });
  const sorted = sortSchedule(rows).filter((row) => {
    const [start, end] = spanOf(row);
    return Number.isFinite(start) && Number.isFinite(end) && end > start;
  });
  const numbers = toNumber ? sorted.map((row) => toNumber(row.value)).filter(Number.isFinite) : [];
  const low = Math.min(...numbers);
  const high = Math.max(...numbers);
  const shadeOf = (value: V): string => {
    if (!toNumber || numbers.length === 0 || high === low) {
      return shades[3];
    }
    const ratio = (toNumber(value) - low) / (high - low);
    return (
      shades[clamp(Math.round(ratio * (shades.length - 1)), 0, shades.length - 1)] ?? shades[3]
    );
  };
  const rangeText = ([start, end]: [number, number]) =>
    messages.range({ from: formatMinutes(start), to: formatMinutes(end) });
  const parts = sorted.map((row) =>
    messages.scheduleSegment({ range: rangeText(spanOf(row)), value: formatValue(row.value) }),
  );
  const gaps = uncoveredSpans(rows).map((span) => messages.notCovered({ range: rangeText(span) }));
  const summary = listFormat(locale, { type: 'unit' }).format([...parts, ...gaps]);
  // Where any two periods overlap, drawn over the bar.
  const overlaps = sorted.flatMap((row, index) =>
    sorted.slice(index + 1).flatMap((other): [number, number][] => {
      const [start, end] = spanOf(row);
      const [otherStart, otherEnd] = spanOf(other);
      const from = Math.max(start, otherStart);
      const to = Math.min(end, otherEnd);
      return to > from ? [[from, to]] : [];
    }),
  );
  const percent = (minutes: number) => `${String((minutes / MINUTES_PER_DAY) * 100)}%`;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div
        role="img"
        aria-label={messages.schedulePreview({ summary })}
        className="relative h-6 overflow-hidden rounded-control border border-border bg-[repeating-linear-gradient(135deg,var(--color-surface-3)_0_4px,var(--color-surface-1)_4px_8px)]"
      >
        {sorted.map((row, index) => {
          const [start, end] = spanOf(row);
          return (
            // An opaque base under the shade, so a light (low) period never looks like the hatched uncovered time.
            <span
              key={`${row.start}-${row.end}-${String(index)}`}
              className="absolute inset-y-0 border-e border-surface-1 bg-surface-1"
              // Geometry from the data.
              // eslint-disable-next-line no-restricted-syntax -- dynamic geometry.
              style={{ insetInlineStart: percent(start), width: percent(end - start) }}
            >
              <span className={cn('absolute inset-0', shadeOf(row.value))} />
            </span>
          );
        })}
        {overlaps.map(([from, to]) => (
          <span
            key={`overlap-${String(from)}-${String(to)}`}
            className="absolute inset-y-0 bg-[repeating-linear-gradient(45deg,var(--color-danger-solid)_0_3px,transparent_3px_6px)]"
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry.
            style={{ insetInlineStart: percent(from), width: percent(to - from) }}
          />
        ))}
      </div>
      <div aria-hidden="true" className="relative h-4 text-xs text-fg-muted tabular-nums">
        {TICKS.map((hour) => (
          <span
            key={hour}
            className={cn(
              'absolute top-0',
              hour === 0
                ? 'start-0'
                : hour === 24
                  ? 'end-0'
                  : '-translate-x-1/2 rtl:translate-x-1/2',
            )}
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry.
            style={hour === 0 || hour === 24 ? undefined : { insetInlineStart: percent(hour * 60) }}
          >
            {hourFormat.format(Date.UTC(2000, 0, 1, hour % 24))}
          </span>
        ))}
      </div>
    </div>
  );
}
