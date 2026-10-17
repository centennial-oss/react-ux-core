// useTimer: a countdown or count-up measured against the wall clock, so it never drifts. Time is worked out from when
// the timer started (or ends) and the time spent paused, not by adding up ticks. It ticks on second boundaries and
// stops ticking while paused, after it runs out and while the page is hidden; on return it recomputes. Nothing reads
// the clock during render, so it renders the same on the server.

import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { createDeadlineTimer } from '../../utils/timers';

export type TimerLevel = 'normal' | 'warning' | 'danger';

/** Where the tone changes: remaining time for a countdown, elapsed time for a count-up (a time budget). */
export interface TimerThresholds {
  warningMs?: number;
  dangerMs?: number;
}

export interface UseTimerOptions {
  /** Defaults to `down`. */
  direction?: 'down' | 'up';
  /** Countdown: when time runs out. */
  endsAt?: Date | number;
  /** When counting started. A countdown can use it with `durationMs` instead of `endsAt`. */
  startedAt?: Date | number;
  /** A countdown's length. */
  durationMs?: number;
  /** Pauses the timer, keeping the time so far. Controlled. */
  isPaused?: boolean;
  /** The time so far, controlled, for apps that persist it (resuming a test after a reload). */
  elapsedMs?: number;
  /** Tone changes at these times. Defaults to none. */
  thresholds?: TimerThresholds;
  /** Called once when a countdown reaches zero. */
  onExpire?: () => void;
  /** Called once as each threshold is crossed. */
  onThreshold?: (level: 'warning' | 'danger') => void;
}

export interface TimerState {
  /** A countdown's time left (never below 0); undefined for a count-up, or before the end time is known. */
  remainingMs: number | undefined;
  elapsedMs: number;
  level: TimerLevel;
  isExpired: boolean;
  isPaused: boolean;
}

interface ClockConfig {
  direction: 'down' | 'up';
  endsAt: number | undefined;
  startedAt: number | undefined;
  durationMs: number | undefined;
  elapsedMs: number | undefined;
  isPaused: boolean;
  warningMs: number | undefined;
  dangerMs: number | undefined;
}

const levelRank: Record<TimerLevel, number> = { normal: 0, warning: 1, danger: 2 };

function toMs(time: Date | number | undefined): number | undefined {
  return time === undefined ? undefined : typeof time === 'number' ? time : time.getTime();
}

function levelOf(config: ClockConfig, elapsed: number, remaining: number | undefined): TimerLevel {
  const { warningMs, dangerMs } = config;
  if (config.direction === 'down') {
    if (remaining === undefined) {
      return 'normal';
    }
    return dangerMs !== undefined && remaining <= dangerMs
      ? 'danger'
      : warningMs !== undefined && remaining <= warningMs
        ? 'warning'
        : 'normal';
  }
  return dangerMs !== undefined && elapsed >= dangerMs
    ? 'danger'
    : warningMs !== undefined && elapsed >= warningMs
      ? 'warning'
      : 'normal';
}

/** The timer's state, kept outside React and read with useSyncExternalStore. */
class TimerClock {
  callbacks: Pick<UseTimerOptions, 'onExpire' | 'onThreshold'> = {};
  private config: ClockConfig;
  private listeners = new Set<() => void>();
  private isAnchored = false;
  /** Time counted before the current run. */
  private base: number;
  /** When the current run started (wall clock), or null while paused. */
  private runStart: number | null = null;
  /** A countdown's length. */
  private total: number | undefined;
  private reachedLevel: TimerLevel = 'normal';
  private hasExpired = false;
  private snapshot: TimerState;
  private timer = createDeadlineTimer(() => {
    this.update();
  });

  constructor(config: ClockConfig) {
    this.config = config;
    // Before the clock is read (and on the server): the time so far, and a countdown's full length if it's known.
    this.base = config.elapsedMs ?? 0;
    this.total = config.direction === 'down' ? config.durationMs : undefined;
    const remaining = this.total === undefined ? undefined : Math.max(0, this.total - this.base);
    this.snapshot = {
      remainingMs: remaining,
      elapsedMs: this.base,
      level: levelOf(config, this.base, remaining),
      isExpired: false,
      isPaused: config.isPaused,
    };
  }

  subscribe = (listener: () => void) => {
    if (this.listeners.size === 0) {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
    this.listeners.add(listener);
    this.schedule();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
        this.timer.clear();
      }
    };
  };

  getSnapshot = () => this.snapshot;

  configure(next: ClockConfig) {
    const now = Date.now();
    const previous = this.config;
    this.config = next;
    const sourcesChanged =
      !this.isAnchored ||
      previous.direction !== next.direction ||
      previous.endsAt !== next.endsAt ||
      previous.startedAt !== next.startedAt ||
      previous.durationMs !== next.durationMs ||
      previous.elapsedMs !== next.elapsedMs;
    if (sourcesChanged) {
      this.anchor(now);
    } else if (previous.isPaused !== next.isPaused) {
      if (next.isPaused) {
        this.base = this.elapsedAt(now);
        this.runStart = null;
      } else {
        this.runStart = now;
      }
    }
    this.update();
  }

  private anchor(now: number) {
    const { direction, endsAt, startedAt, durationMs, elapsedMs, isPaused } = this.config;
    const isFromStart = elapsedMs === undefined && startedAt !== undefined;
    this.base = elapsedMs ?? (isFromStart && isPaused ? Math.max(0, now - startedAt) : 0);
    this.runStart = isPaused ? null : isFromStart ? startedAt : now;
    if (direction === 'up') {
      this.total = undefined;
    } else if (durationMs !== undefined) {
      this.total = durationMs;
    } else if (endsAt !== undefined) {
      this.total = isFromStart ? endsAt - startedAt : endsAt - now + this.base;
    } else {
      this.total = undefined;
    }
    this.isAnchored = true;
    this.reachedLevel = 'normal';
    this.hasExpired = false;
  }

  private elapsedAt(now: number): number {
    return this.runStart === null ? this.base : this.base + Math.max(0, now - this.runStart);
  }

  private update() {
    const elapsed = this.elapsedAt(Date.now());
    const remaining = this.total === undefined ? undefined : Math.max(0, this.total - elapsed);
    const isExpired = this.config.direction === 'down' && remaining === 0;
    const level = levelOf(this.config, elapsed, remaining);
    this.snapshot = {
      remainingMs: remaining,
      elapsedMs: elapsed,
      level,
      isExpired,
      isPaused: this.config.isPaused,
    };
    for (const listener of this.listeners) {
      listener();
    }
    // Each threshold fires once as it's crossed (and again only if time is added back).
    if (levelRank[level] > levelRank[this.reachedLevel]) {
      for (const crossed of ['warning', 'danger'] as const) {
        if (
          levelRank[crossed] > levelRank[this.reachedLevel] &&
          levelRank[crossed] <= levelRank[level]
        ) {
          this.callbacks.onThreshold?.(crossed);
        }
      }
    }
    this.reachedLevel = level;
    if (isExpired && !this.hasExpired) {
      this.hasExpired = true;
      this.callbacks.onExpire?.();
    } else if (!isExpired) {
      this.hasExpired = false;
    }
    this.schedule();
  }

  /** Waits until the shown second changes. Doesn't tick while paused, expired, hidden or unwatched. */
  private schedule() {
    this.timer.clear();
    const { remainingMs, elapsedMs, isExpired } = this.snapshot;
    if (
      this.listeners.size === 0 ||
      this.runStart === null ||
      isExpired ||
      document.visibilityState === 'hidden'
    ) {
      return;
    }
    const delay =
      this.config.direction === 'down' && remainingMs !== undefined
        ? remainingMs % 1000 || 1000
        : 1000 - (elapsedMs % 1000);
    this.timer.start(delay);
  }

  private onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      this.timer.clear();
    } else {
      this.update();
    }
  };
}

/** A countdown or count-up that doesn't drift, with warning and danger levels. See `Timer` for a display. */
export function useTimer(options: UseTimerOptions): TimerState {
  const config: ClockConfig = {
    direction: options.direction ?? 'down',
    endsAt: toMs(options.endsAt),
    startedAt: toMs(options.startedAt),
    durationMs: options.durationMs,
    elapsedMs: options.elapsedMs,
    isPaused: options.isPaused ?? false,
    warningMs: options.thresholds?.warningMs,
    dangerMs: options.thresholds?.dangerMs,
  };
  const clockRef = useRef<TimerClock | null>(null);
  clockRef.current ??= new TimerClock(config);
  const clock = clockRef.current;

  const { onExpire, onThreshold } = options;
  useLayoutEffect(() => {
    clock.callbacks = { onExpire, onThreshold };
  }, [clock, onExpire, onThreshold]);

  const { direction, endsAt, startedAt, durationMs, elapsedMs, isPaused, warningMs, dangerMs } =
    config;
  useLayoutEffect(() => {
    clock.configure({
      direction,
      endsAt,
      startedAt,
      durationMs,
      elapsedMs,
      isPaused,
      warningMs,
      dangerMs,
    });
  }, [clock, direction, endsAt, startedAt, durationMs, elapsedMs, isPaused, warningMs, dangerMs]);

  return useSyncExternalStore(clock.subscribe, clock.getSnapshot, clock.getSnapshot);
}
