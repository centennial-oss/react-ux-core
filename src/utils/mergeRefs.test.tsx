import { render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { mergeRefs } from './mergeRefs';

describe('mergeRefs', () => {
  it('gives the element to every ref and clears them on unmount', () => {
    const objectRef = createRef<HTMLDivElement>();
    const plain = vi.fn();
    const cleanup = vi.fn();
    const withCleanup = vi.fn(() => cleanup);
    const { unmount } = render(<div ref={mergeRefs(objectRef, plain, withCleanup, undefined)} />);

    expect(objectRef.current).toBeInstanceOf(HTMLDivElement);
    expect(plain).toHaveBeenLastCalledWith(objectRef.current);
    expect(withCleanup).toHaveBeenCalledWith(objectRef.current);

    unmount();
    expect(objectRef.current).toBeNull();
    expect(plain).toHaveBeenLastCalledWith(null);
    // A ref callback with a cleanup gets the cleanup, never a call with null.
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(withCleanup).not.toHaveBeenCalledWith(null);
  });
});
