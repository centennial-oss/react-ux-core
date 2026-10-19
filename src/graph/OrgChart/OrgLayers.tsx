// What OrgChart draws inside its Canvas: the lines between people in one SVG (with, zoomed far out, every person as a
// plain box in the same SVG), the people as a tree of cards over it, and a bridge that hands the canvas's controls to
// the chart. Both layers draw only what's near the view: the view is rounded out to tiles a few hundred screen pixels
// wide, so they redraw only when panning or zooming crosses a tile, not on every frame. Cards are DOM only from
// DETAIL_ZOOM up; below it they'd be too small to read, and thousands of boxes cost one SVG path.
import {
  useLayoutEffect,
  useMemo,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  useCanvas,
  useCanvasInternals,
  type CanvasApi,
  type CanvasInternals,
} from '../../canvas/context';
import { rectsIntersect, type CanvasRect } from '../../canvas/geometry';
import { useLatest } from '../../utils/useLatest';
import type { LayoutDirection } from '../layout';
import type { TreeLayout } from '../treeLayout';
import type { OrgTree, OrgView } from './orgTree';
import { PersonItem, PersonToggle } from './PersonItem';
import type { OrgPerson, OrgPersonState } from './types';

/** Below this zoom people are boxes in the drawing rather than cards. */
export const DETAIL_ZOOM = 0.4;
/** The view is rounded out to tiles this many screen pixels wide, with one tile to spare on each side. */
const TILE = 384;

/** Everything one layout produced, shared by both layers. */
export interface OrgScene {
  tree: OrgTree;
  view: OrgView;
  layout: TreeLayout;
  /** Each link's SVG path, in `layout.links` order. */
  linkPaths: readonly string[];
  expanded: ReadonlySet<string>;
  direction: LayoutDirection;
  isMirrored: boolean;
}

interface WorldWindow {
  /** The world rectangle near the view. */
  rect: CanvasRect;
  /** The zoom rounded down to a power of two. */
  scale: number;
  isDetailed: boolean;
}

/** The part of the world near the view, which changes only when the view crosses a tile. */
function useWorldWindow(): WorldWindow {
  const { viewport, size } = useCanvas();
  const scale = 2 ** Math.floor(Math.log2(viewport.zoom));
  const tile = TILE / scale;
  const left = Math.floor(viewport.x / tile) - 1;
  const top = Math.floor(viewport.y / tile) - 1;
  const right = Math.ceil((viewport.x + size.width / viewport.zoom) / tile) + 1;
  const bottom = Math.ceil((viewport.y + size.height / viewport.zoom) / tile) + 1;
  const isDetailed = viewport.zoom >= DETAIL_ZOOM;
  return useMemo(
    () => ({
      rect: {
        x: left * tile,
        y: top * tile,
        width: (right - left) * tile,
        height: (bottom - top) * tile,
      },
      scale,
      isDetailed,
    }),
    [left, top, right, bottom, tile, scale, isDetailed],
  );
}

/** The lines between people (and, zoomed far out, the people as boxes), under the cards. */
export function OrgLinks({
  scene,
  onPress,
}: {
  scene: OrgScene;
  onPress: (event: PointerEvent) => void;
}) {
  const world = useWorldWindow();
  const { layout, linkPaths, view, tree } = scene;
  const lines = useMemo(() => {
    let path = '';
    layout.links.forEach((link, index) => {
      if (rectsIntersect(link.bounds, world.rect)) {
        path += linkPaths[index] ?? '';
      }
    });
    return path;
  }, [layout, linkPaths, world]);
  const boxes = useMemo(() => {
    if (world.isDetailed) {
      return '';
    }
    let path = '';
    for (const node of view.order) {
      const rect = layout.nodes.get(tree.people[node]?.id ?? '');
      if (rect && rectsIntersect(rect, world.rect)) {
        path += `M${String(rect.x)} ${String(rect.y)}h${String(rect.width)}v${String(rect.height)}h${String(-rect.width)}z`;
      }
    }
    return path;
  }, [layout, view, tree, world]);
  // 1.5 screen pixels at 100% and above; about 1 when zoomed out.
  const stroke = world.scale >= 1 ? 1.5 : 1 / world.scale;
  return (
    // A press on a box, zoomed far out, picks that person (the chart works out who from where it lands).
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 overflow-visible"
      width={Math.max(1, layout.bounds.width)}
      height={Math.max(1, layout.bounds.height)}
      onPointerDown={onPress}
    >
      <path d={lines} fill="none" strokeWidth={stroke} className="stroke-border-strong" />
      {boxes && (
        <path
          d={boxes}
          strokeWidth={stroke}
          className="pointer-events-auto cursor-pointer fill-surface-2 stroke-border-strong"
        />
      )}
    </svg>
  );
}

export interface OrgPeopleProps {
  scene: OrgScene;
  /** People drawn wherever the view is: the tab stop, the selected person and the search result. */
  selectedNode: number;
  tabStopNode: number;
  matchNode: number;
  idBase: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  renderPerson?: (person: OrgPerson, state: OrgPersonState) => ReactNode;
  onToggle: (node: number) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onFocus: (event: FocusEvent<HTMLDivElement>) => void;
  onPress: (event: PointerEvent) => void;
}

/** The people near the view as a tree of cards, and the show-or-hide buttons on managers' cards. */
export function OrgPeople({
  scene,
  selectedNode,
  tabStopNode,
  matchNode,
  idBase,
  renderPerson,
  onToggle,
  onKeyDown,
  onFocus,
  onPress,
  ...aria
}: OrgPeopleProps) {
  const world = useWorldWindow();
  const [items, toggles] = useMemo(() => {
    const { tree, view, layout, expanded, direction, isMirrored } = scene;
    const shown: number[] = [];
    if (world.isDetailed) {
      for (const node of view.order) {
        const rect = layout.nodes.get(tree.people[node]?.id ?? '');
        if (rect && rectsIntersect(rect, world.rect)) {
          shown.push(node);
        }
      }
    }
    const pinned = [tabStopNode, selectedNode, matchNode].filter(
      (node) => node >= 0 && (view.placeOf[node] ?? -1) >= 0 && !shown.includes(node),
    );
    if (pinned.length > 0) {
      // Reading order, so a screen reader's browse mode reads them in order.
      shown.push(...new Set(pinned));
      shown.sort((a, b) => (view.placeOf[a] ?? 0) - (view.placeOf[b] ?? 0));
    }
    const cards: ReactNode[] = [];
    const buttons: ReactNode[] = [];
    for (const node of shown) {
      const person = tree.people[node];
      const rect = layout.nodes.get(person?.id ?? '');
      if (!person || !rect) {
        continue;
      }
      const manager = tree.manager[node] ?? -1;
      const reportCount = tree.reports[node]?.length ?? 0;
      const totalReportCount = tree.total[node] ?? 0;
      const isExpanded = reportCount > 0 && expanded.has(person.id);
      cards.push(
        <PersonItem
          key={person.id}
          person={person}
          node={node}
          rect={rect}
          depth={tree.depth[node] ?? 0}
          position={tree.position[node] ?? 0}
          setSize={manager >= 0 ? (tree.reports[manager]?.length ?? 1) : tree.roots.length}
          reportCount={reportCount}
          totalReportCount={totalReportCount}
          isExpanded={isExpanded}
          isSelected={node === selectedNode}
          isTabStop={node === tabStopNode}
          isMatch={node === matchNode}
          isHiddenUntilFocused={!world.isDetailed && node !== selectedNode && node !== matchNode}
          managerName={manager >= 0 ? tree.people[manager]?.name : undefined}
          idBase={idBase}
          renderPerson={renderPerson}
        />,
      );
      if (reportCount > 0 && world.isDetailed) {
        buttons.push(
          <PersonToggle
            key={person.id}
            person={person}
            node={node}
            rect={rect}
            totalReportCount={totalReportCount}
            isExpanded={isExpanded}
            direction={direction}
            isMirrored={isMirrored}
            onToggle={onToggle}
          />,
        );
      }
    }
    return [cards, buttons];
  }, [scene, world, selectedNode, tabStopNode, matchNode, idBase, renderPerson, onToggle]);
  if (items.length === 0) {
    return null;
  }
  return (
    <>
      {/* Keys and presses on the cards are handled here, once, rather than on every card. Focus is on the treeitems
          (one tab stop that moves), as in the ARIA tree pattern, so the tree itself isn't focusable. */}
      {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- see above. */}
      <div role="tree" {...aria} onKeyDown={onKeyDown} onFocus={onFocus} onPointerDown={onPress}>
        {items}
      </div>
      {/* Pointers press the buttons through the chart too (a drag on one pans). */}
      <div onPointerDown={onPress}>{toggles}</div>
    </>
  );
}

/** The canvas's API and internals, for the chart outside it. */
export interface CanvasHandle {
  api: CanvasApi;
  internals: CanvasInternals;
}

/** Lives in the canvas's overlay: shares the canvas with the chart and sets the first view once it has a size. */
export function OrgCanvasBridge({
  handleRef,
  onStart,
}: {
  handleRef: RefObject<CanvasHandle | null>;
  onStart: (api: CanvasApi) => void;
}) {
  const api = useCanvas();
  const internals = useCanvasInternals();
  const latestStart = useLatest(onStart);
  const hasStarted = useRef(false);
  useLayoutEffect(() => {
    handleRef.current = { api, internals };
  });
  const { width, height } = api.size;
  useLayoutEffect(() => {
    const handle = handleRef.current;
    if (!hasStarted.current && handle && width > 0 && height > 0) {
      hasStarted.current = true;
      latestStart.current(handle.api);
    }
  }, [width, height, handleRef, latestStart]);
  return null;
}
