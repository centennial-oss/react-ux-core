// Time helpers shared by the players: clock-style formatting, TimeRanges as plain arrays, and the live edge.

/** A span of media time in seconds, such as a buffered or seekable range. */
export interface MediaTimeRange {
  start: number;
  end: number;
}

/** A point on the timeline, such as a chapter or a comment. `at` is in seconds. */
export interface MediaMarker {
  at: number;
  label: string;
}

/**
 * Formats seconds as a clock: `m:ss`, or `h:mm:ss` from an hour (or when `reference`, such as the duration, reaches
 * an hour, so elapsed and total line up). Negative values are formatted by their size; unknown values show `--:--`.
 */
export function formatMediaTime(seconds: number, reference = 0): string {
  if (!Number.isFinite(seconds)) {
    return '--:--';
  }
  const total = Math.floor(Math.abs(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const ss = String(secs).padStart(2, '0');
  if (hours > 0 || (Number.isFinite(reference) && Math.abs(reference) >= 3600)) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`;
  }
  return `${minutes}:${ss}`;
}

/** A media element's TimeRanges as an array of `{ start, end }`. */
export function timeRangesToArray(ranges: TimeRanges | null | undefined): MediaTimeRange[] {
  if (!ranges) {
    return [];
  }
  const result: MediaTimeRange[] = [];
  for (let index = 0; index < ranges.length; index += 1) {
    result.push({ start: ranges.start(index), end: ranges.end(index) });
  }
  return result;
}

/** Seconds of media buffered ahead of `time` (0 when `time` isn't inside a buffered range). */
export function bufferAhead(ranges: readonly MediaTimeRange[], time: number): number {
  const range = ranges.find((candidate) => time >= candidate.start && time <= candidate.end);
  return range ? range.end - time : 0;
}

/** Seconds behind the live edge under which playback counts as live. */
export const LIVE_EDGE_TOLERANCE = 8;

/** Whether `time` is at the live edge of `seekable`, within `tolerance` seconds. */
export function isAtLiveEdge(
  time: number,
  liveEdge: number | undefined,
  tolerance = LIVE_EDGE_TOLERANCE,
): boolean {
  return liveEdge === undefined || liveEdge - time <= tolerance;
}
