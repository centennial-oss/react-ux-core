// The graph entry point's strings and their English defaults. Apps override them through `UIProvider`'s `messages`.
// NodeGraph is drawn on a Canvas, so it also reads `/canvas`'s strings (zoom controls, canvas instructions).
import type { CommonMessages } from '../provider/coreStrings';
import { useEntryMessages } from '../provider/context';

import { defaultCanvasMessages, type CanvasMessages } from '../canvas/messages';

export interface GraphMessages {
  /** The graph's accessible name when it has no title or label. */
  graphLabel: string;
  /** The toggle between the drawing and the tables. */
  graphViewAsList: string;
  /** Captions of the list view's two tables. */
  graphNodes: string;
  graphConnections: string;
  /** Column headers of the list view. */
  graphColumnName: string;
  graphColumnGroup: string;
  graphColumnStatus: string;
  graphColumnMetrics: string;
  graphColumnFrom: string;
  graphColumnTo: string;
  graphColumnLabel: string;
  graphColumnActions: string;
  /** Shown in the connections table when there are none. */
  graphNoConnections: string;
  /** Describes the graph: how many nodes and connections, and how many need attention. */
  graphSummary: (params: { nodes: number; edges: number }) => string;
  graphAttention: (params: { count: number }) => string;
  /** Sentences in a node's description (its name is its visible text). Lists of names are joined for the locale. */
  graphNodeGroup: (params: { group: string }) => string;
  graphNodeUpstream: (params: { nodes: string }) => string;
  graphNodeDownstream: (params: { nodes: string }) => string;
  /** One metric, such as "Rate 2.4 fps". */
  graphMetric: (params: { label: string; value: string }) => string;
  /** How to move between nodes. */
  graphNodeInstructions: string;
  /** How to edit a node, when the graph is editable. */
  graphEditInstructions: string;
  /** Shown and announced while choosing the node to connect to. */
  graphConnectPrompt: (params: { label: string }) => string;
  /** Announced after connecting two nodes. */
  graphConnected: (params: { from: string; to: string }) => string;
  graphRemoveNode: (params: { label: string }) => string;
  graphRemoveConnection: (params: { from: string; to: string }) => string;
  /** The list view's button that runs a node's action. */
  graphOpenNode: (params: { label: string }) => string;
}

export const defaultGraphMessages: GraphMessages = {
  graphLabel: 'Graph',
  graphViewAsList: 'View as list',
  graphNodes: 'Nodes',
  graphConnections: 'Connections',
  graphColumnName: 'Name',
  graphColumnGroup: 'Group',
  graphColumnStatus: 'Status',
  graphColumnMetrics: 'Metrics',
  graphColumnFrom: 'From',
  graphColumnTo: 'To',
  graphColumnLabel: 'Label',
  graphColumnActions: 'Actions',
  graphNoConnections: 'No connections',
  graphSummary: ({ nodes, edges }) =>
    `${nodes === 1 ? '1 node' : `${String(nodes)} nodes`}, ${edges === 1 ? '1 connection' : `${String(edges)} connections`}.`,
  graphAttention: ({ count }) =>
    count === 1 ? '1 needs attention.' : `${String(count)} need attention.`,
  graphNodeGroup: ({ group }) => `In ${group}.`,
  graphNodeUpstream: ({ nodes }) => `From ${nodes}.`,
  graphNodeDownstream: ({ nodes }) => `To ${nodes}.`,
  graphMetric: ({ label, value }) => `${label} ${value}`,
  graphNodeInstructions: 'Arrow keys follow the connections.',
  graphEditInstructions:
    'Arrow keys move it, Alt and arrow keys follow the connections, C connects it to another node, Delete removes it.',
  graphConnectPrompt: ({ label }) =>
    `Choose the node to connect ${label} to and press Enter. Escape cancels.`,
  graphConnected: ({ from, to }) => `Connected ${from} to ${to}.`,
  graphRemoveNode: ({ label }) => `Remove ${label}`,
  graphRemoveConnection: ({ from, to }) => `Remove the connection from ${from} to ${to}`,
  graphOpenNode: ({ label }) => `Open ${label}`,
};

/** The strings `/graph` components read: the core strings, `/canvas`'s and `/graph`'s own. */
export type GraphStrings = CommonMessages & CanvasMessages & GraphMessages;

const defaults: CanvasMessages & GraphMessages = {
  ...defaultCanvasMessages,
  ...defaultGraphMessages,
};

/** `/graph`'s strings, with the app's overrides from `UIProvider`. */
export function useGraphMessages(): GraphStrings {
  return useEntryMessages(defaults);
}
