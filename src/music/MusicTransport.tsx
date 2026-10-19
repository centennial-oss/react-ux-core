// MusicTransport: the controls a piano roll or step sequencer plays from — play/pause, stop, the position in bars and
// beats, the tempo in BPM and a loop toggle. It's presentational: the app owns the clock (see `useBeatClock`) and the
// sound. MediaTransport (the /media entry) suits media elements with seconds and seeking; this one counts in beats.

import { Pause, Play, Repeat, Square } from 'lucide-react';
import type { Ref } from 'react';
import { IconButton } from '../components/IconButton/IconButton';
import { NumberField } from '../components/NumberField/NumberField';
import { cn } from '../utils/cn';
import { useMusicMessages } from './messages';
import { barAndBeat, type TimeSignature } from './pitch';

export interface MusicTransportProps {
  isPlaying: boolean;
  /** Called by the play/pause button. */
  onPlayingChange: (isPlaying: boolean) => void;
  /** Shows a stop button, which should stop playback and go back to the start. */
  onStop?: () => void;
  /** The position in beats (such as `useBeatClock().beat`). */
  position: number;
  /** For the bars-and-beats readout. Defaults to 4/4. */
  timeSignature?: TimeSignature;
  /** Tempo in beats per minute. */
  bpm: number;
  /** Shows the tempo as an editable field when set. */
  onBpmChange?: (bpm: number) => void;
  /** Defaults to 20. */
  minBpm?: number;
  /** Defaults to 300. */
  maxBpm?: number;
  isLooping?: boolean;
  /** Shows the loop toggle when set. */
  onLoopingChange?: (isLooping: boolean) => void;
  isDisabled?: boolean;
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const COMMON_TIME: TimeSignature = { beats: 4, unit: 4 };

/** Play/pause, stop, position, tempo and loop controls for beat-based playback. */
export function MusicTransport({
  isPlaying,
  onPlayingChange,
  onStop,
  position,
  timeSignature = COMMON_TIME,
  bpm,
  onBpmChange,
  minBpm = 20,
  maxBpm = 300,
  isLooping = false,
  onLoopingChange,
  isDisabled = false,
  'aria-label': ariaLabel,
  className,
  ref,
}: MusicTransportProps) {
  const messages = useMusicMessages();
  const { bar, beat } = barAndBeat(Math.max(0, position), timeSignature);
  const wholeBeat = Math.floor(beat + 1e-6);

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel ?? messages.transportLabel}
      className={cn('flex min-w-0 flex-wrap items-center gap-2', className)}
    >
      <IconButton
        icon={isPlaying ? Pause : Play}
        variant="solid"
        tone="accent"
        aria-label={isPlaying ? messages.transportPause : messages.transportPlay}
        isDisabled={isDisabled}
        onPress={() => {
          onPlayingChange(!isPlaying);
        }}
      />
      {onStop && (
        <IconButton
          icon={Square}
          variant="outline"
          aria-label={messages.transportStop}
          isDisabled={isDisabled}
          onPress={onStop}
        />
      )}
      <span className="min-w-14 rounded-control border border-border bg-surface-2 px-2 py-1.5 text-center font-mono text-sm text-fg tabular-nums">
        <span aria-hidden="true">
          {bar}:{wholeBeat}
        </span>
        <span className="sr-only">{messages.transportPosition({ bar, beat: wholeBeat })}</span>
      </span>
      {onBpmChange && (
        <NumberField
          aria-label={messages.transportBpm}
          value={bpm}
          minValue={minBpm}
          maxValue={maxBpm}
          step={1}
          size="sm"
          hasStepper
          suffix={messages.transportBpm}
          isDisabled={isDisabled}
          className="w-40"
          onChange={(next) => {
            if (next !== null) {
              onBpmChange(next);
            }
          }}
        />
      )}
      {onLoopingChange && (
        <IconButton
          icon={Repeat}
          variant="outline"
          aria-label={messages.transportLoop}
          isSelected={isLooping}
          isDisabled={isDisabled}
          onChange={onLoopingChange}
        />
      )}
    </div>
  );
}
