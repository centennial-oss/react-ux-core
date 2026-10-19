// Image loading: the default loader (`wadouri:` and plain URLs, fetched and decoded by the built-in parser) and a
// small cache that keeps decoded frames, shares in-flight requests and cancels prefetches the viewer no longer needs.

import { decodeDicomImage, type DicomImage } from './parseDicom';

/** Loads and decodes the frame an image id names. Abort the request when `signal` fires. */
export type DicomImageLoader = (imageId: string, signal: AbortSignal) => Promise<DicomImage>;

export type DicomLoadErrorCode = 'unsupported-scheme' | 'http';

/** Why the default loader couldn't fetch an image. Parse problems throw `DicomParseError` instead. */
export class DicomLoadError extends Error {
  readonly code: DicomLoadErrorCode;
  /** The HTTP status, for `http` errors. */
  readonly status: number | undefined;

  constructor(code: DicomLoadErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'DicomLoadError';
    this.code = code;
    this.status = status;
  }
}

/**
 * The default loader: fetches a DICOM Part 10 file from a `wadouri:` image id (the URL after the prefix) or a plain
 * URL (including `blob:` and `data:` URLs) and decodes it with `decodeDicomImage`. A `frame` query parameter (1-based,
 * as in WADO-URI) picks a frame of a multi-frame file. Other schemes (`wadors:`…) need a custom loader.
 */
export const loadDicomImage: DicomImageLoader = async (imageId, signal) => {
  let url = imageId;
  if (url.startsWith('wadouri:')) {
    url = url.slice('wadouri:'.length);
  } else if (/^(wadors|dicomweb|dicomfile|dicomzip):/i.test(url)) {
    throw new DicomLoadError(
      'unsupported-scheme',
      `The built-in loader doesn’t understand “${imageId.slice(0, imageId.indexOf(':'))}:” image ids. Pass a loadImage that does.`,
    );
  }
  let frame = 0;
  const match = /[?&]frame=(\d+)/.exec(url);
  if (match?.[1] !== undefined) {
    frame = Math.max(0, Number(match[1]) - 1);
  }
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new DicomLoadError(
      'http',
      `The image couldn’t be fetched (HTTP ${String(response.status)}).`,
      response.status,
    );
  }
  return decodeDicomImage(await response.arrayBuffer(), frame);
};

interface CacheEntry {
  promise: Promise<DicomImage>;
  controller: AbortController;
  image?: DicomImage;
  /** Whether `cancelExcept` may cancel it (a prefetch nobody else is waiting for). */
  isCancellable: boolean;
}

/** Decoded frames by image id, least recently used first. */
export interface DicomImageCache {
  /** The frame, if it has already loaded. */
  peek: (imageId: string) => DicomImage | undefined;
  /**
   * Loads the frame (or returns the request already in flight). `isCancellable` lets `cancelExcept` cancel the
   * request while it's in flight (for prefetches); a request anyone loads without it is never cancelled.
   */
  load: (imageId: string, isCancellable?: boolean) => Promise<DicomImage>;
  /** Cancels cancellable requests still in flight for ids not in `keep` (prefetches the viewer scrolled away from). */
  cancelExcept: (keep: ReadonlySet<string>) => void;
  /** Cancels everything and forgets every frame. */
  clear: () => void;
}

/** A cache of up to `capacity` decoded frames in front of `loader`. */
export function createImageCache(loader: DicomImageLoader, capacity: number): DicomImageCache {
  const entries = new Map<string, CacheEntry>();

  const touch = (imageId: string, entry: CacheEntry) => {
    entries.delete(imageId);
    entries.set(imageId, entry);
  };

  const evict = () => {
    for (const [imageId, entry] of entries) {
      if (entries.size <= capacity) {
        return;
      }
      // Only settled frames are evicted; requests in flight are cancelled by `cancelExcept`.
      if (entry.image) {
        entries.delete(imageId);
      }
    }
  };

  return {
    peek(imageId) {
      return entries.get(imageId)?.image;
    },
    load(imageId, isCancellable = false) {
      const existing = entries.get(imageId);
      if (existing) {
        existing.isCancellable &&= isCancellable;
        touch(imageId, existing);
        return existing.promise;
      }
      const controller = new AbortController();
      const entry: CacheEntry = {
        controller,
        isCancellable,
        promise: loader(imageId, controller.signal).then(
          (image) => {
            entry.image = image;
            evict();
            return image;
          },
          (error: unknown) => {
            // A failed or cancelled request is forgotten, so the next attempt retries.
            if (entries.get(imageId) === entry) {
              entries.delete(imageId);
            }
            throw error;
          },
        ),
      };
      // Callers that only prefetch don't handle the rejection; keep it from being reported as unhandled.
      entry.promise.catch(() => undefined);
      entries.set(imageId, entry);
      return entry.promise;
    },
    cancelExcept(keep) {
      for (const [imageId, entry] of entries) {
        if (!entry.image && entry.isCancellable && !keep.has(imageId)) {
          entries.delete(imageId);
          entry.controller.abort();
        }
      }
    },
    clear() {
      for (const entry of entries.values()) {
        if (!entry.image) {
          entry.controller.abort();
        }
      }
      entries.clear();
    },
  };
}
