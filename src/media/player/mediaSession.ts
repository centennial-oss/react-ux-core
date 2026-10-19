// The Media Session API: the system's media controls (lock screen, notification shade, headphone buttons) show the
// track and drive the player. Only the player that most recently started playing owns the session.

import { useEffect } from 'react';
import { useLatest } from '../../utils/useLatest';

export interface MediaSessionInfo {
  title: string;
  artist?: string;
  album?: string;
  artworkSrc?: string;
}

export interface MediaSessionHandlers {
  onPlay: () => void;
  onPause: () => void;
  onSeekBy: (deltaSeconds: number) => void;
  onSeekTo: (seconds: number) => void;
  onPreviousTrack?: () => void;
  onNextTrack?: () => void;
}

let owner: HTMLMediaElement | null = null;

function session(): MediaSession | undefined {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator
    ? navigator.mediaSession
    : undefined;
}

const ACTIONS: MediaSessionAction[] = [
  'play',
  'pause',
  'seekbackward',
  'seekforward',
  'seekto',
  'previoustrack',
  'nexttrack',
];

function setHandler(
  media: MediaSession,
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null,
) {
  try {
    media.setActionHandler(action, handler);
  } catch {
    // The browser doesn't support this action.
  }
}

/**
 * Publishes `info` and `handlers` to the Media Session while `element` plays, and keeps the position current. Does
 * nothing when `isEnabled` is false or the API is missing.
 */
export function useMediaSession(
  element: HTMLMediaElement | null,
  isEnabled: boolean,
  info: MediaSessionInfo,
  handlers: MediaSessionHandlers,
  skipSeconds: number,
): void {
  const latest = useLatest({ info, handlers, skipSeconds });

  const { title, artist, album, artworkSrc } = info;
  const hasPrevious = handlers.onPreviousTrack !== undefined;
  const hasNext = handlers.onNextTrack !== undefined;

  useEffect(() => {
    const media = session();
    if (!element || !isEnabled || !media) {
      return;
    }
    const publish = () => {
      owner = element;
      media.metadata = new MediaMetadata({
        title,
        artist: artist ?? '',
        album: album ?? '',
        artwork: artworkSrc ? [{ src: artworkSrc }] : [],
      });
      const current = () => latest.current.handlers;
      setHandler(media, 'play', () => {
        current().onPlay();
      });
      setHandler(media, 'pause', () => {
        current().onPause();
      });
      setHandler(media, 'seekbackward', (details) => {
        current().onSeekBy(-(details.seekOffset ?? latest.current.skipSeconds));
      });
      setHandler(media, 'seekforward', (details) => {
        current().onSeekBy(details.seekOffset ?? latest.current.skipSeconds);
      });
      setHandler(media, 'seekto', (details) => {
        if (details.seekTime !== undefined) {
          current().onSeekTo(details.seekTime);
        }
      });
      setHandler(
        media,
        'previoustrack',
        hasPrevious
          ? () => {
              current().onPreviousTrack?.();
            }
          : null,
      );
      setHandler(
        media,
        'nexttrack',
        hasNext
          ? () => {
              current().onNextTrack?.();
            }
          : null,
      );
      updateState();
    };
    const updateState = () => {
      if (owner !== element) {
        return;
      }
      media.playbackState = element.paused ? 'paused' : 'playing';
      const { duration, currentTime, playbackRate } = element;
      if (Number.isFinite(duration) && duration > 0 && 'setPositionState' in media) {
        try {
          media.setPositionState({
            duration,
            position: Math.min(currentTime, duration),
            playbackRate: playbackRate || 1,
          });
        } catch {
          // Invalid state mid-seek; the next event corrects it.
        }
      }
    };
    if (!element.paused) {
      publish();
    }
    element.addEventListener('play', publish);
    element.addEventListener('pause', updateState);
    element.addEventListener('seeked', updateState);
    element.addEventListener('ratechange', updateState);
    element.addEventListener('durationchange', updateState);
    return () => {
      element.removeEventListener('play', publish);
      element.removeEventListener('pause', updateState);
      element.removeEventListener('seeked', updateState);
      element.removeEventListener('ratechange', updateState);
      element.removeEventListener('durationchange', updateState);
      if (owner === element) {
        owner = null;
        media.metadata = null;
        media.playbackState = 'none';
        for (const action of ACTIONS) {
          setHandler(media, action, null);
        }
      }
    };
  }, [element, isEnabled, title, artist, album, artworkSrc, hasPrevious, hasNext]);
}
