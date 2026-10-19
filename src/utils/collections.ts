// Immutable helpers for the sets and lists components keep in state.

/** A copy of `set` with `value` added, or removed when `isIncluded` is false (default: toggled). */
export function toggleInSet<T>(
  set: ReadonlySet<T>,
  value: T,
  isIncluded = !set.has(value),
): Set<T> {
  const next = new Set(set);
  if (isIncluded) {
    next.add(value);
  } else {
    next.delete(value);
  }
  return next;
}

/** A copy of `list` with the item at `from` moved to `to`. Out-of-range indexes return an unchanged copy. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) {
    return next;
  }
  const [item] = next.splice(from, 1) as [T];
  next.splice(to, 0, item);
  return next;
}

/**
 * A copy of `list` with the items named in `move.ids` taken out (keeping their order) and put back together just
 * before or after the item `move.targetId` names: a drag-and-drop reorder. A missing target, or one that is itself
 * moving, returns an unchanged copy.
 */
export function moveIdsTo<T>(
  list: readonly T[],
  move: { ids: Iterable<string>; targetId: string; position: 'before' | 'after' },
  idOf: (item: T) => string,
): T[] {
  const moving = new Set(move.ids);
  if (moving.has(move.targetId)) {
    return [...list];
  }
  const moved: T[] = [];
  const rest: T[] = [];
  for (const item of list) {
    (moving.has(idOf(item)) ? moved : rest).push(item);
  }
  const at = rest.findIndex((item) => idOf(item) === move.targetId);
  if (at < 0) {
    return [...list];
  }
  const insertAt = move.position === 'after' ? at + 1 : at;
  return [...rest.slice(0, insertAt), ...moved, ...rest.slice(insertAt)];
}

/** A move for `moveIdsTo`: the ids to move, and the item they go just before or after. */
export interface IdMove {
  ids: string[];
  targetId: string;
  position: 'before' | 'after';
}

/**
 * The `IdMove` a React Aria drop describes: its target row (a drop on the row counts as before it) and the dragged
 * keys (a reorder's `event.keys`; none for an insert from elsewhere), as strings.
 */
export function dropMove(
  target: { key: string | number; dropPosition: 'before' | 'after' | 'on' },
  keys: Iterable<string | number> = [],
): IdMove {
  return {
    ids: Array.from(keys, String),
    targetId: String(target.key),
    position: target.dropPosition === 'after' ? 'after' : 'before',
  };
}

/**
 * A copy of `value` with object keys sorted recursively (arrays keep their order, Dates stay as they are), so JSON
 * output and comparisons don't depend on property order.
 */
export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    return Object.fromEntries(entries.map(([key, child]) => [key, sortKeysDeep(child)]));
  }
  return value;
}

/** Whether two lists hold the same items in the same order (compared with `Object.is`). */
export function sameItems<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((item, index) => Object.is(item, b[index]));
}

/** Whether two sets hold the same items, in any order. */
export function sameSet<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const item of a) {
    if (!b.has(item)) {
      return false;
    }
  }
  return true;
}

/** `list` split into runs of neighbouring items with the same key (compared with `Object.is`), in order. */
export function runsBy<T>(list: readonly T[], keyOf: (item: T) => unknown): T[][] {
  const runs: T[][] = [];
  let lastKey: unknown;
  for (const item of list) {
    const key = keyOf(item);
    const run = runs.at(-1);
    if (run !== undefined && Object.is(key, lastKey)) {
      run.push(item);
    } else {
      runs.push([item]);
    }
    lastKey = key;
  }
  return runs;
}

/** A node of a tree: an id, and children of the same kind. */
export interface Nested<T> {
  id: string;
  children?: readonly T[];
}

/** A tree node in a flattened tree, with its depth (0 for the top level) and its parent's id. */
export interface FlatNode<T> {
  item: T;
  depth: number;
  parentId: string | undefined;
}

/**
 * Every node of a tree in one list, parents before their children (document order), down to `maxDepth` levels (the
 * top level counts as 1). For nested navigation: the order to watch, a node's depth, and its way up the tree.
 */
export function flattenTree<T extends Nested<T>>(
  items: readonly T[],
  maxDepth = Infinity,
): FlatNode<T>[] {
  const flat: FlatNode<T>[] = [];
  const visit = (level: readonly T[], depth: number, parentId: string | undefined) => {
    for (const item of level) {
      flat.push({ item, depth, parentId });
      if (item.children && depth + 1 < maxDepth) {
        visit(item.children, depth + 1, item.id);
      }
    }
  };
  visit(items, 0, undefined);
  return flat;
}
