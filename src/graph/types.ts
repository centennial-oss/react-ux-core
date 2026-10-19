// NodeGraph's data types.
import type { ReactNode } from 'react';
import type { CanvasPoint } from '../canvas/geometry';
import type { IconComponent } from '../utils/icon';
import type { Tone } from '../utils/types';

/** A status in words with a tone: the tone colours a node's border or an edge, the label says it. */
export interface GraphStatus {
  tone: Tone;
  label: string;
}

/** A small key figure on a node, such as `{ label: 'Rate', value: '2.4 fps' }`. */
export interface GraphMetric {
  label: string;
  value: string;
}

export interface GraphNode {
  id: string;
  label: string;
  /** One short line under the label. */
  description?: ReactNode;
  icon?: IconComponent;
  status?: GraphStatus;
  /** Small key metrics, such as "4.5 Mbps · 60 fps". */
  metrics?: readonly GraphMetric[];
  /** The id of the group it belongs to, drawn as a labelled container (a region, a site, a cluster). */
  group?: string;
  /** Its position in world units: used by `manual` layout, and pins the node in automatic layouts. */
  position?: CanvasPoint;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  status?: GraphStatus;
  /** Shows traffic flowing along the edge (not with reduced motion). */
  isAnimated?: boolean;
}

/** A group's label, when it should differ from its id. */
export interface GraphGroup {
  id: string;
  label: string;
}

export interface GraphValue {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
