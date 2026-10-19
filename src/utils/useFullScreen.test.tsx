import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFullScreen } from './useFullScreen';

let fullscreenElement: Element | null = null;

function stubFullscreen(isEnabled: boolean) {
  Object.defineProperty(document, 'fullscreenEnabled', {
    configurable: true,
    get: () => isEnabled,
  });
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => fullscreenElement,
  });
  const exit = vi.fn(() => {
    fullscreenElement = null;
    document.dispatchEvent(new Event('fullscreenchange'));
    return Promise.resolve();
  });
  Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit });
  return exit;
}

afterEach(() => {
  fullscreenElement = null;
  for (const name of ['fullscreenEnabled', 'fullscreenElement', 'exitFullscreen']) {
    Reflect.deleteProperty(document, name);
  }
});

describe('useFullScreen', () => {
  it('takes the target full screen and follows the exit', () => {
    const exit = stubFullscreen(true);
    const target = document.createElement('div');
    target.requestFullscreen = vi.fn(() => {
      fullscreenElement = target;
      document.dispatchEvent(new Event('fullscreenchange'));
      return Promise.resolve();
    });
    const { result } = renderHook(() => useFullScreen(target));
    expect(result.current.canFullScreen).toBe(true);
    expect(result.current.isFullScreen).toBe(false);
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isFullScreen).toBe(true);
    act(() => {
      result.current.toggle();
    });
    expect(exit).toHaveBeenCalledOnce();
    expect(result.current.isFullScreen).toBe(false);
  });

  it("isn't full screen when another element is", () => {
    stubFullscreen(true);
    const target = document.createElement('div');
    const { result } = renderHook(() => useFullScreen(target));
    act(() => {
      fullscreenElement = document.createElement('div');
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(result.current.isFullScreen).toBe(false);
  });

  it('does nothing when the browser disallows full screen', () => {
    stubFullscreen(false);
    const target = document.createElement('div');
    const request = vi.fn(() => Promise.resolve());
    target.requestFullscreen = request;
    const { result } = renderHook(() => useFullScreen(target));
    expect(result.current.canFullScreen).toBe(false);
    result.current.toggle();
    expect(request).not.toHaveBeenCalled();
  });
});
