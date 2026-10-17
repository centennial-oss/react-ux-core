// VideoPlayer (FR-038): plays a progressive file, an HLS stream (natively where the browser can, otherwise through
// hls.js loaded on demand) or a DASH stream (natively, or through the app's `loadSource`, since dash.js isn't
// bundled), with the shared MediaTransport below the picture. Live streams get "Go live" and a DVR window when the
// stream has one; HLS through hls.js gets a quality menu (Auto plus the ladder) and detailed stats. Captions,
// picture-in-picture and full screen are built in. Stats show as an overlay of real text (`hasStatsOverlay`) and go
// to `onStats` once a second. Keyboard: Space plays and pauses, F full screen, M mute, C captions, arrows seek.
// It only autoplays muted.

import type Hls from 'hls.js';
import type { HlsConfig, LevelLoadedData } from 'hls.js';
import {
  Activity,
  Captions,
  CircleAlert,
  Maximize,
  Minimize,
  PictureInPicture2,
  Play,
  Settings2,
} from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { useLocale } from 'react-aria-components';
import { IconButton } from '../../components/IconButton/IconButton';
import { Menu, MenuItem, MenuTrigger } from '../../components/Menu/Menu';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { cn } from '../../utils/cn';
import { mergeRefs } from '../../utils/mergeRefs';
import { useDeadlineTimer } from '../../utils/timers';
import { useExclusivePlayback } from './exclusive';
import { playMuted, setElementMuted, setHlsLevel, showTextTrack, type EffectRun } from './mediaDom';
import { diagnoseMediaError, mediaErrorMessage, type MediaErrorKind } from './mediaErrors';
import { mediaKeyAction } from './mediaKeys';
import { MediaTransport, transportPropsFromMedia } from './MediaTransport';
import { useMediaPlayerMessages, type MediaPlayerStrings } from './messages';
import {
  attachMediaSource,
  inferMediaType,
  MediaSourceError,
  type MediaSourceLoader,
  type MediaSourceType,
} from './source';
import { collectStats, type PlaybackStats, type StatsSample } from './stats';
import { useMediaElement } from './useMediaElement';

export type { PlaybackStats } from './stats';

export interface VideoCaption {
  /** A WebVTT file. */
  src: string;
  srcLang: string;
  label: string;
  isDefault?: boolean;
}

export interface VideoPlayerProps {
  src: string;
  /** `auto` infers from the extension: .m3u8 (HLS), .mpd (DASH), otherwise progressive. Defaults to `auto`. */
  type?: MediaSourceType;
  poster?: string;
  /** Names the player for assistive technology. */
  title: string;
  /** A live stream. Detected from the stream when it can be (an endless duration). */
  isLive?: boolean;
  /** Muted. Autoplay always starts muted. Defaults to false. */
  isMuted?: boolean;
  /** Called when the mute toggle (or M) changes the muting. */
  onMutedChange?: (isMuted: boolean) => void;
  /** Starts playing (muted) as soon as it can. Defaults to false. */
  shouldAutoPlay?: boolean;
  captions?: readonly VideoCaption[];
  /** Overlays playback stats (rendition, bitrate, resolution, fps, buffer, dropped frames, live latency), with a toggle. */
  hasStatsOverlay?: boolean;
  /** Called with playback stats once a second while mounted. */
  onStats?: (stats: PlaybackStats) => void;
  /** The rendition picker (Auto plus the ladder). Defaults to true; it shows when hls.js plays the stream. */
  hasQualityMenu?: boolean;
  /** `full` (the default), `compact` (one row) or `none` (no controls, for preview tiles). */
  controlsLayout?: 'full' | 'compact' | 'none';
  /** Pauses (and stops downloading) while scrolled out of view, resuming when back. Defaults to false. */
  shouldPauseOffscreen?: boolean;
  /** Speeds in the speed menu (not shown for live streams). */
  playbackRates?: readonly number[];
  /** Seconds the skip buttons move. Defaults to 10. */
  skipSeconds?: number;
  /** The picture's shape. Defaults to `16/9`. */
  aspectRatio?: '16/9' | '4/3' | '1/1' | '9/16';
  /** Players in the same group pause each other. Defaults to `null` (none), so previews can play side by side. */
  exclusiveGroup?: string | null;
  /** Plays formats the library doesn't, such as DASH through dash.js (see `MediaSourceLoader`). */
  loadSource?: MediaSourceLoader;
  /** Extra hls.js configuration. */
  hlsConfig?: Partial<HlsConfig>;
  /** CORS mode for the video element (needed for captions from another origin). */
  crossOrigin?: 'anonymous' | 'use-credentials';
  /** Content over the picture's top end corner, such as a status chip. */
  overlay?: ReactNode;
  /** The <video> element, for apps that need it. */
  mediaRef?: Ref<HTMLVideoElement>;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const aspectClasses = {
  '16/9': 'aspect-video',
  '4/3': 'aspect-[4/3]',
  '1/1': 'aspect-square',
  '9/16': 'aspect-[9/16]',
} as const;

interface QualityLevel {
  index: number;
  label: string;
  height: number;
  bitrate: number;
}

interface CaptionTrack {
  index: number;
  label: string;
}

function formatBitrate(messages: MediaPlayerStrings, bitrate: number) {
  return messages.mediaBitrate({ kbps: bitrate / 1000 });
}

/** Whether the element can only go full screen on its own (iPhone Safari). */
function hasNativeFullScreen(
  element: HTMLVideoElement,
): element is HTMLVideoElement & { webkitEnterFullscreen: () => void } {
  return (
    typeof (element as { webkitEnterFullscreen?: unknown }).webkitEnterFullscreen === 'function'
  );
}

/** The stats overlay: a description list of real text, so it's readable and copyable. */
function StatsOverlay({
  stats,
  messages,
}: {
  stats: PlaybackStats | null;
  messages: MediaPlayerStrings;
}) {
  const { locale } = useLocale();
  const decimal = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const unknown = messages.mediaStatsUnknown;
  const rows: [string, string][] = [
    [messages.mediaStatsRendition, stats?.rendition ?? unknown],
    [
      messages.mediaStatsBitrate,
      stats?.bitrateKbps !== undefined
        ? messages.mediaBitrate({ kbps: stats.bitrateKbps })
        : unknown,
    ],
    [
      messages.mediaStatsBandwidth,
      stats?.bandwidthKbps !== undefined
        ? messages.mediaBitrate({ kbps: stats.bandwidthKbps })
        : unknown,
    ],
    [
      messages.mediaStatsResolution,
      stats?.width && stats.height ? `${String(stats.width)}×${String(stats.height)}` : unknown,
    ],
    [messages.mediaStatsFps, stats?.fps !== undefined ? decimal.format(stats.fps) : unknown],
    [
      messages.mediaStatsBuffer,
      stats ? messages.mediaSeconds({ seconds: decimal.format(stats.bufferSeconds) }) : unknown,
    ],
    [
      messages.mediaStatsDropped,
      stats?.droppedFrames !== undefined && stats.totalFrames !== undefined
        ? messages.mediaFrames({ dropped: stats.droppedFrames, total: stats.totalFrames })
        : unknown,
    ],
  ];
  if (stats?.liveLatencySeconds !== undefined) {
    rows.push([
      messages.mediaStatsLatency,
      messages.mediaSeconds({ seconds: decimal.format(stats.liveLatencySeconds) }),
    ]);
  }
  return (
    <section
      aria-label={messages.mediaStats}
      className="absolute start-2 top-2 max-w-[calc(100%-1rem)] rounded-control bg-surface-1/90 px-2 py-1.5 font-mono text-xs text-fg shadow-raised"
    >
      <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Plays progressive, HLS and DASH video with the shared transport, live controls, quality, captions and stats. */
export function VideoPlayer({
  src,
  type = 'auto',
  poster,
  title,
  isLive: isLiveProp = false,
  isMuted = false,
  onMutedChange,
  shouldAutoPlay = false,
  captions = [],
  hasStatsOverlay = false,
  onStats,
  hasQualityMenu = true,
  controlsLayout = 'full',
  shouldPauseOffscreen = false,
  playbackRates,
  skipSeconds = 10,
  aspectRatio = '16/9',
  exclusiveGroup = null,
  loadSource,
  hlsConfig,
  crossOrigin,
  overlay,
  mediaRef,
  className,
  ref,
}: VideoPlayerProps) {
  const messages = useMediaPlayerMessages();
  const [element, setElement] = useState<HTMLVideoElement | null>(null);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const media = useMediaElement(element);
  const { state, controls } = media;
  const resolvedType = inferMediaType(src, type);
  // What the current source attached: hls.js (when it plays the stream) and any failure, keyed by the source so a
  // new source starts clean.
  const attachKey = `${resolvedType}|${src}`;
  const [attached, setAttached] = useState<{ key: string; hls?: Hls } | null>(null);
  const [failure, setFailure] = useState<{ key: string; kind: MediaErrorKind } | null>(null);
  const hls = attached?.key === attachKey ? attached.hls : undefined;
  const errorKind = failure?.key === attachKey ? failure.kind : null;
  const isLive = isLiveProp || state.duration === Number.POSITIVE_INFINITY;

  // Muting follows the prop; autoplay is always muted.
  useEffect(() => {
    if (element) {
      setElementMuted(element, isMuted || (shouldAutoPlay && !state.hasStarted && element.paused));
    }
    // Only the prop (and a new element) set the muting; the user's toggle changes it in between.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element, isMuted]);
  const latestMuted = useRef(onMutedChange);
  useEffect(() => {
    latestMuted.current = onMutedChange;
  });
  useEffect(() => {
    if (!element) {
      return;
    }
    let wasMuted = element.muted;
    const onVolume = () => {
      if (element.muted !== wasMuted) {
        wasMuted = element.muted;
        latestMuted.current?.(element.muted);
      }
    };
    element.addEventListener('volumechange', onVolume);
    return () => {
      element.removeEventListener('volumechange', onVolume);
    };
  }, [element]);

  // Attach the source.
  const autoPlayRef = useRef(shouldAutoPlay);
  useEffect(() => {
    autoPlayRef.current = shouldAutoPlay;
  });
  useEffect(() => {
    if (!element) {
      return;
    }
    const key = `${resolvedType}|${src}`;
    const run: EffectRun = { isCurrent: true };
    let destroy: (() => void) | undefined;
    const fail = (kind: MediaErrorKind) => {
      if (run.isCurrent) {
        setFailure({ key, kind });
      }
    };
    attachMediaSource(element, {
      src,
      type: resolvedType,
      loadSource,
      hlsConfig,
      onFatalError: fail,
    }).then(
      (result) => {
        if (!run.isCurrent) {
          result.destroy();
          return;
        }
        destroy = result.destroy;
        setAttached({ key, hls: result.hls });
        if (autoPlayRef.current) {
          playMuted(element);
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
    // hlsConfig is read when attaching; a new object each render shouldn't reattach.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element, src, resolvedType, loadSource]);

  useExclusivePlayback(element, exclusiveGroup);

  // The quality ladder, from hls.js.
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [isAutoLevel, setAutoLevel] = useState(true);
  const [hlsLive, setHlsLive] = useState(false);
  useEffect(() => {
    if (!hls) {
      return;
    }
    const Events = (hls.constructor as typeof Hls).Events;
    const readLevels = () => {
      setLevels(
        hls.levels
          .map((level, index) => ({
            index,
            height: level.height,
            bitrate: level.bitrate,
            label: messages.mediaRendition({
              height: level.height || undefined,
              bitrate: formatBitrate(messages, level.bitrate),
            }),
          }))
          .sort((a, b) => b.height - a.height || b.bitrate - a.bitrate),
      );
    };
    const onSwitched = () => {
      setCurrentLevel(hls.currentLevel);
      setAutoLevel(hls.autoLevelEnabled);
    };
    const onLevelLoaded = (_event: unknown, data: LevelLoadedData) => {
      setHlsLive(data.details.live);
    };
    hls.on(Events.MANIFEST_PARSED, readLevels);
    hls.on(Events.LEVELS_UPDATED, readLevels);
    hls.on(Events.LEVEL_SWITCHED, onSwitched);
    hls.on(Events.LEVEL_LOADED, onLevelLoaded);
    readLevels();
    return () => {
      hls.off(Events.MANIFEST_PARSED, readLevels);
      hls.off(Events.LEVELS_UPDATED, readLevels);
      hls.off(Events.LEVEL_SWITCHED, onSwitched);
      hls.off(Events.LEVEL_LOADED, onLevelLoaded);
    };
  }, [hls, messages]);
  const live = isLive || (hls !== undefined && hlsLive);
  const shownLevels = hls ? levels : [];

  // Captions: the element's text tracks (the `captions` prop, plus any the stream carries).
  const [captionTracks, setCaptionTracks] = useState<CaptionTrack[]>([]);
  const [captionIndex, setCaptionIndex] = useState(-1);
  const lastCaption = useRef(-1);
  useEffect(() => {
    if (!element) {
      return;
    }
    const tracks = element.textTracks;
    const read = () => {
      const list: CaptionTrack[] = [];
      let showing = -1;
      for (let index = 0; index < tracks.length; index += 1) {
        const track = tracks[index];
        if (track && (track.kind === 'captions' || track.kind === 'subtitles')) {
          list.push({ index, label: track.label || track.language || String(index + 1) });
          if (track.mode === 'showing') {
            showing = index;
          }
        }
      }
      setCaptionTracks(list);
      setCaptionIndex(showing);
    };
    read();
    tracks.addEventListener('addtrack', read);
    tracks.addEventListener('removetrack', read);
    tracks.addEventListener('change', read);
    return () => {
      tracks.removeEventListener('addtrack', read);
      tracks.removeEventListener('removetrack', read);
      tracks.removeEventListener('change', read);
    };
  }, [element]);
  const showCaption = (index: number) => {
    if (!element) {
      return;
    }
    showTextTrack(element, index);
    if (index >= 0) {
      lastCaption.current = index;
    }
    setCaptionIndex(index);
  };
  const toggleCaptions = () => {
    if (captionIndex >= 0) {
      showCaption(-1);
    } else {
      const fallback = captionTracks[0]?.index ?? -1;
      showCaption(
        captionTracks.some((track) => track.index === lastCaption.current)
          ? lastCaption.current
          : fallback,
      );
    }
  };

  // Picture-in-picture and full screen.
  const [isPip, setPip] = useState(false);
  const [isFullScreen, setFullScreen] = useState(false);
  const canPip =
    typeof document !== 'undefined' &&
    document.pictureInPictureEnabled &&
    state.duration > 0 &&
    element !== null &&
    !element.disablePictureInPicture;
  useEffect(() => {
    if (!element) {
      return;
    }
    const onEnter = () => {
      setPip(true);
    };
    const onLeave = () => {
      setPip(false);
    };
    element.addEventListener('enterpictureinpicture', onEnter);
    element.addEventListener('leavepictureinpicture', onLeave);
    return () => {
      element.removeEventListener('enterpictureinpicture', onEnter);
      element.removeEventListener('leavepictureinpicture', onLeave);
    };
  }, [element]);
  useEffect(() => {
    const onChange = () => {
      setFullScreen(root !== null && document.fullscreenElement === root);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
    };
  }, [root]);
  const togglePip = () => {
    if (!element) {
      return;
    }
    if (document.pictureInPictureElement === element) {
      void document.exitPictureInPicture().catch(() => undefined);
    } else {
      void element.requestPictureInPicture().catch(() => undefined);
    }
  };
  const canFullScreen =
    typeof document !== 'undefined' &&
    (document.fullscreenEnabled || (element !== null && hasNativeFullScreen(element)));
  const toggleFullScreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else if (root && document.fullscreenEnabled) {
      void root.requestFullscreen().catch(() => undefined);
    } else if (element && hasNativeFullScreen(element)) {
      // iPhone: only the video element itself can go full screen, with the system's controls.
      element.webkitEnterFullscreen();
    }
  };

  // Stats: sampled once a second for the overlay and onStats.
  const [isStatsShown, setStatsShown] = useState(hasStatsOverlay);
  const [syncedStatsProp, setSyncedStatsProp] = useState(hasStatsOverlay);
  if (syncedStatsProp !== hasStatsOverlay) {
    setSyncedStatsProp(hasStatsOverlay);
    setStatsShown(hasStatsOverlay);
  }
  const [stats, setStats] = useState<PlaybackStats | null>(null);
  const sample = useRef<StatsSample | undefined>(undefined);
  const statsInputs = useRef({ element, hls, isLiveNow: live, onStats, isStatsShown, messages });
  useEffect(() => {
    statsInputs.current = { element, hls, isLiveNow: live, onStats, isStatsShown, messages };
  });
  const sampleAgain = useRef<() => void>(() => undefined);
  const isSampling = onStats !== undefined || isStatsShown;
  const statsTimer = useDeadlineTimer(() => {
    const inputs = statsInputs.current;
    if (inputs.element) {
      const result = collectStats(
        inputs.element,
        inputs.hls,
        inputs.isLiveNow,
        sample.current,
        (level) =>
          inputs.messages.mediaRendition({
            height: level.height,
            bitrate: formatBitrate(inputs.messages, level.bitrate),
          }),
      );
      sample.current = result.sample;
      inputs.onStats?.(result.stats);
      if (inputs.isStatsShown) {
        setStats(result.stats);
      }
    }
    sampleAgain.current();
  });
  useEffect(() => {
    sampleAgain.current = () => {
      statsTimer.start(1000);
    };
  }, [statsTimer]);
  useEffect(() => {
    if (!isSampling || !element) {
      return;
    }
    statsTimer.start(0);
    return () => {
      statsTimer.clear();
    };
  }, [isSampling, element, statsTimer]);

  // Off-screen pausing: a tile scrolled out of view stops playing and downloading until it's back.
  const pausedOffscreen = useRef(false);
  useEffect(() => {
    if (!shouldPauseOffscreen || !root || !element) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) {
        return;
      }
      if (!entry.isIntersecting && !element.paused) {
        pausedOffscreen.current = true;
        element.pause();
        hls?.stopLoad();
      } else if (entry.isIntersecting && pausedOffscreen.current) {
        pausedOffscreen.current = false;
        hls?.startLoad();
        element.play().catch(() => undefined);
      }
    });
    observer.observe(root);
    return () => {
      observer.disconnect();
    };
  }, [shouldPauseOffscreen, root, element, hls]);

  const liveEdge = hls?.liveSyncPosition ?? state.seekable?.end;
  const goLive = () => {
    if (liveEdge !== undefined) {
      controls.seek(liveEdge);
    }
    controls.play();
  };

  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    const action = mediaKeyAction(event);
    if (!action) {
      return;
    }
    switch (action.type) {
      case 'toggle':
        controls.setPlaying(!state.isPlaying);
        break;
      case 'seek':
        controls.skip(action.delta);
        break;
      case 'mute':
        controls.setMuted(!state.isMuted);
        break;
      case 'fullscreen':
        toggleFullScreen();
        break;
      case 'captions':
        toggleCaptions();
        break;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  const currentLabel = shownLevels.find((level) => level.index === currentLevel)?.label;
  const qualityMenu =
    hasQualityMenu && shownLevels.length > 1 && hls ? (
      <MenuTrigger>
        <Tooltip content={messages.mediaQuality}>
          <IconButton icon={Settings2} size="sm" aria-label={messages.mediaQuality} />
        </Tooltip>
        <Menu
          aria-label={messages.mediaQuality}
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[isAutoLevel ? 'auto' : String(currentLevel)]}
          onAction={(key) => {
            const level = key === 'auto' ? -1 : Number(key);
            setHlsLevel(hls, level);
            setAutoLevel(level === -1);
            if (level >= 0) {
              setCurrentLevel(level);
            }
          }}
        >
          <MenuItem id="auto" textValue={messages.mediaQualityAuto}>
            {currentLabel && isAutoLevel
              ? messages.mediaQualityAutoCurrent({ rendition: currentLabel })
              : messages.mediaQualityAuto}
          </MenuItem>
          {shownLevels.map((level) => (
            <MenuItem key={level.index} id={String(level.index)}>
              {level.label}
            </MenuItem>
          ))}
        </Menu>
      </MenuTrigger>
    ) : null;

  const captionsMenu =
    captionTracks.length > 0 ? (
      <MenuTrigger>
        <Tooltip content={messages.mediaCaptions}>
          <IconButton
            icon={Captions}
            size="sm"
            aria-label={messages.mediaCaptions}
            className={captionIndex >= 0 ? 'text-accent-fg' : undefined}
          />
        </Tooltip>
        <Menu
          aria-label={messages.mediaCaptions}
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[String(captionIndex)]}
          onAction={(key) => {
            showCaption(Number(key));
          }}
        >
          <MenuItem id="-1">{messages.mediaCaptionsOff}</MenuItem>
          {captionTracks.map((track) => (
            <MenuItem key={track.index} id={String(track.index)}>
              {track.label}
            </MenuItem>
          ))}
        </Menu>
      </MenuTrigger>
    ) : null;

  const errorMessage = errorKind ? mediaErrorMessage(errorKind, messages) : null;
  const hasControls = controlsLayout !== 'none';

  return (
    // The group takes the player's shortcuts from whichever control inside has focus.
    <div
      ref={mergeRefs(ref, setRoot)}
      role="group"
      aria-label={title}
      data-fullscreen={isFullScreen || undefined}
      onKeyDownCapture={onKeyDownCapture}
      className={cn(
        'group/video @container relative flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-surface-1 text-fg',
        'data-fullscreen:h-full data-fullscreen:rounded-none data-fullscreen:border-0',
        className,
      )}
    >
      <div
        className={cn(
          'relative w-full overflow-hidden bg-surface-4',
          aspectClasses[aspectRatio],
          'group-data-fullscreen/video:aspect-auto group-data-fullscreen/video:min-h-0 group-data-fullscreen/video:flex-1',
        )}
      >
        {/* Captions come from the `captions` prop and from the stream itself. */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={mergeRefs(setElement, mediaRef)}
          poster={poster}
          playsInline
          preload="metadata"
          crossOrigin={crossOrigin}
          className="absolute inset-0 size-full object-contain"
        >
          {captions.map((caption) => (
            <track
              key={caption.src}
              kind="captions"
              src={caption.src}
              srcLang={caption.srcLang}
              label={caption.label}
              default={caption.isDefault}
            />
          ))}
        </video>
        {hasControls && !state.hasStarted && !state.isPlaying && !errorMessage && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <IconButton
              icon={Play}
              aria-label={messages.mediaPlay}
              variant="solid"
              tone="accent"
              size="lg"
              className="rounded-full shadow-raised"
              onPress={controls.play}
            />
          </div>
        )}
        {isStatsShown && <StatsOverlay stats={stats} messages={messages} />}
        {overlay !== undefined && <div className="absolute end-2 top-2">{overlay}</div>}
        {errorMessage && (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-surface-1/95 p-4 text-center text-sm"
          >
            <CircleAlert aria-hidden="true" className="size-6 text-danger-fg" />
            <p className="font-medium">{messages.mediaErrorTitle}</p>
            <p className="max-w-sm text-fg-muted">{errorMessage}</p>
          </div>
        )}
      </div>
      {hasControls && (
        <MediaTransport
          {...transportPropsFromMedia(media)}
          layout={controlsLayout === 'compact' ? 'compact' : 'full'}
          isLive={live}
          liveEdge={liveEdge ?? undefined}
          onGoLive={goLive}
          skipSeconds={skipSeconds}
          playbackRates={playbackRates}
          onPlaybackRateChange={live ? undefined : controls.setPlaybackRate}
          onVolumeChange={controlsLayout === 'full' ? controls.setVolume : undefined}
          className="px-2 py-1.5"
        >
          {qualityMenu}
          {captionsMenu}
          {hasStatsOverlay && (
            <Tooltip content={messages.mediaStats}>
              <IconButton
                icon={Activity}
                size="sm"
                aria-label={messages.mediaStats}
                isSelected={isStatsShown}
                onChange={setStatsShown}
              />
            </Tooltip>
          )}
          {canPip && (
            <Tooltip
              content={isPip ? messages.mediaExitPictureInPicture : messages.mediaPictureInPicture}
            >
              <IconButton
                icon={PictureInPicture2}
                size="sm"
                aria-label={messages.mediaPictureInPicture}
                isSelected={isPip}
                onChange={togglePip}
              />
            </Tooltip>
          )}
          {canFullScreen && (
            <Tooltip
              content={isFullScreen ? messages.mediaExitFullScreen : messages.mediaFullScreen}
            >
              <IconButton
                icon={isFullScreen ? Minimize : Maximize}
                size="sm"
                aria-label={messages.mediaFullScreen}
                isSelected={isFullScreen}
                onChange={toggleFullScreen}
              />
            </Tooltip>
          )}
        </MediaTransport>
      )}
    </div>
  );
}
