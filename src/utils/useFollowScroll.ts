// Following the newest row of a bottom-anchored virtual list (a chat transcript, a log): pinned to the bottom until
// scrolled up, then paused with a count of the rows that arrived since, until scrolled back down or jumped to latest.
import type { VirtualItem, Virtualizer } from '@tanstack/react-virtual';
import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';

export interface FollowScrollOptions<T extends { id: string }> {
  /** The scrolling element. */
  scrollRef: RefObject<HTMLDivElement | null>;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  /** The rendered rows; while following, the view pins to the bottom whenever they change. */
  rows: readonly unknown[];
  /** The virtual list's total height; pins again as rows are measured (a streaming row growing). */
  totalSize: number;
  /** Anything else that changes the content's height without changing `rows`, such as wrapping. */
  layoutKey?: unknown;
  /** How close to the bottom (in pixels) still counts as "at the newest row". */
  threshold: number;
  /** Whether the view follows the newest row: the caller's state, controlled or not. */
  isFollowing: boolean;
  setFollowing: (isFollowing: boolean) => void;
  /** The source items, oldest first, which "N new" counts. */
  items: readonly T[];
  /** Whether an item counts towards "N new". Keep it stable (useCallback). */
  isCounted: (item: T) => boolean;
  /** Whether the last item, once added, returns the view to the newest row (such as a message the user sent). */
  shouldFollowLast?: boolean;
  /** The first row's key: when it changes while paused (rows added or removed above), the anchor row stays put. */
  firstKey: string | undefined;
  /** The index of the row with this key. Called only when the first key changes, so it needn't be stable. */
  indexOf: (key: string) => number | undefined;
  /** The row to hold in place, given the scroll offset. Defaults to the row at that offset. */
  anchorAt?: (top: number) => VirtualItem | undefined;
}

export interface FollowScroll {
  /** The scrolling element's scroll handler: pauses when scrolled up, follows again when back at the bottom. */
  onScroll: () => void;
  /** Follows again and moves focus to the scrolling element. */
  jumpToLatest: () => void;
  /** The counted items that arrived since following paused. */
  newCount: number;
}

/** Pins a virtual list to its newest row until the user scrolls up, keeping their place as older rows load. */
export function useFollowScroll<T extends { id: string }>({
  scrollRef,
  virtualizer,
  rows,
  totalSize,
  layoutKey,
  threshold,
  isFollowing,
  setFollowing,
  items,
  isCounted,
  shouldFollowLast,
  firstKey,
  indexOf,
  anchorAt,
}: FollowScrollOptions<T>): FollowScroll {
  // Following: pin to the bottom whenever rows arrive or are measured.
  const lastScrollTop = useRef(0);
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!isFollowing || !element) {
      return;
    }
    element.scrollTop = element.scrollHeight;
    lastScrollTop.current = element.scrollTop;
  }, [scrollRef, isFollowing, rows, totalSize, layoutKey]);

  // When paused, the anchor row stays put as rows are added or removed above it.
  const anchor = useRef<{ key: string; delta: number } | null>(null);
  const previousFirstKey = useRef(firstKey);
  useLayoutEffect(() => {
    const previous = previousFirstKey.current;
    previousFirstKey.current = firstKey;
    const element = scrollRef.current;
    const held = anchor.current;
    if (isFollowing || previous === firstKey || !held || !element) {
      return;
    }
    const index = indexOf(held.key);
    const start = index === undefined ? undefined : virtualizer.measurementsCache[index]?.start;
    if (start !== undefined) {
      element.scrollTop = start + held.delta;
      lastScrollTop.current = element.scrollTop;
    }
  }, [scrollRef, firstKey, isFollowing, indexOf, virtualizer]);

  const lastId = items.at(-1)?.id;
  const previousLastId = useRef(lastId);
  useLayoutEffect(() => {
    const previous = previousLastId.current;
    previousLastId.current = lastId;
    if (shouldFollowLast && previous !== undefined && previous !== lastId) {
      setFollowing(true);
    }
  }, [lastId, shouldFollowLast, setFollowing]);

  // "N new": counted items that arrived after the newest one seen when following paused.
  const [pausedAt, setPausedAt] = useState<string | null>(null);
  if (!isFollowing && pausedAt === null) {
    setPausedAt(lastId ?? '');
  } else if (isFollowing && pausedAt !== null) {
    setPausedAt(null);
  }
  const newCount = useMemo(() => {
    if (pausedAt === null) {
      return 0;
    }
    let count = 0;
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];
      if (!item || item.id === pausedAt) {
        break;
      }
      if (isCounted(item)) {
        count += 1;
      }
    }
    return count;
  }, [items, pausedAt, isCounted]);

  const onScroll = () => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    const top = element.scrollTop;
    const distance = element.scrollHeight - element.clientHeight - top;
    const hasMovedUp = top < lastScrollTop.current - 1;
    lastScrollTop.current = top;
    if (isFollowing && hasMovedUp && distance > threshold) {
      setFollowing(false);
    } else if (!isFollowing && !hasMovedUp && distance <= threshold) {
      setFollowing(true);
    }
    const item = anchorAt ? anchorAt(top) : virtualizer.getVirtualItemForOffset(top);
    anchor.current = item ? { key: String(item.key), delta: top - item.start } : null;
  };

  const jumpToLatest = () => {
    setFollowing(true);
    scrollRef.current?.focus({ preventScroll: true });
  };

  return { onScroll, jumpToLatest, newCount };
}
