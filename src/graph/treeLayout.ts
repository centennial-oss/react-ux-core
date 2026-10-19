// layoutTree: a tidy tree layout with no dependencies, for OrgChart and other hierarchies. Parents sit centred over
// their children; siblings pack as tightly as their whole subtrees allow (each subtree's outline, depth by depth, is
// pushed against its neighbours'), and small subtrees between large ones spread evenly (the average of packing from
// the first sibling and from the last). Outlines are step functions over real depths, so subtrees of any shape pack
// without wasting space, in time proportional to the nodes times the tree's depth.
// Two things save width:
//   - assistants: leaves marked `isAssistant` hang beside the line down from their parent, in pairs, above its other
//     children;
//   - stacking: a parent with more than `stackAbove` children that are all leaves hangs them the same way, in pairs
//     down its line, instead of side by side.
// Everything is worked out along two axes, breadth (across the flow) and depth (along it), then turned into x and y
// for top-to-bottom or left-to-right, and mirrored for right-to-left languages.

import type { CanvasRect } from '../canvas/geometry';
import type { LayoutDirection } from './layout';

export interface TreeLayoutNodeInput {
  id: string;
  /** The parent's id. Nodes without one, or whose parent isn't in the list, are roots. */
  parentId?: string | null;
  /** A leaf that hangs beside its parent's line, above the parent's other children (an assistant). */
  isAssistant?: boolean;
}

export interface TreeLayoutOptions {
  /** `down` (the default): roots at the top. `right`: roots on the left. */
  direction?: LayoutDirection;
  /** Every node's size. Defaults to 240 × 80. */
  nodeWidth?: number;
  nodeHeight?: number;
  /** Space between neighbouring nodes across the flow. Defaults to 20 (twice that between separate trees). */
  nodeGap?: number;
  /** Space between a parent (or the nodes hanging from it) and its children. Defaults to 56. */
  levelGap?: number;
  /** Space between a parent's line and the nodes hanging beside it. Defaults to 16. */
  hangGap?: number;
  /** Space between rows of hanging nodes. Defaults to 20. */
  rowGap?: number;
  /** Stacks a parent's leaf children in pairs down its line when it has more than this many. Defaults to never. */
  stackAbove?: number;
  /** Mirrors the layout left to right, for right-to-left languages. */
  isMirrored?: boolean;
}

export interface TreeLayoutNode extends CanvasRect {
  /** 0 for roots. */
  depth: number;
  /** Hangs beside its parent's line (an assistant, or one of a stack of leaves). */
  isHanging: boolean;
}

/** The lines from a parent to its children. */
export interface TreeLink {
  /** The parent's id. */
  id: string;
  /** Polylines, each a flat list of coordinates: `[x0, y0, x1, y1, …]`. */
  lines: number[][];
  bounds: CanvasRect;
}

export interface TreeLayout {
  direction: LayoutDirection;
  /** Each node's top-left corner, size and depth, by id. */
  nodes: Map<string, TreeLayoutNode>;
  /** One entry per parent with children shown. */
  links: TreeLink[];
  /** Everything the layout draws, from (0, 0). */
  bounds: CanvasRect;
}

/** A forest of items by index: who is whose parent, in what order, at what depth. */
export interface IndexedTree {
  /** The first item with each id. Later items with the same id are left out. */
  index: Map<string, number>;
  /** Each item's parent's index: -1 for a root, -2 for an item left out. */
  parent: Int32Array;
  /** Each item's children, in input order (one shared empty list for leaves). */
  children: (readonly number[])[];
  /** Roots in input order; then, if parents form a loop, one item of each loop. */
  roots: number[];
  /** Every item that isn't left out, each before its children. */
  preorder: Int32Array;
  depth: Int32Array;
}

const NONE: readonly number[] = [];

/**
 * Indexes a flat list of items that name their parents. Items whose parent is missing (or themselves) are roots, a
 * repeated id keeps its first item, and a loop of parents is broken at one of its items, which becomes a root.
 */
export function indexTree<T>(
  items: readonly T[],
  idOf: (item: T) => string,
  parentIdOf: (item: T) => string | null | undefined,
): IndexedTree {
  const count = items.length;
  const index = new Map<string, number>();
  const parent = new Int32Array(count).fill(-1);
  items.forEach((item, position) => {
    const id = idOf(item);
    if (index.has(id)) {
      parent[position] = -2;
    } else {
      index.set(id, position);
    }
  });
  // The parent each item names, and the children that name each parent, in input order.
  const named = new Int32Array(count).fill(-1);
  const claims: (number[] | undefined)[] = new Array<number[] | undefined>(count);
  let placedCount = 0;
  items.forEach((item, position) => {
    if (parent[position] === -2) {
      return;
    }
    placedCount++;
    const parentId = parentIdOf(item);
    const target = parentId === null || parentId === undefined ? undefined : index.get(parentId);
    if (target !== undefined && target !== position) {
      named[position] = target;
      (claims[target] ??= []).push(position);
    }
  });

  const children: (readonly number[])[] = new Array<readonly number[]>(count).fill(NONE);
  const depth = new Int32Array(count);
  const preorder = new Int32Array(placedCount);
  const isPlaced = new Uint8Array(count);
  const roots: number[] = [];
  const stack: number[] = [];
  let cursor = 0;
  const placeFrom = (root: number) => {
    roots.push(root);
    isPlaced[root] = 1;
    parent[root] = -1;
    stack.push(root);
    while (stack.length > 0) {
      const node = stack.pop() ?? 0;
      preorder[cursor++] = node;
      const claimed = claims[node];
      if (!claimed) {
        continue;
      }
      const accepted: number[] = [];
      for (const child of claimed) {
        if (isPlaced[child] === 0) {
          isPlaced[child] = 1;
          parent[child] = node;
          depth[child] = (depth[node] ?? 0) + 1;
          accepted.push(child);
        }
      }
      if (accepted.length > 0) {
        children[node] = accepted;
        for (let position = accepted.length - 1; position >= 0; position--) {
          stack.push(accepted[position] ?? 0);
        }
      }
    }
  };
  for (let position = 0; position < count; position++) {
    if (parent[position] === -1 && named[position] === -1) {
      placeFrom(position);
    }
  }
  // Whatever is left hangs from a loop of parents: walk up to the loop and break it there.
  const walked = new Int32Array(count).fill(-1);
  for (let position = 0; position < count; position++) {
    if (parent[position] === -2 || isPlaced[position] === 1) {
      continue;
    }
    let node = position;
    while (walked[node] !== position) {
      walked[node] = position;
      node = named[node] ?? position;
    }
    placeFrom(node);
  }
  return { index, parent, children, roots, preorder, depth };
}

/** A step function over depth: `values[k]` holds after `ends[k - 1]` up to `ends[k]`. */
interface Outline {
  ends: number[];
  values: number[];
}

/** The largest `right - left` at the depths both outlines reach (they start at the same depth). */
function clearance(right: Outline, left: Outline): number {
  let most = -Infinity;
  let i = 0;
  let j = 0;
  while (i < right.ends.length && j < left.ends.length) {
    const gap = (right.values[i] ?? 0) - (left.values[j] ?? 0);
    if (gap > most) {
      most = gap;
    }
    const a = right.ends[i] ?? 0;
    const b = left.ends[j] ?? 0;
    if (a <= b) {
      i++;
    }
    if (b <= a) {
      j++;
    }
  }
  return most;
}

/** Appends the part of `source` (moved by `shift`) that reaches deeper than `target` does. */
function appendBeyond(target: Outline, source: Outline, shift: number): void {
  const end = target.ends[target.ends.length - 1] ?? -Infinity;
  source.ends.forEach((sourceEnd, k) => {
    if (sourceEnd > end) {
      target.ends.push(sourceEnd);
      target.values.push((source.values[k] ?? 0) + shift);
    }
  });
}

/** `front` moved by `shift`, with `back` where it reaches deeper. */
function overlay(front: Outline, shift: number, back: Outline): Outline {
  const result = { ends: front.ends.slice(), values: front.values.map((value) => value + shift) };
  appendBeyond(result, back, 0);
  return result;
}

/**
 * Places siblings whose outlines start at the same depth: packed from the first and from the last, averaged, and
 * centred on 0. Writes each sibling's offset and returns the siblings' combined left and right outlines.
 */
function packSiblings(
  siblings: readonly number[],
  lefts: (Outline | undefined)[],
  rights: (Outline | undefined)[],
  gap: number,
  offset: Float64Array,
): [Outline, Outline] {
  const count = siblings.length;
  const empty: Outline = { ends: [], values: [] };
  const leftOf = (position: number) => lefts[siblings[position] ?? 0] ?? empty;
  const rightOf = (position: number) => rights[siblings[position] ?? 0] ?? empty;
  const fromStart = new Float64Array(count);
  const fromEnd = new Float64Array(count);
  let right = rightOf(0);
  for (let position = 1; position < count; position++) {
    fromStart[position] = clearance(right, leftOf(position)) + gap;
    right = overlay(rightOf(position), fromStart[position] ?? 0, right);
  }
  let left = leftOf(count - 1);
  for (let position = count - 2; position >= 0; position--) {
    fromEnd[position] = -(clearance(rightOf(position), left) + gap);
    left = overlay(leftOf(position), fromEnd[position] ?? 0, left);
  }
  // Both packings start at 0 (the second moved there); averaged, the first sibling stays at 0.
  const shiftEnd = -(fromEnd[0] ?? 0);
  const at = (position: number) =>
    ((fromStart[position] ?? 0) + (fromEnd[position] ?? 0) + shiftEnd) / 2;
  const middle = at(count - 1) / 2;
  siblings.forEach((sibling, position) => {
    offset[sibling] = at(position) - middle;
  });
  const combinedLeft: Outline = { ends: [], values: [] };
  const combinedRight: Outline = { ends: [], values: [] };
  for (let position = 0; position < count; position++) {
    appendBeyond(combinedLeft, leftOf(position), offset[siblings[position] ?? 0] ?? 0);
  }
  for (let position = count - 1; position >= 0; position--) {
    appendBeyond(combinedRight, rightOf(position), offset[siblings[position] ?? 0] ?? 0);
  }
  return [combinedLeft, combinedRight];
}

/** Lays out a tree (or a forest) tidily, top to bottom or left to right. */
export function layoutTree(
  nodes: readonly TreeLayoutNodeInput[],
  {
    direction = 'down',
    nodeWidth = 240,
    nodeHeight = 80,
    nodeGap = 20,
    levelGap = 56,
    hangGap = 16,
    rowGap = 20,
    stackAbove = Infinity,
    isMirrored = false,
  }: TreeLayoutOptions = {},
): TreeLayout {
  const isDown = direction === 'down';
  // Breadth and depth sizes of every node.
  const across = isDown ? nodeWidth : nodeHeight;
  const along = isDown ? nodeHeight : nodeWidth;
  const tree = indexTree(
    nodes,
    (node) => node.id,
    (node) => node.parentId,
  );
  const { children, preorder, roots } = tree;
  const count = nodes.length;
  const isLeaf = (node: number) => (children[node]?.length ?? 0) === 0;

  // 1. Which children hang (assistants, and stacks of leaves) and which sit in a row, and each hanging node's row
  //    and side (-1 before the line, 1 after it).
  const laid: (readonly number[])[] = new Array<readonly number[]>(count).fill(NONE);
  const hanging: (readonly number[])[] = new Array<readonly number[]>(count).fill(NONE);
  const rows = new Int32Array(count);
  const hangRow = new Int32Array(count);
  const side = new Int8Array(count);
  const hasAfter = new Uint8Array(count);
  for (const node of preorder) {
    const kids = children[node] ?? NONE;
    if (kids.length === 0) {
      continue;
    }
    const assistants: number[] = [];
    const rest: number[] = [];
    for (const kid of kids) {
      (nodes[kid]?.isAssistant === true && isLeaf(kid) ? assistants : rest).push(kid);
    }
    const isStacked = rest.length > stackAbove && rest.every(isLeaf);
    const hung = isStacked ? [...assistants, ...rest] : assistants;
    const assistantRows = Math.ceil(assistants.length / 2);
    hung.forEach((kid, position) => {
      const offset = position < assistants.length ? position : position - assistants.length;
      hangRow[kid] = (position < assistants.length ? 0 : assistantRows) + Math.floor(offset / 2);
      side[kid] = offset % 2 === 0 ? -1 : 1;
      if (offset % 2 === 1) {
        hasAfter[node] = 1;
      }
    });
    hanging[node] = hung;
    laid[node] = isStacked ? NONE : rest;
    rows[node] = assistantRows + (isStacked ? Math.ceil(rest.length / 2) : 0);
  }

  // 2. Depths: hanging rows under their parent, then the row of children.
  const top = new Float64Array(count);
  const blockEnd = new Float64Array(count);
  const hangStart = levelGap / 2;
  const rowPitch = along + rowGap;
  for (const node of preorder) {
    const base = (top[node] ?? 0) + along;
    for (const kid of hanging[node] ?? NONE) {
      top[kid] = base + hangStart + (hangRow[kid] ?? 0) * rowPitch;
    }
    const rowCount = rows[node] ?? 0;
    blockEnd[node] = rowCount > 0 ? base + hangStart + rowCount * rowPitch - rowGap : base;
    const childTop = (blockEnd[node] ?? 0) + levelGap;
    for (const kid of laid[node] ?? NONE) {
      top[kid] = childTop;
    }
  }

  // 3. Outlines, children before parents. A node's outline covers its own box, the nodes hanging from it, and its
  //    children's outlines, which start right below the hanging nodes (so the lines between them are covered too).
  const lefts: (Outline | undefined)[] = new Array<Outline | undefined>(count);
  const rights: (Outline | undefined)[] = new Array<Outline | undefined>(count);
  const offset = new Float64Array(count);
  for (let position = preorder.length - 1; position >= 0; position--) {
    const node = preorder[position] ?? 0;
    if ((side[node] ?? 0) !== 0) {
      // Hanging nodes are inside their parent's outline.
      continue;
    }
    const ends = [(top[node] ?? 0) + along];
    const left: Outline = { ends, values: [-across / 2] };
    const right: Outline = { ends: ends.slice(), values: [across / 2] };
    if ((rows[node] ?? 0) > 0) {
      const end = blockEnd[node] ?? 0;
      left.ends.push(end);
      left.values.push(-(hangGap + across));
      right.ends.push(end);
      right.values.push(hasAfter[node] === 1 ? hangGap + across : 0);
    }
    const kids = laid[node] ?? NONE;
    if (kids.length > 0) {
      const [kidsLeft, kidsRight] = packSiblings(kids, lefts, rights, nodeGap, offset);
      appendBeyond(left, kidsLeft, 0);
      appendBeyond(right, kidsRight, 0);
      for (const kid of kids) {
        lefts[kid] = undefined;
        rights[kid] = undefined;
      }
    }
    lefts[node] = left;
    rights[node] = right;
  }
  if (roots.length > 0) {
    packSiblings(roots, lefts, rights, nodeGap * 2, offset);
  }

  // 4. Breadth centres, parents before children.
  const centre = new Float64Array(count);
  for (const node of preorder) {
    if (tree.parent[node] === -1) {
      centre[node] = offset[node] ?? 0;
    }
    const middle = centre[node] ?? 0;
    for (const kid of hanging[node] ?? NONE) {
      centre[kid] = middle + (side[kid] ?? 0) * (hangGap + across / 2);
    }
    for (const kid of laid[node] ?? NONE) {
      centre[kid] = middle + (offset[kid] ?? 0);
    }
  }

  // 5. Into x and y, mirrored if asked, then moved so the drawing starts at (0, 0).
  const sign = isMirrored ? -1 : 1;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of preorder) {
    const breadth = (centre[node] ?? 0) - across / 2;
    const depthStart = top[node] ?? 0;
    const x = sign * (isDown ? breadth : depthStart) - (isMirrored ? nodeWidth : 0);
    const y = isDown ? depthStart : breadth;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + nodeWidth);
    maxY = Math.max(maxY, y + nodeHeight);
  }
  if (!Number.isFinite(minX)) {
    return {
      direction,
      nodes: new Map(),
      links: [],
      bounds: { x: 0, y: 0, width: 0, height: 0 },
    };
  }
  const result = new Map<string, TreeLayoutNode>();
  for (const node of preorder) {
    const breadth = (centre[node] ?? 0) - across / 2;
    const depthStart = top[node] ?? 0;
    result.set(nodes[node]?.id ?? '', {
      x: sign * (isDown ? breadth : depthStart) - (isMirrored ? nodeWidth : 0) - minX,
      y: (isDown ? depthStart : breadth) - minY,
      width: nodeWidth,
      height: nodeHeight,
      depth: tree.depth[node] ?? 0,
      isHanging: (side[node] ?? 0) !== 0,
    });
  }

  // 6. Lines: down from each parent to a bus across its children's tops, a drop to each child, and an arm to each
  //    hanging node.
  const links: TreeLink[] = [];
  for (const node of preorder) {
    const hung = hanging[node] ?? NONE;
    const kids = laid[node] ?? NONE;
    if (hung.length === 0 && kids.length === 0) {
      continue;
    }
    const lines: number[][] = [];
    let lowX = Infinity;
    let lowY = Infinity;
    let highX = -Infinity;
    let highY = -Infinity;
    // A polyline through breadth and depth pairs, in x and y.
    const line = (...points: number[]) => {
      const coordinates: number[] = [];
      for (let k = 0; k < points.length; k += 2) {
        const breadth = points[k] ?? 0;
        const depthAt = points[k + 1] ?? 0;
        const x = sign * (isDown ? breadth : depthAt) - minX;
        const y = (isDown ? depthAt : breadth) - minY;
        coordinates.push(x, y);
        lowX = Math.min(lowX, x);
        lowY = Math.min(lowY, y);
        highX = Math.max(highX, x);
        highY = Math.max(highY, y);
      }
      lines.push(coordinates);
    };
    const middle = centre[node] ?? 0;
    const bottom = (top[node] ?? 0) + along;
    const childTop = (blockEnd[node] ?? 0) + levelGap;
    const bus = childTop - levelGap / 2;
    const lastHang = hung[hung.length - 1];
    const stemEnd = kids.length > 0 ? bus : (top[lastHang ?? node] ?? 0) + along / 2;
    line(middle, bottom, middle, stemEnd);
    for (const kid of hung) {
      const arm = (top[kid] ?? 0) + along / 2;
      line(middle, arm, middle + (side[kid] ?? 0) * hangGap, arm);
    }
    if (kids.length > 0) {
      const first = centre[kids[0] ?? node] ?? middle;
      const last = centre[kids[kids.length - 1] ?? node] ?? middle;
      if (last - first > 0.5) {
        line(first, bus, last, bus);
      }
      for (const kid of kids) {
        const at = centre[kid] ?? middle;
        line(at, bus, at, childTop);
      }
    }
    links.push({
      id: nodes[node]?.id ?? '',
      lines,
      bounds: { x: lowX, y: lowY, width: highX - lowX, height: highY - lowY },
    });
  }

  return {
    direction,
    nodes: result,
    links,
    bounds: { x: 0, y: 0, width: maxX - minX, height: maxY - minY },
  };
}
