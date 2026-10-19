// The grid's viewport: its size from one ResizeObserver (GRID-12), the height it fills when the host gives it none
// (GRID-10), and which cells are near or in view, from one IntersectionObserver (WID-16).

import { useCallback, useLayoutEffect, useMemo, useRef, useState, type RefCallback } from 'react';
import { isRightToLeft } from '../../utils/direction';
import { mergeRefs } from '../../utils/mergeRefs';
import { useResizeMeasure } from '../../utils/useResizeMeasure';

/** The viewport's size and the window's, in CSS pixels. */
export interface ViewportSize {
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  /** The grid lays out right to left, so it mirrors (I18N-03). */
  isRtl: boolean;
}

/** The viewport's client size (its own scrollbar excluded) and the window's, for `density: 'auto'`. */
const measureViewport = (element: HTMLElement): ViewportSize => ({
  width: element.clientWidth,
  height: element.clientHeight,
  viewportWidth: window.innerWidth,
  viewportHeight: window.visualViewport?.height ?? window.innerHeight,
  isRtl: isRightToLeft(element),
});
const sameViewport = (a: ViewportSize, b: ViewportSize) =>
  a.width === b.width &&
  a.height === b.height &&
  a.viewportWidth === b.viewportWidth &&
  a.viewportHeight === b.viewportHeight &&
  a.isRtl === b.isRtl;

/**
 * The CSS height that fills from `element`'s top down to the bottom of the visual viewport (GRID-10), with dynamic
 * viewport units for mobile browsers, or undefined until measured or while `isActive` is false. Recalculated on
 * resize, orientation change and full-screen change.
 */
export function useFillHeight(element: HTMLElement | null, isActive: boolean): string | undefined {
  const [top, setTop] = useState<number>();
  useLayoutEffect(() => {
    if (!element || !isActive) {
      return;
    }
    const update = () => {
      const next = Math.round(element.getBoundingClientRect().top + window.scrollY);
      setTop((current) => (current === next ? current : next));
    };
    update();
    const visual = window.visualViewport;
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    document.addEventListener('fullscreenchange', update);
    visual?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      document.removeEventListener('fullscreenchange', update);
      visual?.removeEventListener('resize', update);
    };
  }, [element, isActive]);
  return isActive && top !== undefined ? `max(16rem, calc(100dvh - ${String(top)}px))` : undefined;
}

/** The viewport element's ref, the element, and its size. */
export function useGridViewport(): {
  ref: RefCallback<HTMLElement>;
  element: HTMLElement | null;
  size: ViewportSize | undefined;
} {
  const [element, setElement] = useState<HTMLElement | null>(null);
  // The border box, so a viewport whose content changes height still re-measures when the window does.
  const [measureRef, size] = useResizeMeasure(measureViewport, sameViewport, 'border-box');
  const ref = useMemo(() => mergeRefs<HTMLElement>(setElement, measureRef), [measureRef]);
  return { ref, element, size };
}

/** Cells near the viewport (within one viewport height) and in it, from a single IntersectionObserver. */
export interface CellVisibility {
  /** Ids of cells that have come within one viewport height of view: their widgets may load (WID-16). */
  near: ReadonlySet<string>;
  /** Whether a cell is in view now, for load priority (DATA-11). Read in events and effects, not render. */
  isInView: (id: string) => boolean;
  /** Starts watching a cell's element; the returned function stops. */
  observe: (id: string, element: HTMLElement) => () => void;
}

/** Tracks which cells of the viewport `root` are near and in view. */
export function useCellVisibility(root: HTMLElement | null): CellVisibility {
  const [near, setNear] = useState<ReadonlySet<string>>(() => new Set());
  // Read only in observer callbacks and the stable functions below, never in render.
  const tracker = useRef({
    inView: new Set<string>(),
    ids: new WeakMap<Element, string>(),
    elements: new Map<string, HTMLElement>(),
    observers: [] as IntersectionObserver[],
  });

  useLayoutEffect(() => {
    if (!root) {
      return;
    }
    const state = tracker.current;
    const nearby = new IntersectionObserver(
      (entries) => {
        const arrived = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => state.ids.get(entry.target))
          .filter((id): id is string => id !== undefined);
        if (arrived.length > 0) {
          // Once near, a widget stays loaded: the set only grows.
          setNear((current) =>
            arrived.every((id) => current.has(id)) ? current : new Set([...current, ...arrived]),
          );
        }
      },
      { root, rootMargin: '100% 0px' },
    );
    const visible = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = state.ids.get(entry.target);
          if (id !== undefined) {
            if (entry.isIntersecting) {
              state.inView.add(id);
            } else {
              state.inView.delete(id);
            }
          }
        }
      },
      { root },
    );
    state.observers = [nearby, visible];
    for (const element of state.elements.values()) {
      nearby.observe(element);
      visible.observe(element);
    }
    return () => {
      nearby.disconnect();
      visible.disconnect();
      state.observers = [];
    };
  }, [root]);

  const isInView = useCallback((id: string) => tracker.current.inView.has(id), []);
  const observe = useCallback((id: string, element: HTMLElement) => {
    const state = tracker.current;
    state.ids.set(element, id);
    state.elements.set(id, element);
    for (const observer of state.observers) {
      observer.observe(element);
    }
    return () => {
      state.elements.delete(id);
      state.inView.delete(id);
      for (const observer of state.observers) {
        observer.unobserve(element);
      }
    };
  }, []);
  return useMemo(() => ({ near, isInView, observe }), [near, isInView, observe]);
}
