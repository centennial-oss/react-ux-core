// ObservationTrend: a small trend chart of one observation's numeric values over time, with its reference range as a
// band and its critical limits as dashed lines. `/table` doesn't depend on chart.js, so it's a plain inline SVG; the
// text summary under it carries the same information for screen readers.

import { useLocale } from 'react-aria-components';
import { useTimeZone } from '../provider/context';
import { cn } from '../utils/cn';
import { useTableMessages } from './messages';
import {
  criticalText,
  flagSeverity,
  numericValue,
  rangeText,
  resolveFlag,
  timeOf,
  valueFormatter,
  type FlagSeverity,
  type Observation,
  type ObservationValue,
} from './reference';

export interface ObservationTrendProps {
  observation: Observation;
  /** Values of any observations; only this observation's numeric values are drawn. */
  values: readonly ObservationValue[];
  /** IANA time zone for the time labels. Defaults to UIProvider's `timeZone`. */
  timeZone?: string;
  className?: string;
}

const WIDTH = 280;
const HEIGHT = 120;
const PAD = { top: 8, right: 8, bottom: 18, left: 36 };

const pointClasses: Record<FlagSeverity, string> = {
  normal: 'fill-accent-fg',
  abnormal: 'fill-warning-solid stroke-warning-fg',
  critical: 'fill-danger-solid stroke-danger-fg',
};

const pointRadius: Record<FlagSeverity, number> = { normal: 2.5, abnormal: 3.5, critical: 4 };

/**
 * One observation's values over time as a small line chart, with the reference range shaded and critical limits
 * dashed, plus a text summary (count, lowest, highest, latest, and the ranges). Flowsheet opens it from a row header;
 * it also works on its own.
 */
export function ObservationTrend({
  observation,
  values,
  timeZone,
  className,
}: ObservationTrendProps) {
  const messages = useTableMessages();
  const { locale } = useLocale();
  const defaultTimeZone = useTimeZone();
  const format = valueFormatter(locale, observation.unit, observation.formatOptions);
  const timeFormat = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timeZone ?? defaultTimeZone,
  });

  const points = values
    .filter((value) => value.observationId === observation.id)
    .flatMap((value) => {
      const number = numericValue(value.value);
      const time = timeOf(value.at);
      return number === null || Number.isNaN(time) ? [] : [{ ...value, number, time }];
    })
    .sort((a, b) => a.time - b.time);

  const reference = rangeText(observation.referenceRange, format.withUnit, messages);
  const critical = criticalText(observation.criticalRange, format.withUnit, messages);
  const latest = points.at(-1);
  const summary =
    latest === undefined
      ? messages.flowsheetNoNumericValues
      : messages.flowsheetTrendSummary({
          label: observation.label,
          count: points.length,
          min: format.withUnit(Math.min(...points.map((point) => point.number))),
          max: format.withUnit(Math.max(...points.map((point) => point.number))),
          latest: format.withUnit(latest.number),
        });

  let chart = null;
  const first = points[0];
  if (first && latest) {
    const limits = [
      observation.referenceRange?.low,
      observation.referenceRange?.high,
      observation.criticalRange?.low,
      observation.criticalRange?.high,
    ].filter((limit): limit is number => limit !== undefined);
    const numbers = points.map((point) => point.number);
    // The value axis spans the values and the reference range; critical limits show when they fall inside it.
    const lowest = Math.min(...numbers, ...limits.slice(0, 2));
    const highest = Math.max(...numbers, ...limits.slice(0, 2));
    const margin = (highest - lowest || Math.abs(highest) || 1) * 0.1;
    const lo = lowest - margin;
    const hi = highest + margin;
    const plotWidth = WIDTH - PAD.left - PAD.right;
    const plotHeight = HEIGHT - PAD.top - PAD.bottom;
    const y = (value: number) => PAD.top + plotHeight - ((value - lo) / (hi - lo)) * plotHeight;
    const span = latest.time - first.time;
    const x = (time: number) =>
      span === 0 ? PAD.left + plotWidth / 2 : PAD.left + ((time - first.time) / span) * plotWidth;
    const clampY = (value: number) => Math.min(Math.max(y(value), PAD.top), PAD.top + plotHeight);
    const band = observation.referenceRange;
    const bandTop = band?.high === undefined ? PAD.top : clampY(band.high);
    const bandBottom = band?.low === undefined ? PAD.top + plotHeight : clampY(band.low);
    const criticalLines = [observation.criticalRange?.low, observation.criticalRange?.high].filter(
      (limit): limit is number => limit !== undefined && limit > lo && limit < hi,
    );

    chart = (
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
        className="block h-auto w-full overflow-visible text-[9px]"
      >
        {band && (band.low !== undefined || band.high !== undefined) && (
          <rect
            data-band=""
            x={PAD.left}
            width={plotWidth}
            y={bandTop}
            height={Math.max(0, bandBottom - bandTop)}
            className="fill-success-bg"
          />
        )}
        {criticalLines.map((limit) => (
          <line
            key={limit}
            x1={PAD.left}
            x2={PAD.left + plotWidth}
            y1={y(limit)}
            y2={y(limit)}
            strokeDasharray="4 3"
            className="stroke-danger-border"
          />
        ))}
        <line
          x1={PAD.left}
          x2={PAD.left}
          y1={PAD.top}
          y2={PAD.top + plotHeight}
          className="stroke-border"
        />
        <line
          x1={PAD.left}
          x2={PAD.left + plotWidth}
          y1={PAD.top + plotHeight}
          y2={PAD.top + plotHeight}
          className="stroke-border"
        />
        {[highest, lowest].map((value) => (
          <text
            key={value}
            x={PAD.left - 4}
            y={y(value)}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-fg-muted"
          >
            {format.number(value)}
          </text>
        ))}
        <text x={PAD.left} y={HEIGHT - 4} className="fill-fg-muted">
          {timeFormat.format(first.time)}
        </text>
        {span > 0 && (
          <text x={PAD.left + plotWidth} y={HEIGHT - 4} textAnchor="end" className="fill-fg-muted">
            {timeFormat.format(latest.time)}
          </text>
        )}
        <polyline
          points={points
            .map((point) => `${String(x(point.time))},${String(y(point.number))}`)
            .join(' ')}
          fill="none"
          strokeWidth={1.75}
          strokeLinejoin="round"
          className="stroke-accent-fg"
        />
        {points.map((point, index) => {
          const severity = flagSeverity(
            resolveFlag({
              value: point.number,
              referenceRange: observation.referenceRange,
              criticalRange: observation.criticalRange,
              flag: point.flag,
            }),
          );
          return (
            <circle
              key={index}
              cx={x(point.time)}
              cy={y(point.number)}
              r={pointRadius[severity]}
              data-severity={severity}
              className={pointClasses[severity]}
            />
          );
        })}
      </svg>
    );
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-2 text-sm text-fg', className)}>
      {chart}
      <p className="text-xs text-fg">{summary}</p>
      {(reference !== undefined || critical !== undefined) && (
        <ul className="flex flex-col text-xs text-fg-muted">
          {reference !== undefined && <li>{messages.referenceRange({ range: reference })}</li>}
          {critical !== undefined && (
            <li>{messages.referenceCriticalLimits({ range: critical })}</li>
          )}
        </ul>
      )}
    </div>
  );
}
