import { describe, expect, it } from 'vitest';
import { filterTree, normalizeTreeSelection, treeRowIds } from './tree';

interface Node {
  id: string;
  subRows: Node[];
}

const node = (id: string, subRows: Node[] = []): Node => ({ id, subRows });

const roots = [node('a', [node('a1'), node('a2', [node('a2x'), node('a2y')])]), node('b')];

describe('normalizeTreeSelection', () => {
  it('checks a group when all its children are', () => {
    expect(normalizeTreeSelection(new Set(['a1', 'a2x', 'a2y']), roots)).toEqual(
      new Set(['a1', 'a2x', 'a2y', 'a2', 'a']),
    );
  });

  it('clears groups with only some children selected', () => {
    expect(normalizeTreeSelection(new Set(['a', 'a1', 'a2', 'a2x']), roots)).toEqual(
      new Set(['a1', 'a2x']),
    );
  });

  it('returns the same set when nothing changes', () => {
    const keys = new Set(['a1', 'b']);
    expect(normalizeTreeSelection(keys, roots)).toBe(keys);
  });
});

interface Item {
  id: string;
  name: string;
  children?: Item[];
}

const items: Item[] = [
  {
    id: 'eng',
    name: 'Engineering',
    children: [
      { id: 'web', name: 'Web' },
      { id: 'platform', name: 'Platform', children: [{ id: 'sre', name: 'SRE' }] },
    ],
  },
  { id: 'sales', name: 'Sales', children: [{ id: 'emea', name: 'EMEA' }] },
];

const options = (query: string) => ({
  getRowId: (row: Item) => row.id,
  getRowChildren: (row: Item) => row.children,
  matches: (row: Item) => row.name.toLowerCase().includes(query),
});

describe('filterTree', () => {
  it('keeps matches and their ancestors, and lists the ancestors to expand', () => {
    const result = filterTree(items, options('sre'));
    expect(result.rows.map((row) => row.id)).toEqual(['eng']);
    const eng = result.rows[0];
    expect(eng && result.getRowChildren(eng)?.map((row) => row.id)).toEqual(['platform']);
    expect(result.ancestorKeys).toEqual(new Set(['eng', 'platform']));
  });

  it('keeps all children of a matching row', () => {
    const result = filterTree(items, options('sales'));
    const sales = result.rows[0];
    expect(sales && result.getRowChildren(sales)?.map((row) => row.id)).toEqual(['emea']);
    expect(result.ancestorKeys).toEqual(new Set());
  });

  it('lists every id in a tree', () => {
    expect(
      treeRowIds(
        items,
        (row) => row.id,
        (row) => row.children,
      ),
    ).toEqual(['eng', 'web', 'platform', 'sre', 'sales', 'emea']);
  });
});
