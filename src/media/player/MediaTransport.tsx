// MediaTransport (FR-037): the controls every player shares — play/pause, a seek slider with buffered ranges and
// markers, a time readout (elapsed / total, or the time left on press), skip back and forward, a speed menu, volume
// and mute, previous/next, a chapters menu and, for live streams, a "Go live" button over the DVR window. It's
// presentational: the caller owns the clock. `useMediaElement` supplies everything for an <audio> or <video>
// element (`<MediaTransport {...transportPropsFromMedia(media)} />`); other timelines (a piano roll, a slideshow)
// pass their own state.

import {
  ListOrdered,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useId, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { Button as AriaButton, useLocale } from 'react-aria-components';
import { Button } from '../../components/Button/Button';
import { IconButton } from '../../components/IconButton/IconButton';
import { Menu, MenuItem, MenuTrigger } from '../../components/Menu/Menu';
import { Slider } from '../../components/Slider/Slider';
import { SpinnerIcon } from '../../components/Spinner/SpinnerIcon';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { cn } from '../../utils/cn';
import { mediaKeyAction } from './mediaKeys';
import { useMediaPlayerMessages, type MediaPlayerStrings } from './messages';
import { SeekSlider } from './SeekSlider';
import {
  formatMediaTime,
  isAtLiveEdge as atLiveEdge,
  type MediaMarker,
  type MediaTimeRange,
} from './time';
import type { MediaElementControls, MediaElementState } from './useMediaElement';

export interface MediaTransportProps {
  isPlaying: boolean;
  /** Called by the play/pause button, Space, and the system media keys. */
  onPlayingChange: (isPlaying: boolean) => void;
  /** Seconds. */
  currentTime: number;
  /** Seconds; `Infinity` or `NaN` when unknown (a live stream, or before metadata loads). */
  duration: number;
  /** Seeks to a time in seconds (from the slider, the skip buttons, the arrows or a marker). */
  onSeek: (seconds: number) => void;
  /** Ranges already downloaded, drawn on the seek slider. */
  buffered?: readonly MediaTimeRange[];
  /** Points to mark on the timeline, also listed in a chapters menu. */
  markers?: readonly MediaMarker[];
  /** Shows the seek slider. Defaults to true. */
  hasSeekBar?: boolean;
  /** Replaces the seek slider, for example with a `Waveform`. */
  timeline?: ReactNode;
  /** Seconds the skip buttons move. Defaults to 15. */
  skipSeconds?: number;
  /** Shows skip back and forward buttons. Defaults to true in the `full` layout. */
  hasSkipButtons?: boolean;
  playbackRate?: number;
  /** Speeds offered in the speed menu, such as `[0.75, 1, 1.25, 1.5, 2]`. The menu shows when this and `onPlaybackRateChange` are set. */
  playbackRates?: readonly number[];
  onPlaybackRateChange?: (rate: number) => void;
  /** 0–1. The volume slider shows when `onVolumeChange` is set (on wide containers; phones use their buttons). */
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  isMuted?: boolean;
  /** Shows the mute toggle when set. */
  onMutedChange?: (isMuted: boolean) => void;
  /** Previous and next buttons show when these are set. */
  onPrevious?: () => void;
  onNext?: () => void;
  /** A live stream: the seek slider covers `seekable` (the DVR window) and a "Go live" button jumps to the edge. */
  isLive?: boolean;
  /** The seekable window of a live stream, in seconds. */
  seekable?: MediaTimeRange;
  /** The live edge, in seconds. Defaults to the end of `seekable`. */
  liveEdge?: number;
  /** Jumps to the live edge. Defaults to seeking to `liveEdge`. */
  onGoLive?: () => void;
  /** Playback is stalled waiting for data: a spinner shows and "Buffering" is announced. */
  isWaiting?: boolean;
  /** `full`: the seek slider over a row of controls. `compact`: one row. Defaults to `full`. */
  layout?: 'full' | 'compact';
  isDisabled?: boolean;
  /** Extra controls at the end of the row, such as quality, captions, picture-in-picture and full screen. */
  children?: ReactNode;
  /** Names the controls group. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const DEFAULT_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

/** The transport props for a media element's state and controls (from `useMediaElement`). */
export function transportPropsFromMedia({
  state,
  controls,
}: {
  state: MediaElementState;
  controls: MediaElementControls;
}): Pick<
  MediaTransportProps,
  | 'isPlaying'
  | 'onPlayingChange'
  | 'currentTime'
  | 'duration'
  | 'onSeek'
  | 'buffered'
  | 'playbackRate'
  | 'onPlaybackRateChange'
  | 'volume'
  | 'onVolumeChange'
  | 'isMuted'
  | 'onMutedChange'
  | 'seekable'
  | 'isWaiting'
> {
  return {
    isPlaying: state.isPlaying,
    onPlayingChange: controls.setPlaying,
    currentTime: state.currentTime,
    duration: state.duration,
    onSeek: controls.seek,
    buffered: state.buffered,
    playbackRate: state.playbackRate,
    onPlaybackRateChange: controls.setPlaybackRate,
    volume: state.volume,
    onVolumeChange: controls.setVolume,
    isMuted: state.isMuted,
    onMutedChange: controls.setMuted,
    seekable: state.seekable,
    isWaiting: state.isWaiting && state.isPlaying,
  };
}

/** Formats a speed for the menu ("1.5×"). */
function useRateFormatter(messages: MediaPlayerStrings) {
  const { locale } = useLocale();
  const format = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  return (rate: number) => messages.mediaRate({ rate: format.format(rate) });
}

const trackClasses =
  'relative mx-1.5 flex h-hit cursor-pointer items-center data-disabled:cursor-not-allowed data-disabled:opacity-50';
const thumbClasses = cn(
  'hit-area top-1/2 size-3.5 rounded-full border-2 border-surface-1 bg-accent-solid shadow-raised',
  'data-focus-visible:focus-ring data-dragging:scale-110',
);

/** The seek track: rail, buffered ranges, played fill and marker ticks. */
function SeekTrack({
  progress,
  toPosition,
  buffered,
  markers,
  isLive,
}: {
  progress: number;
  toPosition: (seconds: number) => number;
  buffered: readonly MediaTimeRange[];
  markers: readonly MediaMarker[];
  isLive: boolean;
}) {
  return (
    <>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-4">
        {buffered.map((range) => {
          const start = toPosition(range.start);
          const end = toPosition(range.end);
          return (
            <span
              key={`${String(range.start)}-${String(range.end)}`}
              aria-hidden="true"
              className="absolute inset-y-0 bg-border-strong"
              // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the buffered range's position
              style={{
                insetInlineStart: `${String(start * 100)}%`,
                width: `${String(Math.max(0, end - start) * 100)}%`,
              }}
            />
          );
        })}
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-y-0 start-0',
            isLive ? 'bg-danger-solid' : 'bg-accent-solid',
          )}
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the played part of the timeline
          style={{ width: `${String(progress * 100)}%` }}
        />
      </div>
      {markers.map((marker) => (
        <span
          key={`${String(marker.at)}-${marker.label}`}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg rtl:translate-x-1/2"
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the marker's position on the timeline
          style={{ insetInlineStart: `${String(toPosition(marker.at) * 100)}%` }}
        />
      ))}
    </>
  );
}

/** Play/pause, seek, time, skip, speed, volume and live controls, shared by every player. */
export function MediaTransport({
  isPlaying,
  onPlayingChange,
  currentTime,
  duration,
  onSeek,
  buffered = [],
  markers = [],
  hasSeekBar = true,
  timeline,
  skipSeconds = 15,
  hasSkipButtons,
  playbackRate = 1,
  playbackRates = DEFAULT_RATES,
  onPlaybackRateChange,
  volume = 1,
  onVolumeChange,
  isMuted = false,
  onMutedChange,
  onPrevious,
  onNext,
  isLive = false,
  seekable,
  liveEdge: liveEdgeProp,
  onGoLive,
  isWaiting = false,
  layout = 'full',
  isDisabled = false,
  children,
  'aria-label': ariaLabel,
  className,
  ref,
}: MediaTransportProps) {
  const messages = useMediaPlayerMessages();
  const formatRate = useRateFormatter(messages);
  const [isRemainingShown, setRemainingShown] = useState(false);
  const timeDescriptionId = useId();
  const [scrub, setScrub] = useState<number | null>(null);
  const isCompact = layout === 'compact';
  const showSkip = hasSkipButtons ?? !isCompact;

  const liveEdge = liveEdgeProp ?? seekable?.end;
  const hasDuration = Number.isFinite(duration) && duration > 0;
  // A live stream seeks within its DVR window, when it has one worth scrubbing.
  const hasDvr = isLive && seekable !== undefined && seekable.end - seekable.start > 15;
  const isAtEdge = isLive && atLiveEdge(currentTime, liveEdge);
  const minValue = isLive ? (seekable?.start ?? 0) : 0;
  const maxValue = isLive ? (seekable?.end ?? 0) : hasDuration ? duration : 0;
  const shownTime = scrub ?? currentTime;
  const total = formatMediaTime(duration);
  const elapsed = formatMediaTime(shownTime, duration);
  const remaining = formatMediaTime(hasDuration ? duration - shownTime : Number.NaN, duration);

  const valueText = (value: number) => {
    if (isLive) {
      const behind = (liveEdge ?? value) - value;
      return atLiveEdge(value, liveEdge)
        ? messages.mediaPositionLive
        : messages.mediaPositionBehindLive({ behind: formatMediaTime(behind) });
    }
    return messages.mediaPositionValue({
      elapsed: formatMediaTime(value, duration),
      total,
    });
  };

  const seekBy = (delta: number) => {
    const upper = isLive ? (liveEdge ?? currentTime + delta) : hasDuration ? duration : currentTime;
    onSeek(Math.min(upper, Math.max(minValue, currentTime + delta)));
  };
  const goLive = () => {
    if (onGoLive) {
      onGoLive();
    } else if (liveEdge !== undefined) {
      onSeek(liveEdge);
    }
  };

  // Space plays and pauses and the arrows seek anywhere in the transport, unless a control needs the key.
  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    const action = mediaKeyAction(event);
    if (isDisabled || !action) {
      return;
    }
    if (action.type === 'toggle') {
      onPlayingChange(!isPlaying);
    } else if (action.type === 'seek' && (!isLive || hasDvr)) {
      seekBy(action.delta);
    } else if (action.type === 'mute' && onMutedChange) {
      onMutedChange(!isMuted);
    } else {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  const seekBar =
    timeline !== undefined ? (
      <div className={cn('min-w-0', isCompact ? 'flex-1' : 'w-full')}>{timeline}</div>
    ) : hasSeekBar && (isLive ? hasDvr : true) ? (
      <SeekSlider
        aria-label={messages.mediaPosition}
        value={currentTime}
        minValue={minValue}
        maxValue={maxValue}
        valueText={valueText}
        onSeek={onSeek}
        onScrub={setScrub}
        isDisabled={isDisabled || (!isLive && !hasDuration)}
        trackClassName={trackClasses}
        thumbClassName={thumbClasses}
        className={isCompact ? 'flex-1' : 'w-full'}
        renderTrack={(progress, toPosition) => (
          <SeekTrack
            progress={progress}
            toPosition={toPosition}
            buffered={isLive ? [] : buffered}
            markers={markers}
            isLive={isLive}
          />
        )}
      />
    ) : null;

  const playButton = (
    <IconButton
      icon={isPlaying ? Pause : Play}
      aria-label={isPlaying ? messages.mediaPause : messages.mediaPlay}
      variant="solid"
      tone="accent"
      size={isCompact ? 'sm' : 'md'}
      className="rounded-full"
      isDisabled={isDisabled}
      onPress={() => {
        onPlayingChange(!isPlaying);
      }}
    />
  );

  const timeReadout = isLive ? (
    <Button
      size="sm"
      variant={isAtEdge ? 'soft' : 'outline'}
      tone={isAtEdge ? 'danger' : 'neutral'}
      isDisabled={isDisabled}
      onPress={goLive}
      className="shrink-0"
    >
      <span
        aria-hidden="true"
        className={cn('size-2 rounded-full', isAtEdge ? 'bg-danger-solid' : 'bg-fg-muted')}
      />
      {isAtEdge ? messages.mediaLive : messages.mediaGoLive}
    </Button>
  ) : (
    // The visible time is the button's name; the full sentence ("1:23 elapsed of 4:56") describes it.
    <>
      <AriaButton
        aria-describedby={timeDescriptionId}
        isDisabled={isDisabled}
        onPress={() => {
          setRemainingShown((shown) => !shown);
        }}
        className={cn(
          'hit-area shrink-0 cursor-pointer rounded-control px-1 font-mono text-xs whitespace-nowrap text-fg-muted tabular-nums outline-none',
          'data-focus-visible:focus-ring data-hovered:text-fg data-disabled:cursor-not-allowed',
        )}
      >
        {isRemainingShown ? messages.mediaRemainingShort({ remaining }) : elapsed}
        {!isCompact && ` / ${total}`}
      </AriaButton>
      <span id={timeDescriptionId} hidden>
        {isRemainingShown
          ? messages.mediaTimeRemaining({ remaining, total })
          : messages.mediaTimeElapsed({ elapsed, total })}
      </span>
    </>
  );

  const rateMenu =
    onPlaybackRateChange && playbackRates.length > 1 ? (
      <MenuTrigger>
        <Button
          size="sm"
          variant="ghost"
          aria-label={messages.mediaPlaybackRateValue({ rate: formatRate(playbackRate) })}
          isDisabled={isDisabled}
          className="shrink-0 tabular-nums"
        >
          {formatRate(playbackRate)}
        </Button>
        <Menu
          aria-label={messages.mediaPlaybackRate}
          selectionMode="single"
          selectedKeys={[String(playbackRate)]}
          disallowEmptySelection
          onAction={(key) => {
            onPlaybackRateChange(Number(key));
          }}
          className="min-w-28"
        >
          {playbackRates.map((rate) => (
            <MenuItem key={rate} id={String(rate)}>
              {formatRate(rate)}
            </MenuItem>
          ))}
        </Menu>
      </MenuTrigger>
    ) : null;

  const markersMenu =
    markers.length > 0 ? (
      <MenuTrigger>
        <Tooltip content={messages.mediaMarkers}>
          <IconButton
            icon={ListOrdered}
            size="sm"
            aria-label={messages.mediaMarkers}
            isDisabled={isDisabled}
          />
        </Tooltip>
        <Menu
          aria-label={messages.mediaMarkers}
          onAction={(key) => {
            const marker = markers[Number(key)];
            if (marker) {
              onSeek(marker.at);
            }
          }}
        >
          {markers.map((marker, index) => (
            <MenuItem
              key={`${String(marker.at)}-${marker.label}`}
              id={String(index)}
              textValue={marker.label}
              shortcut={formatMediaTime(marker.at, duration)}
            >
              {marker.label}
            </MenuItem>
          ))}
        </Menu>
      </MenuTrigger>
    ) : null;

  const volumeControls = (
    <>
      {onMutedChange && (
        <IconButton
          icon={isMuted || volume === 0 ? VolumeX : Volume2}
          size="sm"
          aria-label={messages.mediaMute}
          isSelected={isMuted}
          onChange={onMutedChange}
          isDisabled={isDisabled}
        />
      )}
      {onVolumeChange && !isCompact && (
        <Slider
          aria-label={messages.mediaVolume}
          isValueHidden
          minValue={0}
          maxValue={1}
          step={0.05}
          value={isMuted ? 0 : volume}
          onChange={onVolumeChange}
          formatOptions={{ style: 'percent' }}
          isDisabled={isDisabled}
          className="hidden w-28 shrink-0 @lg:flex"
        />
      )}
    </>
  );

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      onKeyDownCapture={onKeyDownCapture}
      className={cn('@container flex min-w-0 flex-col gap-1', className)}
    >
      {!isCompact && seekBar}
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {onPrevious && (
          <Tooltip content={messages.mediaPreviousTrack}>
            <IconButton
              icon={SkipBack}
              size="sm"
              aria-label={messages.mediaPreviousTrack}
              onPress={onPrevious}
              isDisabled={isDisabled}
            />
          </Tooltip>
        )}
        {showSkip && (!isLive || hasDvr) && (
          <Tooltip content={messages.mediaSkipBack({ seconds: skipSeconds })}>
            <IconButton
              icon={RotateCcw}
              size="sm"
              aria-label={messages.mediaSkipBack({ seconds: skipSeconds })}
              isDisabled={isDisabled}
              onPress={() => {
                seekBy(-skipSeconds);
              }}
            />
          </Tooltip>
        )}
        {playButton}
        {showSkip && (!isLive || hasDvr) && (
          <Tooltip content={messages.mediaSkipForward({ seconds: skipSeconds })}>
            <IconButton
              icon={RotateCw}
              size="sm"
              aria-label={messages.mediaSkipForward({ seconds: skipSeconds })}
              isDisabled={isDisabled || isAtEdge}
              onPress={() => {
                seekBy(skipSeconds);
              }}
            />
          </Tooltip>
        )}
        {onNext && (
          <Tooltip content={messages.mediaNextTrack}>
            <IconButton
              icon={SkipForward}
              size="sm"
              aria-label={messages.mediaNextTrack}
              onPress={onNext}
              isDisabled={isDisabled}
            />
          </Tooltip>
        )}
        {isCompact && seekBar}
        <div className={cn('flex shrink-0 items-center gap-1', !isCompact && 'ms-1')}>
          {timeReadout}
          {isWaiting && <SpinnerIcon className="size-4 text-fg-muted" />}
        </div>
        <span className="sr-only" aria-live="polite">
          {isWaiting ? messages.mediaBuffering : ''}
        </span>
        <div className={cn('flex min-w-0 items-center gap-1', !isCompact && 'ms-auto')}>
          {markersMenu}
          {rateMenu}
          {volumeControls}
          {children}
        </div>
      </div>
    </div>
  );
}
