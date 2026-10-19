import { describe, expect, it } from 'vitest';
import { isPromise } from './promise';

describe('isPromise', () => {
  it('is true for promises, including what async functions return, and false for plain results', async () => {
    const pending = Promise.resolve('saved');
    expect(isPromise(pending)).toBe(true);
    const saving = async () => {
      await pending;
    };
    expect(isPromise(saving())).toBe(true);
    expect(isPromise('That name is taken')).toBe(false);
    expect(isPromise(undefined)).toBe(false);
    expect(isPromise({ then: 'not a function' })).toBe(false);
    await pending;
  });
});
