import { describe, expect, it } from 'vitest';
import { addTags, allowedTags, splitPasted, splitTyped, tagKeys, type TagRules } from './tags';

const free: TagRules = { allowsDuplicates: false, maxItems: undefined, allowed: undefined };

describe('splitTyped', () => {
  it('finishes the tags before the last delimiter and keeps the rest', () => {
    expect(splitTyped('a, b,  c', [','])).toEqual({ finished: ['a', 'b'], rest: 'c' });
    expect(splitTyped('a;b,', [',', ';'])).toEqual({ finished: ['a', 'b'], rest: '' });
    expect(splitTyped(',', [','])).toEqual({ finished: [], rest: '' });
  });

  it('is null without a delimiter', () => {
    expect(splitTyped('abc', [','])).toBeNull();
    expect(splitTyped('a,b', [''])).toBeNull();
  });
});

describe('splitPasted', () => {
  it('splits at the delimiters and every kind of line break', () => {
    expect(splitPasted('a;b\r\nc\rd\ne', [';'])).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(splitPasted('a,b', [])).toEqual(['a,b']);
  });
});

describe('addTags', () => {
  it('adds in order at the end, or at an index', () => {
    expect(addTags(['a'], ['b', 'c'], free).tags).toEqual(['a', 'b', 'c']);
    expect(addTags(['a', 'd'], ['b', 'c'], free, 1).tags).toEqual(['a', 'b', 'c', 'd']);
    expect(addTags(['a'], ['b'], free, 99).tags).toEqual(['a', 'b']);
  });

  it('refuses repeats, including within the same batch, unless allowed', () => {
    const result = addTags(['a'], ['a', 'b', 'b'], free);
    expect(result.tags).toEqual(['a', 'b']);
    expect(result.refused).toEqual([
      { tag: 'a', reason: 'duplicate' },
      { tag: 'b', reason: 'duplicate' },
    ]);
    expect(addTags(['a'], ['a'], { ...free, allowsDuplicates: true }).tags).toEqual(['a', 'a']);
  });

  it('refuses tags past the limit', () => {
    const result = addTags(['a'], ['b', 'c'], { ...free, maxItems: 2 });
    expect(result.added).toEqual(['b']);
    expect(result.refused).toEqual([{ tag: 'c', reason: 'limit' }]);
  });

  it('accepts only allowed tags, without case, as the list writes them', () => {
    const allowed = allowedTags(['Go', 'Rust']);
    const result = addTags([], ['rust', 'zig'], { ...free, allowed });
    expect(result.tags).toEqual(['Rust']);
    expect(result.refused).toEqual([{ tag: 'zig', reason: 'notInList' }]);
  });
});

describe('tagKeys', () => {
  it('keys repeats apart', () => {
    const keys = tagKeys(['a', 'b', 'a', 'a']);
    expect(new Set(keys).size).toBe(4);
    expect(keys[0]).toBe('a');
    expect(keys[1]).toBe('b');
  });
});
