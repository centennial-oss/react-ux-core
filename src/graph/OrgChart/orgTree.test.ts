import { describe, expect, it } from 'vitest';
import { generateOrg, observatoryOrg } from '../../../test/org';
import {
  buildOrgTree,
  expandedToDepth,
  managersOf,
  orgMove,
  searchPeople,
  searchTexts,
  shownOrAbove,
  visiblePeople,
} from './orgTree';

const tree = buildOrgTree(observatoryOrg);
const at = (id: string) => tree.index.get(id) ?? -1;
const ids = (nodes: Iterable<number>) => [...nodes].map((node) => observatoryOrg[node]?.id);

describe('buildOrgTree', () => {
  it('puts assistants first among the reports, then the rest in order', () => {
    expect(ids(tree.reports[at('ines')] ?? [])).toEqual(['tom', 'mara', 'kenji', 'priya', 'sam']);
    expect(ids(tree.reports[at('priya')] ?? [])).toEqual(['lena', 'ravi', 'gwen']);
    expect(tree.isAssistant[at('tom')]).toBe(1);
    expect(tree.position[at('kenji')]).toBe(2);
  });

  it('counts everyone under each person and orders everyone for reading', () => {
    expect(tree.total[at('ines')]).toBe(observatoryOrg.length - 1);
    expect(tree.total[at('kenji')]).toBe(8);
    expect(tree.total[at('oscar')]).toBe(0);
    expect(ids(tree.preorder).slice(0, 4)).toEqual(['ines', 'tom', 'mara', 'aiko']);
    expect(tree.depth[at('rita')]).toBe(3);
  });

  it('draws an assistant with reports of their own as a regular report', () => {
    const busy = buildOrgTree([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B', managerId: 'a' },
      { id: 'c', name: 'C', managerId: 'a', isAssistant: true },
      { id: 'd', name: 'D', managerId: 'c' },
    ]);
    expect(busy.isAssistant[2]).toBe(0);
    expect(busy.reports[0]).toEqual([1, 2]);
  });
});

describe('visiblePeople', () => {
  it('shows the people at the top and the reports of expanded people, in reading order', () => {
    const view = visiblePeople(tree, new Set(['ines', 'kenji']));
    expect(ids(view.order)).toEqual([
      'ines',
      'tom',
      'mara',
      'kenji',
      'dev',
      'hana',
      'oscar',
      'priya',
      'sam',
    ]);
    expect(view.placeOf[at('dev')]).toBe(4);
    expect(view.placeOf[at('rita')]).toBe(-1);
    expect(shownOrAbove(tree, view, at('rita'))).toBe(at('dev'));
  });

  it('expands to a depth by default', () => {
    expect([...expandedToDepth(tree, 1)]).toEqual(['ines']);
    expect([...expandedToDepth(tree, 2)].sort()).toEqual(['ines', 'kenji', 'mara', 'priya', 'sam']);
  });
});

describe('orgMove', () => {
  const expanded = new Set(['ines', 'kenji', 'mara']);
  const view = visiblePeople(tree, expanded);
  const move = (from: string, step: Parameters<typeof orgMove>[4]) =>
    orgMove(tree, view, expanded, at(from), step);

  it('shows reports, then moves to the first; hides them, then moves to the manager', () => {
    expect(move('kenji', 'forward')).toEqual({ kind: 'focus', node: at('dev') });
    expect(move('dev', 'forward')).toEqual({ kind: 'expand', node: at('dev') });
    expect(move('oscar', 'forward')).toBeNull();
    expect(move('kenji', 'backward')).toEqual({ kind: 'collapse', node: at('kenji') });
    expect(move('dev', 'backward')).toEqual({ kind: 'focus', node: at('kenji') });
    expect(move('ines', 'backward')).toEqual({ kind: 'collapse', node: at('ines') });
  });

  it('moves along a level, across managers, and to the first and last person', () => {
    expect(move('mara', 'next')).toEqual({ kind: 'focus', node: at('kenji') });
    expect(move('tom', 'previous')).toBeNull();
    // From Mara's last report to Kenji's first: the next person at the same depth.
    expect(move('chloe', 'next')).toEqual({ kind: 'focus', node: at('dev') });
    expect(move('kenji', 'first')).toEqual({ kind: 'focus', node: at('ines') });
    expect(move('kenji', 'last')).toEqual({ kind: 'focus', node: at('sam') });
  });
});

describe('search', () => {
  it('finds names and titles, ignoring case, in reading order', () => {
    const texts = searchTexts(observatoryOrg);
    expect(ids(searchPeople(tree, texts, 'ENGINEER'))).toEqual([
      'kenji',
      'rita',
      'ben',
      'mei',
      'ola',
      'oscar',
    ]);
    expect(ids(searchPeople(tree, texts, ' noor '))).toEqual(['noor']);
    expect(searchPeople(tree, texts, '')).toEqual([]);
    expect(ids(managersOf(tree, at('mei')))).toEqual(['hana', 'kenji', 'ines']);
  });

  it('searches a 5,000-person org in a few milliseconds', () => {
    const org = generateOrg(5000);
    const big = buildOrgTree(org);
    const texts = searchTexts(org);
    const started = performance.now();
    const found = searchPeople(big, texts, 'director');
    expect(performance.now() - started).toBeLessThan(50);
    expect(found.length).toBeGreaterThan(10);
    expect(big.total[0]).toBe(4999);
  });
});
