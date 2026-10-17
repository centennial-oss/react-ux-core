// AudioPlayer (FR-037): plays an MP3/AAC/Opus file (or an HLS audio stream, through hls.js loaded on demand) with
// the shared MediaTransport, in three sizes: `full` (artwork, title, waveform, transport and volume), `compact` (a
// title line over one row of controls) and `inline` (play, a small waveform or seek bar and the time, for a message
// bubble). Only one player plays at a time (`exclusiveGroup`), the system media controls follow the playing track
// (Media Session API), a playlist adds previous and next, and failures say what went wrong (404, CORS, codec). It
// never autoplays: playback starts from a press, Space, or the system controls.

import { CircleAlert } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import { Skeleton } from '../../components/Skeleton/Skeleton';
import { cn } from '../../utils/cn';
import { mergeRefs } from '../../utils/mergeRefs';
import { DEFAULT_EXCLUSIVE_GROUP, useExclusivePlayback } from './exclusive';
import { diagnoseMediaError, mediaErrorMessage, type MediaErrorKind } from './mediaErrors';
import type { EffectRun } from './mediaDom';
import { mediaKeyAction } from './mediaKeys';
import { useMediaSession } from './mediaSession';
import { MediaTransport, transportPropsFromMedia } from './MediaTransport';
import { useMediaPlayerMessages } from './messages';
import { decodePeaks } from './peaks';
import {
  attachMediaSource,
  inferMediaType,
  MediaSourceError,
  type MediaSourceLoader,
} from './source';
import type { MediaMarker } from './time';
import { useMediaElement } from './useMediaElement';
import { Waveform } from './Waveform';

export interface AudioTrack {
  id: string;
  /** A URL (a CDN file, a blob URL) or an HLS playlist (.m3u8). */
  src: string;
  title: string;
  artist?: string;
  /** Cover art, shown in the `full` variant and the system media controls. */
  artworkSrc?: string;
  /** The length, if known, shown before the file's metadata loads. */
  durationMs?: number;
  /** The MIME type, such as `audio/mpeg`, or `application/vnd.apple.mpegurl` for HLS. */
  type?: string;
}

/** A point on the timeline, such as a chapter or a comment. `at` is in milliseconds. */
export interface AudioMarker {
  at: number;
  label: string;
}

export interface AudioPlayerProps {
  track: AudioTrack;
  /** A queue with previous and next; `track` must be one of them. It advances on its own at the end of a track. */
  playlist?: readonly AudioTrack[];
  /** Called with the new track's id when previous, next or the end of a track changes it. */
  onTrackChange?: (id: string) => void;
  /** `full` (artwork, waveform, transport, volume), `compact` (one row) or `inline` (for chat bubbles). Defaults to `full`. */
  variant?: 'full' | 'compact' | 'inline';
  /** A waveform: precomputed peaks (recommended for CDN files), or `decode` to decode small files (under 8 MB) in the browser. */
  waveform?: { peaks: readonly number[] } | 'decode';
  /** Speeds in the speed menu. Defaults to `[0.75, 1, 1.25, 1.5, 2]`. */
  playbackRates?: readonly number[];
  /** Sets the system media controls (lock screen, headphones) through the Media Session API. Defaults to true. */
  shouldUseMediaSession?: boolean;
  /** Marks points on the timeline, such as chapters or comments (milliseconds). */
  markers?: readonly AudioMarker[];
  /** Called as playback moves, with the position in milliseconds. */
  onTimeUpdate?: (ms: number) => void;
  onEnded?: () => void;
  /** Players in the same group pause each other. Defaults to one shared group; `null` lets this one play alongside others. */
  exclusiveGroup?: string | null;
  /** Seconds the skip buttons move. Defaults to 15. */
  skipSeconds?: number;
  /** CORS mode for the audio element. Needed for `waveform="decode"` from another origin. */
  crossOrigin?: 'anonymous' | 'use-credentials';
  /** Plays formats the library doesn't (see `MediaSourceLoader`). */
  loadSource?: MediaSourceLoader;
  /** Defaults to `metadata`. */
  preload?: 'none' | 'metadata' | 'auto';
  /** The <audio> element, for apps that need it. */
  mediaRef?: Ref<HTMLAudioElement>;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** Plays audio with the shared transport, a waveform, a playlist and the system media controls. */
export function AudioPlayer({
  track: trackProp,
  playlist,
  onTrackChange,
  variant = 'full',
  waveform,
  playbackRates,
  shouldUseMediaSession = true,
  markers: markersMs,
  onTimeUpdate,
  onEnded,
  exclusiveGroup = DEFAULT_EXCLUSIVE_GROUP,
  skipSeconds = 15,
  crossOrigin,
  loadSource,
  preload = 'metadata',
  mediaRef,
  className,
  ref,
}: AudioPlayerProps) {
  const messages = useMediaPlayerMessages();
  const [element, setElement] = useState<HTMLAudioElement | null>(null);
  const media = useMediaElement(element);
  const { state, controls } = media;

  // The current track: the prop, until previous/next or the end of a track moves along the playlist.
  const [trackId, setTrackId] = useState(trackProp.id);
  const [syncedId, setSyncedId] = useState(trackProp.id);
  if (syncedId !== trackProp.id) {
    setSyncedId(trackProp.id);
    setTrackId(trackProp.id);
  }
  const track = playlist?.find((item) => item.id === trackId) ?? trackProp;
  const index = playlist?.findIndex((item) => item.id === track.id) ?? -1;
  const previous = playlist && index > 0 ? playlist[index - 1] : undefined;
  const next = playlist && index >= 0 ? playlist[index + 1] : undefined;
  const shouldResume = useRef(false);

  const changeTrack = (id: string, isResuming: boolean) => {
    shouldResume.current = isResuming;
    setTrackId(id);
    onTrackChange?.(id);
  };

  // Attach the source; a stream type loads hls.js (or the app's loader) only when needed.
  // A failure belongs to its source, so a new track starts clean.
  const [failure, setFailure] = useState<{ src: string; kind: MediaErrorKind } | null>(null);
  const { src, type: mime } = track;
  const errorKind = failure?.src === src ? failure.kind : null;
  useEffect(() => {
    if (!element) {
      return;
    }
    const run: EffectRun = { isCurrent: true };
    let destroy: (() => void) | undefined;
    const fail = (kind: MediaErrorKind) => {
      if (run.isCurrent) {
        setFailure({ src, kind });
      }
    };
    attachMediaSource(element, {
      src,
      type: inferMediaType(src, 'auto', mime),
      loadSource,
      onFatalError: fail,
    }).then(
      (attached) => {
        if (!run.isCurrent) {
          attached.destroy();
          return;
        }
        destroy = attached.destroy;
        if (shouldResume.current) {
          shouldResume.current = false;
          element.play().catch(() => undefined);
        }
      },
      (error: unknown) => {
        fail(error instanceof MediaSourceError ? error.kind : 'generic');
      },
    );
    const onError = () => {
      void diagnoseMediaError(src, element.error?.code).then(fail);
    };
    element.addEventListener('error', onError);
    return () => {
      run.isCurrent = false;
      element.removeEventListener('error', onError);
      destroy?.();
    };
  }, [element, src, mime, loadSource]);

  // The end of a track: tell the app, then move along the playlist.
  const latest = useRef({ next, onEnded, changeTrack });
  useEffect(() => {
    latest.current = { next, onEnded, changeTrack };
  });
  useEffect(() => {
    if (!element) {
      return;
    }
    const onEnd = () => {
      const { next: following, onEnded: ended, changeTrack: change } = latest.current;
      ended?.();
      if (following) {
        change(following.id, true);
      }
    };
    element.addEventListener('ended', onEnd);
    return () => {
      element.removeEventListener('ended', onEnd);
    };
  }, [element]);

  useEffect(() => {
    onTimeUpdate?.(Math.round(state.currentTime * 1000));
    // Only the time drives this; a new callback identity alone shouldn't report again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentTime]);

  useExclusivePlayback(element, exclusiveGroup);

  const goPrevious = () => {
    // Like most players: past the first few seconds, previous restarts the track.
    if (state.currentTime > 3 || !previous) {
      controls.seek(0);
    } else {
      changeTrack(previous.id, state.isPlaying);
    }
  };
  const goNext = next
    ? () => {
        changeTrack(next.id, state.isPlaying);
      }
    : undefined;

  useMediaSession(
    element,
    shouldUseMediaSession,
    { title: track.title, artist: track.artist, artworkSrc: track.artworkSrc },
    {
      onPlay: controls.play,
      onPause: controls.pause,
      onSeekBy: controls.skip,
      onSeekTo: controls.seek,
      onPreviousTrack: playlist ? goPrevious : undefined,
      onNextTrack: goNext,
    },
    skipSeconds,
  );

  // The waveform: given peaks, or decoded from a small file.
  const [decoded, setDecoded] = useState<{ src: string; peaks: number[] | null } | null>(null);
  const isDecoding = waveform === 'decode' && decoded?.src !== src;
  useEffect(() => {
    if (waveform !== 'decode') {
      return;
    }
    const controller = new AbortController();
    decodePeaks(src, { signal: controller.signal }).then(
      (peaks) => {
        setDecoded({ src, peaks });
      },
      () => {
        if (!controller.signal.aborted) {
          // Too large, cross-origin without CORS, or undecodable: fall back to the seek slider.
          setDecoded({ src, peaks: null });
        }
      },
    );
    return () => {
      controller.abort();
    };
  }, [waveform, src]);
  const peaks =
    waveform === undefined
      ? null
      : waveform === 'decode'
        ? decoded?.src === src
          ? decoded.peaks
          : null
        : waveform.peaks;

  const knownDuration = Number.isFinite(state.duration)
    ? state.duration
    : track.durationMs !== undefined
      ? track.durationMs / 1000
      : Number.NaN;
  const markers = useMemo<MediaMarker[]>(
    () => (markersMs ?? []).map((marker) => ({ at: marker.at / 1000, label: marker.label })),
    [markersMs],
  );

  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    const action = mediaKeyAction(event);
    if (!action) {
      return;
    }
    if (action.type === 'toggle') {
      controls.setPlaying(!state.isPlaying);
    } else if (action.type === 'seek') {
      controls.skip(action.delta);
    } else if (action.type === 'mute') {
      controls.setMuted(!state.isMuted);
    } else {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  const isInline = variant === 'inline';
  const waveformSize = isInline ? 'sm' : variant === 'compact' ? 'sm' : 'md';
  const timeline = isDecoding ? (
    <Skeleton shape="rect" height={waveformSize === 'sm' ? 32 : 56} className="w-full" />
  ) : peaks ? (
    <Waveform
      peaks={peaks}
      currentTime={state.currentTime}
      duration={knownDuration}
      onSeek={controls.seek}
      markers={markers}
      size={waveformSize}
    />
  ) : undefined;

  const transport = (
    <MediaTransport
      {...transportPropsFromMedia(media)}
      duration={knownDuration}
      layout={variant === 'full' ? 'full' : 'compact'}
      timeline={timeline}
      markers={isInline ? [] : markers}
      skipSeconds={skipSeconds}
      hasSkipButtons={variant === 'full'}
      playbackRates={playbackRates}
      onPlaybackRateChange={isInline ? undefined : controls.setPlaybackRate}
      onVolumeChange={variant === 'full' ? controls.setVolume : undefined}
      onMutedChange={isInline ? undefined : controls.setMuted}
      onPrevious={variant === 'full' && playlist ? goPrevious : undefined}
      onNext={variant === 'full' ? goNext : undefined}
    />
  );

  const errorMessage = errorKind ? mediaErrorMessage(errorKind, messages) : null;
  const trackLabel = messages.mediaTrackLabel({ title: track.title, artist: track.artist });

  return (
    // The group takes the player's shortcuts (Space, arrows, M) from whichever control inside has focus.
    <div
      ref={ref}
      role="group"
      aria-label={trackLabel}
      data-variant={variant}
      onKeyDownCapture={onKeyDownCapture}
      className={cn(
        '@container min-w-0 text-fg',
        isInline
          ? 'flex w-full max-w-sm flex-col gap-1'
          : 'flex flex-col gap-2 rounded-card border border-border bg-surface-1',
        variant === 'full' && 'gap-3 p-3 sm:p-4',
        variant === 'compact' && 'p-2',
        className,
      )}
    >
      {/* Audio has no captions track: transcripts, where there are any, belong next to the player. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={mergeRefs(setElement, mediaRef)}
        preload={preload}
        crossOrigin={crossOrigin}
        className="hidden"
      />
      {variant === 'full' && (
        <div className="flex min-w-0 items-center gap-3">
          {track.artworkSrc && (
            <img
              src={track.artworkSrc}
              alt=""
              className="size-14 shrink-0 rounded-control bg-surface-3 object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{track.title}</p>
            {track.artist && <p className="truncate text-sm text-fg-muted">{track.artist}</p>}
          </div>
        </div>
      )}
      {variant === 'compact' && (
        <p className="truncate px-1 text-sm">
          <span className="font-medium">{track.title}</span>
          {track.artist && <span className="text-fg-muted"> · {track.artist}</span>}
        </p>
      )}
      {transport}
      {errorMessage && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-danger-fg">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="font-medium">{messages.mediaErrorTitle}</span> {errorMessage}
          </span>
        </p>
      )}
    </div>
  );
}
