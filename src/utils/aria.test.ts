import { describe, expect, it } from 'vitest';
import { joinIds } from './aria';

describe('joinIds', () => {
  it('joins the ids that are present', () => {
    expect(joinIds('a', undefined, 'b', false, null, '', 'c')).toBe('a b c');
  });

  it('is undefined rather than empty when none are present', () => {
    expect(joinIds()).toBeUndefined();
    expect(joinIds(undefined, '', false)).toBeUndefined();
  });
});
