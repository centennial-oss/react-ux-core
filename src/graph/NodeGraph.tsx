// NodeGraph: pipelines, topologies and diagrams drawn on a Canvas (pan, zoom, fit, and a minimap on large graphs).
// Nodes are cards with an icon, a status (the tone colours the border; the label says it) and key metrics; edges are
// curves coloured and dashed by status, optionally animated (not with reduced motion); groups are labelled
// containers. `layered` lays out left to right with the built-in layered layout (top to bottom when that reads
// better in a narrow container), `top-down` always top to bottom, and `manual` uses each node's position. Nodes are
// options in reading order: Tab and Shift+Tab step through them, arrow keys follow the edges, Space selects, Enter
// runs `onNodeAction`.
// "View as list" shows the nodes and connections as tables. With `isEditable`, nodes can be dragged (or nudged with
// the arrow keys), connected by dragging from a node's port (or with C, then Enter on the target), and deleted, and
// every change is reported through `onChange`.

import { List, Workflow } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from 'react';
import { Canvas } from '../canvas/Canvas';
import { CanvasItem } from '../canvas/CanvasItem';
import { useCanvas, type CanvasApi } from '../canvas/context';
import { capturePointer, unionRects, type CanvasPoint, type CanvasRect } from '../canvas/geometry';
import { Button } from '../components/Button/Button';
import { LiveRegion } from '../components/LiveRegion/LiveRegion';
import { StatusDot } from '../components/StatusDot/StatusDot';
import { cn } from '../utils/cn';
import { useListFormat } from '../utils/intl';
import { clamp } from '../utils/math';
import { useControllableState } from '../utils/useControllableState';
import { useElementWidth } from '../utils/useElementWidth';
import { mergeRefs } from '../utils/mergeRefs';
import { useIsReducedMotion } from '../utils/useMediaQuery';
import type { HeadingLevel, Tone } from '../utils/types';
import { GraphBackground, type RoutedEdge } from './GraphBackground';
import { GraphTable } from './GraphTable';
import {
  directRoute,
  groupBoxes,
  layoutGraph,
  portPoint,
  type LayoutDirection,
  type LayoutOptions,
} from './layout';
import { useGraphMessages } from './messages';
import { nextNode } from './navigation';
import type { GraphEdge, GraphGroup, GraphNode, GraphValue } from './types';

export interface NodeGraphProps {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  /** Labels for the groups nodes name. A group without one is labelled with its id. */
  groups?: readonly GraphGroup[];
  /**
   * `layered` (the default): left to right like a pipeline, or top to bottom when that shows the graph larger in a
   * narrow container (a pipeline on a phone). `top-down`: top to bottom. `manual`: each node's `position`.
   */
  layout?: 'layered' | 'top-down' | 'manual';
  /** The selected node (controlled). */
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelectionChange?: (id: string | null) => void;
  /** Enter, a double-click, or the list view's open button on a node, such as opening its details. */
  onNodeAction?: (id: string) => void;
  /** Drag nodes, connect ports and delete. Off by default. The graph stays controlled: apply `onChange`'s graph. */
  isEditable?: boolean;
  onChange?: (graph: GraphValue) => void;
  /** The drawing's height (CSS). Defaults to the laid-out graph's height, up to 80% of the screen. */
  height?: string;
  /** A heading above the graph, which also names it. */
  title?: string;
  /** Defaults to 3. */
  headingLevel?: HeadingLevel;
  /** Names the graph when it has no `title`. */
  'aria-label'?: string;
  /** Offers "View as list". Defaults to true. */
  hasListToggle?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** World units: every node is this wide, and as tall as its rows need. */
const NODE_WIDTH = 176;
/** Above this many nodes the canvas shows a minimap. */
const MINIMAP_THRESHOLD = 16;
/** A `layered` graph that would fit its container only below this zoom tries top to bottom instead. */
const MIN_READABLE_ZOOM = 0.75;
const PADDING = 24;
const CONTROLS_HEIGHT = 40;

const layoutOptions: Record<LayoutDirection, LayoutOptions> = {
  right: { direction: 'right', nodeGap: 24, layerGap: 56 },
  down: { direction: 'down', nodeGap: 20, layerGap: 44 },
};

const borderClasses: Record<Tone | 'none', string> = {
  none: 'border-border-strong',
  neutral: 'border-border-strong',
  accent: 'border-accent-solid',
  success: 'border-success-solid',
  warning: 'border-warning-solid',
  danger: 'border-danger-solid',
};

/** A node card's height: padding and the label, plus a row each for a description, a status and metrics. */
function nodeHeight(node: GraphNode): number {
  const rows =
    (node.description !== undefined ? 1 : 0) +
    (node.status ? 1 : 0) +
    (node.metrics && node.metrics.length > 0 ? 1 : 0);
  return 44 + rows * 20;
}

function NodeCard({
  node,
  isConnectSource,
  port,
}: {
  node: GraphNode;
  isConnectSource: boolean;
  port?: { side: LayoutDirection; onPointerDown: (event: PointerEvent<HTMLSpanElement>) => void };
}) {
  const messages = useGraphMessages();
  const Icon = node.icon;
  const hasDescription = node.description !== undefined;
  const hasMetrics = node.metrics !== undefined && node.metrics.length > 0;
  return (
    <div
      className={cn(
        'relative flex size-full flex-col gap-1 rounded-card border-2 bg-surface-1 px-3 py-2.5 shadow-raised',
        borderClasses[node.status?.tone ?? 'none'],
        isConnectSource && 'outline-2 outline-offset-4 outline-accent-solid outline-dashed',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {Icon && <Icon aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />}
        <span className="truncate text-sm leading-5 font-semibold text-fg">{node.label}</span>
      </div>
      {node.status && (
        <div className="flex min-w-0 items-center text-xs leading-4">
          <StatusDot tone={node.status.tone} label={node.status.label} size="sm" />
        </div>
      )}
      {hasDescription && (
        <div className="truncate text-xs leading-4 text-fg-muted">{node.description}</div>
      )}
      {hasMetrics && (
        <div className="truncate text-xs leading-4 text-fg-muted tabular-nums">
          {node.metrics?.map((metric) => messages.graphMetric(metric)).join(' · ')}
        </div>
      )}
      {port && (
        // The connector handle: a pointer shortcut (C, then Enter on the target, does the same from the keyboard).
        <span
          aria-hidden="true"
          className={cn(
            'hit-area absolute size-3 cursor-crosshair rounded-full border-2 border-accent-solid bg-surface-1',
            port.side === 'right'
              ? 'top-1/2 -right-1.5 -translate-y-1/2'
              : '-bottom-1.5 left-1/2 -translate-x-1/2',
          )}
          data-graph-port=""
          onPointerDown={port.onPointerDown}
        />
      )}
    </div>
  );
}

/** Lives inside the Canvas: shares its API with the graph and refits when the graph's shape changes. */
function CanvasBridge({
  apiRef,
  fitKey,
}: {
  apiRef: { current: CanvasApi | null };
  fitKey: string;
}) {
  const api = useCanvas();
  useLayoutEffect(() => {
    apiRef.current = api;
  });
  const lastKey = useRef(fitKey);
  const { zoomToFit } = api;
  useEffect(() => {
    if (lastKey.current !== fitKey) {
      lastKey.current = fitKey;
      zoomToFit();
    }
  }, [fitKey, zoomToFit]);
  return null;
}

/** A node-and-edge diagram with automatic layout, status, selection, keyboard navigation and optional editing. */
export function NodeGraph({
  nodes,
  edges,
  groups,
  layout = 'layered',
  selectedId,
  defaultSelectedId = null,
  onSelectionChange,
  onNodeAction,
  isEditable = false,
  onChange,
  height,
  title,
  headingLevel = 3,
  'aria-label': ariaLabel,
  hasListToggle = true,
  className,
  ref,
}: NodeGraphProps) {
  const messages = useGraphMessages();
  const titleId = useId();
  const summaryId = useId();
  const instructionsId = useId();
  const [widthRef, width] = useElementWidth();
  const isReducedMotion = useIsReducedMotion();
  const [selected, setSelected] = useControllableState(
    selectedId,
    defaultSelectedId,
    onSelectionChange,
  );
  const [isList, setList] = useState(false);
  const [live, setLive] = useState<Record<string, CanvasPoint>>({});
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ from: string; to: CanvasPoint } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const apiRef = useRef<CanvasApi | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const cameFrom = useRef<{ node: string; from: string } | null>(null);
  const listFormat = useListFormat();
  const Heading = `h${String(headingLevel)}` as 'h3';
  const rootRefs = useMemo(() => mergeRefs(ref, rootRef), [ref]);
  const descriptionIdBase = useId();

  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const labelOf = (id: string) => byId.get(id)?.label ?? id;
  const groupLabels = useMemo(
    () => new Map((groups ?? []).map((group) => [group.id, group.label])),
    [groups],
  );
  const validEdges = useMemo(
    () => edges.filter((edge) => byId.has(edge.from) && byId.has(edge.to)),
    [edges, byId],
  );

  // The automatic layout depends only on the graph's shape, so moving a node doesn't lay everything out again.
  const shapeKey = JSON.stringify([
    layout,
    nodes.map((node) => [node.id, nodeHeight(node), node.group ?? null]),
    validEdges.map((edge) => [edge.id, edge.from, edge.to]),
  ]);
  // shapeKey stands for the nodes' sizes and groups and the edges (not positions), so moving a node doesn't lay the
  // graph out again.
  const layouts = useMemo(() => {
    if (layout === 'manual') {
      return null;
    }
    const sizes = nodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: nodeHeight(node),
      group: node.group,
    }));
    return {
      right: layout === 'layered' ? layoutGraph(sizes, validEdges, layoutOptions.right) : null,
      down: layoutGraph(sizes, validEdges, layoutOptions.down),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above.
  }, [shapeKey]);
  // `layered` runs left to right unless that would shrink the graph below 75% in this container and top to bottom
  // shows it larger (a pipeline on a phone or a narrow card).
  const direction: LayoutDirection = (() => {
    if (layout !== 'layered' || !layouts?.right) {
      return 'down';
    }
    if (width === undefined) {
      return 'right';
    }
    const available = Math.max(1, width - PADDING * 2);
    const across = available / Math.max(1, layouts.right.bounds.width);
    const down = available / Math.max(1, layouts.down.bounds.width);
    return across < MIN_READABLE_ZOOM && down > across ? 'down' : 'right';
  })();
  const auto = layouts ? (direction === 'right' ? layouts.right : layouts.down) : null;

  // Where each node is: being dragged, pinned by its position, laid out, or (manual without a position) in a grid.
  const rects = useMemo(() => {
    const result = new Map<string, CanvasRect>();
    nodes.forEach((node, index) => {
      const point = live[node.id] ??
        node.position ??
        (auto?.nodes[node.id]
          ? { x: auto.nodes[node.id]?.x ?? 0, y: auto.nodes[node.id]?.y ?? 0 }
          : null) ?? {
          x: (index % 4) * (NODE_WIDTH + 48),
          y: Math.floor(index / 4) * 120,
        };
      result.set(node.id, { ...point, width: NODE_WIDTH, height: nodeHeight(node) });
    });
    return result;
  }, [nodes, live, auto]);
  const isMoved = (id: string) => live[id] !== undefined || byId.get(id)?.position !== undefined;
  const hasMoved = layout === 'manual' || nodes.some((node) => isMoved(node.id));

  const routed: RoutedEdge[] = validEdges.map((edge) => {
    const from = rects.get(edge.from) ?? { x: 0, y: 0, width: 0, height: 0 };
    const to = rects.get(edge.to) ?? from;
    const autoRoute = auto?.edges[edge.id];
    const isDirect = layout === 'manual' || !autoRoute || isMoved(edge.from) || isMoved(edge.to);
    const points = isDirect
      ? directRoute(from, to, layout === 'manual' ? undefined : direction)
      : autoRoute;
    const first = points[0] ?? { x: 0, y: 0 };
    const isSideways =
      Math.abs(first.x - from.x) < 0.5 || Math.abs(first.x - (from.x + from.width)) < 0.5;
    return {
      edge,
      points,
      axis: layout === 'manual' ? (isSideways ? 'right' : 'down') : direction,
      fromLabel: labelOf(edge.from),
      toLabel: labelOf(edge.to),
    };
  });
  const groupRects =
    hasMoved || !auto
      ? groupBoxes(
          nodes.map((node) => ({
            rect: rects.get(node.id) ?? { x: 0, y: 0, width: 0, height: 0 },
            group: node.group,
          })),
        )
      : auto.groups;
  const content = unionRects([
    ...rects.values(),
    ...groupRects,
    ...routed.flatMap((route) => route.points.map((point) => ({ ...point, width: 0, height: 0 }))),
  ]) ?? { x: 0, y: 0, width: 0, height: 0 };
  const bounds = {
    x: content.x - PADDING,
    y: content.y - PADDING,
    width: content.width + PADDING * 2,
    // Extra room at the bottom for the zoom controls.
    height: content.height + PADDING * 2 + CONTROLS_HEIGHT,
  };

  // Reading order: layer by layer for automatic layouts, top to bottom then left to right for manual ones.
  const order = useMemo(() => {
    const ids = nodes.map((node) => node.id);
    if (auto) {
      return ids.sort(
        (a, b) =>
          (auto.nodes[a]?.layer ?? 0) - (auto.nodes[b]?.layer ?? 0) ||
          (auto.nodes[a]?.order ?? 0) - (auto.nodes[b]?.order ?? 0),
      );
    }
    return ids.sort((a, b) => {
      const ra = rects.get(a);
      const rb = rects.get(b);
      return (
        Math.round((ra?.y ?? 0) / 40) - Math.round((rb?.y ?? 0) / 40) || (ra?.x ?? 0) - (rb?.x ?? 0)
      );
    });
  }, [nodes, auto, rects]);
  const navigation = useMemo(() => {
    const successors = new Map<string, string[]>();
    const predecessors = new Map<string, string[]>();
    for (const edge of validEdges) {
      successors.set(edge.from, [...(successors.get(edge.from) ?? []), edge.to]);
      predecessors.set(edge.to, [...(predecessors.get(edge.to) ?? []), edge.from]);
    }
    const layers = auto
      ? new Map(nodes.map((node) => [node.id, auto.nodes[node.id]?.layer ?? 0]))
      : undefined;
    return { direction, order, layers, successors, predecessors };
  }, [validEdges, auto, nodes, direction, order]);

  const emit = (next: GraphValue) => {
    onChange?.(next);
  };
  const removeNodes = (ids: readonly string[]) => {
    emit({
      nodes: nodes.filter((node) => !ids.includes(node.id)),
      edges: edges.filter((edge) => !ids.includes(edge.from) && !ids.includes(edge.to)),
    });
    if (selected !== null && ids.includes(selected)) {
      setSelected(null);
    }
  };
  const removeEdge = (id: string) => {
    emit({ nodes: [...nodes], edges: edges.filter((edge) => edge.id !== id) });
    setSelectedEdgeId(null);
  };
  const connect = (from: string, to: string) => {
    if (from === to || edges.some((edge) => edge.from === from && edge.to === to)) {
      return;
    }
    let id = `${from}-${to}`;
    for (let suffix = 2; edges.some((edge) => edge.id === id); suffix++) {
      id = `${from}-${to}-${String(suffix)}`;
    }
    emit({ nodes: [...nodes], edges: [...edges, { id, from, to }] });
    setAnnouncement(messages.graphConnected({ from: labelOf(from), to: labelOf(to) }));
  };

  const focusNode = (id: string) => {
    rootRef.current?.querySelector<HTMLElement>(`[data-canvas-item="${CSS.escape(id)}"]`)?.focus();
  };

  const onNodeKeyDown = (id: string) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (connectFrom !== null) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setConnectFrom(null);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        connect(connectFrom, id);
        setConnectFrom(null);
        return;
      }
    }
    if (
      isEditable &&
      event.key.toLowerCase() === 'c' &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      event.preventDefault();
      setConnectFrom(id);
      setAnnouncement(messages.graphConnectPrompt({ label: labelOf(id) }));
      return;
    }
    const isNavigationKey =
      event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End';
    // Editable nodes nudge with the arrow keys, so Alt + arrows follow the edges there.
    if (isNavigationKey && (!isEditable || event.altKey || !event.key.startsWith('Arrow'))) {
      const previous = cameFrom.current?.node === id ? cameFrom.current.from : null;
      const next = nextNode(navigation, id, event.key, previous);
      event.preventDefault();
      if (next) {
        cameFrom.current = { node: next, from: id };
        focusNode(next);
      }
    }
  };

  const describe = (node: GraphNode) => {
    const upstream = navigation.predecessors.get(node.id) ?? [];
    const downstream = navigation.successors.get(node.id) ?? [];
    const parts: string[] = [];
    if (node.group !== undefined) {
      parts.push(messages.graphNodeGroup({ group: groupLabels.get(node.group) ?? node.group }));
    }
    if (upstream.length > 0) {
      parts.push(messages.graphNodeUpstream({ nodes: listFormat.format(upstream.map(labelOf)) }));
    }
    if (downstream.length > 0) {
      parts.push(
        messages.graphNodeDownstream({ nodes: listFormat.format(downstream.map(labelOf)) }),
      );
    }
    return parts.join(' ');
  };

  const startConnect = (id: string) => (event: PointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    const api = apiRef.current;
    if (!api) {
      return;
    }
    capturePointer(event.currentTarget, event.pointerId);
    const toWorld = (pointer: { clientX: number; clientY: number }) =>
      api.clientToWorld({ x: pointer.clientX, y: pointer.clientY });
    setDraft({ from: id, to: toWorld(event) });
    const target = event.currentTarget;
    const onMove = (move: globalThis.PointerEvent) => {
      setDraft({
        from: id,
        to: (apiRef.current ?? api).clientToWorld({ x: move.clientX, y: move.clientY }),
      });
    };
    const onUp = (up: globalThis.PointerEvent) => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
      setDraft(null);
      if (up.type === 'pointerup') {
        const hit = document
          .elementFromPoint(up.clientX, up.clientY)
          ?.closest<HTMLElement>('[data-canvas-item]');
        const to = hit?.dataset.canvasItem;
        if (to !== undefined && rootRef.current?.contains(hit ?? null)) {
          connect(id, to);
        }
      }
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  };

  const attention = nodes.filter(
    (node) => node.status?.tone === 'danger' || node.status?.tone === 'warning',
  ).length;
  const summary = [
    messages.graphSummary({ nodes: nodes.length, edges: validEdges.length }),
    attention > 0 ? messages.graphAttention({ count: attention }) : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Tall enough to show the graph at up to 100% across the container's width, within 200 px and 80% of the screen.
  const fitZoom = width ? clamp((width - 48) / Math.max(bounds.width, 1), 0.1, 1) : 1;
  const autoHeight = `min(${String(Math.max(200, Math.ceil(bounds.height * fitZoom + 48)))}px, 80svh)`;
  const draftFrom = draft ? rects.get(draft.from) : undefined;
  const canvasName = title === undefined ? (ariaLabel ?? messages.graphLabel) : undefined;

  return (
    <div ref={rootRefs} className={cn('flex min-w-0 flex-col gap-2', className)}>
      {(title !== undefined || hasListToggle) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title !== undefined && (
            <Heading id={titleId} className="text-base font-semibold text-fg">
              {title}
            </Heading>
          )}
          {hasListToggle && (
            <Button
              variant="ghost"
              size="sm"
              icon={isList ? Workflow : List}
              aria-pressed={isList}
              className="ms-auto"
              onPress={() => {
                setList(!isList);
              }}
            >
              {messages.graphViewAsList}
            </Button>
          )}
        </div>
      )}
      <span id={summaryId} hidden>
        {summary}
      </span>
      <span id={instructionsId} hidden>
        {isEditable ? messages.graphEditInstructions : messages.graphNodeInstructions}
      </span>
      <LiveRegion>{announcement}</LiveRegion>
      <div hidden>
        {order.map((id, index) => {
          const node = byId.get(id);
          return node ? (
            <span key={id} id={`${descriptionIdBase}-${String(index)}`}>
              {describe(node)}
            </span>
          ) : null;
        })}
      </div>
      <div ref={widthRef} className="min-w-0">
        {isList ? (
          <GraphTable
            nodes={order.map((id) => byId.get(id)).filter((node) => node !== undefined)}
            edges={validEdges}
            labelOf={labelOf}
            groupLabels={groupLabels}
            isEditable={isEditable}
            onNodeAction={onNodeAction}
            onRemoveNode={(id) => {
              removeNodes([id]);
            }}
            onRemoveEdge={removeEdge}
          />
        ) : (
          width !== undefined && (
            <Canvas
              key={layout === 'manual' ? 'manual' : direction}
              aria-label={canvasName}
              aria-labelledby={title === undefined ? undefined : titleId}
              aria-describedby={summaryId}
              height={height ?? autoHeight}
              contentBounds={bounds}
              minZoom={0.1}
              maxZoom={2}
              selectionMode="single"
              hasMarquee={false}
              hasMinimap={nodes.length > MINIMAP_THRESHOLD}
              grid={isEditable ? { size: 8, isVisible: false } : undefined}
              selection={selected === null ? [] : [selected]}
              onSelectionChange={(ids) => {
                setSelected(ids[0] ?? null);
                setSelectedEdgeId(null);
              }}
              onDelete={
                isEditable
                  ? (ids) => {
                      removeNodes(ids);
                    }
                  : undefined
              }
              underlay={
                <GraphBackground
                  edges={routed}
                  groups={groupRects}
                  groupLabels={groupLabels}
                  isReducedMotion={isReducedMotion}
                  isEditable={isEditable}
                  selectedEdgeId={selectedEdgeId}
                  onSelectEdge={(id) => {
                    setSelectedEdgeId(id);
                    setSelected(null);
                  }}
                  onRemoveEdge={removeEdge}
                  draft={
                    draft && draftFrom
                      ? {
                          from: portPoint(
                            draftFrom,
                            'out',
                            layout === 'manual' ? 'right' : direction,
                          ),
                          to: draft.to,
                          axis: layout === 'manual' ? 'right' : direction,
                        }
                      : null
                  }
                  bounds={bounds}
                />
              }
              overlay={
                <>
                  <CanvasBridge apiRef={apiRef} fitKey={`${direction}${shapeKey}`} />
                  {connectFrom !== null && (
                    <p className="absolute inset-x-2 top-2 z-10 rounded-control border border-accent-border bg-surface-1 px-3 py-1.5 text-sm text-fg shadow-raised">
                      {messages.graphConnectPrompt({ label: labelOf(connectFrom) })}
                    </p>
                  )}
                </>
              }
            >
              {order.map((id, index) => {
                const node = byId.get(id);
                const rect = rects.get(id);
                if (!node || !rect) {
                  return null;
                }
                return (
                  <CanvasItem
                    key={id}
                    id={id}
                    x={rect.x}
                    y={rect.y}
                    width={rect.width}
                    height={rect.height}
                    isMovable={isEditable}
                    hasInstructions={false}
                    aria-describedby={`${descriptionIdBase}-${String(index)} ${instructionsId}`}
                    className="rounded-card aria-selected:ring-offset-2 aria-selected:ring-offset-surface-1"
                    onKeyDown={onNodeKeyDown(id)}
                    onAction={
                      onNodeAction
                        ? () => {
                            onNodeAction(id);
                          }
                        : undefined
                    }
                    onMove={(position) => {
                      setLive((current) => ({ ...current, [id]: position }));
                    }}
                    onMoveEnd={(position) => {
                      setLive((current) => {
                        const { [id]: _done, ...rest } = current;
                        return rest;
                      });
                      emit({
                        nodes: nodes.map((other) =>
                          other.id === id ? { ...other, position } : other,
                        ),
                        edges: [...edges],
                      });
                    }}
                  >
                    <NodeCard
                      node={node}
                      isConnectSource={connectFrom === id}
                      port={
                        isEditable
                          ? {
                              side: layout === 'manual' ? 'right' : direction,
                              onPointerDown: startConnect(id),
                            }
                          : undefined
                      }
                    />
                  </CanvasItem>
                );
              })}
            </Canvas>
          )
        )}
      </div>
    </div>
  );
}
