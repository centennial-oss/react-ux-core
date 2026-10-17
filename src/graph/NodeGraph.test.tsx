import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { observatoryTopology, pipelineEdges, pipelineNodes } from '../../test/graph';
import { UIProvider } from '../provider/UIProvider';
import { NodeGraph, type NodeGraphProps } from './NodeGraph';
import type { GraphEdge, GraphNode, GraphValue } from './types';

const hasTouch = navigator.maxTouchPoints > 0;
const isPhone = window.innerWidth < 640;
const isDesktop = window.innerWidth >= 1024;

function Pipeline(props: Partial<NodeGraphProps>) {
  return (
    <NodeGraph title="Image pipeline" nodes={pipelineNodes} edges={pipelineEdges} {...props} />
  );
}

function option(name: string | RegExp): HTMLElement {
  return screen.getByRole('option', { name });
}

const sketchNodes: GraphNode[] = [
  { id: 'sensor', label: 'Sky sensor', position: { x: 0, y: 0 } },
  { id: 'dome', label: 'Dome controller', position: { x: 240, y: 0 } },
  { id: 'log', label: 'Night log', position: { x: 0, y: 140 } },
];
const sketchEdges: GraphEdge[] = [{ id: 'sensor-dome', from: 'sensor', to: 'dome' }];

function Sketch({ onChange }: { onChange: (graph: GraphValue) => void }) {
  const [graph, setGraph] = useState<GraphValue>({ nodes: sketchNodes, edges: sketchEdges });
  return (
    <NodeGraph
      title="Weather automation"
      layout="manual"
      nodes={graph.nodes}
      edges={graph.edges}
      isEditable
      height="320px"
      onChange={(next) => {
        onChange(next);
        setGraph(next);
      }}
    />
  );
}

describe('NodeGraph', () => {
  it('names its nodes by their text in reading order, described by their connections', async () => {
    const { container } = render(<Pipeline />);
    const region = screen.getByRole('region', { name: 'Image pipeline' });
    expect(region).toHaveAccessibleDescription(/5 nodes, 4 connections\. 1 needs attention\./);
    const names = [
      'Capture Running Frames 1,240 · Rate 2.4 fps',
      'Calibrate Running Darks 32',
      'Stack Failed Out of memory at frame 812',
      'Archive Waiting',
      'Publish Waiting',
    ];
    screen.getAllByRole('option').forEach((node, index) => {
      expect(node).toHaveAccessibleName(names[index]);
    });
    expect(option(/^Stack/)).toHaveAccessibleDescription(
      'From Calibrate. To Archive. Arrow keys follow the connections.',
    );
    await expectNoAxeViolations(container);
  });

  it.runIf(isPhone || isDesktop)(
    'reads clearly at phone width: top to bottom, near 100%, with nothing cut off',
    () => {
      render(<Pipeline />);
      const capture = option(/^Capture/).getBoundingClientRect();
      const calibrate = option(/^Calibrate/).getBoundingClientRect();
      if (isPhone) {
        expect(calibrate.top).toBeGreaterThan(capture.bottom);
        expect(Math.abs(calibrate.left - capture.left)).toBeLessThan(1);
      } else {
        expect(calibrate.left).toBeGreaterThan(capture.right);
      }
      const zoom = screen.getByRole('button', { name: /reset to 100%/ }).textContent;
      expect(Number.parseInt(zoom, 10)).toBeGreaterThanOrEqual(isPhone ? 85 : 95);
      const canvas = screen.getByRole('region', { name: 'Image pipeline' }).getBoundingClientRect();
      for (const node of screen.getAllByRole('option')) {
        const rect = node.getBoundingClientRect();
        expect(rect.left).toBeGreaterThanOrEqual(canvas.left);
        expect(rect.right).toBeLessThanOrEqual(canvas.right);
        expect(rect.top).toBeGreaterThanOrEqual(canvas.top);
        expect(rect.bottom).toBeLessThanOrEqual(canvas.bottom);
      }
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    },
  );

  it.runIf(isDesktop)('follows the edges with the arrow keys', async () => {
    render(<Pipeline />);
    option(/^Capture/).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(option(/^Calibrate/)).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(option(/^Archive/)).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(option(/^Stack/)).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(option(/^Publish/)).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(option(/^Capture/)).toHaveFocus();
    // Tab steps through the nodes in reading order.
    await userEvent.keyboard('{Tab}');
    expect(option(/^Calibrate/)).toHaveFocus();
  });

  it.runIf(isDesktop)('moves to siblings in the same layer with the cross keys', async () => {
    render(
      <NodeGraph
        aria-label="Fan out"
        nodes={[
          { id: 'a', label: 'Mirror' },
          { id: 'b', label: 'Camera one' },
          { id: 'c', label: 'Camera two' },
        ]}
        edges={[
          { id: 'ab', from: 'a', to: 'b' },
          { id: 'ac', from: 'a', to: 'c' },
        ]}
      />,
    );
    option('Mirror').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(option('Camera one')).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(option('Camera two')).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(option('Mirror')).toHaveFocus();
  });

  it('selects nodes and runs their action', async () => {
    const onSelectionChange = vi.fn();
    const onNodeAction = vi.fn();
    render(<Pipeline onSelectionChange={onSelectionChange} onNodeAction={onNodeAction} />);
    await userEvent.click(option(/^Stack/));
    expect(onSelectionChange).toHaveBeenLastCalledWith('stack');
    expect(option(/^Stack/)).toHaveAttribute('aria-selected', 'true');
    await userEvent.dblClick(option(/^Archive/));
    expect(onNodeAction).toHaveBeenLastCalledWith('archive');
    if (isDesktop) {
      option(/^Capture/).focus();
      await userEvent.keyboard('{Enter}');
      expect(onNodeAction).toHaveBeenLastCalledWith('capture');
    }
  });

  it.runIf(hasTouch)('selects a node with a tap', async () => {
    const onSelectionChange = vi.fn();
    render(<Pipeline onSelectionChange={onSelectionChange} />);
    await commands.tap('[data-canvas-item="publish"]');
    expect(onSelectionChange).toHaveBeenLastCalledWith('publish');
  });

  it('shows the nodes and connections as tables', async () => {
    const { container } = render(<Pipeline />);
    const toggle = screen.getByRole('button', { name: 'View as list' });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    const nodes = screen.getByRole('table', { name: 'Nodes' });
    expect(
      within(nodes)
        .getAllByRole('rowheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Capture', 'Calibrate', 'StackOut of memory at frame 812', 'Archive', 'Publish']);
    const connections = screen.getByRole('table', { name: 'Connections' });
    expect(within(connections).getAllByRole('row')).toHaveLength(5);
    expect(within(connections).getAllByRole('row')[2]?.textContent).toContain('Stalled');
    await expectNoAxeViolations(container);
  });

  it('lays out a 60-node topology with a container per region', async () => {
    const { nodes, edges, groups } = observatoryTopology;
    render(
      <NodeGraph title="Network" nodes={nodes} edges={edges} groups={groups} height="480px" />,
    );
    expect(screen.getAllByRole('option')).toHaveLength(60);
    for (const label of ['North America', 'South America', 'Europe', 'Asia-Pacific']) {
      expect(screen.getByText(label, { exact: true })).toBeInTheDocument();
    }
    // Fitted, the whole graph is in view; zoomed in, the minimap shows where you are.
    if (!isPhone) {
      expect(document.querySelector('[data-canvas-minimap]')).toBeNull();
    }
    await userEvent.click(screen.getByRole('button', { name: /reset to 100%/ }));
    await expect.poll(() => document.querySelector('[data-canvas-minimap]')).not.toBeNull();
  });

  it('draws animated edges with flowing dots', () => {
    const { container } = render(
      <Pipeline edges={pipelineEdges.map((edge) => ({ ...edge, isAnimated: true }))} />,
    );
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    expect(container.querySelectorAll('animate')).toHaveLength(isReduced ? 0 : 4);
  });

  it.runIf(isDesktop)('edits from the keyboard: nudge, connect and delete', async () => {
    const onChange = vi.fn<(graph: GraphValue) => void>();
    render(<Sketch onChange={onChange} />);
    option('Sky sensor').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange.mock.lastCall?.[0].nodes[0]?.position).toEqual({ x: 1, y: 0 });
    // C, then Enter on the target, connects.
    await userEvent.keyboard('c');
    expect(screen.getAllByText(/Choose the node to connect Sky sensor to/).length).toBeGreaterThan(
      0,
    );
    option('Night log').focus();
    await userEvent.keyboard('{Enter}');
    expect(onChange.mock.lastCall?.[0].edges.map((edge) => edge.id)).toEqual([
      'sensor-dome',
      'sensor-log',
    ]);
    // Delete removes the node and its edges.
    await userEvent.click(option('Sky sensor'));
    await userEvent.keyboard('{Delete}');
    const last = onChange.mock.lastCall?.[0];
    expect(last?.nodes.map((node) => node.id)).toEqual(['dome', 'log']);
    expect(last?.edges).toEqual([]);
  });

  it('connects nodes by dragging from a port', async () => {
    const onChange = vi.fn<(graph: GraphValue) => void>();
    render(<Sketch onChange={onChange} />);
    const port = document.querySelector('[data-canvas-item="dome"] [data-graph-port]');
    const target = option('Night log').getBoundingClientRect();
    if (!port) {
      throw new Error('No port');
    }
    const start = port.getBoundingClientRect();
    const init = { bubbles: true, cancelable: true, pointerId: 7, isPrimary: true, button: 0 };
    port.dispatchEvent(
      new PointerEvent('pointerdown', { ...init, clientX: start.x + 4, clientY: start.y + 4 }),
    );
    const end = { clientX: target.x + target.width / 2, clientY: target.y + target.height / 2 };
    port.dispatchEvent(new PointerEvent('pointermove', { ...init, ...end }));
    port.dispatchEvent(new PointerEvent('pointerup', { ...init, ...end }));
    await expect
      .poll(() => onChange.mock.lastCall?.[0].edges.map((edge) => edge.id))
      .toEqual(['sensor-dome', 'dome-log']);
  });

  it('removes connections and nodes from the list view when editable', async () => {
    const onChange = vi.fn<(graph: GraphValue) => void>();
    render(<Sketch onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'View as list' }));
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Remove the connection from Sky sensor to Dome controller',
      }),
    );
    expect(onChange.mock.lastCall?.[0].edges).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Night log' }));
    expect(onChange.mock.lastCall?.[0].nodes.map((node) => node.id)).toEqual(['sensor', 'dome']);
  });

  it('takes its strings from UIProvider', () => {
    render(
      // The lead adds GraphMessages to the Messages union; until then the override needs a cast.
      <UIProvider messages={{ graphViewAsList: 'Liste' }}>
        <Pipeline />
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: 'Liste' })).toBeInTheDocument();
  });
});
