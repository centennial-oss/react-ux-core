import { describe, expect, it } from 'vitest';
import { errorMessageOf, isAbortError } from './errors';

describe('isAbortError', () => {
  it('recognises aborted work only', () => {
    const controller = new AbortController();
    controller.abort();
    expect(isAbortError(controller.signal.reason)).toBe(true);
    expect(isAbortError(new DOMException('Stopped', 'AbortError'))).toBe(true);
    expect(isAbortError(new DOMException('Nope', 'NotAllowedError'))).toBe(false);
    expect(isAbortError(new Error('AbortError'))).toBe(false);
  });
});

describe('errorMessageOf', () => {
  it("uses an Error's message, or the fallback", () => {
    expect(errorMessageOf(new Error('Disk full'), 'Failed')).toBe('Disk full');
    expect(errorMessageOf(new Error('  '), 'Failed')).toBe('Failed');
    expect(errorMessageOf('Disk full', 'Failed')).toBe('Failed');
    expect(errorMessageOf(undefined, 'Failed')).toBe('Failed');
  });
});
