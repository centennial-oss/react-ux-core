// Playback stats for VideoPlayer: the rendition and bitrate from hls.js, frames from getVideoPlaybackQuality, the
// buffer ahead and the live latency.

import type Hls from 'hls.js';
import { bufferAhead, timeRangesToArray } from './time';

export interface PlaybackStats {
  /** The rendition playing, such as "720p" (HLS through hls.js only). */
  rendition?: string;
  /** The rendition's declared bitrate in kbps. */
  bitrateKbps?: number;
  /** hls.js's bandwidth estimate in kbps. */
  bandwidthKbps?: number;
  /** The decoded picture size. */
  width?: number;
  height?: number;
  /** Frames per second, measured between samples (or the rendition's declared rate). */
  fps?: number;
  /** Seconds buffered ahead of the playhead. */
  bufferSeconds: number;
  droppedFrames?: number;
  totalFrames?: number;
  /** Seconds behind the live edge, on a live stream. */
  liveLatencySeconds?: number;
}

/** What the previous sample saw, for measuring the frame rate. */
export interface StatsSample {
  frames: number;
  at: number;
}

/** A level's label: "720p", or nothing when the stream has no heights (the bitrate stands in). */
export type RenditionNamer = (level: { height?: number; bitrate: number }) => string;

/** Collects stats from the video element and, when it plays the stream, hls.js. */
export function collectStats(
  video: HTMLVideoElement,
  hls: Hls | undefined,
  isLive: boolean,
  previous: StatsSample | undefined,
  nameRendition: RenditionNamer,
): { stats: PlaybackStats; sample: StatsSample } {
  const now = performance.now();
  const quality =
    typeof video.getVideoPlaybackQuality === 'function'
      ? video.getVideoPlaybackQuality()
      : undefined;
  const frames = quality?.totalVideoFrames ?? 0;
  const elapsed = previous ? (now - previous.at) / 1000 : 0;
  const level = hls && hls.currentLevel >= 0 ? hls.levels[hls.currentLevel] : undefined;
  const measuredFps =
    previous && elapsed > 0.2 && !video.paused ? (frames - previous.frames) / elapsed : undefined;
  const ranges = timeRangesToArray(video.buffered);
  const seekable = timeRangesToArray(video.seekable);
  const edge = hls?.liveSyncPosition ?? seekable[seekable.length - 1]?.end;
  const hlsLatency = hls && isLive ? hls.latency : undefined;
  const stats: PlaybackStats = {
    rendition: level
      ? nameRendition({ height: level.height || undefined, bitrate: level.bitrate })
      : undefined,
    bitrateKbps: level ? level.bitrate / 1000 : undefined,
    bandwidthKbps: hls && hls.bandwidthEstimate > 0 ? hls.bandwidthEstimate / 1000 : undefined,
    width: video.videoWidth || undefined,
    height: video.videoHeight || undefined,
    fps:
      measuredFps !== undefined && measuredFps > 0
        ? Math.round(measuredFps)
        : level && level.frameRate > 0
          ? level.frameRate
          : undefined,
    bufferSeconds: bufferAhead(ranges, video.currentTime),
    droppedFrames: quality?.droppedVideoFrames,
    totalFrames: quality?.totalVideoFrames,
    liveLatencySeconds: isLive
      ? hlsLatency !== undefined && hlsLatency > 0
        ? hlsLatency
        : edge !== undefined
          ? Math.max(0, edge - video.currentTime)
          : undefined
      : undefined,
  };
  return { stats, sample: { frames, at: now } };
}
