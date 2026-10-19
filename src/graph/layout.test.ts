import { describe, expect, it } from 'vitest';
import { rectsIntersect } from '../canvas/geometry';
import { observatoryTopology } from '../../test/graph';
import { directRoute, groupBoxes, layoutGraph, type LayoutNodeInput } from './layout';

const box = (id: string, group?: string): LayoutNodeInput => ({
  id,
  width: 100,
  height: 40,
  group,
});
const edge = (from: string, to: string) => ({ id: `${from}-${to}`, from, to });

describe('layoutGraph', () => {
  it('puts a pipeline in consecutive layers on one line', () => {
    const stages = ['capture', 'calibrate', 'stack', 'archive', 'publish'];
    const layout = layoutGraph(
      stages.map((id) => box(id)),
      stages.slice(1).map((id, index) => edge(stages[index] ?? '', id)),
      { layerGap: 50 },
    );
    expect(stages.map((id) => layout.nodes[id]?.layer)).toEqual([0, 1, 2, 3, 4]);
    expect(stages.map((id) => layout.nodes[id]?.x)).toEqual([0, 150, 300, 450, 600]);
    // A straight line: every stage at the same height.
    expect(new Set(stages.map((id) => layout.nodes[id]?.y)).size).toBe(1);
    // Routes run from the right side of the source to the left side of the target.
    expect(layout.edges['capture-calibrate']).toEqual([
      { x: 100, y: 20 },
      { x: 150, y: 20 },
    ]);
    expect(layout.bounds).toEqual({ x: 0, y: 0, width: 700, height: 40 });
  });

  it('lays out top-down with the axes swapped', () => {
    const layout = layoutGraph([box('a'), box('b')], [edge('a', 'b')], {
      direction: 'down',
      layerGap: 30,
    });
    expect(layout.nodes.a).toMatchObject({ x: 0, y: 0 });
    expect(layout.nodes.b).toMatchObject({ x: 0, y: 70 });
    expect(layout.edges['a-b']).toEqual([
      { x: 50, y: 40 },
      { x: 50, y: 70 },
    ]);
  });

  it('uses longest-path layers, with bend points on long edges', () => {
    const layout = layoutGraph(
      [box('a'), box('b'), box('c'), box('d')],
      [edge('a', 'b'), edge('b', 'c'), edge('c', 'd'), edge('a', 'd')],
    );
    expect(['a', 'b', 'c', 'd'].map((id) => layout.nodes[id]?.layer)).toEqual([0, 1, 2, 3]);
    // a → d crosses two layers, so it bends twice: four points in all.
    expect(layout.edges['a-d']).toHaveLength(4);
  });

  it('places a source just before its first consumer', () => {
    const layout = layoutGraph(
      [box('a'), box('b'), box('c'), box('side')],
      [edge('a', 'b'), edge('b', 'c'), edge('side', 'c')],
    );
    expect(layout.nodes.side?.layer).toBe(1);
  });

  it('survives cycles and self-loops', () => {
    const layout = layoutGraph(
      [box('a'), box('b'), box('c')],
      [edge('a', 'b'), edge('b', 'c'), edge('c', 'a'), edge('b', 'b')],
    );
    expect(['a', 'b', 'c'].map((id) => layout.nodes[id]?.layer)).toEqual([0, 1, 2]);
    expect(layout.edges['c-a']?.length).toBeGreaterThanOrEqual(2);
    expect(layout.edges['b-b']?.length).toBe(4);
  });

  it('orders layers to remove avoidable crossings', () => {
    // The depth-first start puts e below c, so a → e crosses b → c; a barycentre sweep uncrosses them.
    const layout = layoutGraph(
      [box('a'), box('b'), box('c'), box('d'), box('e')],
      [edge('a', 'c'), edge('a', 'e'), edge('b', 'c'), edge('b', 'd')],
    );
    const y = (id: string) => layout.nodes[id]?.y ?? 0;
    expect(y('a')).toBeLessThan(y('b'));
    expect(y('e')).toBeLessThan(y('c'));
    expect(y('c')).toBeLessThan(y('d'));
  });

  it('keeps groups together in non-overlapping boxes', () => {
    const { nodes, edges } = observatoryTopology;
    const layout = layoutGraph(
      nodes.map((node) => ({ id: node.id, width: 176, height: 68, group: node.group })),
      edges,
    );
    expect(Object.keys(layout.nodes)).toHaveLength(60);
    const groupIds = new Set(nodes.map((node) => node.group));
    expect(layout.groups.map((group) => group.id).sort()).toEqual([...groupIds].sort());
    // No two group boxes overlap, and each node sits inside its own group's box only.
    for (const [index, a] of layout.groups.entries()) {
      for (const b of layout.groups.slice(index + 1)) {
        expect(rectsIntersect(a, b), `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
    for (const node of nodes) {
      const rect = layout.nodes[node.id];
      const group = layout.groups.find((candidate) => candidate.id === node.group);
      expect(rect && group && rectsIntersect(rect, group)).toBe(true);
    }
    // No two nodes overlap.
    const rects = Object.values(layout.nodes);
    for (const [index, a] of rects.entries()) {
      for (const b of rects.slice(index + 1)) {
        expect(
          a.x < b.x + b.width &&
            b.x < a.x + a.width &&
            a.y < b.y + b.height &&
            b.y < a.y + a.height,
        ).toBe(false);
      }
    }
  });

  it('ignores edges to missing nodes', () => {
    const layout = layoutGraph([box('a')], [edge('a', 'ghost')]);
    expect(layout.edges).toEqual({});
  });
});

describe('graph layout helpers', () => {
  it('routes between facing sides', () => {
    const left = { x: 0, y: 0, width: 100, height: 40 };
    expect(directRoute(left, { x: 200, y: 0, width: 100, height: 40 })).toEqual([
      { x: 100, y: 20 },
      { x: 200, y: 20 },
    ]);
    expect(directRoute(left, { x: 0, y: 200, width: 100, height: 40 })).toEqual([
      { x: 50, y: 40 },
      { x: 50, y: 200 },
    ]);
  });

  it('boxes groups with padding and a header', () => {
    expect(
      groupBoxes(
        [
          { rect: { x: 10, y: 50, width: 100, height: 40 }, group: 'g' },
          { rect: { x: 0, y: 0, width: 1, height: 1 } },
        ],
        {
          padding: 10,
          header: 20,
        },
      ),
    ).toEqual([{ id: 'g', x: 0, y: 20, width: 120, height: 80 }]);
  });
});
