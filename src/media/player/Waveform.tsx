// Waveform (FR-037): an audio file's peaks as bars, with the played part filled and a playhead. It's a seek slider:
// click, tap or drag to seek, arrows seek 5 s (30 s with Shift), Home and End jump to the ends, and it's read as
// "Position, 1:23 of 4:56". Bars are resampled to fit the width, and the played part is a clip over a second copy of
// the bars, so playing redraws one rectangle rather than every bar.

import { useId, useMemo, type Ref } from 'react';
import { useElementWidth } from '../../utils/useElementWidth';
import { cn } from '../../utils/cn';
import { mergeRefs } from '../../utils/mergeRefs';
import { useMediaPlayerMessages } from './messages';
import { normalizePeaks, resamplePeaks } from './peaks';
import { SeekSlider } from './SeekSlider';
import { formatMediaTime, type MediaMarker } from './time';

export interface WaveformProps {
  /** Peaks across the whole file, 0–1 (signed or integer peaks are scaled by their largest magnitude). */
  peaks: readonly number[];
  /** Seconds. */
  currentTime: number;
  /** Seconds. */
  duration: number;
  /** Seeks to a time in seconds. Without it the waveform only shows progress. */
  onSeek?: (seconds: number) => void;
  /** Points to mark, such as chapters or comments. */
  markers?: readonly MediaMarker[];
  /** `sm` (32 px, for message bubbles), `md` (56 px, the default) or `lg` (88 px). */
  size?: 'sm' | 'md' | 'lg';
  /** Names the slider. Defaults to the `mediaPosition` message ("Position"). */
  'aria-label'?: string;
  isDisabled?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const heights = { sm: 32, md: 56, lg: 88 } as const;
const heightClasses = { sm: 'h-8', md: 'h-14', lg: 'h-22' } as const;
/** Bar width and gap in CSS pixels. */
const BAR = 2;
const GAP = 1;

/** Peaks drawn as bars with a playhead; click, drag or use the arrows to seek. */
export function Waveform({
  peaks,
  currentTime,
  duration,
  onSeek,
  markers = [],
  size = 'md',
  'aria-label': ariaLabel,
  isDisabled = false,
  className,
  ref,
}: WaveformProps) {
  const messages = useMediaPlayerMessages();
  const clipId = `waveform-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [measureRef, width = 0] = useElementWidth();
  const height = heights[size];
  const normalized = useMemo(() => normalizePeaks(peaks), [peaks]);
  const bars = useMemo(
    () => resamplePeaks(normalized, Math.floor((width + GAP) / (BAR + GAP))),
    [normalized, width],
  );
  const hasDuration = Number.isFinite(duration) && duration > 0;
  const total = formatMediaTime(duration);

  const path = useMemo(() => {
    // One path for every bar, mirrored around the middle; quiet bars keep a 2 px minimum so silence is visible.
    const middle = height / 2;
    return bars
      .map((peak, index) => {
        const barHeight = Math.max(2, peak * (height - 4));
        const x = index * (BAR + GAP);
        return `M${String(x)} ${String(middle - barHeight / 2)}h${String(BAR)}v${String(barHeight)}h-${String(BAR)}z`;
      })
      .join('');
  }, [bars, height]);

  return (
    <div ref={mergeRefs(ref, measureRef)} className={cn('min-w-0', className)}>
      <SeekSlider
        aria-label={ariaLabel ?? messages.mediaPosition}
        value={hasDuration ? currentTime : 0}
        minValue={0}
        maxValue={hasDuration ? duration : 0}
        valueText={(value) =>
          messages.mediaPositionValue({ elapsed: formatMediaTime(value, duration), total })
        }
        onSeek={(seconds) => onSeek?.(seconds)}
        isDisabled={isDisabled || !hasDuration || !onSeek}
        trackClassName={cn(
          'relative flex w-full cursor-pointer items-center data-disabled:cursor-default',
          heightClasses[size],
        )}
        thumbClassName={cn(
          'hit-area top-1/2 h-full w-0.5 rounded-full bg-fg outline-none',
          'data-focus-visible:focus-ring data-disabled:opacity-0',
        )}
        renderTrack={(progress, toPosition) => (
          <>
            <svg
              aria-hidden="true"
              width={width}
              height={height}
              viewBox={`0 0 ${String(Math.max(1, width))} ${String(height)}`}
              className="pointer-events-none block rtl:-scale-x-100"
            >
              <defs>
                <clipPath id={clipId}>
                  <rect x="0" y="0" width={progress * width} height={height} />
                </clipPath>
              </defs>
              <path d={path} className="fill-border-strong" />
              <path d={path} clipPath={`url(#${clipId})`} className="fill-accent-solid" />
            </svg>
            {markers.map((marker) => (
              <span
                key={`${String(marker.at)}-${marker.label}`}
                aria-hidden="true"
                className="pointer-events-none absolute top-0 size-1.5 -translate-x-1/2 rounded-full bg-fg rtl:translate-x-1/2"
                // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the marker's position
                style={{ insetInlineStart: `${String(toPosition(marker.at) * 100)}%` }}
              />
            ))}
          </>
        )}
      />
    </div>
  );
}
