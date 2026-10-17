import { describe, expect, it } from 'vitest';
import { demoLayers } from '../../../test/layers';
import { moveTreeNodes } from './move';
import type { AnyTreeNode } from './types';

/** The tree as nested ids, for readable comparisons. */
function shape(nodes: readonly AnyTreeNode[]): unknown[] {
  return nodes.map((node) => (node.children ? { [node.id]: shape(node.children) } : node.id));
}

describe('moveTreeNodes', () => {
  it('moves a node into another parent at a position', () => {
    const next = moveTreeNodes(demoLayers, { ids: ['header'], parentId: 'page-2', index: 0 });
    expect(shape(next)).toEqual([
      { 'page-1': [{ hero: ['backdrop', 'tagline'] }] },
      { 'page-2': [{ header: ['logo', 'title'] }, 'footer'] },
    ]);
    // The input is unchanged.
    expect(shape(demoLayers)[0]).toEqual({
      'page-1': [{ header: ['logo', 'title'] }, { hero: ['backdrop', 'tagline'] }],
    });
  });

  it('reorders within a parent, counting the index after the moved nodes are taken out', () => {
    const next = moveTreeNodes(demoLayers, { ids: ['logo'], parentId: 'header', index: 1 });
    expect(shape(next)[0]).toEqual({
      'page-1': [{ header: ['title', 'logo'] }, { hero: ['backdrop', 'tagline'] }],
    });
  });

  it('moves to the top level and moves several nodes together', () => {
    const next = moveTreeNodes(demoLayers, {
      ids: ['tagline', 'footer'],
      parentId: null,
      index: 1,
    });
    expect(shape(next)).toEqual([
      { 'page-1': [{ header: ['logo', 'title'] }, { hero: ['backdrop'] }] },
      'tagline',
      'footer',
      { 'page-2': [] },
    ]);
  });

  it('refuses a move into the node itself, its descendant, or an unknown parent', () => {
    expect(moveTreeNodes(demoLayers, { ids: ['page-1'], parentId: 'hero', index: 0 })).toEqual(
      demoLayers,
    );
    expect(moveTreeNodes(demoLayers, { ids: ['hero'], parentId: 'hero', index: 0 })).toEqual(
      demoLayers,
    );
    expect(moveTreeNodes(demoLayers, { ids: ['hero'], parentId: 'nowhere', index: 0 })).toEqual(
      demoLayers,
    );
  });
});
