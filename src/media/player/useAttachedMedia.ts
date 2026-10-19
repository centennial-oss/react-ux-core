// Attaching a source to a player's media element: attachMediaSource on each new source, the attachment freed when the
// source changes, and any failure (a fatal stream error, an unsupported type, or the element's own error, diagnosed)
// kept with the source it belongs to, so a new source starts clean.

import type Hls from 'hls.js';
import type { HlsConfig } from 'hls.js';
import { useEffect, useState } from 'react';
import { useLatest } from '../../utils/useLatest';
import type { EffectRun } from './mediaDom';
import { diagnoseMediaError, type MediaErrorKind } from './mediaErrors';
import {
  attachMediaSource,
  MediaSourceError,
  type MediaSourceLoader,
  type ResolvedSourceType,
} from './source';

export interface AttachedMediaOptions {
  src: string;
  type: ResolvedSourceType;
  loadSource?: MediaSourceLoader | undefined;
  /** Read when attaching; a new object each render doesn't reattach. */
  hlsConfig?: Partial<HlsConfig> | undefined;
  /** Called once the source is attached (the latest callback is used). */
  onAttached?: (element: HTMLMediaElement) => void;
}

export interface AttachedMedia {
  /** What went wrong with the current source, or null. */
  errorKind: MediaErrorKind | null;
  /** The hls.js instance when hls.js plays the current source. */
  hls: Hls | undefined;
}

export function useAttachedMedia(
  element: HTMLMediaElement | null,
  { src, type, loadSource, hlsConfig, onAttached }: AttachedMediaOptions,
): AttachedMedia {
  const key = `${type}|${src}`;
  const [attached, setAttached] = useState<{ key: string; hls?: Hls } | null>(null);
  const [failure, setFailure] = useState<{ key: string; kind: MediaErrorKind } | null>(null);
  const latestOnAttached = useLatest(onAttached);
  useEffect(() => {
    if (!element) {
      return;
    }
    const run: EffectRun = { isCurrent: true };
    let destroy: (() => void) | undefined;
    const fail = (kind: MediaErrorKind) => {
      if (run.isCurrent) {
        setFailure({ key, kind });
      }
    };
    attachMediaSource(element, {
      src,
      type,
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
        latestOnAttached.current?.(element);
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
    // `key` covers src and type. hlsConfig is read when attaching; a new object each render shouldn't reattach.
  }, [element, key, loadSource]);
  return {
    errorKind: failure?.key === key ? failure.kind : null,
    hls: attached?.key === key ? attached.hls : undefined,
  };
}
