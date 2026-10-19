// layoutGraph: a layered (Sugiyama-style) layout with no dependencies, for NodeGraph's `layered` and `top-down`
// layouts. The steps:
//   1. Break cycles by reversing the back edges a depth-first search finds.
//   2. Assign layers by longest path from the sources; a source moves next to its first consumer.
//   3. Split edges that span several layers with invisible bend points, one per layer crossed.
//   4. Order each layer by barycentre sweeps (down, then up), keeping the order with the fewest crossings. Groups are
//      bands: a group's nodes stay together in every layer, and bands are ordered by their members' barycentres.
//   5. Place layers along the main axis, and nodes across it by pulling each toward its neighbours' centre without
//      overlapping (the average of a forward and a backward packing pass), then stack the bands with gaps.
//   6. Route each edge through its bend points, and draw each group as the box around its nodes plus a header.

import type { CanvasPoint, CanvasRect } from '../canvas/geometry';

/** `right`: layers run left to right (pipelines). `down`: top to bottom. */
export type LayoutDirection = 'right' | 'down';

export interface LayoutNodeInput {
  id: string;
  width: number;
  height: number;
  /** Nodes with the same group are kept together and boxed. */
  group?: string;
}

export interface LayoutEdgeInput {
  id: string;
  from: string;
  to: string;
}

export interface LayoutOptions {
  /** Defaults to `right`. */
  direction?: LayoutDirection;
  /** Space between nodes in the same layer. Defaults to 24. */
  nodeGap?: number;
  /** Space between layers. Defaults to 64. */
  layerGap?: number;
  /** Space between groups. Defaults to 32. */
  groupGap?: number;
  /** Space between a group's box and its nodes. Defaults to 16. */
  groupPadding?: number;
  /** Height of a group's label strip at the top of its box. Defaults to 28. */
  groupHeader?: number;
}

export interface LayoutNode extends CanvasRect {
  /** The node's layer (0 is the first). */
  layer: number;
  /** Its position within the layer (0 is the top or left). */
  order: number;
}

export interface LayoutGroup extends CanvasRect {
  id: string;
}

export interface GraphLayout {
  direction: LayoutDirection;
  /** Each node's top-left corner, size, layer and order, by id. */
  nodes: Record<string, LayoutNode>;
  /** Each edge's route by id, from the source's port to the target's, through its bend points. */
  edges: Record<string, CanvasPoint[]>;
  groups: LayoutGroup[];
  /** Everything the layout draws. */
  bounds: CanvasRect;
}

interface Vertex {
  id: string;
  /** Size along the layers' axis and across it. */
  main: number;
  cross: number;
  band: string;
  isDummy: boolean;
  layer: number;
  /** Ids of neighbours in the previous and next layers. */
  up: string[];
  down: string[];
}

const NO_GROUP = '\u0000';

/** The side of a rectangle an edge leaves from (`out`) or arrives at (`in`). */
export function portPoint(
  rect: CanvasRect,
  side: 'in' | 'out',
  direction: LayoutDirection,
): CanvasPoint {
  if (direction === 'right') {
    return { x: side === 'out' ? rect.x + rect.width : rect.x, y: rect.y + rect.height / 2 };
  }
  return { x: rect.x + rect.width / 2, y: side === 'out' ? rect.y + rect.height : rect.y };
}

/** A direct route between two rectangles, leaving and arriving on the sides that face each other. */
export function directRoute(
  from: CanvasRect,
  to: CanvasRect,
  direction?: LayoutDirection,
): CanvasPoint[] {
  const dx = to.x + to.width / 2 - (from.x + from.width / 2);
  const dy = to.y + to.height / 2 - (from.y + from.height / 2);
  const axis = direction ?? (Math.abs(dx) >= Math.abs(dy) ? 'right' : 'down');
  if (axis === 'right' && dx < 0 && direction === undefined) {
    return [
      { x: from.x, y: from.y + from.height / 2 },
      { x: to.x + to.width, y: to.y + to.height / 2 },
    ];
  }
  if (axis === 'down' && dy < 0 && direction === undefined) {
    return [
      { x: from.x + from.width / 2, y: from.y },
      { x: to.x + to.width / 2, y: to.y + to.height },
    ];
  }
  return [portPoint(from, 'out', axis), portPoint(to, 'in', axis)];
}

/** Boxes around each group's nodes, with padding and a header strip on top. */
export function groupBoxes(
  nodes: readonly { rect: CanvasRect; group?: string }[],
  { padding = 16, header = 28 }: { padding?: number; header?: number } = {},
): LayoutGroup[] {
  const boxes = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();
  for (const { rect, group } of nodes) {
    if (group === undefined) {
      continue;
    }
    const box = boxes.get(group) ?? {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    };
    box.minX = Math.min(box.minX, rect.x);
    box.minY = Math.min(box.minY, rect.y);
    box.maxX = Math.max(box.maxX, rect.x + rect.width);
    box.maxY = Math.max(box.maxY, rect.y + rect.height);
    boxes.set(group, box);
  }
  return [...boxes].map(([id, box]) => ({
    id,
    x: box.minX - padding,
    y: box.minY - padding - header,
    width: box.maxX - box.minX + padding * 2,
    height: box.maxY - box.minY + padding * 2 + header,
  }));
}

/** Crossings between the edges joining two adjacent layers, given each vertex's order. */
function countCrossings(
  upper: readonly string[],
  vertices: Map<string, Vertex>,
  order: Map<string, number>,
): number {
  const pairs: [number, number][] = [];
  for (const id of upper) {
    for (const next of vertices.get(id)?.down ?? []) {
      pairs.push([order.get(id) ?? 0, order.get(next) ?? 0]);
    }
  }
  let crossings = 0;
  for (let i = 0; i < pairs.length; i++) {
    const a = pairs[i];
    for (let j = i + 1; j < pairs.length; j++) {
      const b = pairs[j];
      if (a && b && (a[0] - b[0]) * (a[1] - b[1]) < 0) {
        crossings++;
      }
    }
  }
  return crossings;
}

/** Lays out a directed graph in layers, keeping groups together. */
export function layoutGraph(
  nodes: readonly LayoutNodeInput[],
  edges: readonly LayoutEdgeInput[],
  {
    direction = 'right',
    nodeGap = 24,
    layerGap = 64,
    groupGap = 32,
    groupPadding = 16,
    groupHeader = 28,
  }: LayoutOptions = {},
): GraphLayout {
  const isRight = direction === 'right';
  const inputs = new Map(nodes.map((node) => [node.id, node]));
  const valid = edges.filter(
    (edge) => edge.from !== edge.to && inputs.has(edge.from) && inputs.has(edge.to),
  );

  // 1. Cycles: reverse the edges that point back up the depth-first search's stack.
  const outgoing = new Map<string, LayoutEdgeInput[]>(nodes.map((node) => [node.id, []]));
  for (const edge of valid) {
    outgoing.get(edge.from)?.push(edge);
  }
  const reversed = new Set<string>();
  const state = new Map<string, 'open' | 'done'>();
  const visit = (start: string) => {
    // Iterative, so long chains can't overflow the stack.
    const stack: { id: string; index: number }[] = [{ id: start, index: 0 }];
    state.set(start, 'open');
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (!top) {
        break;
      }
      const out = outgoing.get(top.id) ?? [];
      const edge = out[top.index];
      top.index++;
      if (!edge) {
        state.set(top.id, 'done');
        stack.pop();
        continue;
      }
      const seen = state.get(edge.to);
      if (seen === 'open') {
        reversed.add(edge.id);
      } else if (seen === undefined) {
        state.set(edge.to, 'open');
        stack.push({ id: edge.to, index: 0 });
      }
    }
  };
  // Start from the sources so the search follows the graph's flow.
  const hasIncoming = new Set(valid.map((edge) => edge.to));
  for (const node of nodes) {
    if (!hasIncoming.has(node.id) && !state.has(node.id)) {
      visit(node.id);
    }
  }
  for (const node of nodes) {
    if (!state.has(node.id)) {
      visit(node.id);
    }
  }
  const dag = valid.map((edge) =>
    reversed.has(edge.id)
      ? { id: edge.id, from: edge.to, to: edge.from }
      : { id: edge.id, from: edge.from, to: edge.to },
  );

  // 2. Layers: longest path from the sources (Kahn's order, in input order for stability).
  const preds = new Map<string, string[]>(nodes.map((node) => [node.id, []]));
  const succs = new Map<string, string[]>(nodes.map((node) => [node.id, []]));
  for (const edge of dag) {
    preds.get(edge.to)?.push(edge.from);
    succs.get(edge.from)?.push(edge.to);
  }
  const layer = new Map<string, number>(nodes.map((node) => [node.id, 0]));
  const remaining = new Map(nodes.map((node) => [node.id, preds.get(node.id)?.length ?? 0]));
  const queue = nodes.filter((node) => remaining.get(node.id) === 0).map((node) => node.id);
  const topological: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift() ?? '';
    topological.push(id);
    for (const next of succs.get(id) ?? []) {
      layer.set(next, Math.max(layer.get(next) ?? 0, (layer.get(id) ?? 0) + 1));
      const left = (remaining.get(next) ?? 1) - 1;
      remaining.set(next, left);
      if (left === 0) {
        queue.push(next);
      }
    }
  }
  // A source sits just before its earliest consumer, not at the far left.
  for (const id of [...topological].reverse()) {
    const next = succs.get(id) ?? [];
    if ((preds.get(id)?.length ?? 0) === 0 && next.length > 0) {
      layer.set(id, Math.min(...next.map((other) => layer.get(other) ?? 0)) - 1);
    }
  }

  // 3. Vertices, with a bend point for each layer a long edge crosses.
  const vertices = new Map<string, Vertex>();
  for (const node of nodes) {
    vertices.set(node.id, {
      id: node.id,
      main: isRight ? node.width : node.height,
      cross: isRight ? node.height : node.width,
      band: node.group ?? NO_GROUP,
      isDummy: false,
      layer: layer.get(node.id) ?? 0,
      up: [],
      down: [],
    });
  }
  const chains = new Map<string, string[]>();
  for (const edge of dag) {
    const from = vertices.get(edge.from);
    const to = vertices.get(edge.to);
    if (!from || !to) {
      continue;
    }
    const chain = [edge.from];
    const span = to.layer - from.layer;
    for (let step = 1; step < span; step++) {
      const id = `\u0000${edge.id}\u0000${String(step)}`;
      vertices.set(id, {
        id,
        main: 0,
        cross: 2,
        band: step < span / 2 ? from.band : to.band,
        isDummy: true,
        layer: from.layer + step,
        up: [],
        down: [],
      });
      chain.push(id);
    }
    chain.push(edge.to);
    for (let index = 0; index < chain.length - 1; index++) {
      const upper = vertices.get(chain[index] ?? '');
      const lower = vertices.get(chain[index + 1] ?? '');
      if (upper && lower) {
        upper.down.push(lower.id);
        lower.up.push(upper.id);
      }
    }
    chains.set(edge.id, chain);
  }

  const layerCount = Math.max(0, ...[...vertices.values()].map((vertex) => vertex.layer + 1));
  const layers: string[][] = Array.from({ length: layerCount }, () => []);

  // 4. Ordering. Start from a depth-first order (it keeps chains together), then sweep.
  const placed = new Set<string>();
  const place = (id: string) => {
    const stack = [id];
    while (stack.length > 0) {
      const current = stack.pop() ?? '';
      if (placed.has(current)) {
        continue;
      }
      placed.add(current);
      const vertex = vertices.get(current);
      if (!vertex) {
        continue;
      }
      layers[vertex.layer]?.push(current);
      stack.push(...[...vertex.down].reverse());
    }
  };
  for (const id of topological) {
    if ((vertices.get(id)?.up.length ?? 0) === 0) {
      place(id);
    }
  }
  for (const id of vertices.keys()) {
    place(id);
  }

  // Bands in order of first appearance; later sweeps reorder them by their members' barycentres.
  const bandRank = new Map<string, number>();
  for (const row of layers) {
    for (const id of row) {
      const band = vertices.get(id)?.band ?? NO_GROUP;
      if (!bandRank.has(band)) {
        bandRank.set(band, bandRank.size);
      }
    }
  }
  const order = new Map<string, number>();
  const renumber = () => {
    for (const row of layers) {
      row.forEach((id, index) => order.set(id, index));
    }
  };
  const sortRow = (row: string[], score: Map<string, number>) => {
    row.sort(
      (a, b) =>
        (bandRank.get(vertices.get(a)?.band ?? NO_GROUP) ?? 0) -
          (bandRank.get(vertices.get(b)?.band ?? NO_GROUP) ?? 0) ||
        (score.get(a) ?? 0) - (score.get(b) ?? 0) ||
        (order.get(a) ?? 0) - (order.get(b) ?? 0),
    );
  };
  for (const row of layers) {
    sortRow(row, new Map());
  }
  renumber();

  const totalCrossings = () => {
    let total = 0;
    for (let index = 0; index < layers.length - 1; index++) {
      total += countCrossings(layers[index] ?? [], vertices, order);
    }
    return total;
  };
  let best = layers.map((row) => [...row]);
  let bestCrossings = totalCrossings();
  let bestRanks = new Map(bandRank);

  for (let sweep = 0; sweep < 12 && bestCrossings > 0; sweep++) {
    const isDown = sweep % 2 === 0;
    const sequence = isDown
      ? layers.map((_, index) => index).slice(1)
      : layers
          .map((_, index) => index)
          .reverse()
          .slice(1);
    for (const index of sequence) {
      const row = layers[index];
      if (!row) {
        continue;
      }
      const score = new Map<string, number>();
      for (const id of row) {
        const vertex = vertices.get(id);
        const neighbours = (isDown ? vertex?.up : vertex?.down) ?? [];
        score.set(
          id,
          neighbours.length > 0
            ? neighbours.reduce((sum, other) => sum + (order.get(other) ?? 0), 0) /
                neighbours.length
            : (order.get(id) ?? 0),
        );
      }
      sortRow(row, score);
      row.forEach((id, position) => order.set(id, position));
    }
    // Reorder the bands by where their members ended up, relative to each layer's size.
    const bandScore = new Map<string, { sum: number; count: number }>();
    for (const row of layers) {
      row.forEach((id, position) => {
        const band = vertices.get(id)?.band ?? NO_GROUP;
        const entry = bandScore.get(band) ?? { sum: 0, count: 0 };
        entry.sum += row.length > 1 ? position / (row.length - 1) : 0.5;
        entry.count++;
        bandScore.set(band, entry);
      });
    }
    [...bandRank.keys()]
      .sort(
        (a, b) =>
          (bandScore.get(a)?.sum ?? 0) / (bandScore.get(a)?.count ?? 1) -
            (bandScore.get(b)?.sum ?? 0) / (bandScore.get(b)?.count ?? 1) ||
          (bandRank.get(a) ?? 0) - (bandRank.get(b) ?? 0),
      )
      .forEach((band, rank) => bandRank.set(band, rank));
    for (const row of layers) {
      sortRow(row, new Map());
    }
    renumber();
    const crossings = totalCrossings();
    if (crossings < bestCrossings) {
      bestCrossings = crossings;
      best = layers.map((row) => [...row]);
      bestRanks = new Map(bandRank);
    }
  }
  best.forEach((row, index) => {
    layers[index] = row;
  });
  for (const [band, rank] of bestRanks) {
    bandRank.set(band, rank);
  }
  renumber();

  // 5a. The main axis: each layer is as deep as its deepest node, and nodes are centred in it.
  const layerDepth = layers.map((row) =>
    Math.max(0, ...row.map((id) => vertices.get(id)?.main ?? 0)),
  );
  const layerStart: number[] = [];
  layerDepth.reduce((start, depth, index) => {
    layerStart[index] = start;
    return start + depth + layerGap;
  }, 0);

  // 5b. The cross axis, per band in band-local coordinates.
  const centre = new Map<string, number>();
  const bands = [...bandRank.keys()].sort(
    (a, b) => (bandRank.get(a) ?? 0) - (bandRank.get(b) ?? 0),
  );
  const separation = (a: Vertex, b: Vertex) =>
    a.cross / 2 + b.cross / 2 + (a.isDummy || b.isDummy ? nodeGap / 2 : nodeGap);
  const bandRows = new Map<string, string[][]>();
  for (const band of bands) {
    const rows = layers.map((row) => row.filter((id) => vertices.get(id)?.band === band));
    bandRows.set(band, rows);
    for (const row of rows) {
      let position = 0;
      row.forEach((id, index) => {
        const vertex = vertices.get(id);
        const previous = vertices.get(row[index - 1] ?? '');
        if (vertex) {
          position += previous ? separation(previous, vertex) : vertex.cross / 2;
          centre.set(id, position);
        }
      });
    }
    // Pull each node toward its neighbours (in this band), packing forward and backward and averaging.
    for (let pass = 0; pass < 8; pass++) {
      const isDown = pass % 2 === 0;
      const sequence = isDown ? rows : [...rows].reverse();
      for (const row of sequence) {
        const desired = row.map((id) => {
          const vertex = vertices.get(id);
          const neighbours = [...(vertex?.up ?? []), ...(vertex?.down ?? [])].filter(
            (other) => vertices.get(other)?.band === band,
          );
          return neighbours.length > 0
            ? neighbours.reduce((sum, other) => sum + (centre.get(other) ?? 0), 0) /
                neighbours.length
            : (centre.get(id) ?? 0);
        });
        const forward: number[] = [];
        const backward: number[] = [];
        row.forEach((id, index) => {
          const vertex = vertices.get(id);
          const previous = vertices.get(row[index - 1] ?? '');
          const wanted = desired[index] ?? 0;
          const before = forward[index - 1];
          forward[index] =
            vertex && previous && before !== undefined
              ? Math.max(wanted, before + separation(previous, vertex))
              : wanted;
        });
        for (let index = row.length - 1; index >= 0; index--) {
          const vertex = vertices.get(row[index] ?? '');
          const next = vertices.get(row[index + 1] ?? '');
          const wanted = desired[index] ?? 0;
          const after = backward[index + 1];
          backward[index] =
            vertex && next && after !== undefined
              ? Math.min(wanted, after - separation(vertex, next))
              : wanted;
        }
        row.forEach((id, index) => {
          centre.set(id, ((forward[index] ?? 0) + (backward[index] ?? 0)) / 2);
        });
      }
    }
  }

  // 5c. Stack the bands, each starting where the previous one (and its group box) ends.
  let offset = 0;
  for (const band of bands) {
    const rows = bandRows.get(band) ?? [];
    let min = Infinity;
    let max = -Infinity;
    for (const row of rows) {
      for (const id of row) {
        const vertex = vertices.get(id);
        const middle = centre.get(id) ?? 0;
        if (vertex) {
          min = Math.min(min, middle - vertex.cross / 2);
          max = Math.max(max, middle + vertex.cross / 2);
        }
      }
    }
    if (!Number.isFinite(min)) {
      continue;
    }
    const isGroup = band !== NO_GROUP;
    // Across the layers, a group's box adds padding on both sides, and its header when that's the cross axis.
    const lead = isGroup ? groupPadding + (isRight ? groupHeader : 0) : 0;
    for (const row of rows) {
      for (const id of row) {
        centre.set(id, (centre.get(id) ?? 0) - min + offset + lead);
      }
    }
    offset += max - min + lead + (isGroup ? groupPadding : 0) + groupGap;
  }

  // The results, back in x and y.
  const rectOf = (id: string): CanvasRect => {
    const vertex = vertices.get(id);
    const main = vertex
      ? (layerStart[vertex.layer] ?? 0) + ((layerDepth[vertex.layer] ?? 0) - vertex.main) / 2
      : 0;
    const cross = (centre.get(id) ?? 0) - (vertex?.cross ?? 0) / 2;
    const input = inputs.get(id);
    const width = input?.width ?? 0;
    const height = input?.height ?? 0;
    return isRight ? { x: main, y: cross, width, height } : { x: cross, y: main, width, height };
  };
  const result: Record<string, LayoutNode> = {};
  for (const node of nodes) {
    result[node.id] = {
      ...rectOf(node.id),
      layer: layer.get(node.id) ?? 0,
      order: order.get(node.id) ?? 0,
    };
  }

  // 6. Routes through the bend points, and group boxes.
  const routes: Record<string, CanvasPoint[]> = {};
  for (const edge of edges) {
    const from = result[edge.from];
    const to = result[edge.to];
    if (!from || !to) {
      continue;
    }
    if (edge.from === edge.to) {
      // A loop over the node's far corner.
      const start = portPoint(from, 'out', direction);
      const loop = isRight
        ? [
            start,
            { x: start.x + 24, y: from.y - 16 },
            { x: from.x + from.width - 24, y: from.y - 16 },
          ]
        : [
            start,
            { x: from.x + from.width + 16, y: start.y + 24 },
            { x: from.x + from.width + 16, y: from.y + 24 },
          ];
      routes[edge.id] = [...loop, portPoint(from, 'in', isRight ? 'down' : 'right')];
      continue;
    }
    const chain = chains.get(edge.id) ?? [];
    const bends = chain.slice(1, -1).map((id) => {
      const rect = rectOf(id);
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    const isReversed = reversed.has(edge.id);
    const points = isReversed
      ? [portPoint(from, 'in', direction), ...bends.reverse(), portPoint(to, 'out', direction)]
      : [portPoint(from, 'out', direction), ...bends, portPoint(to, 'in', direction)];
    routes[edge.id] = points;
  }
  const groups = groupBoxes(
    nodes.map((node) => ({ rect: result[node.id] ?? rectOf(node.id), group: node.group })),
    { padding: groupPadding, header: groupHeader },
  );
  const xs: number[] = [];
  const ys: number[] = [];
  for (const rect of [...Object.values(result), ...groups]) {
    xs.push(rect.x, rect.x + rect.width);
    ys.push(rect.y, rect.y + rect.height);
  }
  for (const route of Object.values(routes)) {
    for (const point of route) {
      xs.push(point.x);
      ys.push(point.y);
    }
  }
  const bounds =
    xs.length > 0
      ? {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        }
      : { x: 0, y: 0, width: 0, height: 0 };

  return { direction, nodes: result, edges: routes, groups, bounds };
}
