import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { energyLinks, energyNodes } from '../../test/moreCharts';
import { SankeyChart } from './SankeyChart';
import { sankeyLayout } from './sankeyLayout';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;
const isFine = window.matchMedia('(pointer: fine)').matches;
const ids = energyNodes.map((node) => node.id);

function Energy() {
  return <SankeyChart title="Site energy" nodes={energyNodes} links={energyLinks} unit="MWh" />;
}

describe('sankeyLayout', () => {
  it('puts nodes in columns by their longest path from a source, sinks last', () => {
    const layout = sankeyLayout(ids, energyLinks, 600, 300);
    expect(layout.columns).toBe(3);
    const column = Object.fromEntries(layout.nodes.map((node) => [node.id, node.column]));
    expect(column).toMatchObject({ solar: 0, grid: 0, diesel: 0, board: 1, data: 2, lodging: 2 });
    const board = layout.nodes.find((node) => node.id === 'board');
    expect(board?.value).toBe(1_100);
    expect(board?.x).toBeCloseTo(294);
  });

  it('scales every column alike and keeps nodes inside the box', () => {
    const layout = sankeyLayout(ids, energyLinks, 600, 300, { nodePadding: 10 });
    const grid = layout.nodes.find((node) => node.id === 'grid');
    const solar = layout.nodes.find((node) => node.id === 'solar');
    expect((grid?.height ?? 0) / (solar?.height ?? 1)).toBeCloseTo(610 / 420);
    for (const node of layout.nodes) {
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y + node.height).toBeLessThanOrEqual(300.001);
    }
    // A band is as wide as its share of its node.
    const link = layout.links.find((entry) => entry.source === 'grid');
    expect(link?.width).toBeCloseTo(grid?.height ?? 0);
  });

  it('stacks a node’s bands in the order of the nodes at their other ends', () => {
    const layout = sankeyLayout(ids, energyLinks, 600, 300);
    const out = layout.links
      .filter((link) => link.source === 'board')
      .sort((a, b) => a.y0 - b.y0)
      .map((link) => link.target);
    const targets = layout.nodes
      .filter((node) => node.column === 2)
      .sort((a, b) => a.y - b.y)
      .map((node) => node.id);
    expect(out).toEqual(targets);
  });

  it('leaves out bad flows and survives cycles', () => {
    const layout = sankeyLayout(
      ['a', 'b', 'c'],
      [
        { source: 'a', target: 'b', value: 5 },
        { source: 'b', target: 'a', value: 2 },
        { source: 'a', target: 'a', value: 1 },
        { source: 'a', target: 'zzz', value: 1 },
        { source: 'b', target: 'c', value: -3 },
      ],
      300,
      200,
    );
    expect(layout.links.map((link) => link.index)).toEqual([0, 1]);
    expect(layout.nodes.map((node) => node.id)).toEqual(['a', 'b']);
    expect(layout.columns).toBeLessThanOrEqual(2);
  });
});

describe('SankeyChart', () => {
  it('summarises the total and the largest flow', () => {
    render(<Energy />);
    expect(screen.getByRole('img', { name: 'Site energy' })).toHaveAccessibleDescription(
      '9 nodes and 8 flows, 1,100 MWh in all. Largest flow: Grid to Switchboard, 610 MWh.',
    );
  });

  it('draws a band per flow and a labelled node per node', async () => {
    const { container } = render(<Energy />);
    await expect.poll(() => container.querySelectorAll('[data-link]').length).toBe(8);
    expect(container.querySelectorAll('[data-node]')).toHaveLength(9);
    expect(container.querySelector('[data-node="board"]')?.textContent).toBe('Switchboard1,100');
  });

  it.runIf(isFine)('names a node and highlights its flows on hover', async () => {
    const { container } = render(<Energy />);
    await expect.poll(() => container.querySelectorAll('[data-link]').length).toBe(8);
    const rect = container.querySelector<SVGRectElement>('[data-node="data"] rect');
    if (!rect) {
      throw new Error('no node');
    }
    await userEvent.hover(rect);
    await expect.poll(() => screen.queryByText('Data centre: 380 MWh')).toBeInTheDocument();
    const opacity = (index: number) =>
      container.querySelector(`[data-link="${String(index)}"]`)?.getAttribute('stroke');
    // The switchboard-to-data-centre band stays bright; the solar band dims.
    expect(opacity(5)).not.toBe(opacity(0));
  });

  it('lists every flow with its share of the source in the table view', async () => {
    render(<Energy />);
    await userEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole(isPhone ? 'list' : 'table', { name: 'Site energy' });
    expect(within(table).getAllByText('Switchboard').length).toBeGreaterThan(0);
    expect(within(table).getByText('610')).toBeInTheDocument();
    if (!isPhone) {
      expect(within(table).getByText('34.5%')).toBeInTheDocument();
    }
  });

  it('shows the empty state without flows', () => {
    render(<SankeyChart title="Nothing" nodes={energyNodes} links={[]} />);
    expect(screen.getByRole('heading', { name: 'No data' })).toBeInTheDocument();
  });

  it('fits a phone without scrolling sideways', async () => {
    const { container } = render(
      <div className="p-4">
        <Energy />
      </div>,
    );
    await expect.poll(() => container.querySelectorAll('[data-link]').length).toBe(8);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Energy />);
    await expect.poll(() => container.querySelectorAll('[data-link]').length).toBe(8);
    await expectNoAxeViolations(container);
  });
});
