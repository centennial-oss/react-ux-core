// Canvas: a pannable, zoomable world for diagram editors, floor plans and builders. The wheel zooms at the cursor;
// Space-drag, middle-drag (or any drag on empty space when there's no marquee) pans; pinch and two-finger drags zoom
// and pan on touch. A drag on empty space draws a marquee that selects the items it touches. The world is one layer
// moved by a single CSS transform, and items read only stable internals and their own selection flag, so panning
// thousands of items re-renders none of them. Optional: a background grid that drags snap to (Alt suspends it), rulers,
// a minimap, and zoom controls. The zoom level is announced, and every gesture has a keyboard equivalent.

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { useLocale } from 'react-aria-components';
import { cn } from '../utils/cn';
import { useDebouncedCallback } from '../utils/timers';
import { useControllableState } from '../utils/useControllableState';
import { CanvasControls } from './CanvasControls';
import {
  CanvasInternalsContext,
  CanvasStateContext,
  createSelectionStore,
  type CanvasApi,
  type CanvasInternals,
  type CanvasItemEntry,
  type SelectionChange,
} from './context';
import {
  capturePointer,
  clamp,
  fitRect,
  normalizeRect,
  rectsIntersect,
  sameViewport,
  screenToWorld,
  snapValue,
  unionRects,
  worldToScreen,
  zoomAt,
  type CanvasPoint,
  type CanvasRect,
  type CanvasSize,
  type CanvasViewport,
} from './geometry';
import { useCanvasMessages } from './messages';
import { Minimap } from './Minimap';
import { Rulers } from './Rulers';

export interface CanvasGrid {
  /** The grid step in world units. Snapping uses the same step. */
  size: number;
  /** Draws the grid. Defaults to true. */
  isVisible?: boolean;
  /** Snaps dragged items to the grid (hold Alt to suspend). Defaults to true. */
  shouldSnap?: boolean;
}

export interface CanvasProps {
  /** The controlled viewport. Memoize heavy content when you control it, so pan frames don't rebuild it. */
  viewport?: CanvasViewport;
  /** The initial viewport. Without either, the canvas fits `contentBounds` (or starts at 100% at the origin). */
  defaultViewport?: CanvasViewport;
  onViewportChange?: (viewport: CanvasViewport) => void;
  /** Defaults to 0.1 (10%). */
  minZoom?: number;
  /** Defaults to 8 (800%). */
  maxZoom?: number;
  /** A background grid in world units; drags snap to it. */
  grid?: CanvasGrid;
  /** Rulers on the top and left, in world units, with a unit label such as `px`, `mm` or `in`. */
  rulers?: { unit: string };
  /** World-space content: the app's shapes, usually `CanvasItem`s. */
  children?: ReactNode;
  /** World-space content drawn under the items and not part of the item list (connectors, guides, backdrops). */
  background?: ReactNode;
  /** Screen-space content drawn over the canvas inside its context, such as a legend or custom controls. */
  overlay?: ReactNode;
  /** Shows the zoom controls in the bottom-left corner. Defaults to true. */
  hasControls?: boolean;
  /** The selected item ids (controlled). */
  selection?: readonly string[];
  defaultSelection?: readonly string[];
  onSelectionChange?: (ids: string[]) => void;
  /** `multiple` (the default) or `single`. Single selection has no marquee. */
  selectionMode?: 'single' | 'multiple';
  /** A drag on empty space draws a selection marquee. Defaults to true (with multiple selection). */
  hasMarquee?: boolean;
  /** The content's bounds, for "Zoom to fit" and the minimap. Defaults to the bounds of every item. */
  contentBounds?: CanvasRect;
  /** A minimap in the bottom-right corner, shown when the content doesn't fit in view. */
  hasMinimap?: boolean;
  /** Delete or Backspace on an item: the ids to delete (the selection, if the item is in it). */
  onDelete?: (ids: string[]) => void;
  /** The canvas's height (CSS). Defaults to `24rem`. */
  height?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

type Gesture =
  | {
      kind: 'pan';
      pointerId: number;
      start: CanvasPoint;
      viewport: CanvasViewport;
      hasMoved: boolean;
    }
  | {
      kind: 'marquee';
      pointerId: number;
      startScreen: CanvasPoint;
      startWorld: CanvasPoint;
      base: readonly string[];
      isAdditive: boolean;
      hasMoved: boolean;
    }
  | {
      kind: 'pinch';
      ids: [number, number];
      startDistance: number;
      startCenter: CanvasPoint;
      viewport: CanvasViewport;
    };

const EMPTY: readonly string[] = [];
const EMPTY_RECTS: readonly CanvasRect[] = [];
const DEFAULT_VIEWPORT: CanvasViewport = { x: 0, y: 0, zoom: 1 };
/** Screen pixels a pointer moves before a press becomes a drag. */
const DRAG_THRESHOLD = 3;
/** Each zoom button press and +/- key multiplies the zoom by this. */
const ZOOM_STEP = 1.25;

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function isTextInput(target: EventTarget): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/** A pannable, zoomable world with a grid, snapping, marquee selection, rulers, a minimap and zoom controls. */
export function Canvas({
  viewport: viewportProp,
  defaultViewport,
  onViewportChange,
  minZoom = 0.1,
  maxZoom = 8,
  grid,
  rulers,
  children,
  background,
  overlay,
  hasControls = true,
  selection: selectionProp,
  defaultSelection = EMPTY,
  onSelectionChange,
  selectionMode = 'multiple',
  hasMarquee = true,
  contentBounds,
  hasMinimap = false,
  onDelete,
  height = '24rem',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  className,
  ref,
}: CanvasProps) {
  const messages = useCanvasMessages();
  const { locale } = useLocale();
  const instructionsId = useId();
  const itemInstructionsId = useId();
  const percentFormat = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }),
    [locale],
  );
  const numberFormat = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    [locale],
  );

  const [viewport, setViewportState] = useControllableState(
    viewportProp,
    defaultViewport ?? DEFAULT_VIEWPORT,
    onViewportChange,
  );
  const [shouldFitOnMount] = useState(
    viewportProp === undefined && defaultViewport === undefined && contentBounds !== undefined,
  );
  const [selection, setSelectionState] = useControllableState<readonly string[]>(
    selectionProp,
    defaultSelection,
    onSelectionChange as ((ids: readonly string[]) => void) | undefined,
  );
  const [selectionStore] = useState(createSelectionStore);
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const [marquee, setMarquee] = useState<CanvasRect | null>(null);
  const [isPanning, setPanning] = useState(false);
  const [isSpaceHeld, setSpaceHeld] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [itemRects, setItemRects] = useState<readonly CanvasRect[]>(EMPTY_RECTS);
  const [hasItems, setHasItems] = useState(false);

  const areaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef(viewport);
  const frameRef = useRef<number | null>(null);
  const versionFrameRef = useRef<number | null>(null);
  const sizeRef = useRef(size);
  const items = useRef(new Map<string, CanvasItemEntry>());
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, CanvasPoint & { type: string }>());
  const spaceRef = useRef(false);
  const spacePannedRef = useRef(false);
  const itemDragCancel = useRef<(() => void) | null>(null);
  const hasFitted = useRef(false);
  const isMultiple = selectionMode === 'multiple';
  const isMarqueeOn = hasMarquee && isMultiple;
  const snapStep = grid && grid.shouldSnap !== false ? grid.size : 0;

  // The latest props and setters, for callbacks that must stay stable.
  const latest = useRef({
    setViewportState,
    setSelectionState,
    selection,
    minZoom,
    maxZoom,
    grid,
    snapStep,
    isMultiple,
    isMarqueeOn,
    contentBounds,
    onDelete,
    messages,
    numberFormat,
    hasMinimap,
  });
  useLayoutEffect(() => {
    latest.current = {
      setViewportState,
      setSelectionState,
      selection,
      minZoom,
      maxZoom,
      grid,
      snapStep,
      isMultiple,
      isMarqueeOn,
      contentBounds,
      onDelete,
      messages,
      numberFormat,
      hasMinimap,
    };
  });

  // A controlled or uncontrolled change from outside replaces the working viewport, unless a frame is pending.
  useLayoutEffect(() => {
    if (frameRef.current === null) {
      viewportRef.current = viewport;
    }
  }, [viewport]);

  // Items read their selected flag from the store, so only items whose flag flips re-render.
  useLayoutEffect(() => {
    selectionStore.set(selection);
  }, [selection, selectionStore]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      if (versionFrameRef.current !== null) {
        cancelAnimationFrame(versionFrameRef.current);
      }
    },
    [],
  );

  /** Applies a viewport: right away, or (for gestures) once per animation frame. */
  const commitViewport = useCallback((next: CanvasViewport, isImmediate = false) => {
    viewportRef.current = next;
    if (isImmediate) {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      latest.current.setViewportState(next);
      return;
    }
    frameRef.current ??= requestAnimationFrame(() => {
      frameRef.current = null;
      latest.current.setViewportState(viewportRef.current);
    });
  }, []);

  const setSelection = useCallback((ids: readonly string[]) => {
    if (!sameIds(ids, latest.current.selection)) {
      latest.current.selection = ids;
      latest.current.setSelectionState(ids);
    }
  }, []);

  const contentRect = useCallback(
    (): CanvasRect | null =>
      latest.current.contentBounds ??
      unionRects([...items.current.values()].map((entry) => entry.getRect())),
    [],
  );

  const zoomTo = useCallback(
    (zoom: number, point?: CanvasPoint) => {
      const { minZoom: min, maxZoom: max } = latest.current;
      const current = viewportRef.current;
      const center = point ?? { x: sizeRef.current.width / 2, y: sizeRef.current.height / 2 };
      commitViewport(zoomAt(current, center, clamp(zoom, min, max)), point === undefined);
    },
    [commitViewport],
  );

  const zoomToFit = useCallback(() => {
    const rect = contentRect();
    if (!rect || sizeRef.current.width === 0) {
      return;
    }
    const { minZoom: min, maxZoom: max } = latest.current;
    commitViewport(
      fitRect(rect, sizeRef.current, { minZoom: min, maxZoom: Math.min(1, max) }),
      true,
    );
  }, [commitViewport, contentRect]);

  // The canvas's size, measured before paint; the first measurement also fits the content when asked to.
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) {
      return;
    }
    const measure = () => {
      const next = { width: area.clientWidth, height: area.clientHeight };
      if (next.width === sizeRef.current.width && next.height === sizeRef.current.height) {
        return;
      }
      sizeRef.current = next;
      setSize(next);
      if (shouldFitOnMount && !hasFitted.current && next.width > 0) {
        hasFitted.current = true;
        zoomToFit();
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    return () => {
      observer.disconnect();
    };
  }, [shouldFitOnMount, zoomToFit]);

  // The zoom level is announced once it settles.
  const announceZoom = useDebouncedCallback((percent: string) => {
    setAnnouncement(messages.canvasZoomLevel({ percent }));
  }, 500);
  const lastZoom = useRef(viewport.zoom);
  useEffect(() => {
    if (Math.abs(lastZoom.current - viewport.zoom) > 1e-6) {
      lastZoom.current = viewport.zoom;
      announceZoom.run(percentFormat.format(viewport.zoom));
    }
  }, [viewport.zoom, announceZoom, percentFormat]);

  const internals = useMemo<CanvasInternals>(
    () => ({
      getViewport: () => viewportRef.current,
      isPanPress: (event) => event.button === 1 || spaceRef.current,
      hasSpacePanned: () => spacePannedRef.current,
      selection: selectionStore,
      isMultiple: () => latest.current.isMultiple,
      select: (id: string, change: SelectionChange) => {
        const current = latest.current.selection;
        if (!latest.current.isMultiple || change === 'replace') {
          setSelection([id]);
        } else if (change === 'add') {
          setSelection(current.includes(id) ? current : [...current, id]);
        } else {
          setSelection(
            current.includes(id) ? current.filter((other) => other !== id) : [...current, id],
          );
        }
      },
      registerItem: (id, entry) => {
        items.current.set(id, entry);
        if (items.current.size === 1) {
          setHasItems(true);
        }
        return () => {
          if (items.current.get(id) === entry) {
            items.current.delete(id);
            if (items.current.size === 0) {
              setHasItems(false);
            }
          }
        };
      },
      itemChanged: () => {
        // Only the minimap draws every item; it's updated at most once a frame.
        if (!latest.current.hasMinimap) {
          return;
        }
        versionFrameRef.current ??= requestAnimationFrame(() => {
          versionFrameRef.current = null;
          setItemRects([...items.current.values()].map((entry) => entry.getRect()));
        });
      },
      moveGroup: (id, dx, dy, phase) => {
        const current = latest.current.selection;
        const ids = current.includes(id) ? current : [id];
        for (const other of ids) {
          items.current.get(other)?.onGroupMove(dx, dy, phase);
        }
      },
      gridSize: () => latest.current.grid?.size ?? 0,
      isSnapping: () => latest.current.snapStep > 0,
      requestDelete: (id) => {
        const current = latest.current.selection;
        latest.current.onDelete?.(current.includes(id) ? [...current] : [id]);
      },
      announce: (message) => {
        setAnnouncement(message);
      },
      formatNumber: (value) => latest.current.numberFormat.format(value),
      itemInstructionsId,
      setItemDrag: (cancel) => {
        itemDragCancel.current = cancel;
      },
      reveal: (rect) => {
        const current = viewportRef.current;
        const { width, height } = sizeRef.current;
        if (width === 0) {
          return;
        }
        const visibleWidth = width / current.zoom;
        const visibleHeight = height / current.zoom;
        const margin = 16 / current.zoom;
        const shift = (start: number, length: number, from: number, visible: number) => {
          if (start - margin < from) {
            return start - margin;
          }
          if (start + length + margin > from + visible) {
            return Math.min(start - margin, start + length + margin - visible);
          }
          return from;
        };
        const next = {
          ...current,
          x: shift(rect.x, rect.width, current.x, visibleWidth),
          y: shift(rect.y, rect.height, current.y, visibleHeight),
        };
        if (!sameViewport(next, current)) {
          commitViewport(next, true);
        }
      },
    }),
    [commitViewport, selectionStore, setSelection, itemInstructionsId],
  );

  const api = useMemo<CanvasApi>(
    () => ({
      viewport,
      size,
      setViewport: (next) => {
        commitViewport(next, true);
      },
      worldToScreen: (point) => worldToScreen(point, viewport),
      screenToWorld: (point) => screenToWorld(point, viewport),
      clientToWorld: (point) => {
        const rect = areaRef.current?.getBoundingClientRect();
        return screenToWorld(
          { x: point.x - (rect?.left ?? 0), y: point.y - (rect?.top ?? 0) },
          viewportRef.current,
        );
      },
      snap: (point) =>
        snapStep > 0 ? { x: snapValue(point.x, snapStep), y: snapValue(point.y, snapStep) } : point,
      zoomIn: () => {
        zoomTo(viewportRef.current.zoom * ZOOM_STEP);
      },
      zoomOut: () => {
        zoomTo(viewportRef.current.zoom / ZOOM_STEP);
      },
      resetZoom: () => {
        zoomTo(1);
      },
      zoomToFit,
      minZoom,
      maxZoom,
      selection,
      setSelection: (ids) => {
        setSelection(ids);
      },
    }),
    [
      viewport,
      size,
      commitViewport,
      snapStep,
      zoomTo,
      zoomToFit,
      minZoom,
      maxZoom,
      selection,
      setSelection,
    ],
  );

  const minimapBounds = useMemo(
    () => contentBounds ?? unionRects(itemRects),
    [contentBounds, itemRects],
  );

  /** A pointer event's position relative to the canvas's top-left corner. */
  const local = (event: { clientX: number; clientY: number }): CanvasPoint => {
    const rect = areaRef.current?.getBoundingClientRect();
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  };

  // The wheel zooms at the cursor (Shift + wheel pans). It's a native listener so it can stop the page scrolling.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const current = viewportRef.current;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
      if (event.shiftKey && !event.ctrlKey) {
        commitViewport({
          ...current,
          x: current.x + (event.deltaX * unit) / current.zoom,
          y: current.y + (event.deltaY * unit) / current.zoom,
        });
        return;
      }
      const { minZoom: min, maxZoom: max } = latest.current;
      // Trackpad pinches arrive as wheel events with ctrlKey and small deltas, so they get a stronger factor.
      const factor = Math.exp(-event.deltaY * unit * (event.ctrlKey ? 0.01 : 0.0015));
      const rect = area.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      commitViewport(zoomAt(current, point, clamp(current.zoom * factor, min, max)));
    };
    area.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      area.removeEventListener('wheel', onWheel);
    };
  }, [commitViewport]);

  const endGesture = () => {
    const current = gesture.current;
    gesture.current = null;
    if (current?.kind === 'marquee') {
      setMarquee(null);
    }
    setPanning(false);
  };

  const onPointerDownCapture = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.set(event.pointerId, { ...local(event), type: event.pointerType });
    const touches = [...pointers.current.entries()].filter(
      ([, pointer]) => pointer.type === 'touch',
    );
    const [first, second] = touches;
    if (event.pointerType === 'touch' && touches.length === 2 && first && second) {
      // A second finger turns whatever the first one started into a pinch.
      itemDragCancel.current?.();
      itemDragCancel.current = null;
      if (gesture.current?.kind === 'marquee') {
        setSelection(gesture.current.base);
      }
      endGesture();
      gesture.current = {
        kind: 'pinch',
        ids: [first[0], second[0]],
        startDistance: Math.max(1, Math.hypot(first[1].x - second[1].x, first[1].y - second[1].y)),
        startCenter: { x: (first[1].x + second[1].x) / 2, y: (first[1].y + second[1].y) / 2 },
        viewport: viewportRef.current,
      };
      capturePointer(areaRef.current, event.pointerId);
      event.stopPropagation();
    }
  };

  // Reached only for presses on empty space (or pan presses): items stop the ones they handle.
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (gesture.current || (event.button !== 0 && event.button !== 1)) {
      return;
    }
    areaRef.current?.focus({ preventScroll: true });
    const point = local(event);
    if (event.button === 1 || spaceRef.current || !latest.current.isMarqueeOn) {
      event.preventDefault();
      if (spaceRef.current) {
        spacePannedRef.current = true;
      }
      gesture.current = {
        kind: 'pan',
        pointerId: event.pointerId,
        start: point,
        viewport: viewportRef.current,
        hasMoved: false,
      };
      setPanning(true);
    } else {
      const isAdditive = event.shiftKey || event.metaKey || event.ctrlKey;
      gesture.current = {
        kind: 'marquee',
        pointerId: event.pointerId,
        startScreen: point,
        startWorld: screenToWorld(point, viewportRef.current),
        base: isAdditive ? latest.current.selection : EMPTY,
        isAdditive,
        hasMoved: false,
      };
    }
    capturePointer(event.currentTarget, event.pointerId);
  };

  const onPointerMoveCapture = (event: PointerEvent<HTMLDivElement>) => {
    const pointer = pointers.current.get(event.pointerId);
    if (pointer) {
      pointers.current.set(event.pointerId, { ...local(event), type: pointer.type });
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current) {
      return;
    }
    if (current.kind === 'pinch') {
      const a = pointers.current.get(current.ids[0]);
      const b = pointers.current.get(current.ids[1]);
      if (!a || !b) {
        return;
      }
      const { minZoom: min, maxZoom: max } = latest.current;
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const zoom = clamp((current.viewport.zoom * distance) / current.startDistance, min, max);
      const world = screenToWorld(current.startCenter, current.viewport);
      commitViewport({ x: world.x - center.x / zoom, y: world.y - center.y / zoom, zoom });
      return;
    }
    if (event.pointerId !== current.pointerId) {
      return;
    }
    const point = local(event);
    if (current.kind === 'pan') {
      const dx = point.x - current.start.x;
      const dy = point.y - current.start.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        current.hasMoved = true;
      }
      if (current.hasMoved) {
        commitViewport({
          ...current.viewport,
          x: current.viewport.x - dx / current.viewport.zoom,
          y: current.viewport.y - dy / current.viewport.zoom,
        });
      }
      return;
    }
    if (
      !current.hasMoved &&
      Math.hypot(point.x - current.startScreen.x, point.y - current.startScreen.y) <= DRAG_THRESHOLD
    ) {
      return;
    }
    current.hasMoved = true;
    const view = viewportRef.current;
    const world = normalizeRect(current.startWorld, screenToWorld(point, view));
    setMarquee(normalizeRect(worldToScreen(current.startWorld, view), point));
    const hits: string[] = [];
    for (const [id, entry] of items.current) {
      if (rectsIntersect(world, entry.getRect())) {
        hits.push(id);
      }
    }
    setSelection(
      current.isAdditive
        ? [...current.base, ...hits.filter((id) => !current.base.includes(id))]
        : hits,
    );
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    const current = gesture.current;
    if (!current) {
      return;
    }
    if (current.kind === 'pinch') {
      if (current.ids.includes(event.pointerId)) {
        endGesture();
      }
      return;
    }
    if (event.pointerId !== current.pointerId) {
      return;
    }
    const isCancel = event.type === 'pointercancel';
    if (current.kind === 'pan') {
      // A click (no drag) on empty space clears the selection.
      if (!current.hasMoved && !isCancel && event.button === 0 && !spaceRef.current) {
        setSelection(EMPTY);
      }
    } else if (!current.hasMoved) {
      if (!current.isAdditive && !isCancel) {
        setSelection(EMPTY);
      }
    } else {
      setAnnouncement(messages.canvasSelectedCount({ count: latest.current.selection.length }));
    }
    endGesture();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isTextInput(event.target)) {
      return;
    }
    const isOnCanvas =
      event.target === areaRef.current ||
      (event.target instanceof HTMLElement && event.target.dataset.canvasItem !== undefined);
    if (event.key === ' ' && isOnCanvas) {
      event.preventDefault();
      if (!event.repeat) {
        spaceRef.current = true;
        spacePannedRef.current = false;
        setSpaceHeld(true);
      }
      return;
    }
    if (event.key === 'Escape' && isOnCanvas && latest.current.selection.length > 0) {
      event.preventDefault();
      setSelection(EMPTY);
      return;
    }
    if (event.target !== areaRef.current || event.altKey) {
      return;
    }
    const current = viewportRef.current;
    const step = (event.shiftKey ? 160 : 40) / current.zoom;
    const pan: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = pan[event.key];
    if (delta && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      commitViewport({ ...current, x: current.x + delta[0], y: current.y + delta[1] }, true);
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      api.zoomIn();
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      api.zoomOut();
    } else if (event.key === '0' && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      api.resetZoom();
    } else if (event.key === 'a' && (event.metaKey || event.ctrlKey) && isMultiple) {
      event.preventDefault();
      setSelection([...items.current.keys()]);
    }
  };

  const onKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === ' ' && spaceRef.current) {
      spaceRef.current = false;
      setSpaceHeld(false);
    }
  };

  // The visible grid: lines every grid step, doubled while they'd be closer than 8 px.
  let gridStyle: CSSProperties | undefined;
  if (grid && grid.isVisible !== false && grid.size > 0) {
    let step = grid.size;
    for (let guard = 0; step * viewport.zoom < 8 && guard < 20; guard++) {
      step *= 2;
    }
    const screenStep = step * viewport.zoom;
    const offsetX = -(((viewport.x % step) + step) % step) * viewport.zoom;
    const offsetY = -(((viewport.y % step) + step) % step) * viewport.zoom;
    gridStyle = {
      backgroundImage:
        'linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)',
      backgroundSize: `${String(screenStep)}px ${String(screenStep)}px`,
      backgroundPosition: `${String(offsetX)}px ${String(offsetY)}px`,
    };
  }

  return (
    <CanvasInternalsContext.Provider value={internals}>
      <CanvasStateContext.Provider value={api}>
        {/* Key handling here serves the focusable canvas region and the items inside it (Space to pan, Escape). */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- see above. */}
        <div
          ref={ref}
          className={cn(
            'relative isolate h-(--canvas-height) min-w-0 overflow-hidden rounded-card border border-border bg-surface-1',
            className,
          )}
          // Dynamic geometry: the canvas's height is the app's value.
          // eslint-disable-next-line no-restricted-syntax -- see above.
          style={{ '--canvas-height': height } as CSSProperties}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
        >
          {rulers && <Rulers unit={rulers.unit} />}
          <div
            ref={areaRef}
            role="region"
            aria-roledescription={messages.canvasRoleDescription}
            aria-label={ariaLabelledBy ? undefined : (ariaLabel ?? messages.canvasLabel)}
            aria-labelledby={ariaLabelledBy}
            aria-describedby={[instructionsId, ariaDescribedBy].filter(Boolean).join(' ')}
            // The canvas takes focus for its keyboard zoom and pan (and Space-drag), like a scroll region.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            data-panning={isPanning || undefined}
            className={cn(
              'absolute inset-0 touch-none overflow-hidden outline-none select-none',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
              rulers && 'top-6 left-6',
              isSpaceHeld && 'cursor-grab',
              isPanning && 'cursor-grabbing',
            )}
            // Dynamic geometry: the grid's spacing and offset follow the viewport.
            // eslint-disable-next-line no-restricted-syntax -- see above.
            style={gridStyle}
            onPointerDownCapture={onPointerDownCapture}
            onPointerDown={onPointerDown}
            onPointerMoveCapture={onPointerMoveCapture}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onScroll={(event) => {
              // Focusing an item can scroll the clipped area; the viewport does the scrolling here instead.
              event.currentTarget.scrollTop = 0;
              event.currentTarget.scrollLeft = 0;
            }}
          >
            <div
              className="absolute top-0 left-0 origin-top-left will-change-transform"
              // Dynamic geometry: the whole world moves with one transform, so pan frames touch no item.
              // eslint-disable-next-line no-restricted-syntax -- see above.
              style={{
                transform: `scale(${String(viewport.zoom)}) translate(${String(-viewport.x)}px, ${String(-viewport.y)}px)`,
              }}
            >
              {background}
              <div
                role={hasItems ? 'listbox' : undefined}
                aria-label={hasItems ? messages.canvasItems : undefined}
                aria-multiselectable={hasItems && isMultiple ? true : undefined}
              >
                {children}
              </div>
            </div>
            {marquee && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-0 border border-accent-solid bg-accent-bg/40"
                // Dynamic geometry: the marquee follows the pointer.
                // eslint-disable-next-line no-restricted-syntax -- see above.
                style={{
                  transform: `translate(${String(marquee.x)}px, ${String(marquee.y)}px)`,
                  width: marquee.width,
                  height: marquee.height,
                }}
              />
            )}
          </div>
          {hasMinimap && <Minimap rects={itemRects} bounds={minimapBounds} />}
          {hasControls && <CanvasControls className="absolute bottom-2 left-2" />}
          {overlay}
          <span id={instructionsId} hidden>
            {messages.canvasInstructions}
          </span>
          <span id={itemInstructionsId} hidden>
            {messages.canvasItemInstructions}
          </span>
          <span className="sr-only" aria-live="polite">
            {announcement}
          </span>
        </div>
      </CanvasStateContext.Provider>
    </CanvasInternalsContext.Provider>
  );
}
