// Turns a media failure into something the user can act on. A media element reports a missing file, a server that
// refuses cross-origin access and an unsupported codec alike (MEDIA_ERR_SRC_NOT_SUPPORTED), so the cause is narrowed
// with a HEAD request: an HTTP status means the server answered, a failed request means it couldn't be reached (down,
// or no CORS), and a successful one leaves the format.

import type { MediaPlayerStrings } from './messages';

export type MediaErrorKind =
  | 'not-found'
  | 'forbidden'
  | 'cors'
  | 'network'
  | 'unsupported'
  | 'decode'
  | 'dash-unsupported'
  | 'generic';

/** What's known about a failure. */
export interface MediaErrorFacts {
  /** `MediaError.code`: 1 aborted, 2 network, 3 decode, 4 source not supported. */
  code?: number;
  /** The HTTP status of a diagnostic request, when the server answered. */
  status?: number;
  /** The diagnostic request failed without a response (server down, offline, or no CORS). */
  isUnreachable?: boolean;
}

/** The kind of failure, from the facts gathered about it. */
export function classifyMediaError({
  code,
  status,
  isUnreachable,
}: MediaErrorFacts): MediaErrorKind {
  if (status === 404 || status === 410) {
    return 'not-found';
  }
  if (status === 401 || status === 403) {
    return 'forbidden';
  }
  if (isUnreachable) {
    return typeof navigator !== 'undefined' && !navigator.onLine ? 'network' : 'cors';
  }
  if (code === 2) {
    return 'network';
  }
  if (code === 3) {
    return 'decode';
  }
  if (code === 4) {
    return 'unsupported';
  }
  return 'generic';
}

/** Gathers facts about a failed source with a HEAD request (falling back to a one-byte GET), then classifies it. */
export async function diagnoseMediaError(src: string, code?: number): Promise<MediaErrorKind> {
  if (!/^https?:/i.test(new URL(src, document.baseURI).protocol)) {
    // Blob and data URLs are local: whatever failed was the format.
    return classifyMediaError({ code });
  }
  try {
    let response = await fetch(src, { method: 'HEAD' });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(src, { headers: { Range: 'bytes=0-0' } });
    }
    return classifyMediaError({ code, status: response.ok ? undefined : response.status });
  } catch {
    return classifyMediaError({ code, isUnreachable: true });
  }
}

/** The message for a kind of failure. */
export function mediaErrorMessage(kind: MediaErrorKind, messages: MediaPlayerStrings): string {
  switch (kind) {
    case 'not-found':
      return messages.mediaErrorNotFound;
    case 'forbidden':
      return messages.mediaErrorForbidden;
    case 'cors':
      return messages.mediaErrorCors;
    case 'network':
      return messages.mediaErrorNetwork;
    case 'unsupported':
      return messages.mediaErrorUnsupported;
    case 'decode':
      return messages.mediaErrorDecode;
    case 'dash-unsupported':
      return messages.mediaErrorDashUnsupported;
    case 'generic':
      return messages.mediaErrorGeneric;
  }
}
