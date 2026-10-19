import { describe, expect, it } from 'vitest';
import { createTypeahead, findByPrefix, isTypeaheadKey } from './typeahead';

const NAMES = ['File', 'Edit', 'View', 'Format', 'Help'];
const self = (name: string) => name;

describe('isTypeaheadKey', () => {
  it('takes one printable character without Ctrl, Alt or the command key', () => {
    const plain = { ctrlKey: false, altKey: false, metaKey: false };
    expect(isTypeaheadKey({ ...plain, key: 'f' })).toBe(true);
    expect(isTypeaheadKey({ ...plain, key: 'É' })).toBe(true);
    expect(isTypeaheadKey({ ...plain, key: ' ' })).toBe(false);
    expect(isTypeaheadKey({ ...plain, key: 'ArrowDown' })).toBe(false);
    expect(isTypeaheadKey({ ...plain, key: 'f', ctrlKey: true })).toBe(false);
    expect(isTypeaheadKey({ ...plain, key: 'f', altKey: true })).toBe(false);
    expect(isTypeaheadKey({ ...plain, key: 'f', metaKey: true })).toBe(false);
  });
});

describe('findByPrefix', () => {
  it('finds the first match from the start index, wrapping round, in any case', () => {
    expect(findByPrefix(NAMES, self, 'f', 0)).toBe(0);
    expect(findByPrefix(NAMES, self, 'f', 1)).toBe(3);
    expect(findByPrefix(NAMES, self, 'F', 4)).toBe(0);
    expect(findByPrefix(NAMES, self, 'fo', 0)).toBe(3);
    expect(findByPrefix(NAMES, self, 'x', 0)).toBe(-1);
    expect(findByPrefix([], self, 'f', 0)).toBe(-1);
  });
});

describe('createTypeahead', () => {
  it('joins characters typed within a second into one search', () => {
    const typeahead = createTypeahead();
    expect(typeahead.next('f', 0, NAMES, self, 0)).toBe(3);
    // "fo" still matches Format, where focus now is.
    expect(typeahead.next('o', 100, NAMES, self, 3)).toBe(3);
    // A second later the search starts again.
    expect(typeahead.next('e', 1200, NAMES, self, 3)).toBe(1);
  });

  it('cycles through the items a repeated character starts', () => {
    const typeahead = createTypeahead();
    expect(typeahead.next('f', 0, NAMES, self, -1)).toBe(0);
    expect(typeahead.next('f', 100, NAMES, self, 0)).toBe(3);
    expect(typeahead.next('f', 200, NAMES, self, 3)).toBe(0);
  });

  it('returns -1 when nothing matches', () => {
    expect(createTypeahead().next('z', 0, NAMES, self, 0)).toBe(-1);
  });
});
