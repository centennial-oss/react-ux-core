import { useId, useMemo } from 'react';
import { useLocale } from 'react-aria-components';
import { useMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { fadedOpacity } from '../../utils/fade';
import type { Tone } from '../../utils/types';

const strokeClasses: Record<Tone, string> = {
  neutral: 'text-neutral-fg',
  accent: 'text-accent-fg',
  success: 'text-success-fg',
  warning: 'text-warning-fg',
  danger: 'text-danger-fg',
};

export interface SparklineThreshold {
  value: number;
  /** Which side of the value is shaded. Defaults to `above`. */
  direction?: 'above' | 'below';
  /** Defaults to `danger`. */
  tone?: 'warning' | 'danger';
}

export interface SparklineProps {
  data: readonly number[];
  /** Defaults to `line`. `area` shades below the line. */
  type?: 'line' | 'area' | 'bar';
  /** The `area` shade's opacity, from 0 to 1. Defaults to 0.2. */
  shadeOpacity?: number;
  /**
   * Fades the `area` shade toward the bottom, from 0 (the shade's opacity all the way down, the default) to 100
   * (transparent at the bottom). It only ever makes the shade more transparent.
   */
  fade?: number;
  /** Defaults to `accent`. */
  tone?: Tone;
  /** Height in pixels. Defaults to 32. The width fills the container. */
  height?: number;
  /** Marks the lowest and highest values. */
  hasMinMaxMarkers?: boolean;
  /** A dashed reference line at this value. */
  baseline?: number;
  /** Shades the area beyond a threshold. */
  threshold?: SparklineThreshold;
  /** Number formatting for the generated text summary. */
  formatOptions?: Intl.NumberFormatOptions;
  /** Replaces the generated summary ("12 values from 3 to 18, latest 9"). */
  'aria-label'?: string;
  /** Hides the sparkline from assistive technology (for example when it only decorates a stat). */
  'aria-hidden'?: boolean;
  className?: string;
}

const WIDTH = 100;

/** A small, wordless chart of a series, with a generated text summary for assistive technology. */
export function Sparkline({
  data,
  type = 'line',
  shadeOpacity = 0.2,
  fade = 0,
  tone = 'accent',
  height = 32,
  hasMinMaxMarkers = false,
  baseline,
  threshold,
  formatOptions,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
  className,
}: SparklineProps) {
  const messages = useMessages();
  const { locale } = useLocale();
  // An id usable in `url(#…)`.
  const gradientId = `rux-spark-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const geometry = useMemo(() => {
    if (data.length === 0) {
      return null;
    }
    const extras = [baseline, threshold?.value].filter(
      (value): value is number => value !== undefined,
    );
    const lo = Math.min(...data, ...extras, type === 'bar' ? 0 : Infinity);
    const hi = Math.max(...data, ...extras);
    const span = hi - lo || 1;
    const y = (value: number) => height - ((value - lo) / span) * (height - 2) - 1;
    const step = data.length > 1 ? WIDTH / (data.length - 1) : 0;
    const x = (index: number) => (data.length > 1 ? index * step : WIDTH / 2);
    const minIndex = data.indexOf(Math.min(...data));
    const maxIndex = data.indexOf(Math.max(...data));
    return { y, x, minIndex, maxIndex, barWidth: WIDTH / data.length };
  }, [data, baseline, threshold?.value, type, height]);

  const summary = useMemo(() => {
    if (data.length === 0) {
      return messages.noData;
    }
    const format = new Intl.NumberFormat(locale, formatOptions);
    return messages.sparklineSummary({
      count: data.length,
      min: format.format(Math.min(...data)),
      max: format.format(Math.max(...data)),
      latest: format.format(data[data.length - 1] ?? 0),
    });
  }, [data, formatOptions, locale, messages]);

  const a11y = ariaHidden
    ? { 'aria-hidden': true }
    : { role: 'img', 'aria-label': ariaLabel ?? summary };

  return (
    <span
      {...a11y}
      className={cn('relative block w-full', strokeClasses[tone], className)}
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the height comes from props
      style={{ height }}
    >
      {geometry && (
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${String(WIDTH)} ${String(height)}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          {threshold && (
            <rect
              x={0}
              width={WIDTH}
              y={threshold.direction === 'below' ? geometry.y(threshold.value) : 0}
              height={
                threshold.direction === 'below'
                  ? height - geometry.y(threshold.value)
                  : geometry.y(threshold.value)
              }
              className={threshold.tone === 'warning' ? 'fill-warning-bg' : 'fill-danger-bg'}
            />
          )}
          {baseline !== undefined && (
            <line
              x1={0}
              x2={WIDTH}
              y1={geometry.y(baseline)}
              y2={geometry.y(baseline)}
              className="stroke-border-strong"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {type === 'bar' ? (
            data.map((value, index) => (
              <rect
                key={index}
                x={index * geometry.barWidth + geometry.barWidth * 0.15}
                width={geometry.barWidth * 0.7}
                y={Math.min(geometry.y(value), geometry.y(0))}
                height={Math.max(1, Math.abs(geometry.y(0) - geometry.y(value)))}
                fill="currentColor"
              />
            ))
          ) : (
            <>
              {type === 'area' && (
                <>
                  <defs>
                    <linearGradient
                      id={gradientId}
                      gradientUnits="userSpaceOnUse"
                      x1={0}
                      x2={0}
                      y1={Math.min(...data.map((value) => geometry.y(value)))}
                      y2={height}
                    >
                      <stop offset={0} stopColor="currentColor" stopOpacity={shadeOpacity} />
                      <stop
                        offset={1}
                        stopColor="currentColor"
                        stopOpacity={fadedOpacity(shadeOpacity, fade)}
                      />
                    </linearGradient>
                  </defs>
                  <polygon
                    points={[
                      `${String(geometry.x(0))},${String(height)}`,
                      ...data.map(
                        (value, index) =>
                          `${String(geometry.x(index))},${String(geometry.y(value))}`,
                      ),
                      `${String(geometry.x(data.length - 1))},${String(height)}`,
                    ].join(' ')}
                    fill={`url(#${gradientId})`}
                  />
                </>
              )}
              <polyline
                points={data
                  .map(
                    (value, index) => `${String(geometry.x(index))},${String(geometry.y(value))}`,
                  )
                  .join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>
      )}
      {geometry &&
        hasMinMaxMarkers &&
        [geometry.minIndex, geometry.maxIndex].map((index) => (
          <span
            key={index}
            aria-hidden="true"
            className="absolute size-1.5 -translate-1/2 rounded-full bg-current ring-2 ring-surface-2"
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: marker position
            style={{
              left: `${String(type === 'bar' ? (index + 0.5) * geometry.barWidth : geometry.x(index))}%`,
              top: geometry.y(data[index] ?? 0),
            }}
          />
        ))}
    </span>
  );
}
