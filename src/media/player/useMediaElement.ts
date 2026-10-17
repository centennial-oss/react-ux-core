// Follows an <audio> or <video> element's state through its events and offers the controls a transport needs. The
// players build on it; apps with their own media element can too: `<MediaTransport {...media.transportProps} />`.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { clamp, timeRangesToArray, type MediaTimeRange } from './time';

export interface MediaElementState {
  isPlaying: boolean;
  /** Playback stalled waiting for data. */
  isWaiting: boolean;
  isEnded: boolean;
  /** Playback has started at least once. */
  hasStarted: boolean;
  currentTime: number;
  /** Seconds; `Infinity` for a live stream, `NaN` before metadata loads. */
  duration: number;
  buffered: MediaTimeRange[];
  /** The last seekable range (the DVR window on a live stream). */
  seekable: MediaTimeRange | undefined;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  /** The element's error, if it failed. */
  error: MediaError | null;
}

export interface MediaElementControls {
  play: () => void;
  pause: () => void;
  setPlaying: (isPlaying: boolean) => void;
  seek: (seconds: number) => void;
  skip: (deltaSeconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (isMuted: boolean) => void;
}

const initialState: MediaElementState = {
  isPlaying: false,
  isWaiting: false,
  isEnded: false,
  hasStarted: false,
  currentTime: 0,
  duration: Number.NaN,
  buffered: [],
  seekable: undefined,
  playbackRate: 1,
  volume: 1,
  isMuted: false,
  error: null,
};

function read(element: HTMLMediaElement, previous: MediaElementState): MediaElementState {
  const seekable = timeRangesToArray(element.seekable);
  return {
    isPlaying: !element.paused,
    isWaiting: previous.isWaiting,
    isEnded: element.ended,
    hasStarted: previous.hasStarted || !element.paused,
    currentTime: element.currentTime,
    duration: element.duration,
    buffered: timeRangesToArray(element.buffered),
    seekable: seekable[seekable.length - 1],
    playbackRate: element.playbackRate,
    volume: element.volume,
    isMuted: element.muted,
    error: element.error,
  };
}

const EVENTS = [
  'play',
  'pause',
  'timeupdate',
  'durationchange',
  'loadedmetadata',
  'progress',
  'ratechange',
  'volumechange',
  'ended',
  'seeked',
  'emptied',
  'error',
  'canplay',
] as const;

/** The element's state and controls. Pass the element itself (from a callback ref), so the hook follows remounts. */
export function useMediaElement(element: HTMLMediaElement | null): {
  state: MediaElementState;
  controls: MediaElementControls;
} {
  const [state, setState] = useState<MediaElementState>(initialState);

  useEffect(() => {
    if (!element) {
      return;
    }
    const update = () => {
      setState((previous) => read(element, previous));
    };
    const onWaiting = () => {
      setState((previous) => ({ ...read(element, previous), isWaiting: true }));
    };
    const onFlowing = () => {
      setState((previous) => ({ ...read(element, previous), isWaiting: false }));
    };
    const onEmptied = () => {
      setState(() => ({ ...read(element, initialState), hasStarted: false }));
    };
    for (const name of EVENTS) {
      element.addEventListener(name, name === 'emptied' ? onEmptied : update);
    }
    element.addEventListener('waiting', onWaiting);
    element.addEventListener('playing', onFlowing);
    element.addEventListener('canplay', onFlowing);
    element.addEventListener('pause', onFlowing);
    element.addEventListener('error', onFlowing);
    update();
    return () => {
      for (const name of EVENTS) {
        element.removeEventListener(name, name === 'emptied' ? onEmptied : update);
      }
      element.removeEventListener('waiting', onWaiting);
      element.removeEventListener('playing', onFlowing);
      element.removeEventListener('canplay', onFlowing);
      element.removeEventListener('pause', onFlowing);
      element.removeEventListener('error', onFlowing);
    };
  }, [element]);

  const play = useCallback(() => {
    // play() rejects when interrupted (a pause, a new source) or blocked by autoplay rules; the state follows events.
    element?.play().catch(() => undefined);
  }, [element]);
  const pause = useCallback(() => {
    element?.pause();
  }, [element]);
  const seek = useCallback(
    (seconds: number) => {
      if (!element) {
        return;
      }
      const { duration } = element;
      const ranges = timeRangesToArray(element.seekable);
      const last = ranges[ranges.length - 1];
      const min = Number.isFinite(duration) ? 0 : (ranges[0]?.start ?? 0);
      const max = Number.isFinite(duration) ? duration : (last?.end ?? seconds);
      element.currentTime = clamp(seconds, min, max);
      setState((previous) => ({ ...previous, currentTime: element.currentTime }));
    },
    [element],
  );

  const controls = useMemo<MediaElementControls>(
    () => ({
      play,
      pause,
      setPlaying: (isPlaying) => {
        if (isPlaying) {
          play();
        } else {
          pause();
        }
      },
      seek,
      skip: (delta) => {
        if (element) {
          seek(element.currentTime + delta);
        }
      },
      setPlaybackRate: (rate) => {
        if (element) {
          element.playbackRate = rate;
        }
      },
      setVolume: (volume) => {
        if (element) {
          element.volume = clamp(volume, 0, 1);
          if (volume > 0 && element.muted) {
            element.muted = false;
          }
        }
      },
      setMuted: (isMuted) => {
        if (element) {
          element.muted = isMuted;
        }
      },
    }),
    [element, play, pause, seek],
  );

  return { state, controls };
}
