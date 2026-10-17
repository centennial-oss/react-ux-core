import type { TreeNode } from './types';

/** A move reported by `Tree`'s `onMove`: where the dragged nodes go. */
export interface TreeMove {
  /** The moved nodes, in tree order. */
  ids: string[];
  /** The new parent's id, or `null` for the top level. */
  parentId: string | null;
  /**
   * Where the nodes go among the new parent's children, counted after the moved nodes are taken out (so it's the
   * position the first moved node ends up at).
   */
  index: number;
}

/** A node as the move sees it: its id and children (other fields are copied as they are). */
interface Plain {
  id: string;
  children?: readonly Plain[];
}

/**
 * Applies a `TreeMove` to `items` and returns the new tree (the input isn't changed). Moving a node into itself or
 * its own descendant, or to an unknown parent, returns `items` unchanged.
 */
export function moveTreeNodes<T>(items: readonly TreeNode<T>[], move: TreeMove): TreeNode<T>[] {
  const moving = new Set(move.ids);
  const taken = new Map<string, Plain>();
  const found = { isParentMoving: false, isParent: false };

  // Copies the tree without the moved nodes, remembering them (with their subtrees) to put back.
  const strip = (list: readonly Plain[], insideMoved: boolean): Plain[] =>
    list.flatMap((node) => {
      const isMoving = moving.has(node.id);
      if (node.id === move.parentId && (insideMoved || isMoving)) {
        found.isParentMoving = true;
      }
      const copy: Plain = { ...node };
      if (node.children) {
        copy.children = strip(node.children, insideMoved || isMoving);
      }
      if (isMoving && !insideMoved) {
        taken.set(node.id, copy);
        return [];
      }
      return [copy];
    });
  const rest = strip(items, false);
  if (found.isParentMoving) {
    return [...items];
  }

  const nodes = move.ids.flatMap((id) => {
    const node = taken.get(id);
    return node ? [node] : [];
  });
  const insert = (list: readonly Plain[]): Plain[] => {
    const at = Math.max(0, Math.min(move.index, list.length));
    return [...list.slice(0, at), ...nodes, ...list.slice(at)];
  };
  if (move.parentId === null) {
    return insert(rest) as TreeNode<T>[];
  }
  const place = (list: readonly Plain[]): Plain[] =>
    list.map((node) => {
      if (node.id === move.parentId) {
        found.isParent = true;
        return { ...node, children: insert(node.children ?? []) };
      }
      return node.children ? { ...node, children: place(node.children) } : node;
    });
  const placed = place(rest);
  return found.isParent ? (placed as TreeNode<T>[]) : [...items];
}
