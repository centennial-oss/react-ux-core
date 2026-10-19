// The layout behind SankeyChart (no dependencies): nodes in columns by their longest path from a source, with nodes
// that have no outgoing flows pushed to the last column; each column's nodes stacked in order of where their flows
// come from; heights in proportion to the larger of a node's inflow and outflow; and each flow a band whose width is
// its value, leaving and entering its nodes in the order of the nodes at the other end, so bands cross less.

import { extent } from './format';

/** A flow from one node to another. */
export interface SankeyLinkInput {
  source: string;
  target: string;
  value: number;
}

export interface SankeyLayoutNode {
  id: string;
  /** Its position in the input, for its default colour. */
  index: number;
  column: number;
  x: number;
  y: number;
  height: number;
  /** The larger of its inflow and outflow. */
  value: number;
  inflow: number;
  outflow: number;
}

export interface SankeyLayoutLink {
  /** Its position in the input. */
  index: number;
  source: string;
  target: string;
  value: number;
  /** The band's width. */
  width: number;
  /** Where the band's centre line leaves the source and enters the target. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface SankeyLayout {
  nodes: SankeyLayoutNode[];
  links: SankeyLayoutLink[];
  columns: number;
}

/**
 * Lays out the flows between `nodeIds` in a `width` × `height` box. Flows that aren't positive, that loop back to
 * their own node or that name a node not in `nodeIds` are left out, as are nodes without flows. A cycle stops the
 * columns growing rather than looping forever.
 */
export function sankeyLayout(
  nodeIds: readonly string[],
  links: readonly SankeyLinkInput[],
  width: number,
  height: number,
  { nodeWidth = 12, nodePadding = 10 }: { nodeWidth?: number; nodePadding?: number } = {},
): SankeyLayout {
  const known = new Set(nodeIds);
  const flows = links
    .map((link, index) => ({ ...link, index }))
    .filter(
      (link) =>
        link.value > 0 &&
        Number.isFinite(link.value) &&
        link.source !== link.target &&
        known.has(link.source) &&
        known.has(link.target),
    );
  const used = nodeIds.filter((id) =>
    flows.some((link) => link.source === id || link.target === id),
  );
  if (used.length === 0 || width <= 0 || height <= 0) {
    return { nodes: [], links: [], columns: 0 };
  }

  // Columns: the longest path from a source, then sinks pushed to the end.
  const column = new Map(used.map((id) => [id, 0]));
  let changed = true;
  for (let pass = 0; changed && pass < used.length; pass += 1) {
    changed = false;
    for (const link of flows) {
      const next = (column.get(link.source) ?? 0) + 1;
      if (next > (column.get(link.target) ?? 0) && next < used.length) {
        column.set(link.target, next);
        changed = true;
      }
    }
  }
  const last = extent(column.values())?.[1] ?? 0;
  for (const id of used) {
    if (!flows.some((link) => link.source === id)) {
      column.set(id, last);
    }
  }
  const columns = last + 1;

  const inflow = new Map<string, number>();
  const outflow = new Map<string, number>();
  for (const link of flows) {
    outflow.set(link.source, (outflow.get(link.source) ?? 0) + link.value);
    inflow.set(link.target, (inflow.get(link.target) ?? 0) + link.value);
  }
  const valueOf = (id: string) => Math.max(inflow.get(id) ?? 0, outflow.get(id) ?? 0);

  const byColumn = Array.from({ length: columns }, (_, index) =>
    used.filter((id) => column.get(id) === index),
  );
  // One scale for every column, set by the fullest one, so heights compare across the chart.
  const scale =
    extent(
      byColumn.map((ids) => {
        const total = ids.reduce((sum, id) => sum + valueOf(id), 0);
        const room = height - Math.max(0, ids.length - 1) * nodePadding;
        return total > 0 ? Math.max(0, room) / total : Number.POSITIVE_INFINITY;
      }),
    )?.[0] ?? 0;
  const columnX = (index: number) =>
    columns === 1 ? 0 : (index * (width - nodeWidth)) / (columns - 1);

  const placed = new Map<string, SankeyLayoutNode>();
  byColumn.forEach((ids, index) => {
    // Order each column by where its nodes' flows come from (the first column keeps the input order).
    const centreOfSources = (id: string) => {
      let weight = 0;
      let sum = 0;
      for (const link of flows) {
        const source = link.target === id ? placed.get(link.source) : undefined;
        if (source) {
          weight += link.value;
          sum += link.value * (source.y + source.height / 2);
        }
      }
      return weight > 0 ? sum / weight : Number.POSITIVE_INFINITY;
    };
    const ordered =
      index === 0
        ? ids
        : ids
            .map((id, position) => ({ id, position, centre: centreOfSources(id) }))
            .sort((a, b) => a.centre - b.centre || a.position - b.position)
            .map((entry) => entry.id);
    const total =
      ordered.reduce((sum, id) => sum + valueOf(id) * scale, 0) +
      Math.max(0, ordered.length - 1) * nodePadding;
    // Columns that don't fill the height are centred.
    let y = Math.max(0, (height - total) / 2);
    for (const id of ordered) {
      const nodeHeight = Math.max(1, valueOf(id) * scale);
      placed.set(id, {
        id,
        index: nodeIds.indexOf(id),
        column: index,
        x: columnX(index),
        y,
        height: nodeHeight,
        value: valueOf(id),
        inflow: inflow.get(id) ?? 0,
        outflow: outflow.get(id) ?? 0,
      });
      y += nodeHeight + nodePadding;
    }
  });

  // Each node's bands, in the order of the nodes at their other ends.
  const centre = (id: string) => {
    const node = placed.get(id);
    return node ? node.y + node.height / 2 : 0;
  };
  const leaving = new Map<number, number>();
  const entering = new Map<number, number>();
  for (const node of placed.values()) {
    let out = node.y;
    for (const link of flows
      .filter((flow) => flow.source === node.id)
      .sort((a, b) => centre(a.target) - centre(b.target))) {
      const band = link.value * scale;
      leaving.set(link.index, out + band / 2);
      out += band;
    }
    let into = node.y;
    for (const link of flows
      .filter((flow) => flow.target === node.id)
      .sort((a, b) => centre(a.source) - centre(b.source))) {
      const band = link.value * scale;
      entering.set(link.index, into + band / 2);
      into += band;
    }
  }

  return {
    nodes: used.flatMap((id) => {
      const node = placed.get(id);
      return node ? [node] : [];
    }),
    links: flows.map((link) => ({
      index: link.index,
      source: link.source,
      target: link.target,
      value: link.value,
      width: link.value * scale,
      x0: (placed.get(link.source)?.x ?? 0) + nodeWidth,
      y0: leaving.get(link.index) ?? 0,
      x1: placed.get(link.target)?.x ?? 0,
      y1: entering.get(link.index) ?? 0,
    })),
    columns,
  };
}

/** A band's centre line: a curve from where it leaves its source to where it enters its target. */
export function sankeyLinkPath(link: Pick<SankeyLayoutLink, 'x0' | 'y0' | 'x1' | 'y1'>): string {
  const middle = (link.x0 + link.x1) / 2;
  const f = (value: number) => value.toFixed(2);
  return `M${f(link.x0)},${f(link.y0)}C${f(middle)},${f(link.y0)} ${f(middle)},${f(link.y1)} ${f(link.x1)},${f(link.y1)}`;
}
