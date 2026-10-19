import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { describedText } from '../../test/clipboard';
import { parabolaAndSine, vertexPoint } from '../../test/math';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import { CoordinatePlane, type CoordinatePlaneProps, type PlanePoint } from './CoordinatePlane';
import type { MathMessages } from './messages';

const isDesktop = window.innerWidth >= 1024;
const isTouch = navigator.maxTouchPoints > 0;

function Plane(props: Partial<CoordinatePlaneProps>) {
  return (
    <div className="p-2">
      <CoordinatePlane
        title="Parabola and sine"
        xRange={[-4, 4]}
        yRange={[-3, 3]}
        functions={parabolaAndSine}
        points={[vertexPoint]}
        draggablePointIds={['vertex']}
        dragStep={1}
        {...props}
      />
    </div>
  );
}

/** Dispatches a pointer event at a client position. */
function pointer(
  element: Element,
  type: string,
  clientX: number,
  clientY: number,
  pointerType = 'mouse',
) {
  element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      pointerId: 7,
      pointerType,
      isPrimary: true,
      button: type === 'pointermove' ? -1 : 0,
      buttons: type === 'pointerup' ? 0 : 1,
    }),
  );
}

async function plot() {
  const group = await screen.findByRole('group', { name: 'Parabola and sine' });
  await expect.poll(() => group.querySelector('svg')).not.toBeNull();
  return group;
}

describe('CoordinatePlane', () => {
  it('draws both functions, the shaded area and the axes', async () => {
    render(<Plane />);
    const group = await plot();
    const curves = group.querySelectorAll('path[fill="none"]');
    expect(curves).toHaveLength(2);
    expect(curves[0]?.getAttribute('class')).toContain('stroke-chart-1');
    expect(curves[1]?.getAttribute('stroke-dasharray')).toBe('6 4');
    const area = group.querySelector('path.fill-chart-1\\/20');
    expect(area?.getAttribute('d')).toMatch(/Z$/);
    // The legend names each function with its TeX label as MathML.
    const legend = screen.getByRole('list', { name: 'Functions' });
    expect(within(legend).getAllByRole('listitem')).toHaveLength(2);
    expect(legend.querySelector('math msup')).not.toBeNull();
  });

  it('breaks a curve at a discontinuity', async () => {
    render(
      <Plane functions={[{ id: 'reciprocal', label: 'y = 1/x', fn: (x) => 1 / x }]} points={[]} />,
    );
    const group = await plot();
    const d = group.querySelector('path[fill="none"]')?.getAttribute('d') ?? '';
    expect(d.match(/M/g)).toHaveLength(2);
  });

  it('labels x ticks at multiples of π', async () => {
    render(<Plane xRange={[-2 * Math.PI, 2 * Math.PI]} xTickFormat="pi" points={[]} />);
    const group = await plot();
    const labels = [...group.querySelectorAll('text')].map((text) => text.textContent);
    expect(labels).toContain('π');
    expect(labels).toContain('−π');
  });

  it('describes the plane and each function’s features', async () => {
    render(<Plane />);
    const group = await plot();
    const description = describedText(group);
    expect(description).toEqual(
      expect.stringContaining(
        'Coordinate plane, x from -4 to 4, y from -3 to 3. 2 functions. 1 point.',
      ),
    );
    expect(description).toEqual(expect.stringContaining('minimum at (0, −2)'));
    expect(description).toEqual(expect.stringContaining('Use the arrow keys to pan'));
  });

  it('moves a draggable point with the arrow keys, announcing its coordinates', async () => {
    const onPointMove = vi.fn();
    render(<Plane onPointMove={onPointMove} />);
    await plot();
    const vertex = screen.getByRole('button', { name: 'Vertex, (0, -2)' });
    expect(describedText(vertex)).toBe('Drag, or use the arrow keys, to move this point.');
    vertex.focus();
    await userEvent.keyboard('{ArrowRight}{ArrowUp}');
    expect(onPointMove).toHaveBeenLastCalledWith('vertex', 1, -1);
    expect(screen.getByRole('button', { name: 'Vertex, (1, -1)' })).toHaveFocus();
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe(
      'Vertex moved to (1, -1)',
    );
  });

  it('drags a point with the pointer, snapping to the drag step', async () => {
    const onPointMove = vi.fn();
    render(<Plane onPointMove={onPointMove} />);
    const group = await plot();
    const vertex = screen.getByRole('button', { name: /Vertex/ });
    const rect = group.getBoundingClientRect();
    // (2, 1) in data coordinates: x from -4 to 4, y from 3 down to −3.
    const targetX = rect.left + (6 / 8) * rect.width;
    const targetY = rect.top + (2 / 6) * rect.height;
    const start = vertex.getBoundingClientRect();
    pointer(vertex, 'pointerdown', start.left + 8, start.top + 8);
    pointer(vertex, 'pointermove', targetX, targetY);
    pointer(vertex, 'pointerup', targetX, targetY);
    expect(onPointMove).toHaveBeenLastCalledWith('vertex', 2, 1);
    await expect
      .poll(() => document.querySelector('[aria-live="polite"]')?.textContent)
      .toBe('Vertex moved to (2, 1)');
  });

  it('follows the app’s coordinates when controlled', async () => {
    function Controlled() {
      const [vertex, setVertex] = useState<PlanePoint>({ ...vertexPoint });
      return (
        <>
          <Plane
            points={[vertex]}
            onPointMove={(id, x, y) => {
              setVertex({ ...vertex, x, y: Math.max(-2, y) });
            }}
          />
          <output>{`${String(vertex.x)},${String(vertex.y)}`}</output>
        </>
      );
    }
    render(<Controlled />);
    await plot();
    screen.getByRole('button', { name: /Vertex/ }).focus();
    await userEvent.keyboard('{ArrowLeft}{ArrowDown}');
    expect(screen.getByRole('status').textContent).toBe('-1,-2');
    expect(screen.getByRole('button', { name: 'Vertex, (-1, -2)' })).toBeInTheDocument();
  });

  it('reads (x, f(x)) under the pointer', async () => {
    render(<Plane />);
    const group = await plot();
    expect(screen.getByText('Point at or touch the plot to read its values.')).toBeInTheDocument();
    const rect = group.getBoundingClientRect();
    // x = 1.
    pointer(group, 'pointermove', rect.left + (5 / 8) * rect.width, rect.top + rect.height / 2);
    await expect.poll(() => screen.queryByText(/^x = 1/)).not.toBeNull();
    expect(document.body.textContent).toContain('(1, -1)');
    expect(group.querySelector('line[stroke-dasharray="4 3"]')).not.toBeNull();
  });

  it('zooms with the buttons and resets the view', async () => {
    render(<Plane />);
    const group = await plot();
    const labelsBefore = [...group.querySelectorAll('text')].map((text) => text.textContent);
    expect(screen.queryByRole('button', { name: 'Reset view' })).toBeNull();
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
    if (isTouch) {
      await commands.tap('[aria-label="Zoom in"]');
      await commands.tap('[aria-label="Zoom in"]');
    } else {
      await userEvent.click(zoomIn);
      await userEvent.click(zoomIn);
    }
    expect(describedText(group)).toEqual(expect.stringContaining('x from -2.56 to 2.56'));
    const reset = screen.getByRole('button', { name: 'Reset view' });
    await userEvent.click(reset);
    expect([...group.querySelectorAll('text')].map((text) => text.textContent)).toEqual(
      labelsBefore,
    );
  });

  it.skipIf(!isDesktop)('pans and zooms by keyboard', async () => {
    render(<Plane />);
    const group = await plot();
    group.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(describedText(group)).toEqual(expect.stringContaining('x from -3.2 to 4.8'));
    await userEvent.keyboard('-');
    expect(describedText(group)).toEqual(expect.stringContaining('x from -4.2 to 5.8'));
    await userEvent.keyboard('0');
    expect(describedText(group)).toEqual(expect.stringContaining('x from -4 to 4'));
  });

  it.skipIf(!isDesktop)('pans by dragging and zooms with the wheel', async () => {
    render(<Plane />);
    const group = await plot();
    const rect = group.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    pointer(group, 'pointerdown', rect.left + rect.width / 2, midY);
    pointer(group, 'pointermove', rect.left + rect.width / 4, midY);
    pointer(group, 'pointerup', rect.left + rect.width / 4, midY);
    await expect
      .poll(() => describedText(group))
      .toEqual(expect.stringContaining('x from -2 to 6'));
    group.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: -200,
        clientX: rect.left + rect.width / 2,
        clientY: midY,
      }),
    );
    await expect
      .poll(() => describedText(group))
      .not.toEqual(expect.stringContaining('x from -2 to 6'));
    expect(screen.getByRole('button', { name: 'Reset view' })).toBeInTheDocument();
  });

  it('shows sampled values as a table', async () => {
    render(
      <Plane
        functions={[...parabolaAndSine, { id: 'log', label: 'y = \\ln x', fn: Math.log }]}
        tableStep={1}
      />,
    );
    await plot();
    await userEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const region = screen.getByRole('region', { name: 'Sampled values' });
    const table = within(region).getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(10);
    expect(within(table).getAllByRole('columnheader')).toHaveLength(4);
    const [, firstRow = document.body] = rows;
    const first = within(firstRow).getAllByRole('cell');
    expect(within(firstRow).getByRole('rowheader').textContent).toBe('-4');
    expect(first[0]?.textContent).toBe('14');
    expect(first[2]?.textContent).toBe('Undefined');
    expect(screen.getByRole('button', { name: 'View as table' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('turns off pan and zoom when not interactive', async () => {
    render(<Plane isInteractive={false} />);
    await plot();
    expect(screen.queryByRole('button', { name: 'Zoom in' })).toBeNull();
  });

  it('takes its strings from UIProvider', async () => {
    const messages: Partial<MathMessages> = {
      planeZoomIn: 'Agrandir',
      planePoint: ({ label, x, y }) => `${label} en (${x} ; ${y})`,
    };
    render(
      <UIProvider messages={messages as Partial<Messages>}>
        <Plane />
      </UIProvider>,
    );
    await plot();
    expect(screen.getByRole('button', { name: 'Agrandir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vertex en (0 ; -2)' })).toBeInTheDocument();
  });

  it('never makes the page scroll sideways', async () => {
    render(<Plane />);
    await plot();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Plane
        segments={[{ id: 'v', from: [0, 0], to: [2, 1], label: 'v', isVector: true }]}
        polygons={[
          {
            id: 't',
            points: [
              [-3, -1],
              [-1, -1],
              [-2, 1],
            ],
            label: 'T',
          },
        ]}
      />,
    );
    await plot();
    await expectNoAxeViolations(container);
  });
});
