// OrgChart: an organisation drawn as a tidy tree on a Canvas (pan, zoom and fit), top to bottom or left to right.
// People are cards (Avatar, name, title and a badge, or the app's own content through `renderPerson`); managers have
// a button on the edge of their card that shows or hides the people under them, with how many there are. Assistants
// hang beside their manager's line, and on a top-down chart a team of more than three people without reports hangs
// in pairs down the line rather than in one wide row. Search finds people by name or title, opens the path to each
// one and centres them.
// The chart is a tree (`role="tree"`): arrow keys move toward reports (showing them first), toward the manager
// (hiding reports first) and along a level; Home and End go to the first and last person, * shows the reports of
// everyone at the focused person's level, Space selects and Enter runs `onAction` (as does a double click or tap).
// Large orgs stay fast: only people above `defaultExpandedDepth` start expanded, the layout runs once per change,
// and only the people near the view are drawn (as plain boxes when zoomed far out).

import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { useLocale } from 'react-aria-components';
import { Canvas } from '../../canvas/Canvas';
import type { CanvasApi } from '../../canvas/context';
import {
  fitRect,
  rectsIntersect,
  type CanvasPoint,
  type CanvasViewport,
} from '../../canvas/geometry';
import { IconButton } from '../../components/IconButton/IconButton';
import { LiveRegion, useAnnouncer } from '../../components/LiveRegion/LiveRegion';
import { SearchField } from '../../components/SearchField/SearchField';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { cn } from '../../utils/cn';
import { clamp, mod } from '../../utils/math';
import { mergeRefs } from '../../utils/mergeRefs';
import { useDebouncedCallback } from '../../utils/timers';
import { useControllableState } from '../../utils/useControllableState';
import { useLatest } from '../../utils/useLatest';
import type { HeadingLevel } from '../../utils/types';
import type { LayoutDirection } from '../layout';
import { layoutTree, type TreeLayout } from '../treeLayout';
import { useOrgChartMessages } from './messages';
import {
  OrgCanvasBridge,
  OrgLinks,
  OrgPeople,
  type CanvasHandle,
  type OrgScene,
} from './OrgLayers';
import {
  buildOrgTree,
  expandedToDepth,
  managersOf,
  orgMove,
  searchPeople,
  searchTexts,
  shownOrAbove,
  visiblePeople,
  type OrgStep,
} from './orgTree';
import type { OrgPerson, OrgPersonState } from './types';

export interface OrgChartProps<P extends OrgPerson = OrgPerson> {
  /** Everyone in the chart, each naming their manager. */
  people: readonly P[];
  /** `top-down` (the default): managers above their reports. `left-to-right`: managers before their reports. */
  layout?: 'top-down' | 'left-to-right';
  /**
   * Draws a person's card instead of the built-in one (Avatar, name, title and badge). Size it with `cardSize`, and
   * keep the function stable (`useCallback`) so cards redraw only when they change.
   */
  renderPerson?: (person: P, state: OrgPersonState) => ReactNode;
  /** Every card's size in pixels at 100%. Defaults to 240 × 80. */
  cardSize?: { width: number; height: number };
  /** The ids of the people whose reports are shown. Controlled; see `defaultExpandedIds`. */
  expandedIds?: Iterable<string>;
  /** Defaults to everyone above `defaultExpandedDepth`, and the selected person's managers. */
  defaultExpandedIds?: Iterable<string>;
  onExpandedChange?: (ids: Set<string>) => void;
  /** Without `expandedIds` or `defaultExpandedIds`, the people above this depth start expanded. Defaults to 2. */
  defaultExpandedDepth?: number;
  /** The selected person's id (controlled). */
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelectionChange?: (id: string | null) => void;
  /** Enter, a double click or a double tap on a person, such as opening their profile. */
  onAction?: (id: string) => void;
  /** Search text: people whose name or title contains it are found in turn. Controlled; see `defaultSearch`. */
  search?: string;
  defaultSearch?: string;
  onSearchChange?: (search: string) => void;
  /** Shows the search field. Defaults to true. */
  hasSearch?: boolean;
  /** The drawing's height (CSS). Defaults to `min(36rem, 75svh)`. */
  height?: string;
  /** A heading above the chart, which also names it. */
  title?: string;
  /** Defaults to 3. */
  headingLevel?: HeadingLevel;
  /** Names the chart when it has no `title`. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const CARD_WIDTH = 240;
const CARD_HEIGHT = 80;
/** Room around the chart, and below it for the zoom controls. */
const PADDING = 24;
const CONTROLS_HEIGHT = 40;
const MIN_ZOOM = 0.02;
const MAX_ZOOM = 2;
/** A chart that fits its canvas at this zoom or more starts fitted; a larger one starts at its top, readable. */
const FIT_ZOOM = 0.6;
const READABLE_ZOOM = 0.8;
/** A top-down team of more than this many people without reports hangs in pairs down its manager's line. */
const STACK_ABOVE = 3;
/** Screen pixels a press may move and still be a tap, and the time between the taps of a double tap. */
const TAP_SLOP = 3;
const DOUBLE_TAP_MS = 500;
const INITIAL_VIEWPORT: CanvasViewport = { x: 0, y: 0, zoom: 1 };
const NO_MATCHES: readonly number[] = [];

const layoutGaps = { nodeGap: 20, levelGap: 56, hangGap: 16, rowGap: 24 };

/** An SVG path through a polyline's flat coordinates. */
function polylinePath(line: readonly number[]): string {
  let path = '';
  for (let index = 0; index < line.length; index += 2) {
    path += `${index === 0 ? 'M' : 'L'}${String(line[index] ?? 0)} ${String(line[index + 1] ?? 0)}`;
  }
  return path;
}

function toSet(ids: Iterable<string>): Set<string> {
  return ids instanceof Set ? (ids as Set<string>) : new Set(ids);
}

/** The person a treeitem (and only a treeitem) stands for, or -1. */
function nodeOf(target: EventTarget | null): number {
  return target instanceof HTMLElement && target.dataset.orgNode !== undefined
    ? Number(target.dataset.orgNode)
    : -1;
}

/** An organisation as a tidy tree of people, with expand and collapse, search, pan and zoom. */
export function OrgChart<P extends OrgPerson>({
  people,
  layout = 'top-down',
  renderPerson,
  cardSize,
  expandedIds,
  defaultExpandedIds,
  onExpandedChange,
  defaultExpandedDepth = 2,
  selectedId,
  defaultSelectedId = null,
  onSelectionChange,
  onAction,
  search: searchProp,
  defaultSearch = '',
  onSearchChange,
  hasSearch = true,
  height = 'min(36rem, 75svh)',
  title,
  headingLevel = 3,
  'aria-label': ariaLabel,
  className,
  ref,
}: OrgChartProps<P>) {
  const messages = useOrgChartMessages();
  const { direction: textDirection } = useLocale();
  const isMirrored = textDirection === 'rtl';
  const direction: LayoutDirection = layout === 'left-to-right' ? 'right' : 'down';
  const titleId = useId();
  const summaryId = useId();
  const instructionsId = useId();
  const idBase = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const rootRefs = useMemo(() => mergeRefs(ref, rootRef), [ref]);
  const handleRef = useRef<CanvasHandle | null>(null);
  const Heading = `h${String(headingLevel)}` as 'h3';
  const { ref: liveRef, announce } = useAnnouncer();

  const tree = useMemo(() => buildOrgTree(people), [people]);
  const [initialExpanded] = useState(() => {
    if (defaultExpandedIds !== undefined) {
      return toSet(defaultExpandedIds);
    }
    const ids = expandedToDepth(tree, defaultExpandedDepth);
    const chosen = tree.index.get(selectedId ?? defaultSelectedId ?? '');
    for (const manager of chosen === undefined ? [] : managersOf(tree, chosen)) {
      ids.add(tree.people[manager]?.id ?? '');
    }
    return ids;
  });
  const controlledExpanded = useMemo(
    () => (expandedIds === undefined ? undefined : toSet(expandedIds)),
    [expandedIds],
  );
  const [expanded, setExpanded] = useControllableState(
    controlledExpanded,
    initialExpanded,
    onExpandedChange,
  );
  const [selected, setSelected] = useControllableState(
    selectedId,
    defaultSelectedId,
    onSelectionChange,
  );
  const [search, setSearch] = useControllableState(searchProp, defaultSearch, onSearchChange);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [match, setMatch] = useState<{ query: string; place: number } | null>(null);

  // One layout per change of who is shown, the direction or the card size.
  const view = useMemo(() => visiblePeople(tree, expanded), [tree, expanded]);
  const cardWidth = cardSize?.width ?? CARD_WIDTH;
  const cardHeight = cardSize?.height ?? CARD_HEIGHT;
  const scene = useMemo<OrgScene>(() => {
    const nodes = Array.from(view.order, (node) => {
      const manager = tree.manager[node] ?? -1;
      return {
        id: tree.people[node]?.id ?? '',
        parentId: manager >= 0 ? tree.people[manager]?.id : null,
        isAssistant: tree.isAssistant[node] === 1,
      };
    });
    const treeLayout = layoutTree(nodes, {
      direction,
      nodeWidth: cardWidth,
      nodeHeight: cardHeight,
      ...layoutGaps,
      stackAbove: direction === 'down' ? STACK_ABOVE : Infinity,
      isMirrored,
    });
    return {
      tree,
      view,
      layout: treeLayout,
      linkPaths: treeLayout.links.map((link) => link.lines.map(polylinePath).join('')),
      expanded,
      direction,
      isMirrored,
    };
  }, [tree, view, expanded, direction, cardWidth, cardHeight, isMirrored]);
  const treeLayout = scene.layout;
  const bounds = treeLayout.bounds;
  const contentBounds = useMemo(
    () => ({
      x: -PADDING,
      y: -PADDING,
      width: bounds.width + PADDING * 2,
      height: bounds.height + PADDING * 2 + CONTROLS_HEIGHT,
    }),
    [bounds],
  );

  const idOf = (node: number) => tree.people[node]?.id ?? '';
  const rectOf = (node: number) => treeLayout.nodes.get(idOf(node));
  const indexOf = (id: string | null) => (id === null ? -1 : (tree.index.get(id) ?? -1));
  const selectedNode = indexOf(selected);
  // The tree's one tab stop: the focused person, else the selected one, else the first (or the nearest shown manager).
  const tabStopNode = (() => {
    const wanted = indexOf(focusedId) >= 0 ? indexOf(focusedId) : selectedNode;
    const shown = wanted >= 0 ? shownOrAbove(tree, view, wanted) : -1;
    return shown >= 0 ? shown : (view.order[0] ?? -1);
  })();

  // Search, in reading order. Texts are built only while searching.
  const isSearching = search.trim() !== '';
  const texts = useMemo(() => (isSearching ? searchTexts(people) : null), [people, isSearching]);
  const matches = useMemo(
    () => (texts ? searchPeople(tree, texts, search) : NO_MATCHES),
    [tree, texts, search],
  );
  const matchNode = match?.query === search ? (matches[match.place] ?? -1) : -1;

  // Work that waits for the next layout: keep a toggled person in place, centre a search result, move focus.
  const pending = useRef<{
    anchor: { id: string; point: CanvasPoint; layout: TreeLayout } | null;
    centre: number;
    focus: number;
  }>({ anchor: null, centre: -1, focus: -1 });
  const isPointerFocus = useRef(false);

  const itemElement = (node: number) =>
    rootRef.current?.querySelector<HTMLElement>(`[data-org-node="${String(node)}"]`) ?? null;

  /** Centres a person at a readable zoom (or the current one, if closer). */
  const centreOn = (node: number) => {
    const handle = handleRef.current;
    const rect = rectOf(node);
    if (!handle || !rect || handle.api.size.width === 0) {
      return;
    }
    const zoom = clamp(
      Math.max(handle.internals.getViewport().zoom, READABLE_ZOOM),
      MIN_ZOOM,
      MAX_ZOOM,
    );
    handle.api.setViewport(
      fitRect(rect, handle.api.size, { padding: 0, minZoom: zoom, maxZoom: zoom }),
    );
  };

  useLayoutEffect(() => {
    const handle = handleRef.current;
    const state = pending.current;
    if (handle && state.anchor && state.anchor.layout !== treeLayout) {
      const rect = treeLayout.nodes.get(state.anchor.id);
      if (rect) {
        const current = handle.internals.getViewport();
        handle.api.setViewport({
          ...current,
          x: current.x + rect.x - state.anchor.point.x,
          y: current.y + rect.y - state.anchor.point.y,
        });
      }
      state.anchor = null;
    }
    if (state.centre >= 0) {
      const node = state.centre;
      state.centre = -1;
      centreOn(node);
    }
    if (state.focus >= 0) {
      const element = itemElement(state.focus);
      if (element) {
        state.focus = -1;
        element.focus({ preventScroll: true });
      }
    }
  });

  const setExpandedFrom = (next: Set<string>, node: number) => {
    const rect = rectOf(node);
    pending.current.anchor = rect
      ? { id: idOf(node), point: { x: rect.x, y: rect.y }, layout: treeLayout }
      : null;
    setExpanded(next);
  };
  const toggle = (node: number) => {
    const id = idOf(node);
    const next = new Set(expanded);
    if (next.delete(id)) {
      // Focus inside the hidden reports moves up to this person.
      const focused = indexOf(focusedId);
      if (
        focused >= 0 &&
        managersOf(tree, focused).includes(node) &&
        rootRef.current?.contains(document.activeElement)
      ) {
        setFocusedId(id);
        pending.current.focus = node;
      }
    } else {
      next.add(id);
    }
    setExpandedFrom(next, node);
  };
  // Stable for the memoised cards; it calls the latest `toggle`.
  const latestToggle = useLatest(toggle);
  const onToggle = useCallback(
    (node: number) => {
      latestToggle.current(node);
    },
    [latestToggle],
  );

  const select = (node: number) => {
    const id = idOf(node);
    if (id !== selected) {
      setSelected(id);
    }
  };
  /** Moves focus to a person, drawing them first if they aren't yet. */
  const focusNode = (node: number, isPointer = false) => {
    setFocusedId(idOf(node));
    const element = itemElement(node);
    if (element) {
      isPointerFocus.current = isPointer;
      element.focus({ preventScroll: true });
      isPointerFocus.current = false;
    } else {
      pending.current.focus = node;
    }
  };

  // Keyboard focus brings a person into view; a press already has them under the pointer.
  const onTreeFocus = (event: FocusEvent<HTMLDivElement>) => {
    const node = nodeOf(event.target);
    const rect = node >= 0 ? rectOf(node) : undefined;
    if (!rect) {
      return;
    }
    if (focusedId !== idOf(node)) {
      setFocusedId(idOf(node));
    }
    if (!isPointerFocus.current) {
      handleRef.current?.internals.reveal(rect);
    }
  };

  const stepOf = (key: string): OrgStep | null => {
    const start = isMirrored ? 'ArrowRight' : 'ArrowLeft';
    const end = isMirrored ? 'ArrowLeft' : 'ArrowRight';
    const keys: Record<string, OrgStep> =
      direction === 'down'
        ? { ArrowDown: 'forward', ArrowUp: 'backward', [end]: 'next', [start]: 'previous' }
        : { [end]: 'forward', [start]: 'backward', ArrowDown: 'next', ArrowUp: 'previous' };
    if (key === 'Home') {
      return 'first';
    }
    if (key === 'End') {
      return 'last';
    }
    return keys[key] ?? null;
  };

  const onTreeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const node = nodeOf(event.target);
    if (node < 0 || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (onAction) {
        onAction(idOf(node));
      } else {
        select(node);
      }
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      select(node);
      return;
    }
    if (event.key === '*') {
      // Shows the reports of everyone beside this person.
      event.preventDefault();
      const manager = tree.manager[node] ?? -1;
      const siblings = manager >= 0 ? (tree.reports[manager] ?? []) : tree.roots;
      const next = new Set(expanded);
      for (const sibling of siblings) {
        if ((tree.reports[sibling]?.length ?? 0) > 0) {
          next.add(idOf(sibling));
        }
      }
      if (next.size !== expanded.size) {
        setExpandedFrom(next, node);
      }
      return;
    }
    const step = stepOf(event.key);
    if (!step || event.shiftKey) {
      return;
    }
    event.preventDefault();
    const move = orgMove(tree, view, expanded, node, step);
    if (move?.kind === 'focus') {
      focusNode(move.node);
    } else if (move) {
      toggle(move.node);
    }
  };

  // Presses: a drag pans the canvas (it handles the press too), so a tap is a press that ends where it started.
  const lastTap = useRef<{ node: number; time: number } | null>(null);
  const endPress = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      endPress.current?.();
    },
    [],
  );
  const tapAt = (clientX: number, clientY: number) => {
    const handle = handleRef.current;
    const hit = document.elementFromPoint(clientX, clientY);
    if (!handle || !hit || !rootRef.current?.contains(hit)) {
      return;
    }
    const button = hit.closest<HTMLElement>('[data-org-toggle]');
    if (button) {
      toggle(Number(button.dataset.orgToggle));
      return;
    }
    const item = hit.closest<HTMLElement>('[data-org-node]');
    let node = item ? nodeOf(item) : -1;
    if (node < 0) {
      // Zoomed far out people are boxes in the drawing: find the one under the pointer and zoom in on them.
      const point = handle.api.clientToWorld({ x: clientX, y: clientY });
      const spot = { ...point, width: 0, height: 0 };
      node =
        view.order.find((candidate) => {
          const rect = rectOf(candidate);
          return rect !== undefined && rectsIntersect(spot, rect);
        }) ?? -1;
      if (node < 0) {
        return;
      }
      centreOn(node);
    }
    select(node);
    focusNode(node, true);
    const now = performance.now();
    const last = lastTap.current;
    if (last?.node === node && now - last.time < DOUBLE_TAP_MS) {
      lastTap.current = null;
      onAction?.(idOf(node));
    } else {
      lastTap.current = { node, time: now };
    }
  };
  const latestTap = useLatest(tapAt);
  const onPress = useCallback(
    (event: PointerEvent) => {
      if (
        event.button !== 0 ||
        !event.isPrimary ||
        handleRef.current?.internals.isPanPress(event) === true
      ) {
        return;
      }
      endPress.current?.();
      const { pointerId, clientX: startX, clientY: startY } = event;
      const onEnd = (end: globalThis.PointerEvent) => {
        if (end.pointerId !== pointerId) {
          return;
        }
        endPress.current?.();
        if (
          end.type === 'pointerup' &&
          Math.hypot(end.clientX - startX, end.clientY - startY) <= TAP_SLOP
        ) {
          latestTap.current(end.clientX, end.clientY);
        }
      };
      window.addEventListener('pointerup', onEnd);
      window.addEventListener('pointercancel', onEnd);
      endPress.current = () => {
        window.removeEventListener('pointerup', onEnd);
        window.removeEventListener('pointercancel', onEnd);
        endPress.current = null;
      };
    },
    [latestTap],
  );

  // The first view: the whole chart if it's readable that way, otherwise its top at a readable zoom.
  const onStart = (api: CanvasApi) => {
    const fit = fitRect(contentBounds, api.size, { minZoom: MIN_ZOOM, maxZoom: 1 });
    const first = view.order[0];
    const rect = first === undefined ? undefined : rectOf(first);
    if (fit.zoom >= FIT_ZOOM || !rect) {
      api.setViewport(fit);
      return;
    }
    const zoom = READABLE_ZOOM;
    const visibleWidth = api.size.width / zoom;
    const visibleHeight = api.size.height / zoom;
    api.setViewport(
      direction === 'down'
        ? { zoom, x: rect.x + rect.width / 2 - visibleWidth / 2, y: -PADDING }
        : {
            zoom,
            x: isMirrored ? bounds.width + PADDING - visibleWidth : -PADDING,
            y: rect.y + rect.height / 2 - visibleHeight / 2,
          },
    );
  };

  // Search: typing pauses, then the first result is shown; Enter and the arrows go through the rest.
  const goToMatch = (place: number) => {
    if (matches.length === 0) {
      announce(messages.orgChartMatchCount({ count: 0 }));
      return;
    }
    const next = mod(place, matches.length);
    const node = matches[next] ?? 0;
    setMatch({ query: search, place: next });
    const closed = managersOf(tree, node).filter((manager) => !expanded.has(idOf(manager)));
    if (closed.length > 0) {
      const opened = new Set(expanded);
      for (const manager of closed) {
        opened.add(idOf(manager));
      }
      setExpanded(opened);
    }
    pending.current.centre = node;
    announce(
      match?.query === search
        ? messages.orgChartMatchPosition({ current: next + 1, total: matches.length })
        : `${messages.orgChartMatchCount({ count: matches.length })} ${messages.orgChartMatchPosition({ current: next + 1, total: matches.length })}`,
    );
  };
  const { run: showFirstSoon, cancel: cancelShowFirst } = useDebouncedCallback(() => {
    if (search.trim() !== '' && match?.query !== search) {
      goToMatch(0);
    }
  }, 400);
  useEffect(() => {
    if (search.trim() === '') {
      cancelShowFirst();
    } else {
      showFirstSoon();
    }
  }, [search, showFirstSoon, cancelShowFirst]);
  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || !isSearching) {
      return;
    }
    event.preventDefault();
    cancelShowFirst();
    goToMatch(match?.query === search ? match.place + (event.shiftKey ? -1 : 1) : 0);
  };
  const position = !isSearching
    ? ''
    : matches.length === 0
      ? messages.orgChartMatchPosition({ current: 0, total: 0 })
      : match?.query === search
        ? messages.orgChartMatchPosition({ current: match.place + 1, total: matches.length })
        : messages.orgChartMatchCount({ count: matches.length });

  const label = title === undefined ? (ariaLabel ?? messages.orgChartLabel) : undefined;

  return (
    <div ref={rootRefs} className={cn('flex min-w-0 flex-col gap-2', className)}>
      {(title !== undefined || hasSearch) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title !== undefined && (
            <Heading id={titleId} className="text-base font-semibold text-fg">
              {title}
            </Heading>
          )}
          {hasSearch && (
            // The end padding keeps the last button's touch area inside the chart.
            <div className="ms-auto flex min-w-0 grow basis-64 items-center gap-1 pe-1.5 sm:max-w-sm">
              <SearchField
                aria-label={messages.orgChartSearch}
                placeholder={messages.orgChartSearchPlaceholder}
                size="sm"
                value={search}
                onChange={setSearch}
                onKeyDown={onSearchKeyDown}
                className="min-w-0 flex-1"
              />
              {position !== '' && (
                <span className="shrink-0 px-1 text-xs whitespace-nowrap text-fg-muted tabular-nums">
                  {position}
                </span>
              )}
              <Tooltip content={messages.orgChartPreviousMatch}>
                <IconButton
                  icon={ChevronUp}
                  size="sm"
                  aria-label={messages.orgChartPreviousMatch}
                  isDisabled={matches.length === 0}
                  onPress={() => {
                    cancelShowFirst();
                    goToMatch(match?.query === search ? match.place - 1 : matches.length - 1);
                  }}
                />
              </Tooltip>
              <Tooltip content={messages.orgChartNextMatch}>
                <IconButton
                  icon={ChevronDown}
                  size="sm"
                  aria-label={messages.orgChartNextMatch}
                  isDisabled={matches.length === 0}
                  onPress={() => {
                    cancelShowFirst();
                    goToMatch(match?.query === search ? match.place + 1 : 0);
                  }}
                />
              </Tooltip>
            </div>
          )}
        </div>
      )}
      <span id={summaryId} hidden>
        {messages.orgChartSummary({ count: tree.preorder.length })}
      </span>
      <span id={instructionsId} hidden>
        {direction === 'down'
          ? messages.orgChartInstructionsTopDown
          : messages.orgChartInstructionsAcross}
      </span>
      <LiveRegion ref={liveRef} />
      <Canvas
        key={direction}
        aria-label={label}
        aria-labelledby={title === undefined ? undefined : titleId}
        aria-describedby={summaryId}
        height={height}
        contentBounds={contentBounds}
        defaultViewport={INITIAL_VIEWPORT}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        selectionMode="single"
        hasMarquee={false}
        underlay={<OrgLinks scene={scene} onPress={onPress} />}
        overlay={<OrgCanvasBridge handleRef={handleRef} onStart={onStart} />}
      >
        <OrgPeople
          scene={scene}
          selectedNode={selectedNode}
          tabStopNode={tabStopNode}
          matchNode={matchNode}
          idBase={idBase}
          aria-label={label}
          aria-labelledby={title === undefined ? undefined : titleId}
          aria-describedby={instructionsId}
          renderPerson={renderPerson as OrgPeopleRender}
          onToggle={onToggle}
          onKeyDown={onTreeKeyDown}
          onFocus={onTreeFocus}
          onPress={onPress}
        />
      </Canvas>
    </div>
  );
}

/** `renderPerson` as the layers see it: they pass back the people the app gave. */
type OrgPeopleRender = ((person: OrgPerson, state: OrgPersonState) => ReactNode) | undefined;
