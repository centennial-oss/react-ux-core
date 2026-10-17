// Keyboard movement between NodeGraph's nodes: the arrow key that points along the flow goes to the next node
// downstream, the opposite one upstream, and the cross keys to the neighbouring node in the same layer. Going back
// returns to the node you came from when it's still a neighbour. Pure, so it's unit-tested on its own.
import type { LayoutDirection } from './layout';

export interface GraphNavigation {
  direction: LayoutDirection;
  /** Node ids in reading order (layer by layer, or by position for manual layouts). */
  order: readonly string[];
  /** Each node's layer; nodes in a manual layout have none, so the cross keys follow reading order. */
  layers?: ReadonlyMap<string, number>;
  successors: ReadonlyMap<string, readonly string[]>;
  predecessors: ReadonlyMap<string, readonly string[]>;
}

/**
 * The node a key moves to from `from`, or null when there's none that way. `cameFrom` is the node the last move left,
 * which the opposite key prefers.
 */
export function nextNode(
  navigation: GraphNavigation,
  from: string,
  key: string,
  cameFrom?: string | null,
): string | null {
  const { direction, order, layers, successors, predecessors } = navigation;
  const rank = new Map(order.map((id, index) => [id, index]));
  const byRank = (ids: readonly string[]) =>
    [...ids].sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
  const forward = direction === 'right' ? 'ArrowRight' : 'ArrowDown';
  const backward = direction === 'right' ? 'ArrowLeft' : 'ArrowUp';
  const crossNext = direction === 'right' ? 'ArrowDown' : 'ArrowRight';
  const crossPrevious = direction === 'right' ? 'ArrowUp' : 'ArrowLeft';

  if (key === 'Home') {
    return order[0] ?? null;
  }
  if (key === 'End') {
    return order[order.length - 1] ?? null;
  }
  if (key === forward || key === backward) {
    const neighbours = byRank(
      (key === forward ? successors.get(from) : predecessors.get(from)) ?? [],
    );
    if (cameFrom && neighbours.includes(cameFrom)) {
      return cameFrom;
    }
    return neighbours[0] ?? null;
  }
  if (key === crossNext || key === crossPrevious) {
    const layer = layers?.get(from);
    const peers = layer === undefined ? order : order.filter((id) => layers?.get(id) === layer);
    const index = peers.indexOf(from);
    return peers[key === crossNext ? index + 1 : index - 1] ?? null;
  }
  return null;
}
