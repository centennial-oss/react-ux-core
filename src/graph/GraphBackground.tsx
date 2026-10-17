// What NodeGraph draws under its nodes, in world units: group containers with their labels, the edges (curves with
// arrowheads, coloured and dashed by status, with flowing dots when animated), edge labels, and while editing the
// connector being dragged and a remove button on the selected edge. The drawing is hidden from assistive technology:
// each node's description names its connections, and "View as list" shows them all as a table.
import { X } from 'lucide-react';
import { useId } from 'react';
import type { CanvasPoint, CanvasRect } from '../canvas/geometry';
import { IconButton } from '../components/IconButton/IconButton';
import { cn } from '../utils/cn';
import type { Tone } from '../utils/types';
import type { LayoutDirection, LayoutGroup } from './layout';
import { useGraphMessages } from './messages';
import type { GraphEdge } from './types';

export interface RoutedEdge {
  edge: GraphEdge;
  points: CanvasPoint[];
  axis: LayoutDirection;
  fromLabel: string;
  toLabel: string;
}

const strokeClasses: Record<Tone, string> = {
  neutral: 'stroke-border-strong',
  accent: 'stroke-accent-solid',
  success: 'stroke-success-solid',
  warning: 'stroke-warning-solid',
  danger: 'stroke-danger-solid',
};

const fillClasses: Record<Tone, string> = {
  neutral: 'fill-border-strong',
  accent: 'fill-accent-solid',
  success: 'fill-success-solid',
  warning: 'fill-warning-solid',
  danger: 'fill-danger-solid',
};

const labelToneClasses: Record<Tone, string> = {
  neutral: 'border-border text-fg-muted',
  accent: 'border-accent-border text-accent-fg',
  success: 'border-success-border text-success-fg',
  warning: 'border-warning-border text-warning-fg',
  danger: 'border-danger-border text-danger-fg',
};

/** Warnings and failures are dashed as well as coloured, so status never depends on colour alone. */
const dashes: Partial<Record<Tone, string>> = { warning: '8 4', danger: '4 4' };

const TONES: Tone[] = ['neutral', 'accent', 'success', 'warning', 'danger'];

/** A smooth path through the route's points, leaving and arriving along the flow's axis. */
export function edgePath(points: readonly CanvasPoint[], axis: LayoutDirection): string {
  const [first, ...rest] = points;
  if (!first) {
    return '';
  }
  let path = `M${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  let previous = first;
  for (const point of rest) {
    if (axis === 'right') {
      const delta = point.x - previous.x;
      const pull = Math.sign(delta || 1) * Math.max(Math.abs(delta) / 2, 24);
      path += ` C${(previous.x + pull).toFixed(1)} ${previous.y.toFixed(1)} ${(point.x - pull).toFixed(1)} ${point.y.toFixed(1)} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    } else {
      const delta = point.y - previous.y;
      const pull = Math.sign(delta || 1) * Math.max(Math.abs(delta) / 2, 24);
      path += ` C${previous.x.toFixed(1)} ${(previous.y + pull).toFixed(1)} ${point.x.toFixed(1)} ${(point.y - pull).toFixed(1)} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    }
    previous = point;
  }
  return path;
}

/** Where an edge's label sits: the middle point, or the middle of the middle segment. */
export function edgeMidpoint(points: readonly CanvasPoint[]): CanvasPoint {
  if (points.length % 2 === 1) {
    return points[(points.length - 1) / 2] ?? { x: 0, y: 0 };
  }
  const a = points[points.length / 2 - 1] ?? { x: 0, y: 0 };
  const b = points[points.length / 2] ?? a;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export interface GraphBackgroundProps {
  edges: readonly RoutedEdge[];
  groups: readonly LayoutGroup[];
  groupLabels: ReadonlyMap<string, string>;
  isReducedMotion: boolean;
  isEditable: boolean;
  selectedEdgeId: string | null;
  onSelectEdge: (id: string | null) => void;
  onRemoveEdge: (id: string) => void;
  /** The connector being dragged from a port. */
  draft: { from: CanvasPoint; to: CanvasPoint; axis: LayoutDirection } | null;
  bounds: CanvasRect;
}

export function GraphBackground({
  edges,
  groups,
  groupLabels,
  isReducedMotion,
  isEditable,
  selectedEdgeId,
  onSelectEdge,
  onRemoveEdge,
  draft,
  bounds,
}: GraphBackgroundProps) {
  const messages = useGraphMessages();
  const markerPrefix = `graph${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const selected = edges.find((routed) => routed.edge.id === selectedEdgeId);

  return (
    <>
      <div aria-hidden="true">
        {groups.map((group) => (
          <div
            key={group.id}
            className="absolute top-0 left-0 rounded-card border border-dashed border-border-strong bg-surface-2"
            // Dynamic geometry: the group's box from the layout.
            // eslint-disable-next-line no-restricted-syntax -- see above.
            style={{
              transform: `translate(${String(group.x)}px, ${String(group.y)}px)`,
              width: group.width,
              height: group.height,
            }}
          >
            <div className="truncate px-3 pt-1.5 text-xs leading-4 font-semibold text-fg-muted">
              {groupLabels.get(group.id) ?? group.id}
            </div>
          </div>
        ))}
        <svg
          className="pointer-events-none absolute top-0 left-0 overflow-visible"
          width={Math.max(1, bounds.x + bounds.width)}
          height={Math.max(1, bounds.y + bounds.height)}
        >
          <defs>
            {TONES.map((tone) => (
              <marker
                key={tone}
                id={`${markerPrefix}-${tone}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0 0L10 5L0 10z" className={fillClasses[tone]} />
              </marker>
            ))}
          </defs>
          {edges.map(({ edge, points, axis }) => {
            const tone = edge.status?.tone ?? 'neutral';
            const path = edgePath(points, axis);
            const isSelected = edge.id === selectedEdgeId;
            return (
              <g key={edge.id}>
                {isSelected && (
                  <path
                    d={path}
                    fill="none"
                    strokeWidth={6}
                    strokeLinecap="round"
                    className="stroke-accent-bg"
                  />
                )}
                <path
                  d={path}
                  fill="none"
                  strokeWidth={isSelected ? 2.5 : 1.75}
                  strokeDasharray={dashes[tone]}
                  markerEnd={`url(#${markerPrefix}-${tone})`}
                  className={strokeClasses[tone]}
                />
                {edge.isAnimated && !isReducedMotion && (
                  <path
                    d={path}
                    fill="none"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray="1 11"
                    className={tone === 'neutral' ? 'stroke-accent-solid' : strokeClasses[tone]}
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="12"
                      to="0"
                      dur="0.6s"
                      repeatCount="indefinite"
                    />
                  </path>
                )}
                {isEditable && (
                  // A wide invisible stroke that makes the edge easy to press.
                  <path
                    d={path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    className="pointer-events-auto cursor-pointer [pointer-events:stroke]"
                    onPointerDown={(event) => {
                      if (event.button === 0) {
                        event.stopPropagation();
                        onSelectEdge(edge.id);
                      }
                    }}
                  />
                )}
              </g>
            );
          })}
          {draft && (
            <path
              d={edgePath([draft.from, draft.to], draft.axis)}
              fill="none"
              strokeWidth={2}
              strokeDasharray="6 4"
              className="stroke-accent-solid"
            />
          )}
        </svg>
        {edges.map(({ edge, points }) => {
          const text = [edge.label, edge.status?.label].filter(Boolean).join(' · ');
          if (!text) {
            return null;
          }
          const middle = edgeMidpoint(points);
          return (
            <div
              key={edge.id}
              className={cn(
                'pointer-events-none absolute top-0 left-0 max-w-40 -translate-x-1/2 -translate-y-1/2 truncate rounded-control border bg-surface-1 px-1.5 text-xs leading-5 whitespace-nowrap',
                labelToneClasses[edge.status?.tone ?? 'neutral'],
              )}
              // Dynamic geometry: the label sits at the edge's midpoint.
              // eslint-disable-next-line no-restricted-syntax -- see above.
              style={{ left: middle.x, top: middle.y }}
            >
              {text}
            </div>
          );
        })}
      </div>
      {isEditable && selected && (
        <div
          className="absolute top-0 left-0 -translate-x-1/2 translate-y-2"
          // Dynamic geometry: the button sits under the selected edge's midpoint.
          // eslint-disable-next-line no-restricted-syntax -- see above.
          style={{ left: edgeMidpoint(selected.points).x, top: edgeMidpoint(selected.points).y }}
          // A press on the button is the button's, not the start of a pan.
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        >
          <IconButton
            icon={X}
            size="sm"
            variant="solid"
            tone="danger"
            aria-label={messages.graphRemoveConnection({
              from: selected.fromLabel,
              to: selected.toLabel,
            })}
            onPress={() => {
              onRemoveEdge(selected.edge.id);
            }}
          />
        </div>
      )}
    </>
  );
}
