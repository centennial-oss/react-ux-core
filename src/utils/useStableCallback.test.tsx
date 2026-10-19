import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useStableCallback } from './useStableCallback';

describe('useStableCallback', () => {
  it('keeps one function that calls the latest callback', () => {
    const { result, rerender } = renderHook(
      ({ suffix }) => useStableCallback((value: string) => `${value}${suffix}`),
      { initialProps: { suffix: '!' } },
    );
    const callback = result.current;
    expect(callback('a')).toBe('a!');
    rerender({ suffix: '?' });
    expect(result.current).toBe(callback);
    expect(callback('a')).toBe('a?');
  });
});
