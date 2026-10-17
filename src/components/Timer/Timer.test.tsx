import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import { formatClock, formatDurationWords, Timer } from './Timer';

const START = Date.UTC(2026, 9, 16, 9);
const SECOND = 1000;
const MINUTE = 60 * SECOND;

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function shown() {
  return screen.getByRole('timer').textContent;
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(START);
});

afterEach(() => {
  setVisibility('visible');
  vi.useRealTimers();
});

describe('formatting', () => {
  it('shows a clock, with hours only when needed', () => {
    expect(formatClock(130 * MINUTE, true)).toBe('2:10:00');
    expect(formatClock(5 * MINUTE + 9 * SECOND, true)).toBe('05:09');
    expect(formatClock(4200, true)).toBe('00:05');
    expect(formatClock(4200, false)).toBe('00:04');
  });

  it('shows words in the locale', () => {
    expect(formatDurationWords(65 * MINUTE, 'en-US')).toBe('1 hr 5 min');
    expect(formatDurationWords(5 * MINUTE, 'en-US', 'long')).toBe('5 minutes');
    expect(formatDurationWords(90 * SECOND, 'en-US')).toBe('1 min 30 sec');
  });
});

describe('Timer', () => {
  it('counts down from its length, named by its label, without announcing every second', () => {
    render(<Timer label="Time left" startedAt={START} durationMs={130 * MINUTE} />);
    const timer = screen.getByRole('timer', { name: 'Time left' });
    expect(timer).toHaveAttribute('aria-live', 'off');
    expect(shown()).toBe('Time left2:10:00');
    advance(SECOND);
    expect(shown()).toBe('Time left2:09:59');
  });

  it('doesn’t drift over 1,000 ticks, and keeps up when ticks run late', () => {
    render(<Timer startedAt={START} durationMs={130 * MINUTE} />);
    advance(1000 * SECOND);
    expect(shown()).toBe('1:53:20');
    // The clock jumps ahead (a busy main thread) between ticks: the next tick shows the real time left.
    act(() => {
      vi.setSystemTime(Date.now() + 7 * SECOND);
    });
    advance(SECOND);
    expect(shown()).toBe('1:53:12');
  });

  it('keeps the time so far while paused, and continues from it', () => {
    const { rerender } = render(<Timer direction="up" />);
    advance(5 * SECOND);
    expect(shown()).toBe('00:05');
    rerender(<Timer direction="up" isPaused />);
    advance(30 * SECOND);
    expect(shown()).toBe('00:05Paused');
    rerender(<Timer direction="up" isPaused={false} />);
    advance(2 * SECOND);
    expect(shown()).toBe('00:07');
  });

  it('runs out at 0:00, calling onExpire once and announcing it', () => {
    const onExpire = vi.fn();
    render(<Timer endsAt={START + 3 * SECOND} onExpire={onExpire} />);
    advance(10 * SECOND);
    expect(shown()).toBe('00:00');
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Time is up')).toHaveAttribute('aria-live', 'assertive');
  });

  it('changes tone at each threshold once, announcing it', () => {
    const onThreshold = vi.fn();
    render(
      <Timer
        startedAt={START}
        durationMs={10 * MINUTE}
        thresholds={{ warningMs: 5 * MINUTE, dangerMs: 2 * MINUTE }}
        onThreshold={onThreshold}
      />,
    );
    advance(5 * MINUTE);
    expect(onThreshold).toHaveBeenLastCalledWith('warning');
    expect(screen.getByText('5 minutes left')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('05:00')).toHaveClass('text-warning-fg');
    advance(3 * MINUTE);
    expect(onThreshold).toHaveBeenLastCalledWith('danger');
    expect(onThreshold).toHaveBeenCalledTimes(2);
    expect(screen.getByText('2 minutes left')).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getByText('02:00')).toHaveClass('text-danger-fg');
  });

  it('counts up against a budget', () => {
    render(
      <Timer
        direction="up"
        label="Time on this question"
        thresholds={{ warningMs: 2 * MINUTE }}
        format="words"
      />,
    );
    advance(2 * MINUTE);
    expect(screen.getByText('2 min')).toHaveClass('text-warning-fg');
    expect(screen.getByText('2 minutes elapsed')).toBeInTheDocument();
  });

  it('stops ticking while the page is hidden, and catches up when it’s shown', () => {
    render(<Timer direction="up" />);
    advance(3 * SECOND);
    setVisibility('hidden');
    advance(20 * SECOND);
    expect(shown()).toBe('00:03');
    setVisibility('visible');
    expect(shown()).toBe('00:23');
  });

  it('has no accessibility violations, in each variant', async () => {
    vi.useRealTimers();
    const { container } = render(
      <>
        <Timer label="Time left" durationMs={10 * MINUTE} startedAt={Date.now()} />
        <Timer label="Exam" variant="badge" durationMs={10 * MINUTE} startedAt={Date.now()} />
        <Timer label="On question" variant="tile" direction="up" />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
