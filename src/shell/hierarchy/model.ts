import { useCallback, useEffect, useRef, useState } from 'react';
import type { HierarchyLevel, HierarchyNode, HierarchyPath } from '../types';

/** Loads the choices at a level under a parent (`null` at the top level). */
export type LoadChildren = (
  levelId: string,
  parentId: string | null,
  signal: AbortSignal,
) => Promise<readonly HierarchyNode[]>;

/** The picker's data: a full tree (levels optional, for headings), or levels with a loader. */
export type HierarchySource =
  | { tree: readonly HierarchyNode[]; levels?: readonly HierarchyLevel[]; loadChildren?: never }
  | { levels: readonly HierarchyLevel[]; loadChildren: LoadChildren; tree?: never };

export interface ResolvedLevel {
  depth: number;
  level: HierarchyLevel | undefined;
  status: 'loading' | 'ready' | 'error';
  options: readonly HierarchyNode[];
  selected: HierarchyNode | undefined;
  /** Exactly one choice: chosen automatically and hidden. */
  isSkipped: boolean;
  /** The cache key of a loaded level (to retry it). */
  key: string | undefined;
}

export interface Resolved {
  levels: readonly ResolvedLevel[];
  /** The chosen nodes, including the automatic ones. */
  path: HierarchyPath;
  /** A choice has been made at every level. */
  isComplete: boolean;
  /** Levels still to load. */
  missing: readonly { key: string; levelId: string; parentId: string | null }[];
}

export type Loaded = Readonly<
  Record<string, { status: 'ready'; options: readonly HierarchyNode[] } | { status: 'error' }>
>;

function keyOf(levelId: string, parentId: string | null): string {
  return `${levelId}\u0000${parentId ?? ''}`;
}

/**
 * Walks the levels from the top, choosing what `draft` chose (matched by id) or the only choice there is, until a
 * level has no choice yet, is still loading, or the bottom is reached.
 */
export function resolvePath(
  source: HierarchySource,
  draft: HierarchyPath,
  loaded: Loaded,
): Resolved {
  const levels: ResolvedLevel[] = [];
  const path: HierarchyNode[] = [];
  const missing: { key: string; levelId: string; parentId: string | null }[] = [];
  for (let depth = 0; ; depth += 1) {
    const parent = depth === 0 ? undefined : path[depth - 1];
    const level = source.levels?.[depth];
    let options: readonly HierarchyNode[];
    let status: ResolvedLevel['status'] = 'ready';
    let key: string | undefined;
    if (source.loadChildren) {
      if (!level) {
        break;
      }
      const parentId = parent?.id ?? null;
      key = keyOf(level.id, parentId);
      const entry = loaded[key];
      if (!entry) {
        missing.push({ key, levelId: level.id, parentId });
        status = 'loading';
        options = [];
      } else if (entry.status === 'error') {
        status = 'error';
        options = [];
      } else {
        options = entry.options;
      }
    } else {
      options = depth === 0 ? source.tree : (parent?.children ?? []);
      if (options.length === 0) {
        break;
      }
    }
    const wanted = draft[depth];
    const isSkipped = status === 'ready' && options.length === 1;
    const selected = isSkipped
      ? options[0]
      : status === 'ready'
        ? options.find((option) => option.id === wanted?.id)
        : wanted; // Keep showing the chosen scope while its level loads.
    levels.push({ depth, level, status, options, selected, isSkipped, key });
    if (!selected || status !== 'ready') {
      if (selected) {
        path.push(selected);
      }
      break;
    }
    path.push(selected);
  }
  const last = levels.at(-1);
  const isComplete = source.loadChildren
    ? path.length === source.levels.length && levels.every((entry) => entry.status === 'ready')
    : path.length > 0 && (path.at(-1)?.children ?? []).length === 0;
  return { levels: last ? levels : [], path, isComplete, missing };
}

/**
 * Loads levels on demand through the app's `loadChildren`, keeping what it loaded while the picker is mounted (so
 * moving back and forth between choices doesn't reload). `onSettled` hears about each level that arrives, with
 * everything loaded so far.
 */
export function useHierarchyLoader(source: HierarchySource, onSettled?: (loaded: Loaded) => void) {
  const [loaded, setLoaded] = useState<Loaded>({});
  // The same value, readable at once in `onSettled` (state updates apply on the next render).
  const loadedRef = useRef<Loaded>({});
  const inFlight = useRef(new Map<string, AbortController>());
  const loadChildren = source.loadChildren;
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  });

  // Requests are only abandoned on unmount: a level that is no longer needed still fills the cache.
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
    (requests: Resolved['missing']) => {
      if (!loadChildren) {
        return;
      }
      for (const request of requests) {
        if (inFlight.current.has(request.key)) {
          continue;
        }
        const controller = new AbortController();
        inFlight.current.set(request.key, controller);
        const settle = (entry: Loaded[string]) => {
          if (controller.signal.aborted) {
            return;
          }
          inFlight.current.delete(request.key);
          loadedRef.current = { ...loadedRef.current, [request.key]: entry };
          setLoaded(loadedRef.current);
          onSettledRef.current?.(loadedRef.current);
        };
        loadChildren(request.levelId, request.parentId, controller.signal).then(
          (options) => {
            settle({ status: 'ready', options });
          },
          () => {
            settle({ status: 'error' });
          },
        );
      }
    },
    [loadChildren],
  );

  const retry = useCallback((key: string) => {
    const { [key]: _removed, ...rest } = loadedRef.current;
    loadedRef.current = rest;
    setLoaded(rest);
  }, []);

  return { loaded, load, retry };
}

/** Starts loading what the resolved paths are missing. */
export function useLoadMissing(
  load: (requests: Resolved['missing']) => void,
  missing: Resolved['missing'],
) {
  const signature = missing.map((request) => request.key).join('\u0001');
  const latest = useRef(missing);
  useEffect(() => {
    latest.current = missing;
  });
  useEffect(() => {
    if (signature !== '') {
      load(latest.current);
    }
  }, [load, signature]);
}

/** Path labels for display, leaving out levels that are skipped (they have one choice) in `resolved`. */
export function visibleLabels(path: HierarchyPath, resolved: Resolved): string[] {
  return path
    .filter((node, depth) => {
      const level = resolved.levels[depth];
      return !(level?.isSkipped === true && level.selected?.id === node.id);
    })
    .map((node) => node.label);
}
