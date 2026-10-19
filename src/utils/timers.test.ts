import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDeadlineTimer,
  useDebouncedCallback,
  useNow,
  useNowSelector,
  useWallClock,
} from './timers';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('createDeadlineTimer', () => {
  it('fires once after the given time', () => {
    const onExpire = vi.fn();
    const timer = createDeadlineTimer(onExpire);
    timer.start(1000);
    vi.advanceTimersByTime(999);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(timer.remaining()).toBe(0);
  });

  it('keeps the remaining time across pause and resume', () => {
    const onExpire = vi.fn();
    const timer = createDeadlineTimer(onExpire);
    timer.start(1000);
    vi.advanceTimersByTime(400);
    timer.pause();
    expect(timer.remaining()).toBe(600);
    vi.advanceTimersByTime(5000);
    expect(onExpire).not.toHaveBeenCalled();
    timer.resume();
    vi.advanceTimersByTime(599);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('does nothing after clear', () => {
    const onExpire = vi.fn();
    const timer = createDeadlineTimer(onExpire);
    timer.start(100);
    timer.clear();
    vi.advanceTimersByTime(1000);
    expect(onExpire).not.toHaveBeenCalled();
  });
});

describe('useDebouncedCallback', () => {
  it('runs once with the latest arguments after the delay', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));
    act(() => {
      result.current.run('a');
      vi.advanceTimersByTime(200);
      result.current.run('ab');
      vi.advanceTimersByTime(299);
    });
    expect(callback).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(callback).toHaveBeenCalledExactlyOnceWith('ab');
  });

  it('cancels pending calls on unmount', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 300));
    act(() => {
      result.current.run('a');
    });
    unmount();
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('flushes immediately', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));
    act(() => {
      result.current.run('now');
      result.current.flush();
    });
    expect(callback).toHaveBeenCalledExactlyOnceWith('now');
  });
});

describe('useNow', () => {
  it('shares one clock that advances every 15 seconds', () => {
    const first = renderHook(() => useNow());
    const second = renderHook(() => useNow());
    const start = first.result.current;
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(first.result.current).toBeGreaterThan(start);
    expect(second.result.current).toBe(first.result.current);
    first.unmount();
    second.unmount();
  });
});

describe('useNowSelector', () => {
  it('re-renders only when the selected value changes', () => {
    let renders = 0;
    const minute = renderHook(() => {
      renders += 1;
      return useNowSelector((now) => Math.floor(now / 60_000));
    });
    const start = minute.result.current;
    const rendersAtStart = renders;
    // Three ticks inside the same minute (the clock ticks on 15-second boundaries).
    act(() => {
      vi.advanceTimersByTime(60_000 - (Date.now() % 60_000) - 1);
    });
    expect(minute.result.current).toBe(start);
    expect(renders).toBe(rendersAtStart);
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(minute.result.current).toBe(start + 1);
    expect(renders).toBe(rendersAtStart + 1);
    minute.unmount();
  });
});

describe('useWallClock', () => {
  it('ticks on whole seconds, shared by every caller', () => {
    const first = renderHook(() => useWallClock('second'));
    const second = renderHook(() => useWallClock('second'));
    act(() => {
      vi.advanceTimersByTime(1000 - (Date.now() % 1000));
    });
    expect(first.result.current % 1000).toBe(0);
    expect(second.result.current).toBe(first.result.current);
    const tick = first.result.current;
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(first.result.current).toBe(tick + 1000);
    first.unmount();
    second.unmount();
  });

  it('ticks on whole minutes for the minute unit', () => {
    const minute = renderHook(() => useWallClock('minute'));
    const start = minute.result.current;
    act(() => {
      vi.advanceTimersByTime(60_000 - (Date.now() % 60_000) - 1);
    });
    expect(minute.result.current).toBe(start);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(minute.result.current % 60_000).toBe(0);
    minute.unmount();
  });

  it("doesn't re-render while disabled", () => {
    let renders = 0;
    const clock = renderHook(() => {
      renders += 1;
      return useWallClock('second', false);
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(renders).toBe(1);
    clock.unmount();
  });
});
