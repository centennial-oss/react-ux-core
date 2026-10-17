// A beat clock for driving a piano roll's or sequencer's playhead in step with the app's audio. Time comes from the
// app's AudioContext (`currentTime`, the clock its sounds are scheduled on), so the playhead and the sound can't drift
// apart; without one it falls back to `performance.now()`. Positions update once per animation frame, and a
// look-ahead window (`onSchedule`) tells the app which beats are coming up and exactly when, so it can schedule notes
// ahead (`oscillator.start(window.timeAt(note.start))`) instead of firing them late from a frame callback. Loops wrap.
// The clock makes no sound itself.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** A loop region in beats: playback that reaches `end` continues from `start`. */
export interface BeatLoop {
  start: number;
  end: number;
}

/** Beats coming up, for scheduling sounds: `from` (included) to `to` (excluded), and when each beat will sound. */
export interface BeatWindow {
  from: number;
  to: number;
  /** The clock time (AudioContext seconds) at which a beat in this window sounds. */
  timeAt: (beat: number) => number;
}

export interface BeatClockOptions {
  /** Tempo in beats per minute. */
  bpm: number;
  /** The context whose `currentTime` drives the clock. Defaults to `performance.now()` (in seconds). */
  audioContext?: BaseAudioContext | null;
  loop?: BeatLoop | null;
  /** Called every animation frame while playing, with the current beat. */
  onBeat?: (beat: number) => void;
  /** Called while playing with each new window of upcoming beats (see `lookahead`). */
  onSchedule?: (window: BeatWindow) => void;
  /** How far ahead `onSchedule` looks, in seconds. Defaults to 0.1. */
  lookahead?: number;
}

export interface BeatClock {
  play: () => void;
  /** Stops where it is. */
  pause: () => void;
  /** Stops and goes back to the loop start (or beat 0). */
  stop: () => void;
  seek: (beat: number) => void;
  /** The current position in beats. */
  getBeat: () => number;
  isPlaying: () => boolean;
  setBpm: (bpm: number) => void;
  setLoop: (loop: BeatLoop | null) => void;
  setAudioContext: (context: BaseAudioContext | null) => void;
  setOnSchedule: (onSchedule: ((window: BeatWindow) => void) | undefined) => void;
  /** Listens to the position (every frame while playing, and on seek and stop). */
  subscribe: (listener: (beat: number) => void) => () => void;
  /** Stops the frame loop for good. */
  dispose: () => void;
}

/** Creates a beat clock. Call `dispose` when done with it. */
export function createBeatClock({
  bpm: initialBpm,
  audioContext: initialContext = null,
  loop: initialLoop = null,
  onBeat,
  onSchedule: initialOnSchedule,
  lookahead = 0.1,
}: BeatClockOptions): BeatClock {
  let bpm = Math.max(1, initialBpm);
  let context = initialContext;
  let loop = initialLoop && initialLoop.end > initialLoop.start ? initialLoop : null;
  let onSchedule = initialOnSchedule;
  let isRunning = false;
  /** Where playback was anchored: a musical beat and the clock time it sounded at. */
  let anchorBeat = 0;
  let anchorTime = 0;
  /** Unwrapped beats (relative to the anchor, before loop wrapping) already handed to `onSchedule`. */
  let scheduledUntil = 0;
  let frame: number | null = null;
  const listeners = new Set<(beat: number) => void>();

  const now = () => (context ? context.currentTime : performance.now() / 1000);
  /** The unwrapped beat at a clock time. */
  const rawAt = (time: number) => anchorBeat + ((time - anchorTime) * bpm) / 60;
  const loops = () => loop !== null && anchorBeat < loop.end;
  /** A musical beat for an unwrapped one: past the loop end it wraps back into the loop. */
  const wrap = (raw: number) => {
    if (!loop || !loops() || raw < loop.end) {
      return raw;
    }
    const length = loop.end - loop.start;
    return loop.start + ((raw - loop.start) % length);
  };
  const getBeat = () => (isRunning ? wrap(rawAt(now())) : anchorBeat);

  const emit = (beat: number) => {
    onBeat?.(beat);
    for (const listener of listeners) {
      listener(beat);
    }
  };

  /** Hands the upcoming unwrapped window to `onSchedule`, split at loop boundaries. */
  const schedule = () => {
    if (!onSchedule) {
      scheduledUntil = rawAt(now() + lookahead);
      return;
    }
    const horizon = rawAt(now() + lookahead);
    let raw = scheduledUntil;
    while (raw < horizon - 1e-9) {
      let offset = 0;
      let end = horizon;
      if (loop && loops()) {
        const length = loop.end - loop.start;
        const iteration =
          raw >= loop.end - 1e-9 ? Math.floor((raw - loop.start) / length + 1e-9) : 0;
        offset = iteration * length;
        end = Math.min(horizon, loop.end + offset);
      }
      const segmentOffset = offset;
      onSchedule({
        from: raw - segmentOffset,
        to: end - segmentOffset,
        timeAt: (beat) => anchorTime + ((beat + segmentOffset - anchorBeat) * 60) / bpm,
      });
      raw = end;
    }
    scheduledUntil = Math.max(scheduledUntil, horizon);
  };

  const tick = () => {
    frame = null;
    if (!isRunning) {
      return;
    }
    schedule();
    emit(getBeat());
    frame = requestAnimationFrame(tick);
  };

  /** Re-anchors at the current position (after a tempo, loop or clock change), keeping what's already scheduled. */
  const rebase = () => {
    if (!isRunning) {
      return;
    }
    const time = now();
    const raw = rawAt(time);
    const ahead = scheduledUntil - raw;
    anchorBeat = wrap(raw);
    anchorTime = time;
    scheduledUntil = anchorBeat + Math.max(0, ahead);
  };

  const pause = () => {
    if (!isRunning) {
      return;
    }
    anchorBeat = getBeat();
    isRunning = false;
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
    emit(anchorBeat);
  };

  return {
    play: () => {
      if (isRunning) {
        return;
      }
      isRunning = true;
      anchorTime = now();
      scheduledUntil = anchorBeat;
      schedule();
      frame ??= requestAnimationFrame(tick);
    },
    pause,
    stop: () => {
      pause();
      anchorBeat = loop?.start ?? 0;
      emit(anchorBeat);
    },
    seek: (beat) => {
      anchorBeat = Math.max(0, beat);
      anchorTime = now();
      scheduledUntil = anchorBeat;
      emit(anchorBeat);
    },
    getBeat,
    isPlaying: () => isRunning,
    setBpm: (next) => {
      rebase();
      bpm = Math.max(1, next);
    },
    setLoop: (next) => {
      rebase();
      loop = next && next.end > next.start ? next : null;
    },
    setAudioContext: (next) => {
      if (next === context) {
        return;
      }
      const beat = getBeat();
      context = next;
      anchorBeat = beat;
      anchorTime = now();
      scheduledUntil = beat;
    },
    setOnSchedule: (next) => {
      onSchedule = next;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose: () => {
      isRunning = false;
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      listeners.clear();
    },
  };
}

export interface UseBeatClockOptions extends Omit<BeatClockOptions, 'onBeat' | 'audioContext'> {
  /** The context the app plays its sounds on. `play()` resumes it if the browser suspended it. */
  audioContext?: AudioContext | null;
}

export interface BeatClockState {
  /** The current position in beats, updated every frame while playing (pass it to `playhead`). */
  beat: number;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (beat: number) => void;
  /** The underlying clock, for reading the position outside React. */
  clock: BeatClock;
}

/** A beat clock owned by a component: its position as state, re-rendering every frame while playing. */
export function useBeatClock({
  bpm,
  audioContext = null,
  loop = null,
  onSchedule,
  lookahead,
}: UseBeatClockOptions): BeatClockState {
  const [clock] = useState(() => createBeatClock({ bpm, audioContext, loop, lookahead }));
  const [beat, setBeat] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const onScheduleRef = useRef(onSchedule);
  useLayoutEffect(() => {
    onScheduleRef.current = onSchedule;
  });

  useEffect(() => clock.subscribe(setBeat), [clock]);
  useEffect(() => {
    clock.setOnSchedule((window) => onScheduleRef.current?.(window));
  }, [clock]);
  useEffect(() => {
    clock.setBpm(bpm);
  }, [clock, bpm]);
  const loopStart = loop?.start;
  const loopEnd = loop?.end;
  useEffect(() => {
    clock.setLoop(
      loopStart !== undefined && loopEnd !== undefined ? { start: loopStart, end: loopEnd } : null,
    );
  }, [clock, loopStart, loopEnd]);
  useEffect(() => {
    clock.setAudioContext(audioContext);
  }, [clock, audioContext]);
  useEffect(
    () => () => {
      clock.dispose();
    },
    [clock],
  );

  return {
    beat,
    isPlaying,
    play: () => {
      if (audioContext?.state === 'suspended') {
        void audioContext.resume();
      }
      clock.play();
      setPlaying(true);
    },
    pause: () => {
      clock.pause();
      setPlaying(false);
    },
    stop: () => {
      clock.stop();
      setPlaying(false);
    },
    seek: (next) => {
      clock.seek(next);
    },
    clock,
  };
}
