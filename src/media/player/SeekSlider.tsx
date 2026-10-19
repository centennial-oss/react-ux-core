// The seek slider behind MediaTransport's timeline and Waveform: a React Aria slider (pointer, touch and keyboard,
// with a native range input for assistive technology) whose track the caller draws. It scrubs locally while dragged
// and seeks once on release, arrows seek 5 s (30 s with Shift), and its value is read as a time ("1:23 of 4:56").

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Slider, SliderThumb, SliderTrack, useLocale } from 'react-aria-components';
import { cn } from '../../utils/cn';
import { clamp } from '../../utils/math';
import { ARROW_SEEK, SEEK_ATTRIBUTE, SHIFT_ARROW_SEEK } from './mediaKeys';

export interface SeekSliderProps {
  value: number;
  minValue: number;
  maxValue: number;
  /** How the value is read, for example "1:23 of 4:56". Receives the shown value (the scrub position while dragged). */
  valueText: (value: number) => string;
  'aria-label': string;
  /** Called once when a drag, tap or key press ends. */
  onSeek: (seconds: number) => void;
  /** Called while dragging with the scrub position, then with null. */
  onScrub?: (seconds: number | null) => void;
  isDisabled?: boolean;
  /** Draws the track: receives the shown value's position (0–1) and a function from seconds to position. */
  renderTrack: (progress: number, toPosition: (seconds: number) => number) => ReactNode;
  trackClassName: string;
  thumbClassName: string;
  className?: string;
}

export function SeekSlider({
  value,
  minValue,
  maxValue,
  valueText,
  'aria-label': ariaLabel,
  onSeek,
  onScrub,
  isDisabled = false,
  renderTrack,
  trackClassName,
  thumbClassName,
  className,
}: SeekSliderProps) {
  const { direction } = useLocale();
  const [scrub, setScrub] = useState<number | null>(null);
  const max = Math.max(maxValue, minValue + 0.001);
  const shown = clamp(scrub ?? value, minValue, max);
  const span = max - minValue;
  const toPosition = (seconds: number) => clamp((seconds - minValue) / span, 0, 1);
  const text = valueText(shown);

  // React Aria reads the value as a formatted number; a time reads better. The attribute is set after React Aria's
  // own on every commit, so it always wins.
  const inputRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    inputRef.current?.setAttribute('aria-valuetext', text);
  });

  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isDisabled || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        // Up and Down step like Right and Left; keep them to the same seek sizes.
        const size = event.shiftKey ? SHIFT_ARROW_SEEK : ARROW_SEEK;
        event.preventDefault();
        event.stopPropagation();
        onSeek(clamp(value + (event.key === 'ArrowUp' ? size : -size), minValue, max));
      }
      return;
    }
    const size = event.shiftKey ? SHIFT_ARROW_SEEK : ARROW_SEEK;
    const forward = (event.key === 'ArrowRight') !== (direction === 'rtl');
    event.preventDefault();
    event.stopPropagation();
    onSeek(clamp(value + (forward ? size : -size), minValue, max));
  };

  return (
    <div
      {...{ [SEEK_ATTRIBUTE]: '' }}
      className={cn('min-w-0', className)}
      onKeyDownCapture={onKeyDownCapture}
    >
      <Slider
        aria-label={ariaLabel}
        minValue={minValue}
        maxValue={max}
        step={span > 600 ? 1 : 0.1}
        value={shown}
        isDisabled={isDisabled}
        onChange={(next) => {
          setScrub(next);
          onScrub?.(next);
        }}
        onChangeEnd={(next) => {
          setScrub(null);
          onScrub?.(null);
          onSeek(next);
        }}
        className="w-full"
      >
        <SliderTrack className={trackClassName}>
          {renderTrack(toPosition(shown), toPosition)}
          <SliderThumb inputRef={inputRef} className={thumbClassName} />
        </SliderTrack>
      </Slider>
    </div>
  );
}
