import { describe, expect, it } from 'vitest';
import {
  dropMove,
  flattenTree,
  moveIdsTo,
  moveItem,
  runsBy,
  sameItems,
  sameSet,
  sortKeysDeep,
  toggleInSet,
} from './collections';

describe('toggleInSet', () => {
  it('toggles a value without changing the original', () => {
    const original = new Set(['a']);
    expect([...toggleInSet(original, 'b')]).toEqual(['a', 'b']);
    expect([...toggleInSet(original, 'a')]).toEqual([]);
    expect([...original]).toEqual(['a']);
  });

  it('adds or removes explicitly', () => {
    const original = new Set(['a']);
    expect([...toggleInSet(original, 'a', true)]).toEqual(['a']);
    expect([...toggleInSet(original, 'b', false)]).toEqual(['a']);
  });
});

describe('moveItem', () => {
  it('moves an item forward and back', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('returns an unchanged copy for out-of-range indexes', () => {
    const list = ['a', 'b'];
    const moved = moveItem(list, 0, 5);
    expect(moved).toEqual(list);
    expect(moved).not.toBe(list);
  });
});

describe('moveIdsTo', () => {
  const id = (item: string) => item;

  it('moves items before or after the target, keeping their order', () => {
    const list = ['a', 'b', 'c', 'd', 'e'];
    expect(moveIdsTo(list, { ids: ['d', 'b'], targetId: 'a', position: 'before' }, id)).toEqual([
      'b',
      'd',
      'a',
      'c',
      'e',
    ]);
    expect(moveIdsTo(list, { ids: new Set(['a']), targetId: 'e', position: 'after' }, id)).toEqual([
      'b',
      'c',
      'd',
      'e',
      'a',
    ]);
  });

  it('returns an unchanged copy for a missing or moving target', () => {
    const list = ['a', 'b', 'c'];
    const missing = moveIdsTo(list, { ids: ['a'], targetId: 'z', position: 'after' }, id);
    expect(missing).toEqual(list);
    expect(missing).not.toBe(list);
    expect(moveIdsTo(list, { ids: ['a', 'b'], targetId: 'b', position: 'after' }, id)).toEqual(
      list,
    );
  });
});

describe('dropMove', () => {
  it('describes a drop before or after a row, with the dragged ids as strings', () => {
    expect(dropMove({ key: 'b', dropPosition: 'after' }, new Set(['a', 7]))).toEqual({
      ids: ['a', '7'],
      targetId: 'b',
      position: 'after',
    });
    expect(dropMove({ key: 3, dropPosition: 'before' })).toEqual({
      ids: [],
      targetId: '3',
      position: 'before',
    });
  });

  it('places a drop on a row before it', () => {
    expect(dropMove({ key: 'c', dropPosition: 'on' }, ['a']).position).toBe('before');
  });
});

describe('sameItems', () => {
  it('compares items in order', () => {
    expect(sameItems(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(sameItems(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(sameItems(['a'], ['a', 'b'])).toBe(false);
    expect(sameItems([Number.NaN], [Number.NaN])).toBe(true);
  });
});

describe('sameSet', () => {
  it('compares members in any order', () => {
    expect(sameSet(new Set([1, 2]), new Set([2, 1]))).toBe(true);
    expect(sameSet(new Set([1, 2]), new Set([1, 3]))).toBe(false);
    expect(sameSet(new Set([1]), new Set([1, 2]))).toBe(false);
    expect(sameSet(new Set(), new Set())).toBe(true);
  });
});

describe('sortKeysDeep', () => {
  it('sorts object keys at every depth, keeping array order and Dates', () => {
    const date = new Date(0);
    const sorted = sortKeysDeep({ b: [{ z: 1, a: 2 }], a: { d: date, c: null } });
    expect(JSON.stringify(sorted)).toBe(
      JSON.stringify({ a: { c: null, d: date }, b: [{ a: 2, z: 1 }] }),
    );
    expect((sorted as { a: { d: unknown } }).a.d).toBe(date);
  });
});

describe('runsBy', () => {
  it('splits a list into runs of neighbours with the same key', () => {
    const words = ['ant', 'ape', 'bee', 'cat', 'cow', 'ant'];
    expect(runsBy(words, (word) => word[0])).toEqual([
      ['ant', 'ape'],
      ['bee'],
      ['cat', 'cow'],
      ['ant'],
    ]);
    // An undefined key is a key like any other.
    expect(runsBy([{ group: undefined }, { group: undefined }], (item) => item.group)).toHaveLength(
      1,
    );
    expect(runsBy([], String)).toEqual([]);
  });
});

describe('flattenTree', () => {
  const tree = [
    { id: 'a', children: [{ id: 'a1', children: [{ id: 'a1x' }] }, { id: 'a2' }] },
    { id: 'b' },
  ];

  it('lists parents before their children, with depth and parent', () => {
    expect(
      flattenTree(tree).map(({ item, depth, parentId }) => [item.id, depth, parentId]),
    ).toEqual([
      ['a', 0, undefined],
      ['a1', 1, 'a'],
      ['a1x', 2, 'a1'],
      ['a2', 1, 'a'],
      ['b', 0, undefined],
    ]);
  });

  it('stops at the deepest level asked for', () => {
    expect(flattenTree(tree, 2).map(({ item }) => item.id)).toEqual(['a', 'a1', 'a2', 'b']);
    expect(flattenTree(tree, 1).map(({ item }) => item.id)).toEqual(['a', 'b']);
    expect(flattenTree([])).toEqual([]);
  });
});
