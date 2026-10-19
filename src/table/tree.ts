// Tree data for DataTable: child rows loaded on demand, tri-state group selection, and a filter that keeps the
// ancestors of matching rows.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLatest } from '../utils/useLatest';

/** Loads a row's children the first time it expands. */
export type LoadRowChildren<Row> = (row: Row, signal: AbortSignal) => Promise<readonly Row[]>;

/** What the table knows about a row's lazily loaded children. */
export type RowChildrenEntry<Row> =
  { status: 'loading' } | { status: 'ready'; rows: readonly Row[] } | { status: 'error' };

/** The state of an expanded row's children: shown, still on their way, or failed. */
export type RowChildrenStatus = 'ready' | 'loading' | 'error';

/**
 * Loads children through the app's `loadRowChildren` and keeps them while the table is mounted, so collapsing and
 * expanding again doesn't reload. `onLoaded` hears about each row whose children arrive.
 */
export function useRowChildrenLoader<Row>(
  loadRowChildren: LoadRowChildren<Row> | undefined,
  onLoaded?: (id: string, rows: readonly Row[]) => void,
) {
  const [entries, setEntries] = useState<Readonly<Record<string, RowChildrenEntry<Row>>>>({});
  const inFlight = useRef(new Map<string, AbortController>());
  const onLoadedRef = useLatest(onLoaded);

  // Requests are only abandoned on unmount: children of a row that collapsed meanwhile still fill the cache.
  useEffect(() => {
    const requests = inFlight.current;
    return () => {
      for (const controller of requests.values()) {
        controller.abort();
      }
      requests.clear();
    };
  }, []);

  const load = useCallback(
    (requests: readonly { id: string; row: Row }[]) => {
      if (!loadRowChildren) {
        return;
      }
      for (const { id, row } of requests) {
        if (inFlight.current.has(id)) {
          continue;
        }
        const controller = new AbortController();
        inFlight.current.set(id, controller);
        setEntries((current) => ({ ...current, [id]: { status: 'loading' } }));
        const settle = (entry: RowChildrenEntry<Row>) => {
          if (controller.signal.aborted) {
            return;
          }
          inFlight.current.delete(id);
          setEntries((current) => ({ ...current, [id]: entry }));
          if (entry.status === 'ready') {
            onLoadedRef.current?.(id, entry.rows);
          }
        };
        loadRowChildren(row, controller.signal).then(
          (rows) => {
            settle({ status: 'ready', rows });
          },
          () => {
            settle({ status: 'error' });
          },
        );
      }
    },
    [loadRowChildren],
  );

  /** Forgets a failed load so the row loads again (it is still expanded). */
  const retry = useCallback((id: string) => {
    setEntries((current) => {
      const { [id]: _removed, ...rest } = current;
      return rest;
    });
  }, []);

  return { entries, load, retry };
}

/** The parts of a TanStack row the selection rules need. */
interface TreeNode {
  id: string;
  subRows: readonly TreeNode[];
}

/**
 * Makes a selection consistent with the tree: a row with children is selected exactly when all of them are
 * (checked), so a parent with only some selected is indeterminate. Rows whose children aren't loaded keep their own
 * state. Returns the same set when nothing changes.
 */
export function normalizeTreeSelection(
  keys: ReadonlySet<string>,
  roots: readonly TreeNode[],
): ReadonlySet<string> {
  const next = new Set(keys);
  const visit = (node: TreeNode): boolean => {
    if (node.subRows.length === 0) {
      return next.has(node.id);
    }
    // Visit every child (no short-circuit), so deeper groups are settled too.
    const all = node.subRows.map(visit).every(Boolean);
    if (all) {
      next.add(node.id);
    } else {
      next.delete(node.id);
    }
    return all;
  };
  roots.forEach(visit);
  return next.size === keys.size && [...next].every((key) => keys.has(key)) ? keys : next;
}

/** Every id in the rows and their children, as far as `getRowChildren` reaches. */
export function treeRowIds<Row>(
  rows: readonly Row[],
  getRowId: (row: Row) => string,
  getRowChildren?: (row: Row) => readonly Row[] | undefined,
): string[] {
  const ids: string[] = [];
  const visit = (row: Row) => {
    ids.push(getRowId(row));
    getRowChildren?.(row)?.forEach(visit);
  };
  rows.forEach(visit);
  return ids;
}

export interface FilterTreeOptions<Row> {
  getRowId: (row: Row) => string;
  getRowChildren: (row: Row) => readonly Row[] | undefined;
  /** Whether a row matches the filter (search text, filter values). */
  matches: (row: Row) => boolean;
}

export interface FilteredTree<Row> {
  /** The top-level rows that match or contain a match. */
  rows: Row[];
  /** Children filtered the same way; pass it to DataTable's `getRowChildren`. */
  getRowChildren: (row: Row) => readonly Row[] | undefined;
  /** The rows above each match, to expand (DataTable's `expandedIds`) so the matches show. */
  ancestorKeys: Set<string>;
}

/**
 * Filters tree rows for DataTable: a row shows when it matches or one of its descendants does, and a matching row
 * keeps all of its children (so a matching group can still be opened). Only the children `getRowChildren` returns
 * are searched: filter lazily loaded rows on the server.
 */
export function filterTree<Row>(
  rows: readonly Row[],
  { getRowId, getRowChildren, matches }: FilterTreeOptions<Row>,
): FilteredTree<Row> {
  const kept = new Map<Row, readonly Row[] | undefined>();
  const ancestorKeys = new Set<string>();
  /**
   * Decides whether the row shows (`inMatch`: it's under a match, so it does) and returns whether it or a
   * descendant matches itself. Rows with a match below them go into `ancestorKeys`.
   */
  const visit = (row: Row, inMatch: boolean): { isShown: boolean; hasMatch: boolean } => {
    const isMatch = matches(row);
    const children = getRowChildren(row);
    const results = children?.map((child) => ({ child, ...visit(child, inMatch || isMatch) }));
    const keptChildren = results?.filter((result) => result.isShown).map((result) => result.child);
    const hasMatchBelow = results?.some((result) => result.hasMatch) ?? false;
    if (hasMatchBelow) {
      ancestorKeys.add(getRowId(row));
    }
    const isShown = inMatch || isMatch || hasMatchBelow;
    if (isShown) {
      kept.set(row, keptChildren);
    }
    return { isShown, hasMatch: isMatch || hasMatchBelow };
  };
  const top = rows.filter((row) => visit(row, false).isShown);
  return {
    rows: top,
    getRowChildren: (row) => (kept.has(row) ? kept.get(row) : getRowChildren(row)),
    ancestorKeys,
  };
}
