// KanbanBoard's data: its cards, columns, lanes and moves, and the pure functions that group cards into columns and
// apply a move to the app's list.

import { moveIdsTo, sameItems } from '../../utils/collections';
import type { ListMove, ListViewItem } from '../ListView/ListView';

/** A card. Its column (and lane) list it in the order of the board's `items`. */
export interface KanbanItem<T = unknown> extends ListViewItem<T> {
  /** The column the card is in. */
  columnId: string;
  /** With `lanes`, the lane (row) the card is in. Cards with lanes and no lane of theirs aren't shown. */
  laneId?: string;
}

/** A column (a status, such as "To do" or "Done"). */
export interface KanbanColumn {
  id: string;
  /** The column's heading; it also names the column's list and its "Move to" item. */
  title: string;
  /**
   * The work-in-progress limit: the most cards the column should hold. The count shows against it, in the warning
   * tone at the limit and the danger tone past it. It doesn't stop moves: refuse them in `onMove` to enforce it.
   */
  limit?: number;
}

/** A swimlane: a row of the board, such as an assignee or a priority. */
export interface KanbanLane {
  id: string;
  /** The lane's heading. */
  title: string;
}

/**
 * A move reported by `onMove`: cards going to a column (and lane), next to a card there or at the column's end. Like
 * `ListMove`, with where the cards land.
 */
export interface KanbanMove extends Omit<ListMove, 'targetId' | 'position'> {
  /** The moved cards' ids, in board order. */
  ids: string[];
  /** The column they go to (it may be the one they're in). */
  columnId: string;
  /** With lanes, the lane they go to. Left out, each card keeps its lane. */
  laneId?: string;
  /** The card they go just before or after. Left out, they go to the end of the column (in the lane). */
  targetId?: string;
  position?: 'before' | 'after';
}

/** The key of a column's list of cards: one per column, or one per column in each lane. */
export function cellKey(columnId: string, laneId?: string): string {
  return laneId === undefined ? columnId : `${laneId}\n${columnId}`;
}

/** Cards in their lists (by `cellKey`), and every card's place in the board's order. */
export interface CardGroups<I extends KanbanItem> {
  cells: Map<string, readonly I[]>;
  indexById: Map<string, number>;
}

const NO_CARDS: readonly never[] = [];

/**
 * Groups `items` into their columns (and lanes), in one pass. A list with the same cards as in `previous` keeps its
 * identity, so a move renders only the columns it changed.
 */
export function groupCards<I extends KanbanItem>(
  items: readonly I[],
  hasLanes: boolean,
  previous?: CardGroups<I>,
): CardGroups<I> {
  const lists = new Map<string, I[]>();
  const indexById = new Map<string, number>();
  items.forEach((item, index) => {
    indexById.set(item.id, index);
    if (hasLanes && item.laneId === undefined) {
      return;
    }
    const key = cellKey(item.columnId, hasLanes ? item.laneId : undefined);
    const list = lists.get(key);
    if (list) {
      list.push(item);
    } else {
      lists.set(key, [item]);
    }
  });
  const cells = new Map<string, readonly I[]>();
  for (const [key, list] of lists) {
    const before = previous?.cells.get(key);
    cells.set(key, before && sameItems(before, list) ? before : list);
  }
  return { cells, indexById };
}

/** A list's cards from `groupCards` (the same empty list for every empty one). */
export function cardsIn<I extends KanbanItem>(
  groups: CardGroups<I>,
  columnId: string,
  laneId?: string,
): readonly I[] {
  return groups.cells.get(cellKey(columnId, laneId)) ?? NO_CARDS;
}

/**
 * Applies a `KanbanMove` to the board's flat list of cards and returns the new list (the input isn't changed): the
 * moved cards take the new column (and lane) and go next to the target card, or to the end. Cards that don't change
 * keep their identity.
 */
export function moveKanbanItems<I extends KanbanItem>(items: readonly I[], move: KanbanMove): I[] {
  const moving = new Set(move.ids);
  const placed = items.map((item) =>
    moving.has(item.id) &&
    (item.columnId !== move.columnId || (move.laneId !== undefined && item.laneId !== move.laneId))
      ? { ...item, columnId: move.columnId, laneId: move.laneId ?? item.laneId }
      : item,
  );
  if (move.targetId !== undefined) {
    return moveIdsTo(
      placed,
      { ids: moving, targetId: move.targetId, position: move.position ?? 'before' },
      (item) => item.id,
    );
  }
  // The end of the column is after every other card.
  const rest: I[] = [];
  const moved: I[] = [];
  for (const item of placed) {
    (moving.has(item.id) ? moved : rest).push(item);
  }
  return rest.concat(moved);
}
