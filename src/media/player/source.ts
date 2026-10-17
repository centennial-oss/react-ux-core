// Attaching a source to a media element: progressive files go straight to `src`; HLS plays natively where the
// browser can (Safari, iOS) and otherwise through hls.js, loaded with a dynamic import only then; DASH plays natively
// where supported or through an app-provided `loadSource` hook (dash.js isn't bundled), and fails clearly otherwise.

import type Hls from 'hls.js';
import type { HlsConfig } from 'hls.js';
import type { MediaErrorKind } from './mediaErrors';

export type MediaSourceType = 'auto' | 'hls' | 'dash' | 'progressive';
export type ResolvedSourceType = Exclude<MediaSourceType, 'auto'>;

/**
 * An app-provided loader for formats the library doesn't play itself, typically DASH through dash.js:
 * `loadSource={async (media, src) => { const dash = MediaPlayer().create(); dash.initialize(media, src, false); return () => dash.reset(); }}`.
 * It may return (or resolve to) a cleanup function. It's called for `hls` sources too when given, replacing hls.js.
 */
export type MediaSourceLoader = (
  media: HTMLMediaElement,
  src: string,
  type: Exclude<ResolvedSourceType, 'progressive'>,
) => unknown;

const HLS_MIME = /^application\/(vnd\.apple\.mpegurl|x-mpegurl)$|^audio\/mpegurl$/i;
const DASH_MIME = /^application\/dash\+xml$/i;

/** The source type from `type` (`auto` looks at a MIME type, then the URL's extension: .m3u8 HLS, .mpd DASH). */
export function inferMediaType(
  src: string,
  type: MediaSourceType = 'auto',
  mime?: string,
): ResolvedSourceType {
  if (type !== 'auto') {
    return type;
  }
  if (mime && HLS_MIME.test(mime)) {
    return 'hls';
  }
  if (mime && DASH_MIME.test(mime)) {
    return 'dash';
  }
  const path = src.split(/[?#]/, 1)[0]?.toLowerCase() ?? '';
  if (path.endsWith('.m3u8')) {
    return 'hls';
  }
  if (path.endsWith('.mpd')) {
    return 'dash';
  }
  return 'progressive';
}

/** A failure while attaching or playing a stream, with its kind for the message. */
export class MediaSourceError extends Error {
  readonly kind: MediaErrorKind;
  constructor(kind: MediaErrorKind, message: string) {
    super(message);
    this.name = 'MediaSourceError';
    this.kind = kind;
  }
}

let hlsModule: Promise<typeof Hls> | undefined;

/** Loads hls.js once, on first use. */
export function loadHls(): Promise<typeof Hls> {
  hlsModule ??= import('hls.js').then((module) => module.default);
  return hlsModule;
}

/** Whether the browser plays HLS without hls.js (Safari, iOS, some Android browsers). */
export function canPlayHlsNatively(media: HTMLMediaElement): boolean {
  return media.canPlayType('application/vnd.apple.mpegurl') !== '';
}

export interface AttachedSource {
  /** The hls.js instance when hls.js plays the stream. */
  hls?: Hls;
  /** Detaches the source and frees what it holds. */
  destroy: () => void;
}

export interface AttachOptions {
  src: string;
  type: ResolvedSourceType;
  loadSource?: MediaSourceLoader;
  /** Extra hls.js configuration, merged over the defaults. */
  hlsConfig?: Partial<HlsConfig>;
  /** Called when hls.js reports a fatal error it couldn't recover from. */
  onFatalError?: (kind: MediaErrorKind) => void;
}

/** Attaches `src` to `media` as its type requires. Rejects with `MediaSourceError` when the type can't play here. */
export async function attachMediaSource(
  media: HTMLMediaElement,
  { src, type, loadSource, hlsConfig, onFatalError }: AttachOptions,
): Promise<AttachedSource> {
  const clearSource = () => {
    media.removeAttribute('src');
    media.load();
  };
  if (type === 'progressive') {
    media.src = src;
    return { destroy: clearSource };
  }
  if (type === 'hls' && !loadSource && canPlayHlsNatively(media)) {
    media.src = src;
    return { destroy: clearSource };
  }
  if (loadSource) {
    const cleanup: unknown = await loadSource(media, src, type);
    return {
      destroy: () => {
        if (typeof cleanup === 'function') {
          (cleanup as () => void)();
        }
      },
    };
  }
  if (type === 'dash') {
    if (media.canPlayType('application/dash+xml') !== '') {
      media.src = src;
      return { destroy: clearSource };
    }
    throw new MediaSourceError('dash-unsupported', 'DASH needs a loadSource hook in this browser.');
  }

  const HlsClass = await loadHls();
  if (!HlsClass.isSupported()) {
    throw new MediaSourceError('unsupported', 'This browser has no Media Source Extensions.');
  }
  const hls = new HlsClass({ enableWorker: true, lowLatencyMode: true, ...hlsConfig });
  let hasRecovered = false;
  hls.on(HlsClass.Events.ERROR, (_event, data) => {
    if (!data.fatal) {
      return;
    }
    if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR && !hasRecovered) {
      hasRecovered = true;
      hls.recoverMediaError();
      return;
    }
    if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) {
      const status = data.response?.code;
      onFatalError?.(
        status === 404 || status === 410
          ? 'not-found'
          : status === 401 || status === 403
            ? 'forbidden'
            : status === 0 || status === undefined
              ? 'cors'
              : 'network',
      );
    } else {
      onFatalError?.(data.type === HlsClass.ErrorTypes.MEDIA_ERROR ? 'decode' : 'generic');
    }
    hls.destroy();
  });
  hls.loadSource(src);
  hls.attachMedia(media);
  return {
    hls,
    destroy: () => {
      hls.destroy();
    },
  };
}
