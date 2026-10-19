// Scrollspy: which of a page's sections is being read, from one IntersectionObserver.

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { useLatest } from './useLatest';

/** Input that means the user is scrolling again, which ends a `hold`. */
const TAKEOVER_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;

export interface UseScrollSpyOptions {
  /** Ids of the elements to watch (section headings, or the sections), in document order. Memoise it. */
  ids: readonly string[];
  /** The scroll container the elements scroll in; the page when it's absent or holds no element. */
  rootRef?: RefObject<Element | null>;
  /** Pixels at the top of the page or container hidden under sticky headers. Defaults to 0. */
  offset?: number;
  /** The id reported last (or the controlled value), so an unchanged answer isn't reported again. */
  activeId: string | null;
  /** Called with the id of the element being read when it changes, or null above the first one. */
  onChange: (id: string | null) => void;
}

/**
 * Watches elements as the page (or `rootRef`) scrolls and reports which is being read: the first one in the upper
 * half of the view, below `offset`, or else the last one scrolled past. One IntersectionObserver reports when one
 * crosses that zone; only then are a few positions read (a binary search, as the elements are in document order), so
 * nothing is measured while scrolling between crossings, and `onChange` runs only when the answer changes.
 *
 * Returns `hold`, for a programmatic scroll to a chosen element: the answer stays put (the app has already shown the
 * choice) while it runs and after, even when a short last section can't reach the top, until the user scrolls, taps,
 * clicks or types again.
 */
export function useScrollSpy({
  ids,
  rootRef,
  offset = 0,
  activeId,
  onChange,
}: UseScrollSpyOptions): () => void {
  const onChangeRef = useLatest(onChange);
  // The answer last reported or set from outside. Written here too, so a quick second crossing isn't reported twice.
  const lastRef = useRef(activeId);
  useLayoutEffect(() => {
    lastRef.current = activeId;
  }, [activeId]);
  const isHeldRef = useRef(false);
  const releaseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const root = rootRef?.current ?? null;
    const doc = root?.ownerDocument ?? document;
    const order: string[] = [];
    const elements: Element[] = [];
    const seen = new Set<Element>();
    for (const id of ids) {
      const element = doc.getElementById(id);
      if (element && !seen.has(element)) {
        seen.add(element);
        elements.push(element);
        order.push(id);
      }
    }
    if (elements.length === 0) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const zone = entries[0]?.rootBounds;
        if (isHeldRef.current || !zone) {
          return;
        }
        // Something crossed the zone. An element can also jump right over it in one frame (an instant scroll, or the
        // End key) without a crossing of its own, so rather than trust what each one did last, find where they all
        // are now: they're in document order, so a binary search reads only a few positions.
        let low = 0;
        let high = elements.length;
        while (low < high) {
          const middle = (low + high) >> 1;
          if ((elements[middle]?.getBoundingClientRect().bottom ?? 0) > zone.top) {
            high = middle;
          } else {
            low = middle + 1;
          }
        }
        // The first element not yet scrolled past is being read if it's in the zone; otherwise the one before it.
        const isInZone = (elements[low]?.getBoundingClientRect().top ?? Infinity) < zone.bottom;
        const next = order[isInZone ? low : low - 1] ?? null;
        if (next !== lastRef.current) {
          lastRef.current = next;
          onChangeRef.current(next);
        }
      },
      // The document as root (not the implicit one) keeps the zone in this document's viewport inside an iframe.
      // The zone runs from below the sticky headers to halfway down.
      { root: root ?? doc, rootMargin: `${String(-Math.max(0, offset))}px 0px -50% 0px` },
    );
    for (const element of elements) {
      observer.observe(element);
    }
    return () => {
      observer.disconnect();
    };
  }, [ids, rootRef, offset, onChangeRef]);

  useEffect(
    () => () => {
      releaseRef.current?.();
    },
    [],
  );

  return useCallback(() => {
    isHeldRef.current = true;
    if (releaseRef.current) {
      return;
    }
    const release = () => {
      isHeldRef.current = false;
      releaseRef.current = null;
      for (const type of TAKEOVER_EVENTS) {
        window.removeEventListener(type, release, true);
      }
    };
    for (const type of TAKEOVER_EVENTS) {
      window.addEventListener(type, release, { capture: true, passive: true });
    }
    releaseRef.current = release;
  }, []);
}
