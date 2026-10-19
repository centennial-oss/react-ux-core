import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIsPageHidden } from './usePageVisibility';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useIsPageHidden', () => {
  it('follows the document visibility', () => {
    const state = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const { result } = renderHook(() => useIsPageHidden());
    expect(result.current).toBe(false);
    state.mockReturnValue('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toBe(true);
    state.mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toBe(false);
  });
});
