import { describe, expect, it } from 'vitest';
import {
  autoPlace,
  compactLayout,
  deriveLayout,
  layoutRows,
  moveItem,
  normalizeLayout,
  readingOrder,
  rectsOverlap,
  rescaleLayout,
  resizeItem,
  type LayoutEntry,
  type ResizeAnchor,
  type SizeLimits,
} from './engine';

const at = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  isLocked?: boolean,
): LayoutEntry => (isLocked ? { id, x, y, w, h, isLocked } : { id, x, y, w, h });

/** The layout as `id@x,y wxh` strings, in reading order, for readable assertions. */
const show = (layout: readonly LayoutEntry[]) =>
  layout.map(
    (item) => `${item.id}@${String(item.x)},${String(item.y)} ${String(item.w)}x${String(item.h)}`,
  );

function expectValid(layout: readonly LayoutEntry[], columns: number) {
  for (const [index, item] of layout.entries()) {
    expect(Number.isInteger(item.x) && Number.isInteger(item.y)).toBe(true);
    expect(item.x).toBeGreaterThanOrEqual(0);
    expect(item.y).toBeGreaterThanOrEqual(0);
    expect(item.x + item.w).toBeLessThanOrEqual(columns);
    for (const other of layout.slice(index + 1)) {
      expect(rectsOverlap(item, other), `${item.id} overlaps ${other.id}`).toBe(false);
    }
  }
}

/** A small seeded PRNG (mulberry32), so property tests are repeatable. */
function random(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)) };
}

describe('readingOrder (GRID-08)', () => {
  it('orders by y, then x, then id', () => {
    expect(
      readingOrder([
        at('c', 0, 2, 2, 2),
        at('b', 4, 0, 2, 2),
        at('a', 0, 0, 2, 2),
        at('d', 4, 0, 2, 2),
      ]),
    ).toEqual(['a', 'b', 'd', 'c']);
  });
});

describe('normalizeLayout', () => {
  it('clamps sizes to the default limits and the columns (GRID-07)', () => {
    const layout = normalizeLayout(
      [
        { id: 'tiny', x: 0, y: 0, w: 1, h: 1 },
        { id: 'wide', x: 0, y: 2, w: 40, h: 200 },
      ],
      { columns: 12 },
    );
    expect(show(layout)).toEqual(['tiny@0,0 2x2', 'wide@0,2 12x48']);
  });

  it('applies type limits and keeps positions in bounds as whole units', () => {
    const limits = (id: string): SizeLimits | undefined =>
      id === 'chart' ? { minW: 3, minH: 3, maxH: 6 } : undefined;
    const layout = normalizeLayout([{ id: 'chart', x: 10.6, y: -3, w: 1, h: 9 }], {
      columns: 12,
      limits,
    });
    expect(show(layout)).toEqual(['chart@9,0 3x6']);
  });

  it('auto-places items without positions in array order at the first fit (GRID-06)', () => {
    const layout = normalizeLayout(
      [
        { id: 'a', w: 6, h: 4 },
        { id: 'b', w: 6, h: 4 },
        { id: 'c', w: 4, h: 2 },
        { id: 'd', w: 12, h: 2 },
      ],
      { columns: 12 },
    );
    expect(show(layout)).toEqual(['a@0,0 6x4', 'b@6,0 6x4', 'c@0,4 4x2', 'd@0,6 12x2']);
  });

  it('places auto items around positioned ones', () => {
    const layout = normalizeLayout(
      [
        { id: 'auto', w: 4, h: 2 },
        { id: 'fixed', x: 0, y: 0, w: 4, h: 2 },
      ],
      { columns: 12 },
    );
    expect(show(layout)).toEqual(['fixed@0,0 4x2', 'auto@4,0 4x2']);
  });

  it('resolves overlaps by pushing later items down (GRID-04)', () => {
    const layout = normalizeLayout(
      [
        { id: 'a', x: 0, y: 0, w: 6, h: 4 },
        { id: 'b', x: 2, y: 1, w: 6, h: 2 },
      ],
      { columns: 12, compaction: 'none' },
    );
    expect(show(layout)).toEqual(['a@0,0 6x4', 'b@2,4 6x2']);
  });

  it('keeps locked items in place and moves others off them (EDIT-15)', () => {
    const layout = normalizeLayout(
      [
        { id: 'a', x: 0, y: 0, w: 4, h: 2 },
        { id: 'lock', x: 0, y: 0, w: 4, h: 2, isLocked: true },
      ],
      { columns: 12 },
    );
    expect(show(layout)).toEqual(['lock@0,0 4x2', 'a@0,2 4x2']);
    expect(layout[0]?.isLocked).toBe(true);
  });

  it('floats items up with vertical compaction, and keeps gaps without it (GRID-05)', () => {
    const items = [
      { id: 'a', x: 0, y: 3, w: 4, h: 2 },
      { id: 'b', x: 4, y: 8, w: 4, h: 2 },
    ];
    expect(show(normalizeLayout(items, { columns: 12 }))).toEqual(['a@0,0 4x2', 'b@4,0 4x2']);
    expect(show(normalizeLayout(items, { columns: 12, compaction: 'none' }))).toEqual([
      'a@0,3 4x2',
      'b@4,8 4x2',
    ]);
  });

  it('stops floating at a locked item above', () => {
    const layout = normalizeLayout(
      [
        { id: 'lock', x: 0, y: 2, w: 12, h: 2, isLocked: true },
        { id: 'a', x: 0, y: 6, w: 4, h: 2 },
      ],
      { columns: 12 },
    );
    expect(show(layout)).toEqual(['lock@0,2 12x2', 'a@0,4 4x2']);
  });

  it('keeps the first of repeated ids', () => {
    const layout = normalizeLayout(
      [
        { id: 'a', x: 0, y: 0, w: 4, h: 2 },
        { id: 'a', x: 4, y: 0, w: 4, h: 2 },
      ],
      { columns: 12 },
    );
    expect(show(layout)).toEqual(['a@0,0 4x2']);
  });

  it('is idempotent', () => {
    const once = normalizeLayout(
      [
        { id: 'a', w: 5, h: 3 },
        { id: 'b', x: 3, y: 1, w: 7, h: 2 },
        { id: 'c', x: 0, y: 9, w: 2, h: 5, isLocked: true },
        { id: 'd', w: 12, h: 2 },
      ],
      { columns: 12 },
    );
    expect(normalizeLayout(once, { columns: 12 })).toEqual(once);
  });
});

describe('moveItem', () => {
  const base = normalizeLayout(
    [
      { id: 'a', x: 0, y: 0, w: 6, h: 2 },
      { id: 'b', x: 6, y: 0, w: 6, h: 2 },
      { id: 'c', x: 0, y: 2, w: 6, h: 2 },
    ],
    { columns: 12 },
  );

  it('moves an item into free space and compacts', () => {
    const layout = moveItem(base, 'c', { x: 6, y: 5 }, { columns: 12 });
    expect(show(layout)).toEqual(['a@0,0 6x2', 'b@6,0 6x2', 'c@6,2 6x2']);
  });

  it('swaps an item dropped onto another (acceptance 10)', () => {
    const layout = moveItem(base, 'a', { x: 0, y: 2 }, { columns: 12 });
    expect(show(layout)).toEqual(['c@0,0 6x2', 'b@6,0 6x2', 'a@0,2 6x2']);
  });

  it('pushes displaced items down when there is no room above', () => {
    const layout = moveItem(base, 'c', { x: 6, y: 0 }, { columns: 12 });
    expect(show(layout)).toEqual(['a@0,0 6x2', 'c@6,0 6x2', 'b@6,2 6x2']);
  });

  it('cascades pushes through several items', () => {
    const stack = normalizeLayout(
      [
        { id: 'a', x: 0, y: 0, w: 4, h: 2 },
        { id: 'b', x: 0, y: 2, w: 4, h: 2 },
        { id: 'c', x: 0, y: 4, w: 4, h: 2 },
        { id: 'm', x: 4, y: 0, w: 8, h: 3 },
      ],
      { columns: 12 },
    );
    const layout = moveItem(stack, 'm', { x: 0, y: 0 }, { columns: 12 });
    expect(show(layout)).toEqual(['m@0,0 8x3', 'a@0,3 4x2', 'b@0,5 4x2', 'c@0,7 4x2']);
  });

  it('holds the target inside the grid', () => {
    const layout = moveItem(base, 'c', { x: 20, y: -4 }, { columns: 12 });
    expectValid(layout, 12);
    expect(layout.find((item) => item.id === 'c')?.x).toBe(6);
  });

  it('treats locked items as fixed obstacles and never moves them (EDIT-15)', () => {
    const locked = normalizeLayout(
      [
        { id: 'lock', x: 0, y: 0, w: 6, h: 2, isLocked: true },
        { id: 'a', x: 6, y: 0, w: 6, h: 2 },
      ],
      { columns: 12 },
    );
    // Moving onto the locked item lands below it.
    expect(show(moveItem(locked, 'a', { x: 0, y: 0 }, { columns: 12 }))).toEqual([
      'lock@0,0 6x2',
      'a@0,2 6x2',
    ]);
    // The locked item itself doesn't move.
    expect(moveItem(locked, 'lock', { x: 6, y: 4 }, { columns: 12 })).toEqual(locked);
  });

  it('keeps gaps without compaction', () => {
    const layout = moveItem(base, 'c', { x: 6, y: 6 }, { columns: 12, compaction: 'none' });
    expect(show(layout)).toEqual(['a@0,0 6x2', 'b@6,0 6x2', 'c@6,6 6x2']);
  });

  it('ignores unknown ids', () => {
    expect(moveItem(base, 'nope', { x: 0, y: 0 }, { columns: 12 })).toEqual(base);
  });
});

describe('resizeItem', () => {
  const base = normalizeLayout(
    [
      { id: 'a', x: 0, y: 0, w: 4, h: 2 },
      { id: 'b', x: 4, y: 0, w: 4, h: 2 },
      { id: 'c', x: 0, y: 2, w: 4, h: 2 },
    ],
    { columns: 12 },
  );

  it('grows from the bottom-end corner and pushes colliding items down', () => {
    const layout = resizeItem(base, 'a', { w: 6, h: 3 }, 'se', { columns: 12 });
    expect(show(layout)).toEqual(['a@0,0 6x3', 'c@0,3 4x2', 'b@4,3 4x2']);
  });

  it('keeps the other dimension for an edge-only anchor', () => {
    expect(show(resizeItem(base, 'a', { w: 2, h: 9 }, 'e', { columns: 12 }))[0]).toBe('a@0,0 2x2');
    expect(show(resizeItem(base, 'c', { w: 9, h: 5 }, 's', { columns: 12 })).at(-1)).toBe(
      'c@0,2 4x5',
    );
  });

  it('keeps the opposite edge when pulling the inline-start or top edge', () => {
    const fromStart = resizeItem(base, 'b', { w: 6, h: 2 }, 'w', { columns: 12 });
    expect(fromStart.find((item) => item.id === 'b')).toMatchObject({ x: 2, w: 6 });
    const fromTop = resizeItem(
      normalizeLayout([{ id: 'x', x: 0, y: 4, w: 4, h: 2 }], { columns: 12, compaction: 'none' }),
      'x',
      { w: 4, h: 5 },
      'n',
      { columns: 12, compaction: 'none' },
    );
    expect(show(fromTop)).toEqual(['x@0,1 4x5']);
  });

  it('clamps to the limits and the grid while resizing (EDIT-17)', () => {
    const limits = (): SizeLimits => ({ minW: 3, minH: 2, maxH: 4 });
    const layout = resizeItem(base, 'b', { w: 40, h: 40 }, 'se', { columns: 12, limits });
    expect(layout.find((item) => item.id === 'b')).toMatchObject({ x: 4, w: 8, h: 4 });
    const small = resizeItem(base, 'b', { w: 0, h: 0 }, 'se', { columns: 12, limits });
    expect(small.find((item) => item.id === 'b')).toMatchObject({ w: 3, h: 2 });
    const fromStart = resizeItem(base, 'b', { w: 40, h: 2 }, 'w', { columns: 12 });
    expect(fromStart.find((item) => item.id === 'b')).toMatchObject({ x: 0, w: 8 });
  });

  it('never resizes locked items or over them', () => {
    const locked = normalizeLayout(
      [
        { id: 'lock', x: 4, y: 0, w: 4, h: 2, isLocked: true },
        { id: 'a', x: 0, y: 0, w: 4, h: 2 },
      ],
      { columns: 12 },
    );
    expect(resizeItem(locked, 'lock', { w: 8, h: 8 }, 'se', { columns: 12 })).toEqual(locked);
    const grown = resizeItem(locked, 'a', { w: 6, h: 2 }, 'e', { columns: 12 });
    expectValid(grown, 12);
    expect(grown.find((item) => item.id === 'lock')).toMatchObject({ x: 4, y: 0 });
  });
});

describe('autoPlace', () => {
  const layout = [at('a', 0, 0, 4, 2), at('b', 8, 0, 4, 2), at('c', 0, 2, 12, 2)];

  it('finds the first position that fits, rows first', () => {
    expect(autoPlace(layout, { w: 4, h: 2 }, 12)).toEqual({ x: 4, y: 0 });
    expect(autoPlace(layout, { w: 5, h: 2 }, 12)).toEqual({ x: 0, y: 4 });
  });

  it('starts from a given position (EDIT-10, EDIT-19)', () => {
    expect(autoPlace(layout, { w: 2, h: 2 }, 12, { x: 6, y: 0 })).toEqual({ x: 6, y: 0 });
    expect(autoPlace(layout, { w: 2, h: 2 }, 12, { x: 9, y: 0 })).toEqual({ x: 0, y: 4 });
  });
});

describe('deriveLayout (RESP-04)', () => {
  const canonical = normalizeLayout(
    [
      { id: 'chart', x: 0, y: 0, w: 8, h: 6 },
      { id: 'stats', x: 8, y: 0, w: 4, h: 3 },
      { id: 'legend', x: 8, y: 3, w: 4, h: 3 },
      { id: 'table', x: 0, y: 6, w: 6, h: 5 },
      { id: 'map', x: 6, y: 6, w: 6, h: 5 },
    ],
    { columns: 12 },
  );

  it('keeps the canonical layout at full width', () => {
    expect(deriveLayout(canonical, 12, 12)).toEqual(canonical);
  });

  it('halves widths for the half breakpoint and keeps row-mates side by side', () => {
    const half = deriveLayout(canonical, 12, 6);
    expectValid(half, 6);
    expect(show(half)).toEqual([
      'chart@0,0 4x6',
      'stats@4,0 2x3',
      'legend@4,3 2x3',
      'table@0,6 3x5',
      'map@3,6 3x5',
    ]);
  });

  it('stacks every widget full width in reading order for one column', () => {
    const stack = deriveLayout(canonical, 12, 1);
    expectValid(stack, 1);
    expect(readingOrder(stack)).toEqual(readingOrder(canonical));
    expect(stack.every((item) => item.w === 1)).toBe(true);
  });

  it('keeps the scaled minimum width', () => {
    const derived = deriveLayout([at('a', 0, 0, 2, 2)], 12, 6, () => ({ minW: 6 }));
    expect(derived[0]?.w).toBe(3);
  });
});

describe('rescaleLayout (GRID-03)', () => {
  it('doubles positions and widths from 12 to 24 columns', () => {
    const layout = normalizeLayout(
      [
        { id: 'a', x: 0, y: 0, w: 6, h: 4 },
        { id: 'b', x: 6, y: 0, w: 6, h: 4 },
      ],
      { columns: 12 },
    );
    expect(show(rescaleLayout(layout, 12, 24))).toEqual(['a@0,0 12x4', 'b@12,0 12x4']);
  });

  it('keeps each width at or above its minimum when shrinking', () => {
    const layout = [at('a', 0, 0, 3, 2), at('b', 3, 0, 3, 2)];
    const rescaled = rescaleLayout(layout, 12, 6, { limits: () => ({ minW: 2 }) });
    expectValid(rescaled, 6);
    expect(rescaled.every((item) => item.w >= 2)).toBe(true);
  });
});

describe('compactLayout', () => {
  it('brings stray items inside the grid before compacting', () => {
    const layout = compactLayout([at('a', 10, 5, 6, 2)], { columns: 12 });
    expect(show(layout)).toEqual(['a@6,0 6x2']);
  });
});

describe('properties (TEST-01)', () => {
  const ops = ['move', 'resize', 'normalize'] as const;
  const anchors: ResizeAnchor[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    it(`keeps every layout valid and deterministic over random operations (seed ${String(seed)})`, () => {
      const rng = random(seed);
      const columns = rng.int(4, 24);
      const compaction = rng.next() < 0.5 ? 'vertical' : 'none';
      const options = { columns, compaction } as const;
      let layout = normalizeLayout(
        Array.from({ length: rng.int(5, 30) }, (_, index) => ({
          id: `w${String(index)}`,
          ...(rng.next() < 0.7 ? { x: rng.int(0, columns), y: rng.int(0, 20) } : {}),
          w: rng.int(1, columns + 2),
          h: rng.int(1, 8),
          isLocked: rng.next() < 0.1,
        })),
        options,
      );
      expectValid(layout, columns);
      for (let step = 0; step < 40; step++) {
        const op = ops[rng.int(0, ops.length - 1)];
        const target = layout[rng.int(0, layout.length - 1)];
        if (!target) {
          break;
        }
        const run = () => {
          if (op === 'move') {
            return moveItem(
              layout,
              target.id,
              { x: rng.int(-2, columns), y: rng.int(-2, 30) },
              options,
            );
          }
          if (op === 'resize') {
            return resizeItem(
              layout,
              target.id,
              { w: rng.int(0, columns + 3), h: rng.int(0, 10) },
              anchors[rng.int(0, anchors.length - 1)] ?? 'se',
              options,
            );
          }
          return normalizeLayout(layout, options);
        };
        const next = run();
        expectValid(next, columns);
        // Locked items never move.
        for (const item of layout.filter((entry) => entry.isLocked)) {
          expect(next.find((entry) => entry.id === item.id)).toEqual(item);
        }
        // Normalizing a result changes nothing.
        expect(normalizeLayout(next, options)).toEqual(next);
        layout = next;
      }
    });
  }

  it('gives the same output for the same input (GRID-09)', () => {
    const items = Array.from({ length: 40 }, (_, index) => ({
      id: `w${String((index * 7) % 40)}`,
      w: 1 + (index % 5),
      h: 1 + (index % 3),
    }));
    const first = normalizeLayout(items, { columns: 12 });
    const second = normalizeLayout(
      items.map((item) => ({ ...item })),
      { columns: 12 },
    );
    expect(second).toEqual(first);
    expect(moveItem(first, 'w3', { x: 4, y: 2 }, { columns: 12 })).toEqual(
      moveItem(second, 'w3', { x: 4, y: 2 }, { columns: 12 }),
    );
  });
});

describe('performance (PERF-01)', () => {
  it('moves, resizes and normalizes a 100-widget page in under 2 ms', () => {
    const rng = random(42);
    const layout = normalizeLayout(
      Array.from({ length: 100 }, (_, index) => ({
        id: `w${String(index)}`,
        w: rng.int(2, 6),
        h: rng.int(2, 6),
      })),
      { columns: 12 },
    );
    expect(layoutRows(layout)).toBeGreaterThan(20);
    const time = (run: () => void) => {
      const samples: number[] = [];
      for (let index = 0; index < 30; index++) {
        const start = performance.now();
        run();
        samples.push(performance.now() - start);
      }
      return samples.sort((a, b) => a - b)[15] ?? 0;
    };
    expect(time(() => moveItem(layout, 'w50', { x: 3, y: 0 }, { columns: 12 }))).toBeLessThan(2);
    expect(
      time(() => resizeItem(layout, 'w10', { w: 8, h: 6 }, 'se', { columns: 12 })),
    ).toBeLessThan(2);
    expect(time(() => normalizeLayout(layout, { columns: 12 }))).toBeLessThan(2);
    expect(time(() => deriveLayout(layout, 12, 6))).toBeLessThan(2);
  });
});
