import { Info } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import type { KeyboardEvent } from 'react-aria-components';
import { LiveRegion, useAnnouncer } from '../../components/LiveRegion/LiveRegion';
import { cn } from '../../utils/cn';
import { warnInDevelopment } from '../../utils/dev';
import { TABBABLE_SELECTOR } from '../../utils/focus';
import { lazyComponent, preloadComponent } from '../../utils/lazyComponent';
import { clamp } from '../../utils/math';
import { mergeRefs } from '../../utils/mergeRefs';
import { useLatest } from '../../utils/useLatest';
import { isPastTapSlop } from '../../utils/pointer';
import { usePointerDrag, type PointerDrag } from '../../utils/usePointerDrag';
import {
  deriveLayout,
  layoutRows,
  normalizeLayout,
  placeItem,
  readingOrder,
  resizedRect,
  type GridRect,
  type LayoutEntry,
  type LayoutOptions,
  type ResizeAnchor,
  type SizeLimits,
} from '../layout/engine';
import {
  gridHeight,
  mergeGridSpec,
  resolveGridMetrics,
  type GridMetrics,
  type GridSpec,
} from '../layout/metrics';
import { useDashboardMessages } from '../messages';
import type { WidgetLayout } from '../types';
import {
  GridCell,
  resizeCursor,
  type DashboardGridItemEnv,
  type GridCellHandlers,
} from './GridCell';
import type { MoveResizeDialogProps } from './MoveResizeDialog';
import { useCellVisibility, useFillHeight, useGridViewport } from './useGridViewport';

/** An item on the grid. */
export interface DashboardGridItem {
  id: string;
  /** Names the item in its handle, announcements and the Move/Resize dialog. */
  label: string;
  /** What kind of item it is, read in its handle's name (EDIT-32), such as its widget type's name. */
  kind?: string;
  /** Its place and size; without `x` and `y` it's auto-placed (GRID-06). */
  layout: WidgetLayout;
  /** Can't be moved or resized, and stays put while others move around it (EDIT-15). */
  isLocked?: boolean;
  /** Defaults to true. */
  isResizable?: boolean;
  /** Size limits in grid units (GRID-07). Default to at least 2 × 2. */
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  /** Rows when stacked, or `content` for its natural height (RESP-14). Defaults to its height, held to 4–10. */
  stackedHeight?: number | 'content';
}

/** Ways to reach into the grid, through `handleRef`. */
export interface DashboardGridHandle {
  /** Focuses an item: its drag handle while editable, else the first control in it (EDIT-10, A11Y-05). */
  focusItem: (id: string) => void;
  /** Scrolls an item into view (EDIT-10). */
  scrollItemIntoView: (id: string) => void;
  /**
   * Shows where an item of `size` dragged in from outside the grid (a widget type from a picker, EDIT-11) would land
   * with the pointer at (`clientX`, `clientY`): the placeholder, and the other items making room. Returns its place,
   * or null when the pointer is outside the grid or it can't be arranged (stacked, or a narrower breakpoint).
   */
  previewDrop: (
    size: { w: number; h: number },
    clientX: number,
    clientY: number,
  ) => GridRect | null;
  /** Ends the preview `previewDrop` showed. */
  clearDrop: () => void;
}

export interface DashboardGridProps<T extends DashboardGridItem> {
  items: readonly T[];
  /**
   * Draws an item. Keep it stable (memoized): it runs again for an item only when its size or surroundings change,
   * never because another item moved.
   */
  renderItem: (item: T, env: DashboardGridItemEnv) => ReactNode;
  /** The canonical layout, controlled (ARCH-02). Items it doesn't place come from their own `layout`. */
  layout?: readonly LayoutEntry[];
  /** The starting layout, uncontrolled. Defaults to the items' own layouts. */
  defaultLayout?: readonly LayoutEntry[];
  /** Called with the new canonical layout after a move, resize or dialog change, normalized (MOD-07). */
  onLayoutChange?: (layout: LayoutEntry[]) => void;
  /** Grid settings over the defaults (§5.1). */
  grid?: Partial<GridSpec>;
  /** Shows drag and resize handles, and keyboard manipulation (EDIT-12 to EDIT-18). Defaults to false. */
  isEditable?: boolean;
  /**
   * The grid's height (CSS). Without it the grid fills from its top down to the bottom of the visual viewport
   * (GRID-10); give `100%` inside a container of definite height.
   */
  height?: string;
  /** Names the grid's region (A11Y-02). Give this or `aria-labelledby`. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Called when the breakpoint, columns, sizes or scale change. */
  onMetricsChange?: (metrics: GridMetrics) => void;
  /** Shown when there are no items. */
  emptyState?: ReactNode;
  handleRef?: Ref<DashboardGridHandle>;
  className?: string;
  ref?: Ref<HTMLElement>;
}

/** A drag in progress: a move from the handle, or a resize from an edge or corner. */
type Gesture =
  | {
      kind: 'move';
      id: string;
      start: LayoutEntry[];
      rect: GridRect;
      /** Where the pointer grabbed the cell, from its inline-start and top edges, in pixels. */
      grab: { x: number; y: number };
    }
  | {
      kind: 'resize';
      id: string;
      start: LayoutEntry[];
      rect: GridRect;
      anchor: ResizeAnchor;
      startScroll: number;
    };

/** Keyboard manipulation in progress (EDIT-32): the layout it began from and where the item is now. */
interface Manipulation {
  id: string;
  start: LayoutEntry[];
  rect: GridRect;
  layout: LayoutEntry[];
}

/**
 * The Move/Resize dialog's code (Dialog, NumberField) loads when a grid first becomes editable, not with every grid,
 * so view-only dashboards never carry it.
 */
const MoveResizeDialog = lazyComponent<MoveResizeDialogProps>(
  () => import('./MoveResizeDialog').then((module) => module.MoveResizeDialog),
  () => null,
);

/** Pixels from the viewport's edge where a drag starts scrolling it (EDIT-13), and the fastest scroll per frame. */
const AUTO_SCROLL_EDGE = 48;
const AUTO_SCROLL_SPEED = 16;

/** The id the preview gives an item dragged in from outside. */
const DROP_ID = '\u0000drop';

const sameRect = (a: GridRect | undefined, b: GridRect | undefined) =>
  a?.x === b?.x && a?.y === b?.y && a?.w === b?.w && a?.h === b?.h;

/** Whether two layouts place every item the same: one pass with a lookup, as layouts can be long. */
function isSameLayout(a: readonly LayoutEntry[], b: readonly LayoutEntry[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const byId = new Map(b.map((item) => [item.id, item]));
  return a.every((item) => sameRect(item, byId.get(item.id)));
}

/**
 * A grid of items laid out by the dashboard's layout engine: sized to its container (§5.3), derived for narrower
 * breakpoints (RESP-04), stacked on phones (RESP-14), and scaled up on large displays (RESP-07). In edit mode items
 * move by dragging their handle and resize from their edges, with a live preview of where everything lands, by
 * keyboard from the handle (Enter, then arrow keys), or with the Move/Resize dialog. Usable on its own with any
 * content (ARCH-02), with the layout controlled or not.
 */
export function DashboardGrid<T extends DashboardGridItem>({
  items,
  renderItem,
  layout: layoutProp,
  defaultLayout,
  onLayoutChange,
  grid,
  isEditable = false,
  height: heightProp,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  onMetricsChange,
  emptyState,
  handleRef,
  className,
  ref,
}: DashboardGridProps<T>) {
  const messages = useDashboardMessages();
  const { spec, issues } = useMemo(() => mergeGridSpec(grid), [grid]);
  useEffect(() => {
    for (const issue of issues) {
      warnInDevelopment('DashboardGrid', `grid.${issue.setting}: ${issue.message}`);
    }
  }, [issues]);

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const limits = useCallback(
    (id: string): SizeLimits | undefined => {
      const item = byId.get(id);
      return (
        item && {
          minW: item.minSize?.w,
          minH: item.minSize?.h,
          maxW: item.maxSize?.w,
          maxH: item.maxSize?.h,
        }
      );
    },
    [byId],
  );
  const options = useMemo(
    (): LayoutOptions => ({ columns: spec.columns, compaction: spec.compaction, limits }),
    [spec.columns, spec.compaction, limits],
  );

  // The canonical layout: the controlled or stored one, with every item in it and normalized.
  const [internal, setInternal] = useState<readonly LayoutEntry[] | null>(defaultLayout ?? null);
  const isControlled = layoutProp !== undefined;
  const stored = isControlled ? layoutProp : internal;
  const canonical = useMemo(() => {
    const entries = stored ? new Map(stored.map((entry) => [entry.id, entry])) : undefined;
    return normalizeLayout(
      items.map((item) => {
        const entry = entries?.get(item.id);
        const place = entry ? { x: entry.x, y: entry.y, w: entry.w, h: entry.h } : item.layout;
        return { id: item.id, ...place, isLocked: item.isLocked === true };
      }),
      options,
    );
  }, [items, stored, options]);

  const [root, setRoot] = useState<HTMLElement | null>(null);
  const rootRef = useMemo(() => mergeRefs<HTMLElement>(setRoot, ref), [ref]);
  const viewport = useGridViewport();
  const fillHeight = useFillHeight(root, heightProp === undefined);
  const visibility = useCellVisibility(viewport.element);
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  const isRtl = viewport.size?.isRtl ?? false;
  const baseMetrics = useMemo(
    () => (viewport.size ? resolveGridMetrics(spec, viewport.size, canonical) : undefined),
    [spec, viewport.size, canonical],
  );
  const columns = baseMetrics?.columns ?? spec.columns;
  const isStacked = baseMetrics !== undefined && baseMetrics.isStacked && spec.columns > 1;
  const isCanonical = columns === spec.columns;
  const canArrangeGrid = isEditable && isCanonical && !isStacked;

  // The layout shown: canonical, or derived for a narrower breakpoint (never stored, RESP-05).
  const derived = useMemo(
    () => (isCanonical ? canonical : deriveLayout(canonical, spec.columns, columns, limits)),
    [isCanonical, canonical, spec.columns, columns, limits],
  );
  const metrics = useMemo((): GridMetrics | undefined => {
    if (!baseMetrics || isCanonical) {
      return baseMetrics;
    }
    const contentHeight = gridHeight(baseMetrics, layoutRows(derived));
    return {
      ...baseMetrics,
      height: contentHeight,
      isScrolling:
        (viewport.size?.height ?? 0) > 0 && contentHeight > (viewport.size?.height ?? 0) + 0.5,
    };
  }, [baseMetrics, isCanonical, derived, viewport.size?.height]);

  const latestCallbacks = useLatest({ onLayoutChange, onMetricsChange });
  useEffect(() => {
    if (metrics) {
      latestCallbacks.current.onMetricsChange?.(metrics);
    }
  }, [metrics, latestCallbacks]);

  const commit = useCallback(
    (next: LayoutEntry[]) => {
      if (!isControlled) {
        setInternal(next);
      }
      latestCallbacks.current.onLayoutChange?.(next);
    },
    [isControlled, latestCallbacks],
  );

  useEffect(() => {
    if (isEditable) {
      preloadComponent(MoveResizeDialog);
    }
  }, [isEditable]);

  const announcer = useAnnouncer();
  const handleHintId = useId();
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [manipulation, setManipulation] = useState<Manipulation | null>(null);
  const [focusedHandle, setFocusedHandle] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<{ id: string; scrollTop: number } | null>(null);
  const [dialogId, setDialogId] = useState<string | null>(null);
  // An item dragged in from outside (EDIT-11): where it was asked to go, and the layout with it placed there.
  const [external, setExternal] = useState<{ rect: GridRect; layout: LayoutEntry[] } | null>(null);
  const elements = useRef(new Map<string, HTMLElement>());
  const pendingFocus = useRef<string | null>(null);
  /** The drag in progress, kept current between renders: pointer events can arrive before React renders. */
  const pointer = useRef<{
    id: string;
    kind: Gesture['kind'];
    pointerType: string;
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null>(null);
  const scrollAtStart = useRef(0);

  const label = (id: string) => byId.get(id)?.label ?? id;
  const announce = announcer.announce;
  const announcePlaced = (placed: LayoutEntry | undefined) => {
    if (placed) {
      announce(
        messages.widgetPlaced({
          title: label(placed.id),
          column: placed.x + 1,
          row: placed.y + 1,
          width: placed.w,
          height: placed.h,
        }),
      );
    }
  };

  /** Where a drag would land with the pointer at (`clientX`, `clientY`), snapped to the grid. */
  const resolveDrag = (drag: PointerDrag<Gesture>, clientX: number, clientY: number): GridRect => {
    const { state } = drag;
    const area = content?.getBoundingClientRect();
    if (!metrics || !area) {
      return state.rect;
    }
    const stepX = metrics.columnWidth + metrics.gap;
    const stepY = metrics.rowHeight + metrics.gap;
    if (state.kind === 'move') {
      const pointerX = isRtl ? area.right - clientX : clientX - area.left;
      const left = pointerX - state.grab.x - metrics.padding;
      const top = clientY - area.top - state.grab.y - metrics.padding;
      return {
        ...state.rect,
        x: clamp(Math.round(left / stepX), 0, metrics.columns - state.rect.w),
        y: Math.max(0, Math.round(top / stepY)),
      };
    }
    const scrolled = (viewport.element?.scrollTop ?? 0) - state.startScroll;
    const dx = Math.round(((clientX - drag.originX) * (isRtl ? -1 : 1)) / stepX);
    const dy = Math.round((clientY - drag.originY + scrolled) / stepY);
    const { anchor } = state;
    const w = state.rect.w + (anchor.includes('e') ? dx : anchor.includes('w') ? -dx : 0);
    const h = state.rect.h + (anchor.includes('s') ? dy : anchor.includes('n') ? -dy : 0);
    return resizedRect(state.rect, { w, h }, anchor, metrics.columns, limits(state.id));
  };

  const endGesture = () => {
    pointer.current = null;
    for (const element of elements.current.values()) {
      element.style.translate = '';
    }
    document.documentElement.style.cursor = '';
    setGesture(null);
  };

  const drag = usePointerDrag<Gesture, GridRect>({
    resolve: resolveDrag,
    onDrop: (dropped, rect) => {
      endGesture();
      const next = placeItem(dropped.state.start, dropped.state.id, rect, options);
      if (!isSameLayout(next, canonical)) {
        commit(next);
      }
      announcePlaced(next.find((item) => item.id === dropped.state.id));
    },
  });

  // The preview while dragging: the engine run from the layout the drag began with (GRID-14).
  const preview = drag.preview;
  const previewLayout = useMemo(
    () => (gesture && preview ? placeItem(gesture.start, gesture.id, preview, options) : null),
    [gesture, preview, options],
  );
  const externalLayout = external?.layout.filter((item) => item.id !== DROP_ID);
  const shownCanonical = previewLayout ?? externalLayout ?? manipulation?.layout ?? canonical;
  const shown = isCanonical ? shownCanonical : derived;

  const cancelGesture = () => {
    drag.cancel();
    endGesture();
    if (gesture) {
      announce(messages.widgetMoveCancelled({ title: label(gesture.id) }));
    }
  };

  const finishManipulation = (shouldCommit: boolean) => {
    if (!manipulation) {
      return;
    }
    setManipulation(null);
    if (!shouldCommit) {
      announce(messages.widgetMoveCancelled({ title: label(manipulation.id) }));
      return;
    }
    if (!isSameLayout(manipulation.layout, canonical)) {
      commit(manipulation.layout);
    }
    pendingFocus.current = manipulation.id;
    announcePlaced(manipulation.layout.find((item) => item.id === manipulation.id));
  };

  const startManipulation = (id: string) => {
    const item = canonical.find((entry) => entry.id === id);
    if (!item || !canArrangeGrid || gesture) {
      return;
    }
    setManipulation({ id, start: canonical, rect: item, layout: canonical });
    announce(messages.widgetManipulating({ title: label(id) }));
  };

  /**
   * One keyboard step: arrows move one unit (vertically, to the next spot that changes the layout, since compaction
   * can float an item straight back); with Shift they resize from the bottom-end corner. Collisions work as for drags.
   */
  const step = (key: string, isResize: boolean) => {
    if (!manipulation) {
      return;
    }
    const physical: Record<string, number | undefined> = { ArrowLeft: -1, ArrowRight: 1 };
    const dx = (physical[key] ?? 0) * (isRtl ? -1 : 1);
    const dy = key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0;
    const { id, start } = manipulation;
    const before = manipulation.layout.find((item) => item.id === id);
    if (!before) {
      return;
    }
    let next = manipulation.layout;
    let rect = manipulation.rect;
    if (isResize) {
      rect = resizedRect(
        rect,
        { w: rect.w + dx, h: rect.h + dy },
        'se',
        options.columns,
        limits(id),
      );
      next = placeItem(start, id, rect, options);
    } else {
      const tries = dy === 0 ? 1 : layoutRows(manipulation.layout) + before.h + 1;
      for (let count = 1; count <= tries; count++) {
        const candidate = { ...rect, x: rect.x + dx, y: rect.y + dy * count };
        const attempt = placeItem(start, id, candidate, options);
        const moved = attempt.find((item) => item.id === id);
        if (moved && (moved.x !== before.x || moved.y !== before.y)) {
          rect = { ...candidate, x: moved.x };
          next = attempt;
          break;
        }
      }
    }
    setManipulation({ ...manipulation, rect, layout: next });
    const placed = next.find((item) => item.id === id);
    if (placed) {
      announce(
        isResize
          ? messages.widgetResizedTo({ title: label(id), width: placed.w, height: placed.h })
          : messages.widgetMovedTo({ title: label(id), column: placed.x + 1, row: placed.y + 1 }),
      );
    }
  };

  /** Starts a pointer drag: a move from the handle, or a resize from an edge or corner. */
  const beginGesture = (next: Gesture, event: PointerEvent<HTMLElement>) => {
    if (!canArrangeGrid || manipulation) {
      return;
    }
    pointer.current = {
      id: next.id,
      kind: next.kind,
      pointerType: event.pointerType,
      x: event.clientX,
      y: event.clientY,
      originX: event.clientX,
      originY: event.clientY,
    };
    scrollAtStart.current = viewport.element?.scrollTop ?? 0;
    drag.begin(event, next);
    if (next.kind === 'resize') {
      // The cursor shows the direction for the whole drag, also outside the widget (EDIT-16).
      document.documentElement.style.cursor = resizeCursor(next.anchor, isRtl);
    }
    setGesture(next);
  };

  const followPointer = (event: PointerEvent<HTMLElement>) => {
    const at = pointer.current;
    if (!at) {
      return;
    }
    at.x = event.clientX;
    at.y = event.clientY;
    drag.move(event);
    const dx = event.clientX - at.originX;
    const dy = event.clientY - at.originY;
    const element = elements.current.get(at.id);
    if (at.kind === 'move' && element && isPastTapSlop(dx, dy, at.pointerType)) {
      // The dragged widget follows the pointer without a render; the placeholder snaps to the grid.
      const scrolled = (viewport.element?.scrollTop ?? 0) - scrollAtStart.current;
      element.style.translate = `${String(dx)}px ${String(dy + scrolled)}px`;
    }
  };

  /** The grid's content box: the cells' area, or where it would be on an empty grid. */
  const contentBox = () => {
    const area = content?.getBoundingClientRect();
    const frame = viewport.element?.getBoundingClientRect();
    if (area || !frame || !metrics) {
      return area;
    }
    const left = frame.left + Math.max(0, (frame.width - metrics.width) / 2);
    return {
      left,
      right: left + metrics.width,
      top: frame.top - (viewport.element?.scrollTop ?? 0),
    };
  };

  const previewDrop = (size: { w: number; h: number }, clientX: number, clientY: number) => {
    const frame = viewport.element?.getBoundingClientRect();
    const area = contentBox();
    const isInside =
      frame !== undefined &&
      clientX >= frame.left &&
      clientX <= frame.right &&
      clientY >= frame.top &&
      clientY <= frame.bottom;
    if (!canArrangeGrid || gesture || manipulation || !metrics || !area || !isInside) {
      if (external) {
        setExternal(null);
      }
      return null;
    }
    const stepX = metrics.columnWidth + metrics.gap;
    const stepY = metrics.rowHeight + metrics.gap;
    const w = clamp(Math.round(size.w), 1, metrics.columns);
    const h = Math.max(1, Math.round(size.h));
    // The item is held by its middle.
    const pointerX = isRtl ? area.right - clientX : clientX - area.left;
    const left = pointerX - metrics.padding - (w * stepX) / 2;
    const top = clientY - area.top - metrics.padding - (h * stepY) / 2;
    const rect = {
      x: clamp(Math.round(left / stepX), 0, metrics.columns - w),
      y: Math.max(0, Math.round(top / stepY)),
      w,
      h,
    };
    if (external && sameRect(external.rect, rect)) {
      return external.layout.find((item) => item.id === DROP_ID) ?? null;
    }
    const next = placeItem([...canonical, { id: DROP_ID, ...rect }], DROP_ID, rect, options);
    setExternal({ rect, layout: next });
    return next.find((item) => item.id === DROP_ID) ?? null;
  };

  const latest = useLatest({
    canonical,
    gesture,
    previewDrop,
    drag,
    expanded,
    viewportElement: viewport.element,
    isRtl,
    beginGesture,
    followPointer,
    endGesture,
    cancelGesture,
    finishManipulation,
    startManipulation,
    step,
    manipulationId: manipulation?.id,
  });

  // Escape cancels a drag (EDIT-12), and a drag near the viewport's edge scrolls it (EDIT-13).
  const gestureId = gesture?.id;
  useEffect(() => {
    if (gestureId === undefined) {
      return;
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        latest.current.cancelGesture();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    const element = latest.current.viewportElement;
    let frame = requestAnimationFrame(function scroll() {
      const at = pointer.current;
      if (at && element) {
        const bounds = element.getBoundingClientRect();
        const speed =
          at.y < bounds.top + AUTO_SCROLL_EDGE
            ? -AUTO_SCROLL_SPEED * (1 - Math.max(0, at.y - bounds.top) / AUTO_SCROLL_EDGE)
            : at.y > bounds.bottom - AUTO_SCROLL_EDGE
              ? AUTO_SCROLL_SPEED * (1 - Math.max(0, bounds.bottom - at.y) / AUTO_SCROLL_EDGE)
              : 0;
        if (speed !== 0) {
          const before = element.scrollTop;
          element.scrollTop += speed;
          if (element.scrollTop !== before) {
            latest.current.drag.move({ clientX: at.x, clientY: at.y } as PointerEvent);
          }
        }
      }
      frame = requestAnimationFrame(scroll);
    });
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      cancelAnimationFrame(frame);
    };
  }, [gestureId, latest]);

  const [handlers] = useState((): GridCellHandlers => ({
    observe: (id, element) => {
      elements.current.set(id, element);
      const stop = visibility.observe(id, element);
      return () => {
        if (elements.current.get(id) === element) {
          elements.current.delete(id);
        }
        stop();
      };
    },
    onHandlePointerDown: (id, event) => {
      const state = latest.current;
      const item = state.canonical.find((entry) => entry.id === id);
      const cell = elements.current.get(id)?.getBoundingClientRect();
      if (!item || !cell) {
        return;
      }
      const grab = {
        x: state.isRtl ? cell.right - event.clientX : event.clientX - cell.left,
        y: event.clientY - cell.top,
      };
      state.beginGesture({ kind: 'move', id, start: state.canonical, rect: item, grab }, event);
    },
    onResizePointerDown: (id, anchor, event) => {
      const state = latest.current;
      const item = state.canonical.find((entry) => entry.id === id);
      if (!item) {
        return;
      }
      event.stopPropagation();
      state.beginGesture(
        {
          kind: 'resize',
          id,
          start: state.canonical,
          rect: item,
          anchor,
          startScroll: state.viewportElement?.scrollTop ?? 0,
        },
        event,
      );
    },
    onPointerMove: (event) => {
      latest.current.followPointer(event);
    },
    onPointerUp: (event) => {
      const state = latest.current;
      state.drag.end(event);
      if (state.gesture) {
        state.endGesture();
      }
      pointer.current = null;
    },
    onPointerCancel: () => {
      latest.current.drag.cancel();
      latest.current.endGesture();
      pointer.current = null;
    },
    onHandlePress: (id, pointerType) => {
      // Pointer presses end drags; only the keyboard (and screen readers) start manipulation (EDIT-32).
      if (pointerType !== 'keyboard' && pointerType !== 'virtual') {
        return;
      }
      const state = latest.current;
      if (state.manipulationId === id) {
        state.finishManipulation(true);
      } else if (state.manipulationId === undefined) {
        state.startManipulation(id);
      }
    },
    onHandleKeyDown: (id, event: KeyboardEvent | ReactKeyboardEvent) => {
      const state = latest.current;
      if (state.manipulationId !== id) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        state.finishManipulation(false);
      } else if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        state.step(event.key, event.shiftKey);
      }
    },
    onHandleFocusChange: (id, isFocused) => {
      setFocusedHandle((current) => (isFocused ? id : current === id ? null : current));
      // Leaving the handle mid-manipulation puts the widget back.
      if (!isFocused && latest.current.manipulationId === id) {
        latest.current.finishManipulation(false);
      }
    },
    onExpandChange: (id, isExpanded) => {
      setExpanded(
        isExpanded ? { id, scrollTop: latest.current.viewportElement?.scrollTop ?? 0 } : null,
      );
    },
    onMoveResize: (id) => {
      setDialogId(id);
    },
    isInView: (id) => visibility.isInView(id),
  }));

  // After a committed keyboard move the cells reorder; focus goes back to the moved widget's handle (EDIT-33).
  useLayoutEffect(() => {
    const id = pendingFocus.current;
    if (id === null) {
      return;
    }
    pendingFocus.current = null;
    elements.current.get(id)?.querySelector<HTMLElement>('[data-grid-handle]')?.focus();
  });

  useImperativeHandle(
    handleRef,
    () => ({
      focusItem: (id) => {
        const element = elements.current.get(id);
        const target =
          element?.querySelector<HTMLElement>('[data-grid-handle]') ??
          element?.querySelector<HTMLElement>(TABBABLE_SELECTOR);
        target?.focus();
      },
      scrollItemIntoView: (id) => {
        elements.current.get(id)?.scrollIntoView({ block: 'nearest' });
      },
      previewDrop: (size, clientX, clientY) => latest.current.previewDrop(size, clientX, clientY),
      clearDrop: () => {
        setExternal(null);
      },
    }),
    [latest],
  );

  // Escape closes an expanded widget. Dialogs are portals, so their own Escape never reaches the grid.
  const isAnyExpanded = expanded !== null;
  useEffect(() => {
    if (!root || !isAnyExpanded) {
      return;
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        setExpanded(null);
      }
    };
    root.addEventListener('keydown', onKeyDown);
    return () => {
      root.removeEventListener('keydown', onKeyDown);
    };
  }, [root, isAnyExpanded]);

  // Cells in reading order of what's committed (GRID-08), so a preview never reorders the DOM under focus.
  const committed = isCanonical ? (manipulation?.start ?? gesture?.start ?? canonical) : derived;
  const order = useMemo(() => readingOrder(committed), [committed]);
  const shownById = useMemo(() => new Map(shown.map((item) => [item.id, item])), [shown]);
  const canonicalById = useMemo(
    () => new Map(canonical.map((item) => [item.id, item])),
    [canonical],
  );
  const shownCanonicalById = useMemo(
    () =>
      shownCanonical === shown ? shownById : new Map(shownCanonical.map((item) => [item.id, item])),
    [shownCanonical, shown, shownById],
  );
  const startById = useMemo(
    () => (gesture ? new Map(gesture.start.map((item) => [item.id, item])) : undefined),
    [gesture],
  );

  const viewportHeight = viewport.size?.height ?? 0;
  const style = {
    '--dashboard-scale': metrics?.scale ?? 1,
    height: heightProp ?? fillHeight,
  } as CSSProperties;

  let cells: ReactNode = null;
  let placeholder: ReactNode = null;
  if (metrics) {
    const stepX = metrics.columnWidth + metrics.gap;
    const stepY = metrics.rowHeight + metrics.gap;
    const box = (rect: GridRect) => ({
      left: metrics.padding + rect.x * stepX,
      top: metrics.padding + rect.y * stepY,
      width: rect.w * metrics.columnWidth + (rect.w - 1) * metrics.gap,
      height: rect.h * metrics.rowHeight + (rect.h - 1) * metrics.gap,
    });
    cells = order.map((id) => {
      const item = byId.get(id);
      const place = shownById.get(id);
      if (!item || !place) {
        return null;
      }
      const isDragged = gesture?.id === id;
      // The dragged or resized cell stays where it began; the placeholder shows where it would land.
      const rect = isDragged ? (startById?.get(id) ?? place) : place;
      const isExpandedCell = expanded?.id === id;
      let geometry = box(rect);
      let units = { w: rect.w, h: rect.h };
      let isContentHeight = false;
      if (isStacked) {
        const rows =
          typeof item.stackedHeight === 'number'
            ? Math.max(1, Math.round(item.stackedHeight))
            : clamp(canonicalById.get(id)?.h ?? 4, 4, 10);
        isContentHeight = item.stackedHeight === 'content';
        geometry = {
          left: 0,
          top: 0,
          width: metrics.width - 2 * metrics.padding,
          height: rows * metrics.rowHeight + (rows - 1) * metrics.gap,
        };
        units = { w: 1, h: rows };
      }
      if (isExpandedCell) {
        geometry = {
          left: metrics.padding,
          top: expanded.scrollTop + metrics.padding,
          width: metrics.width - 2 * metrics.padding,
          height: Math.max(0, viewportHeight - 2 * metrics.padding),
        };
      }
      const isManipulated = manipulation?.id === id;
      const sizeOf = shownCanonicalById.get(id) ?? rect;
      const badge =
        isManipulated || (focusedHandle === id && canArrangeGrid && !gesture)
          ? messages.widgetSize({ width: sizeOf.w, height: sizeOf.h })
          : undefined;
      return (
        <GridCell
          key={id}
          item={item}
          renderItem={renderItem}
          handlers={handlers}
          left={geometry.left}
          top={geometry.top}
          width={geometry.width}
          height={geometry.height}
          isStacked={isStacked}
          isContentHeight={isContentHeight}
          w={units.w}
          h={units.h}
          scale={metrics.scale}
          breakpoint={metrics.breakpoint}
          mode={isEditable ? 'edit' : 'view'}
          canArrange={canArrangeGrid && item.isLocked !== true && !isExpandedCell}
          isResizable={item.isResizable !== false}
          isNear={visibility.near.has(id)}
          isExpanded={isExpandedCell}
          isCovered={expanded !== null && !isExpandedCell}
          isDragging={isDragged && gesture.kind === 'move' && preview !== null}
          isManipulating={isManipulated}
          badge={badge}
          handleLabel={messages.widgetHandle({
            title: item.label,
            type: item.kind,
            column: place.x + 1,
            row: place.y + 1,
            width: place.w,
            height: place.h,
          })}
          handleHintId={handleHintId}
          isRtl={isRtl}
        />
      );
    });
    const target =
      gesture && preview
        ? previewLayout?.find((item) => item.id === gesture.id)
        : external?.layout.find((item) => item.id === DROP_ID);
    if (target) {
      const area = box(target);
      placeholder = (
        <div
          aria-hidden="true"
          // Dynamic geometry: where the dragged widget would land.
          // eslint-disable-next-line no-restricted-syntax -- see above.
          style={{
            insetInlineStart: area.left,
            top: area.top,
            width: area.width,
            height: area.height,
          }}
          className="pointer-events-none absolute z-[1] rounded-card border-2 border-dashed border-accent-solid bg-accent-bg/60 motion-safe:transition-[inset-inline-start,top,width,height] motion-safe:duration-(--duration-fast)"
        >
          <span className="absolute end-2 bottom-2 rounded-control bg-neutral-solid px-1.5 py-0.5 text-xs font-medium text-neutral-on-solid tabular-nums">
            {messages.widgetSize({ width: target.w, height: target.h })}
          </span>
        </div>
      );
    }
  }

  const dialogItem = dialogId === null ? undefined : byId.get(dialogId);
  const dialogRect = dialogId === null ? undefined : canonical.find((item) => item.id === dialogId);

  return (
    <section
      ref={rootRef}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      // The content scale, for widgets to size type and strokes with (RESP-08), and the height the grid fills
      // (GRID-10).
      // eslint-disable-next-line no-restricted-syntax -- dynamic: a CSS custom property, and geometry.
      style={style}
      className={cn('relative flex min-h-0 min-w-0 flex-col', gesture && 'select-none', className)}
    >
      {isEditable && !canArrangeGrid && items.length > 0 && (
        <p className="flex items-center gap-2 px-3 pt-2 text-sm text-fg-muted">
          <Info aria-hidden="true" className="size-4 shrink-0" />
          {messages.arrangeOnWiderScreen}
        </p>
      )}
      <div
        ref={viewport.ref}
        className={cn(
          'relative min-h-0 min-w-0 flex-1 overflow-x-hidden [scrollbar-gutter:stable]',
          expanded ? 'overflow-y-hidden' : 'overflow-y-auto',
        )}
      >
        {items.length === 0 && !external
          ? emptyState
          : metrics && (
              <div
                ref={setContent}
                // Dynamic geometry: the grid's width (capped, RESP-09) and its rows' height (GRID-11).
                // eslint-disable-next-line no-restricted-syntax -- see above.
                style={
                  isStacked
                    ? { width: metrics.width, padding: metrics.padding, gap: metrics.gap }
                    : { width: metrics.width, height: metrics.height }
                }
                className={cn('relative mx-auto max-w-full', isStacked && 'flex flex-col')}
              >
                {cells}
                {placeholder}
              </div>
            )}
      </div>
      <span id={handleHintId} hidden>
        {messages.widgetHandleHint}
      </span>
      <LiveRegion ref={announcer.ref} />
      {dialogItem && dialogRect && (
        <MoveResizeDialog
          title={dialogItem.label}
          rect={dialogRect}
          columns={spec.columns}
          limits={limits(dialogItem.id)}
          isResizable={dialogItem.isResizable !== false}
          isOpen
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setDialogId(null);
            }
          }}
          onApply={(rect) => {
            const next = placeItem(canonical, dialogItem.id, rect, options);
            if (!isSameLayout(next, canonical)) {
              commit(next);
            }
            const placed = next.find((item) => item.id === dialogItem.id);
            if (placed) {
              announcer.announce(
                messages.widgetPlaced({
                  title: dialogItem.label,
                  column: placed.x + 1,
                  row: placed.y + 1,
                  width: placed.w,
                  height: placed.h,
                }),
              );
            }
          }}
        />
      )}
    </section>
  );
}
