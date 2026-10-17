// The media library's paged results: the first page loads whenever the search or type filter changes (aborting the
// request it replaces), more pages load by cursor, and uploads, edits and deletions update the loaded list in place.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MediaAsset, MediaAssetPage, MediaAssetQuery, MediaAssetType } from './assets';

export type LoadAssets = (query: MediaAssetQuery, signal: AbortSignal) => Promise<MediaAssetPage>;

export type AssetPagesStatus = 'loading' | 'ready' | 'error' | 'loading-more' | 'more-error';

export interface AssetPages {
  assets: readonly MediaAsset[];
  status: AssetPagesStatus;
  hasMore: boolean;
  loadMore: () => void;
  /** Loads the first page again (after an error). */
  reload: () => void;
  prepend: (assets: readonly MediaAsset[]) => void;
  replace: (asset: MediaAsset) => void;
  removeIds: (ids: readonly string[]) => void;
}

interface PagesState {
  assets: readonly MediaAsset[];
  nextCursor?: string;
  status: AssetPagesStatus;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** Loads and holds the pages for a search and type; `loadAssets` may change identity without reloading. */
export function useAssetPages(
  loadAssets: LoadAssets,
  search: string,
  type: MediaAssetType | undefined,
): AssetPages {
  const [state, setState] = useState<PagesState>({ assets: [], status: 'loading' });
  const [reloads, setReloads] = useState(0);
  const loadRef = useRef(loadAssets);
  useLayoutEffect(() => {
    loadRef.current = loadAssets;
  });
  const controller = useRef<AbortController | null>(null);
  const query = useRef({ search, type });
  useEffect(() => {
    const requests = controller;
    // A page still loading when the library unmounts is cancelled.
    return () => {
      requests.current?.abort();
    };
  }, []);

  useEffect(() => {
    query.current = { search, type };
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState((previous) => ({ ...previous, status: 'loading' }));
    loadRef.current({ search, type }, current.signal).then(
      (page) => {
        if (!current.signal.aborted) {
          setState({ assets: page.assets, nextCursor: page.nextCursor, status: 'ready' });
        }
      },
      (error: unknown) => {
        if (!current.signal.aborted && !isAbort(error)) {
          setState({ assets: [], status: 'error' });
        }
      },
    );
    return () => {
      current.abort();
    };
  }, [search, type, reloads]);

  // Event handlers read the latest state from here (never inside a state updater, which may run twice).
  const latest = useRef(state);
  useLayoutEffect(() => {
    latest.current = state;
  });

  const loadMore = useCallback(() => {
    const previous = latest.current;
    const cursor = previous.nextCursor;
    if (cursor === undefined || (previous.status !== 'ready' && previous.status !== 'more-error')) {
      return;
    }
    latest.current = { ...previous, status: 'loading-more' };
    setState((current) => ({ ...current, status: 'loading-more' }));
    const current = new AbortController();
    controller.current = current;
    loadRef.current({ ...query.current, cursor }, current.signal).then(
      (page) => {
        if (!current.signal.aborted) {
          setState((last) => ({
            assets: [
              ...last.assets,
              ...page.assets.filter((asset) => !last.assets.some((old) => old.id === asset.id)),
            ],
            nextCursor: page.nextCursor,
            status: 'ready',
          }));
        }
      },
      (error: unknown) => {
        if (!current.signal.aborted && !isAbort(error)) {
          setState((last) => ({ ...last, status: 'more-error' }));
        }
      },
    );
  }, []);

  const reload = useCallback(() => {
    setReloads((count) => count + 1);
  }, []);
  const prepend = useCallback((assets: readonly MediaAsset[]) => {
    setState((previous) => ({
      ...previous,
      assets: [
        ...assets,
        ...previous.assets.filter((old) => !assets.some((asset) => asset.id === old.id)),
      ],
    }));
  }, []);
  const replace = useCallback((asset: MediaAsset) => {
    setState((previous) => ({
      ...previous,
      assets: previous.assets.map((old) => (old.id === asset.id ? asset : old)),
    }));
  }, []);
  const removeIds = useCallback((ids: readonly string[]) => {
    setState((previous) => ({
      ...previous,
      assets: previous.assets.filter((asset) => !ids.includes(asset.id)),
    }));
  }, []);

  return {
    assets: state.assets,
    status: state.status,
    hasMore: state.nextCursor !== undefined,
    loadMore,
    reload,
    prepend,
    replace,
    removeIds,
  };
}
