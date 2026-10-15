import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDeadlineTimer, useDebouncedCallback, useNow } from './timers';

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
