// NodeGraph's "View as list": the nodes and the connections as two tables, so the graph can be read without the
// drawing. When the graph is editable, each row has a remove button; with `onNodeAction`, each node an open button.
// Wide tables scroll sideways inside their own focusable region, never the page.
import { ExternalLink, Trash2 } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { IconButton } from '../components/IconButton/IconButton';
import { StatusDot } from '../components/StatusDot/StatusDot';
import { useGraphMessages } from './messages';
import type { GraphEdge, GraphNode } from './types';

export interface GraphTableProps {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  labelOf: (id: string) => string;
  groupLabels: ReadonlyMap<string, string>;
  isEditable: boolean;
  onNodeAction?: (id: string) => void;
  onRemoveNode: (id: string) => void;
  onRemoveEdge: (id: string) => void;
}

const cellClasses = 'border-b border-border px-3 py-2 text-start align-top';
const headerClasses = `${cellClasses} text-xs font-semibold text-fg-muted whitespace-nowrap`;

function Region({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      // A region that may scroll sideways must be focusable so keyboard users can scroll it.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className="min-w-0 overflow-x-auto rounded-card border border-border bg-surface-1 outline-none focus-visible:focus-ring"
    >
      {children}
    </div>
  );
}

export function GraphTable({
  nodes,
  edges,
  labelOf,
  groupLabels,
  isEditable,
  onNodeAction,
  onRemoveNode,
  onRemoveEdge,
}: GraphTableProps) {
  const messages = useGraphMessages();
  const nodesId = useId();
  const edgesId = useId();
  const hasGroups = nodes.some((node) => node.group !== undefined);
  const hasMetrics = nodes.some((node) => node.metrics && node.metrics.length > 0);
  const hasNodeActions = isEditable || onNodeAction !== undefined;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Region label={messages.graphNodes}>
        <table aria-labelledby={nodesId} className="w-full border-collapse text-sm text-fg">
          <caption id={nodesId} className="px-3 pt-2 text-start text-sm font-semibold text-fg">
            {messages.graphNodes}
          </caption>
          <thead>
            <tr>
              <th scope="col" className={headerClasses}>
                {messages.graphColumnName}
              </th>
              {hasGroups && (
                <th scope="col" className={headerClasses}>
                  {messages.graphColumnGroup}
                </th>
              )}
              <th scope="col" className={headerClasses}>
                {messages.graphColumnStatus}
              </th>
              {hasMetrics && (
                <th scope="col" className={headerClasses}>
                  {messages.graphColumnMetrics}
                </th>
              )}
              {hasNodeActions && (
                <th scope="col" className={headerClasses}>
                  <span className="sr-only">{messages.graphColumnActions}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => (
              <tr key={node.id}>
                <th scope="row" className={`${cellClasses} font-medium`}>
                  <span className="block min-w-32">{node.label}</span>
                  {node.description !== undefined && (
                    <span className="block text-xs font-normal text-fg-muted">
                      {node.description}
                    </span>
                  )}
                </th>
                {hasGroups && (
                  <td className={cellClasses}>
                    {node.group === undefined ? '' : (groupLabels.get(node.group) ?? node.group)}
                  </td>
                )}
                <td className={`${cellClasses} whitespace-nowrap`}>
                  {node.status && <StatusDot tone={node.status.tone} label={node.status.label} />}
                </td>
                {hasMetrics && (
                  <td className={`${cellClasses} tabular-nums`}>
                    {node.metrics?.map((metric) => (
                      <span key={metric.label} className="block whitespace-nowrap">
                        {messages.graphMetric(metric)}
                      </span>
                    ))}
                  </td>
                )}
                {hasNodeActions && (
                  <td className={`${cellClasses} py-1 whitespace-nowrap`}>
                    <div className="flex justify-end gap-1">
                      {onNodeAction && (
                        <IconButton
                          icon={ExternalLink}
                          size="sm"
                          aria-label={messages.graphOpenNode({ label: node.label })}
                          onPress={() => {
                            onNodeAction(node.id);
                          }}
                        />
                      )}
                      {isEditable && (
                        <IconButton
                          icon={Trash2}
                          size="sm"
                          tone="danger"
                          aria-label={messages.graphRemoveNode({ label: node.label })}
                          onPress={() => {
                            onRemoveNode(node.id);
                          }}
                        />
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Region>
      <Region label={messages.graphConnections}>
        <table aria-labelledby={edgesId} className="w-full border-collapse text-sm text-fg">
          <caption id={edgesId} className="px-3 pt-2 text-start text-sm font-semibold text-fg">
            {messages.graphConnections}
          </caption>
          <thead>
            <tr>
              <th scope="col" className={headerClasses}>
                {messages.graphColumnFrom}
              </th>
              <th scope="col" className={headerClasses}>
                {messages.graphColumnTo}
              </th>
              <th scope="col" className={headerClasses}>
                {messages.graphColumnLabel}
              </th>
              <th scope="col" className={headerClasses}>
                {messages.graphColumnStatus}
              </th>
              {isEditable && (
                <th scope="col" className={headerClasses}>
                  <span className="sr-only">{messages.graphColumnActions}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {edges.length === 0 && (
              <tr>
                <td colSpan={isEditable ? 5 : 4} className={`${cellClasses} text-fg-muted`}>
                  {messages.graphNoConnections}
                </td>
              </tr>
            )}
            {edges.map((edge) => (
              <tr key={edge.id}>
                <td className={`${cellClasses} min-w-32`}>{labelOf(edge.from)}</td>
                <td className={`${cellClasses} min-w-32`}>{labelOf(edge.to)}</td>
                <td className={cellClasses}>{edge.label ?? ''}</td>
                <td className={`${cellClasses} whitespace-nowrap`}>
                  {edge.status && <StatusDot tone={edge.status.tone} label={edge.status.label} />}
                </td>
                {isEditable && (
                  <td className={`${cellClasses} py-1`}>
                    <div className="flex justify-end">
                      <IconButton
                        icon={Trash2}
                        size="sm"
                        tone="danger"
                        aria-label={messages.graphRemoveConnection({
                          from: labelOf(edge.from),
                          to: labelOf(edge.to),
                        })}
                        onPress={() => {
                          onRemoveEdge(edge.id);
                        }}
                      />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Region>
    </div>
  );
}
