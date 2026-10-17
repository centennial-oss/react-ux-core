// Small imperative helpers for media elements and hls.js, kept outside components so React's rules about state
// values stay clear: these objects are external systems, written to from effects and event handlers only.

import type Hls from 'hls.js';

export function setElementMuted(element: HTMLMediaElement, isMuted: boolean): void {
  element.muted = isMuted;
}

/** Starts playback muted (the only autoplay browsers allow, and the only one the players do). */
export function playMuted(element: HTMLMediaElement): void {
  element.muted = true;
  element.play().catch(() => undefined);
}

/** Switches hls.js to a level, or back to automatic selection with -1. */
export function setHlsLevel(hls: Hls, level: number): void {
  hls.currentLevel = level;
}

/** Shows one captions or subtitles track (by its index in `textTracks`) and hides the rest; -1 hides all. */
export function showTextTrack(element: HTMLMediaElement, index: number): void {
  const tracks = element.textTracks;
  for (let position = 0; position < tracks.length; position += 1) {
    const track = tracks[position];
    if (track && (track.kind === 'captions' || track.kind === 'subtitles')) {
      track.mode = position === index ? 'showing' : 'disabled';
    }
  }
}

/** A flag for async work started by an effect, cleared when the effect cleans up. */
export interface EffectRun {
  isCurrent: boolean;
}

/** Whether an effect's async work should still apply (a function, so checks after an await aren't narrowed away). */
export function isRunCurrent(run: EffectRun): boolean {
  return run.isCurrent;
}
