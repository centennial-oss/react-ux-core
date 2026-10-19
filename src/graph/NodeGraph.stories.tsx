import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { observatoryTopology, pipelineEdges, pipelineNodes } from '../../test/graph';
import { DescriptionList } from '../components/DescriptionList/DescriptionList';
import { StatusDot } from '../components/StatusDot/StatusDot';
import { NodeGraph } from './NodeGraph';
import type { GraphEdge, GraphNode, GraphValue } from './types';

const meta = {
  title: 'Graph/NodeGraph',
  component: NodeGraph,
  parameters: { layout: 'padded' },
  args: { nodes: pipelineNodes, edges: pipelineEdges },
} satisfies Meta<typeof NodeGraph>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A five-stage image pipeline for a telescope with one failed stage: its border, status and stalled input edge are
 * red and dashed. It runs left to right, and top to bottom on phones.
 */
export const ImagePipeline: Story = {
  args: { title: 'Image pipeline' },
};

/** The same pipeline, always top to bottom. */
export const TopDown: Story = {
  args: { title: 'Image pipeline', layout: 'top-down' },
};

/** The list view: the nodes and connections as tables. */
export const ViewAsList: Story = {
  args: { title: 'Image pipeline' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'View as list' }));
  },
};

/**
 * A 60-node network of observatories, laid out automatically with a container per region. Large graphs get a minimap;
 * zoom in to read the nodes, or use "View as list".
 */
export const ObservatoryNetwork: Story = {
  args: {
    title: 'Observatory network',
    nodes: observatoryTopology.nodes,
    edges: observatoryTopology.edges,
    groups: observatoryTopology.groups,
    height: '32rem',
  },
};

/** Selection drives a details panel beside the graph (an inspector or a Drawer in an app). */
export const WithDetails: Story = {
  render: function Render(args) {
    const [selected, setSelected] = useState<string | null>('stack');
    const node = pipelineNodes.find((candidate) => candidate.id === selected);
    return (
      <div className="flex flex-col gap-4">
        <NodeGraph {...args} selectedId={selected} onSelectionChange={setSelected} />
        <section
          aria-label="Stage details"
          className="rounded-card border border-border bg-surface-1 p-4"
        >
          {node ? (
            <DescriptionList
              items={[
                { id: 'stage', label: 'Stage', value: node.label },
                {
                  id: 'status',
                  label: 'Status',
                  value: node.status && (
                    <StatusDot tone={node.status.tone} label={node.status.label} />
                  ),
                },
                { id: 'detail', label: 'Detail', value: node.description },
              ]}
            />
          ) : (
            <p className="text-sm text-fg-muted">Select a stage to see its details.</p>
          )}
        </section>
      </div>
    );
  },
  args: { title: 'Image pipeline' },
};

const animatedEdges: GraphEdge[] = pipelineEdges.map((edge) =>
  edge.id === 'capture-calibrate' ? { ...edge, isAnimated: true } : edge,
);

/** Traffic flowing on the first edge (static with reduced motion). Animated, so not in visual snapshots. */
export const AnimatedEdge: Story = {
  args: { title: 'Image pipeline', edges: animatedEdges },
  tags: ['!visual'],
};

const sketchNodes: GraphNode[] = [
  { id: 'sensor', label: 'Sky sensor', position: { x: 0, y: 0 } },
  { id: 'dome', label: 'Dome controller', position: { x: 260, y: -60 } },
  { id: 'mount', label: 'Mount', position: { x: 260, y: 80 } },
  { id: 'log', label: 'Night log', position: { x: 520, y: 20 } },
];
const sketchEdges: GraphEdge[] = [
  { id: 'sensor-dome', from: 'sensor', to: 'dome', label: 'Rain' },
  { id: 'sensor-mount', from: 'sensor', to: 'mount' },
  { id: 'dome-log', from: 'dome', to: 'log' },
];

/**
 * Editable, with manual layout: drag nodes (or select one and use the arrow keys), drag from a node's port to another
 * node to connect them (or press C, then Enter on the target), press an edge to remove it, and Delete removes nodes.
 */
export const Editable: Story = {
  args: { nodes: sketchNodes, edges: sketchEdges },
  render: function Render(args) {
    const [graph, setGraph] = useState<GraphValue>({ nodes: sketchNodes, edges: sketchEdges });
    return (
      <NodeGraph
        {...args}
        title="Weather automation"
        layout="manual"
        nodes={graph.nodes}
        edges={graph.edges}
        isEditable
        onChange={setGraph}
        height="22rem"
      />
    );
  },
};
