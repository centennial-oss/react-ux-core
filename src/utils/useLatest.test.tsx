import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLatest } from './useLatest';

describe('useLatest', () => {
  it('keeps one ref holding the latest value', () => {
    const { result, rerender } = renderHook(({ value }) => useLatest(value), {
      initialProps: { value: 'first' },
    });
    const ref = result.current;
    expect(ref.current).toBe('first');
    rerender({ value: 'second' });
    expect(result.current).toBe(ref);
    expect(ref.current).toBe('second');
  });
});
