import { describe, expect, it } from 'vitest';
import { generateOrg } from '../../test/org';
import type { CanvasRect } from '../canvas/geometry';
import {
  indexTree,
  layoutTree,
  type TreeLayout,
  type TreeLayoutNode,
  type TreeLayoutNodeInput,
} from './treeLayout';

const node = (id: string, parentId?: string, isAssistant?: boolean): TreeLayoutNodeInput => ({
  id,
  parentId,
  isAssistant,
});
const options = { nodeWidth: 100, nodeHeight: 40, nodeGap: 10, levelGap: 40 };

function rectOf(layout: TreeLayout, id: string): TreeLayoutNode {
  const rect = layout.nodes.get(id);
  if (!rect) {
    throw new Error(`No ${id}`);
  }
  return rect;
}
const centreX = (rect: CanvasRect) => rect.x + rect.width / 2;
const centreY = (rect: CanvasRect) => rect.y + rect.height / 2;

/** Pairs of nodes whose boxes overlap (touching is fine), found by sweeping in y order. */
function overlaps(layout: TreeLayout): [string, string][] {
  const entries = [...layout.nodes].sort((a, b) => a[1].y - b[1].y);
  const found: [string, string][] = [];
  entries.forEach(([id, rect], index) => {
    for (let next = index + 1; next < entries.length; next++) {
      const [otherId, other] = entries[next] ?? ['', rect];
      if (other.y >= rect.y + rect.height - 0.01) {
        break;
      }
      if (other.x < rect.x + rect.width - 0.01 && rect.x < other.x + other.width - 0.01) {
        found.push([id, otherId]);
      }
    }
  });
  return found;
}

describe('indexTree', () => {
  it('finds roots, children, depths and reading order', () => {
    const tree = indexTree(
      [node('b', 'a'), node('a'), node('c', 'a'), node('d', 'b'), node('e', 'missing')],
      (item) => item.id,
      (item) => item.parentId,
    );
    expect(tree.roots).toEqual([1, 4]);
    expect(tree.children[1]).toEqual([0, 2]);
    expect([...tree.preorder]).toEqual([1, 0, 3, 2, 4]);
    expect([...tree.depth]).toEqual([1, 0, 1, 2, 0]);
  });

  it('keeps the first of a repeated id, makes self-parents roots and breaks loops', () => {
    const tree = indexTree(
      [node('a', 'c'), node('b', 'a'), node('c', 'b'), node('d', 'a'), node('a'), node('e', 'e')],
      (item) => item.id,
      (item) => item.parentId,
    );
    // The repeated "a" is left out.
    expect(tree.parent[4]).toBe(-2);
    // "e" names itself, so it's a root; a → b → c → a is a loop, broken at the loop's first item.
    expect(tree.roots).toEqual([5, 0]);
    expect([...tree.preorder].sort()).toEqual([0, 1, 2, 3, 5]);
    expect(tree.children[0]).toEqual([1, 3]);
    expect(tree.parent[2]).toBe(1);
  });
});

describe('layoutTree', () => {
  it('centres a parent over its children, a level gap above them', () => {
    const layout = layoutTree([node('a'), node('b', 'a'), node('c', 'a'), node('d', 'a')], options);
    const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((id) => rectOf(layout, id));
    expect(centreX(a ?? rectOf(layout, 'a'))).toBe(centreX(c ?? rectOf(layout, 'c')));
    expect(b).toEqual({ x: 0, y: 80, width: 100, height: 40, depth: 1, isHanging: false });
    expect(c?.x).toBe(110);
    expect(d?.x).toBe(220);
    expect(layout.bounds).toEqual({ x: 0, y: 0, width: 320, height: 120 });
    // Down from the parent, across the children's tops, and down to each child.
    expect(layout.links).toEqual([
      {
        id: 'a',
        lines: [
          [160, 40, 160, 60],
          [50, 60, 270, 60],
          [50, 60, 50, 80],
          [160, 60, 160, 80],
          [270, 60, 270, 80],
        ],
        bounds: { x: 50, y: 40, width: 220, height: 40 },
      },
    ]);
  });

  it('runs left to right with the axes swapped', () => {
    const layout = layoutTree([node('a'), node('b', 'a'), node('c', 'a')], {
      ...options,
      direction: 'right',
    });
    expect(rectOf(layout, 'a')).toMatchObject({ x: 0, y: 25 });
    expect(rectOf(layout, 'b')).toMatchObject({ x: 140, y: 0 });
    expect(rectOf(layout, 'c')).toMatchObject({ x: 140, y: 50 });
  });

  it('mirrors for right-to-left languages', () => {
    const tree = [node('a'), node('b', 'a'), node('c', 'a')];
    const layout = layoutTree(tree, { ...options, isMirrored: true });
    expect(rectOf(layout, 'b').x).toBe(110);
    expect(rectOf(layout, 'c').x).toBe(0);
    const across = layoutTree(tree, { ...options, direction: 'right', isMirrored: true });
    expect(rectOf(across, 'a').x).toBe(140);
    expect(rectOf(across, 'b').x).toBe(0);
  });

  it('packs subtrees by their outlines, not their bounding boxes', () => {
    // "left" is wide one level down; "right" is narrow there and wide a level further down. Their bounding boxes
    // overlap across, but no level does, so they interlock.
    const layout = layoutTree(
      [
        node('root'),
        node('left', 'root'),
        node('l1', 'left'),
        node('l2', 'left'),
        node('right', 'root'),
        node('r', 'right'),
        node('r1', 'r'),
        node('r2', 'r'),
        node('r3', 'r'),
      ],
      options,
    );
    expect(overlaps(layout)).toEqual([]);
    const l2 = rectOf(layout, 'l2');
    const r = rectOf(layout, 'r');
    const r1 = rectOf(layout, 'r1');
    expect(r.x - (l2.x + l2.width)).toBe(10);
    expect(r1.x).toBeLessThan(l2.x + l2.width);
    // Parents stay centred over their first and last children.
    for (const [parent, first, last] of [
      ['root', 'left', 'right'],
      ['left', 'l1', 'l2'],
      ['right', 'r', 'r'],
      ['r', 'r1', 'r3'],
    ] as const) {
      expect(centreX(rectOf(layout, parent))).toBeCloseTo(
        (centreX(rectOf(layout, first)) + centreX(rectOf(layout, last))) / 2,
      );
    }
  });

  it('centres small subtrees in the room between large ones, rather than packing them to one side', () => {
    const wide = (id: string) => [
      node(id, 'root'),
      ...[1, 2, 3, 4].map((k) => node(`${id}${String(k)}`, id)),
    ];
    const layout = layoutTree(
      [node('root'), ...wide('a'), node('s1', 'root'), node('s2', 'root'), ...wide('b')],
      options,
    );
    const a = rectOf(layout, 'a');
    const s1 = rectOf(layout, 's1');
    const s2 = rectOf(layout, 's2');
    const b = rectOf(layout, 'b');
    expect(s1.x - (a.x + a.width)).toBeCloseTo(b.x - (s2.x + s2.width));
    expect(s1.x - (a.x + a.width)).toBeGreaterThan(10);
    expect(s2.x - (s1.x + s1.width)).toBe(10);
  });

  it('hangs assistants beside the line, above the other children', () => {
    const layout = layoutTree(
      [
        node('boss'),
        node('pa', 'boss', true),
        node('chief', 'boss', true),
        node('x', 'boss'),
        node('y', 'boss'),
      ],
      { ...options, hangGap: 16, rowGap: 20 },
    );
    const boss = rectOf(layout, 'boss');
    const pa = rectOf(layout, 'pa');
    const chief = rectOf(layout, 'chief');
    expect(pa).toMatchObject({ y: boss.y + 40 + 20, isHanging: true });
    expect(pa.x + pa.width).toBe(centreX(boss) - 16);
    expect(chief.x).toBe(centreX(boss) + 16);
    expect(chief.y).toBe(pa.y);
    // The other reports start a level gap below the assistants.
    expect(rectOf(layout, 'x').y).toBe(pa.y + 40 + 40);
    expect(overlaps(layout)).toEqual([]);
    // An assistant with reports of its own sits with the other children.
    const busy = layoutTree([node('boss'), node('pa', 'boss', true), node('kid', 'pa')], options);
    expect(rectOf(busy, 'pa').isHanging).toBe(false);
  });

  it('stacks many leaves in pairs down the line to save width', () => {
    const leaves = Array.from({ length: 7 }, (_, index) => node(`leaf${String(index)}`, 'lead'));
    const side = layoutTree([node('lead'), ...leaves], options);
    const stacked = layoutTree([node('lead'), ...leaves], { ...options, stackAbove: 3 });
    expect(side.bounds.width).toBe(7 * 100 + 6 * 10);
    expect(stacked.bounds.width).toBe(2 * 100 + 2 * 16);
    expect(overlaps(stacked)).toEqual([]);
    // Row by row: before the line, then after it.
    const rows = leaves.map((leaf) => rectOf(stacked, leaf.id));
    expect(rows[0]?.y).toBe(rows[1]?.y);
    expect(rows[0]?.x).toBeLessThan(rows[1]?.x ?? 0);
    expect(rows[2]?.y).toBeGreaterThan(rows[0]?.y ?? 0);
    // Not when a child has children of its own.
    const mixed = layoutTree([node('lead'), ...leaves, node('deep', 'leaf0')], {
      ...options,
      stackAbove: 3,
    });
    expect(rectOf(mixed, 'leaf1').isHanging).toBe(false);
  });

  it('lays out a 5,000-person org quickly, with no overlaps and every parent centred', () => {
    const org = generateOrg(5000);
    const nodes = org.map((person) => ({
      id: person.id,
      parentId: person.managerId,
      isAssistant: person.isAssistant,
    }));
    const started = performance.now();
    const layout = layoutTree(nodes, { stackAbove: 3 });
    const elapsed = performance.now() - started;
    expect(layout.nodes.size).toBe(5000);
    expect(elapsed).toBeLessThan(500);
    expect(overlaps(layout)).toEqual([]);
    const tree = indexTree(
      nodes,
      (item) => item.id,
      (item) => item.parentId,
    );
    for (const parent of tree.preorder) {
      const kids = (tree.children[parent] ?? []).filter(
        (kid) => !rectOf(layout, nodes[kid]?.id ?? '').isHanging,
      );
      const first = kids[0];
      const last = kids[kids.length - 1];
      if (first === undefined || last === undefined) {
        continue;
      }
      expect(centreX(rectOf(layout, nodes[parent]?.id ?? ''))).toBeCloseTo(
        (centreX(rectOf(layout, nodes[first]?.id ?? '')) +
          centreX(rectOf(layout, nodes[last]?.id ?? ''))) /
          2,
      );
    }
    // Stacked leaves make the layout far narrower than one row per level would be.
    expect(layout.bounds.width).toBeLessThan(layoutTree(nodes).bounds.width * 0.6);
    expect(centreY(rectOf(layout, 'p0'))).toBe(40);
  });

  it('returns an empty layout for no nodes', () => {
    expect(layoutTree([])).toEqual({
      direction: 'down',
      nodes: new Map(),
      links: [],
      bounds: { x: 0, y: 0, width: 0, height: 0 },
    });
  });
});
