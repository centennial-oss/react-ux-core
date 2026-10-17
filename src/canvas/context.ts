// Canvas contexts. They're split so a pan frame re-renders only what reads the viewport: `CanvasInternalsContext`
// is stable for the canvas's lifetime (items read it, so 2,000 items don't re-render while panning), the selection is
// an external store each item reads its own flag from, and `CanvasStateContext` (viewport, size, selection) is for
// `useCanvas()` and the built-in controls, rulers and minimap.
import { createContext, useContext, useSyncExternalStore } from 'react';
import type { CanvasPoint, CanvasRect, CanvasSize, CanvasViewport } from './geometry';

/** How a pointer press or a key changes the selection. */
export type SelectionChange = 'replace' | 'toggle' | 'add';

/** Where a group move is: live while dragging, at the end of a drag or keyboard nudge, or cancelled. */
export type MovePhase = 'move' | 'end' | 'cancel';

/** What an item tells the canvas about itself. */
export interface CanvasItemEntry {
  /** The item's world bounds (for marquee selection, the minimap and zoom to fit). */
  getRect: () => CanvasRect;
  /** Moves the item by a world delta from where it was when the move started. */
  onGroupMove: (dx: number, dy: number, phase: MovePhase) => void;
}

/** A small store of selected ids that items subscribe to one flag at a time. */
export interface SelectionStore {
  get: () => readonly string[];
  has: (id: string) => boolean;
  subscribe: (listener: () => void) => () => void;
}

/** The canvas's stable internals, for CanvasItem. Every function reads current values through refs. */
export interface CanvasInternals {
  getViewport: () => CanvasViewport;
  /** Whether a pointer press should pan instead of acting on what's under it (Space held, or the middle button). */
  isPanPress: (event: { button: number }) => boolean;
  /** Whether Space was used to pan since it went down (so its release doesn't also select). */
  hasSpacePanned: () => boolean;
  selection: SelectionStore;
  isMultiple: () => boolean;
  select: (id: string, change: SelectionChange) => void;
  registerItem: (id: string, entry: CanvasItemEntry) => () => void;
  /** Notes that an item's bounds changed (for the minimap). */
  itemChanged: () => void;
  /** Moves the item and, if it's selected, the rest of the selection, by a world delta. */
  moveGroup: (id: string, dx: number, dy: number, phase: MovePhase) => void;
  /** The grid step, or 0 when there's no grid. */
  gridSize: () => number;
  /** Whether drags snap to the grid. */
  isSnapping: () => boolean;
  requestDelete: (id: string) => void;
  announce: (message: string) => void;
  /** Formats a world coordinate for announcements. */
  formatNumber: (value: number) => string;
  /** Registers how to cancel the item drag in progress (or clears it), so a second touch can become a pinch. */
  setItemDrag: (cancel: (() => void) | null) => void;
  /** The id of the shared element that tells how to move an item, for items' `aria-describedby`. */
  itemInstructionsId: string;
  /** Pans the least distance that brings a world rectangle into view (when an item takes focus). */
  reveal: (rect: CanvasRect) => void;
}

export const CanvasInternalsContext = createContext<CanvasInternals | null>(null);

/** What `useCanvas()` returns. */
export interface CanvasApi {
  /** The current viewport. Components that read it re-render on every pan and zoom frame. */
  viewport: CanvasViewport;
  /** The canvas's size in screen pixels. */
  size: CanvasSize;
  setViewport: (viewport: CanvasViewport) => void;
  /** A world point in screen pixels, relative to the canvas's top-left corner. */
  worldToScreen: (point: CanvasPoint) => CanvasPoint;
  /** A screen point (relative to the canvas's top-left corner) in world units. */
  screenToWorld: (point: CanvasPoint) => CanvasPoint;
  /** A pointer's viewport position (`clientX`, `clientY`) in world units, for drops and connectors. */
  clientToWorld: (point: CanvasPoint) => CanvasPoint;
  /** A world point snapped to the grid, or unchanged when there's no grid or snapping is off. */
  snap: (point: CanvasPoint) => CanvasPoint;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Back to 100%, about the canvas's centre. */
  resetZoom: () => void;
  /** Fits the content bounds (or every item) in view. */
  zoomToFit: () => void;
  minZoom: number;
  maxZoom: number;
  selection: readonly string[];
  setSelection: (ids: string[]) => void;
}

export const CanvasStateContext = createContext<CanvasApi | null>(null);

export function useCanvasInternals(): CanvasInternals {
  const value = useContext(CanvasInternalsContext);
  if (!value) {
    throw new Error('CanvasItem and CanvasControls must be used inside <Canvas>.');
  }
  return value;
}

/**
 * The canvas around this component: its viewport and size, coordinate conversion, snapping, zoom actions and the
 * selection. Use it inside `Canvas` content or its `overlay`. It re-renders on every viewport change, so read it in
 * small components (a status readout), not in every item.
 */
export function useCanvas(): CanvasApi {
  const value = useContext(CanvasStateContext);
  if (!value) {
    throw new Error('useCanvas must be used inside <Canvas>.');
  }
  return value;
}

export function createSelectionStore(): SelectionStore & { set: (ids: readonly string[]) => void } {
  let ids: readonly string[] = [];
  let lookup = new Set<string>();
  const listeners = new Set<() => void>();
  return {
    get: () => ids,
    has: (id) => lookup.has(id),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set: (next) => {
      if (next === ids) {
        return;
      }
      ids = next;
      lookup = new Set(next);
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

/** Whether `id` is selected, re-rendering only when that answer changes. */
export function useIsSelected(store: SelectionStore, id: string): boolean {
  return useSyncExternalStore(
    store.subscribe,
    () => store.has(id),
    () => store.has(id),
  );
}
