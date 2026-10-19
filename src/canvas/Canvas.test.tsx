import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { UIProvider } from '../provider/UIProvider';
import { Canvas, type CanvasProps } from './Canvas';
import { CanvasItem } from './CanvasItem';
import type { CanvasPoint, CanvasViewport } from './geometry';

const hasTouch = navigator.maxTouchPoints > 0;
const isDesktop = window.innerWidth >= 1024;

interface Shape {
  id: string;
  label: string;
  x: number;
  y: number;
}

const shapes: Shape[] = [
  { id: 'a', label: 'Telescope', x: 20, y: 20 },
  { id: 'b', label: 'Dome', x: 140, y: 20 },
  { id: 'c', label: 'Control room', x: 20, y: 120 },
];

function Scene({
  onMoveEnd,
  ...props
}: Partial<CanvasProps> & { onMoveEnd?: (id: string, position: CanvasPoint) => void }) {
  const [items, setItems] = useState(shapes);
  return (
    <Canvas aria-label="Floor plan" height="400px" {...props}>
      {items.map((shape) => (
        <CanvasItem
          key={shape.id}
          id={shape.id}
          x={shape.x}
          y={shape.y}
          width={80}
          height={40}
          aria-label={shape.label}
          onMoveEnd={(position) => {
            onMoveEnd?.(shape.id, position);
            setItems((current) =>
              current.map((other) => (other.id === shape.id ? { ...other, ...position } : other)),
            );
          }}
        >
          <div className="size-full rounded-control bg-accent-bg" />
        </CanvasItem>
      ))}
    </Canvas>
  );
}

function area(): HTMLElement {
  return screen.getByRole('region', { name: 'Floor plan' });
}

/** Dispatches a synthetic pointer event at a point relative to the canvas's top-left corner. */
function pointer(
  target: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  point: CanvasPoint,
  init: PointerEventInit = {},
) {
  const rect = area().getBoundingClientRect();
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: type === 'pointermove' ? -1 : 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: rect.left + point.x,
      clientY: rect.top + point.y,
      ...init,
    }),
  );
}

function drag(target: Element, from: CanvasPoint, to: CanvasPoint, init: PointerEventInit = {}) {
  pointer(target, 'pointerdown', from, init);
  pointer(target, 'pointermove', { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, init);
  pointer(target, 'pointermove', to, init);
  pointer(target, 'pointerup', to, init);
}

describe('Canvas', () => {
  it('is a named canvas region whose items are options in a list', async () => {
    const { container } = render(<Scene />);
    expect(area()).toHaveAttribute('aria-roledescription', 'canvas');
    const list = screen.getByRole('listbox', { name: 'Items' });
    expect(list).toHaveAttribute('aria-multiselectable', 'true');
    expect(
      within(list)
        .getAllByRole('option')
        .map((option) => option.ariaLabel),
    ).toEqual(['Telescope', 'Dome', 'Control room']);
    expect(screen.getByRole('toolbar', { name: 'Zoom' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('selects with a click, adds with Shift, and clears on empty space', async () => {
    const onSelectionChange = vi.fn();
    render(<Scene onSelectionChange={onSelectionChange} />);
    await userEvent.click(screen.getByRole('option', { name: 'Telescope' }));
    expect(screen.getByRole('option', { name: 'Telescope' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.keyboard('{Shift>}');
    await userEvent.click(screen.getByRole('option', { name: 'Dome' }));
    await userEvent.keyboard('{/Shift}');
    expect(onSelectionChange).toHaveBeenLastCalledWith(['a', 'b']);
    await userEvent.click(area(), { position: { x: 300, y: 350 } });
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    expect(screen.getByRole('option', { name: 'Telescope' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it.runIf(isDesktop)(
    'nudges with the arrow keys, by a grid step with Shift, and asks to delete',
    async () => {
      const onMoveEnd = vi.fn();
      const onDelete = vi.fn();
      render(<Scene grid={{ size: 20 }} onMoveEnd={onMoveEnd} onDelete={onDelete} />);
      const telescope = screen.getByRole('option', { name: 'Telescope' });
      expect(telescope).toHaveAccessibleDescription(
        'Arrow keys move it, Shift and arrow keys move it a grid step, Delete removes it.',
      );
      telescope.focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(onMoveEnd).toHaveBeenLastCalledWith('a', { x: 21, y: 20 });
      await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
      expect(onMoveEnd).toHaveBeenLastCalledWith('a', { x: 21, y: 40 });
      await expect
        .poll(() => document.querySelector('[aria-live="polite"]')?.textContent)
        .toBe('Moved to 21, 40');
      await userEvent.keyboard('{Delete}');
      expect(onDelete).toHaveBeenLastCalledWith(['a']);
    },
  );

  it.runIf(isDesktop)('moves the whole selection together', async () => {
    const onMoveEnd = vi.fn();
    render(<Scene defaultSelection={['a', 'c']} onMoveEnd={onMoveEnd} />);
    screen.getByRole('option', { name: 'Telescope' }).focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onMoveEnd).toHaveBeenCalledWith('a', { x: 20, y: 19 });
    expect(onMoveEnd).toHaveBeenCalledWith('c', { x: 20, y: 119 });
    expect(onMoveEnd).not.toHaveBeenCalledWith('b', expect.anything());
  });

  it('drags an item, snapping to the grid unless Alt is held', async () => {
    const onMoveEnd = vi.fn();
    render(<Scene grid={{ size: 20 }} onMoveEnd={onMoveEnd} />);
    const telescope = screen.getByRole('option', { name: 'Telescope' });
    drag(telescope, { x: 60, y: 40 }, { x: 93, y: 58 });
    expect(onMoveEnd).toHaveBeenLastCalledWith('a', { x: 60, y: 40 });
    await expect.poll(() => telescope.style.transform).toBe('translate(60px, 40px)');
    drag(telescope, { x: 100, y: 60 }, { x: 113, y: 67 }, { altKey: true });
    expect(onMoveEnd).toHaveBeenLastCalledWith('a', { x: 73, y: 47 });
  });

  it('selects the items a marquee touches', async () => {
    const onSelectionChange = vi.fn();
    render(<Scene onSelectionChange={onSelectionChange} />);
    drag(area(), { x: 5, y: 5 }, { x: 230, y: 70 });
    expect(onSelectionChange).toHaveBeenLastCalledWith(['a', 'b']);
    await expect
      .poll(() => document.querySelector('[aria-live="polite"]')?.textContent)
      .toBe('2 items selected');
  });

  it('zooms at the cursor with the wheel', async () => {
    const onViewportChange = vi.fn<(viewport: CanvasViewport) => void>();
    render(<Scene onViewportChange={onViewportChange} />);
    const rect = area().getBoundingClientRect();
    area().dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: -200,
        clientX: rect.left + 100,
        clientY: rect.top + 50,
      }),
    );
    await expect.poll(() => onViewportChange.mock.calls.length).toBeGreaterThan(0);
    const viewport = onViewportChange.mock.lastCall?.[0] ?? { x: 0, y: 0, zoom: 1 };
    expect(viewport.zoom).toBeGreaterThan(1);
    // The world point under the cursor (100, 50) stays there.
    expect(viewport.x + 100 / viewport.zoom).toBeCloseTo(100);
    expect(viewport.y + 50 / viewport.zoom).toBeCloseTo(50);
  });

  it('pans with a middle-button drag, even over an item', async () => {
    const onViewportChange = vi.fn<(viewport: CanvasViewport) => void>();
    render(<Scene onViewportChange={onViewportChange} />);
    drag(
      screen.getByRole('option', { name: 'Telescope' }),
      { x: 50, y: 40 },
      { x: 90, y: 100 },
      { button: 1, buttons: 4 },
    );
    await expect
      .poll(() => onViewportChange.mock.lastCall?.[0])
      .toEqual({ x: -40, y: -60, zoom: 1 });
  });

  it('pinches to zoom and pans with two fingers', async () => {
    const onViewportChange = vi.fn<(viewport: CanvasViewport) => void>();
    render(<Scene onViewportChange={onViewportChange} />);
    const touch = { pointerType: 'touch' };
    pointer(area(), 'pointerdown', { x: 100, y: 200 }, { ...touch, pointerId: 11 });
    pointer(area(), 'pointerdown', { x: 200, y: 200 }, { ...touch, pointerId: 12 });
    pointer(area(), 'pointermove', { x: 300, y: 200 }, { ...touch, pointerId: 12 });
    await expect.poll(() => onViewportChange.mock.lastCall?.[0].zoom).toBeCloseTo(2);
    pointer(area(), 'pointerup', { x: 100, y: 200 }, { ...touch, pointerId: 11 });
    pointer(area(), 'pointerup', { x: 300, y: 200 }, { ...touch, pointerId: 12 });
  });

  it('zooms with the controls and announces the level', async () => {
    render(<Scene contentBounds={{ x: 0, y: 0, width: 2000, height: 400 }} />);
    // With no viewport given, the canvas starts fitted to the content bounds.
    const reset = () => screen.getByRole('button', { name: /^Zoom \d+%, reset to 100%$/ });
    expect(Number.parseInt(reset().textContent, 10)).toBeLessThan(100);
    await userEvent.click(reset());
    expect(reset()).toHaveTextContent('100%');
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(reset()).toHaveTextContent('125%');
    await expect
      .poll(() => document.querySelector('[aria-live="polite"]')?.textContent, { timeout: 3000 })
      .toBe('Zoom 125%');
    await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(reset()).toHaveTextContent('100%');
    await userEvent.click(screen.getByRole('button', { name: 'Zoom to fit' }));
    expect(Number.parseInt(reset().textContent, 10)).toBeLessThan(100);
  });

  it.runIf(isDesktop)(
    'shows a focus ring on the canvas and its items from the keyboard',
    async () => {
      // `outline-none` with `focus-visible:outline-2` left the outline style at none: no ring at all.
      render(<Scene />);
      await userEvent.keyboard('{Tab}');
      expect(area()).toHaveFocus();
      expect(getComputedStyle(area()).outlineStyle).toBe('solid');
      await userEvent.keyboard('{Tab}');
      const item = screen.getByRole('option', { name: 'Telescope' });
      expect(item).toHaveFocus();
      expect(getComputedStyle(item).outlineStyle).toBe('solid');
    },
  );

  it.runIf(isDesktop)('zooms and pans from the keyboard', async () => {
    const onViewportChange = vi.fn<(viewport: CanvasViewport) => void>();
    render(<Scene onViewportChange={onViewportChange} />);
    area().focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onViewportChange).toHaveBeenLastCalledWith({ x: 40, y: 0, zoom: 1 });
    await userEvent.keyboard('+');
    expect(onViewportChange.mock.lastCall?.[0].zoom).toBeCloseTo(1.25);
    await userEvent.keyboard('0');
    expect(onViewportChange.mock.lastCall?.[0].zoom).toBe(1);
  });

  it('pans 2,000 items without re-rendering them', async () => {
    let renders = 0;
    function Box() {
      renders++;
      return <div className="size-full bg-accent-bg" />;
    }
    const items = Array.from({ length: 2000 }, (_, index) => (
      <CanvasItem
        key={index}
        id={String(index)}
        x={(index % 50) * 30}
        y={Math.floor(index / 50) * 30}
        width={24}
        height={24}
        aria-label={`Box ${String(index)}`}
      >
        <Box />
      </CanvasItem>
    ));
    const onViewportChange = vi.fn();
    render(
      <Canvas aria-label="Floor plan" height="300px" onViewportChange={onViewportChange} hasMinimap>
        {items}
      </Canvas>,
    );
    const before = renders;
    expect(before).toBe(2000);
    drag(area(), { x: 10, y: 10 }, { x: 60, y: 80 }, { button: 1, buttons: 4 });
    await expect.poll(() => onViewportChange.mock.calls.length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(renders).toBe(before);
  });

  it('draws rulers in world units, labelled with the unit', () => {
    const { container } = render(
      <Scene rulers={{ unit: 'mm' }} defaultViewport={{ x: 0, y: 0, zoom: 1 }} />,
    );
    const rulers = container.querySelector('[aria-hidden="true"].pointer-events-none');
    expect(rulers?.textContent).toContain('mm');
    // Ticks every 100 world units at 100% (the smallest nice step at least 64 px apart).
    expect(
      [...(rulers?.querySelectorAll('text') ?? [])].slice(0, 3).map((text) => text.textContent),
    ).toEqual(['0', '100', '200']);
  });

  it.runIf(hasTouch)('selects an item with a tap', async () => {
    render(<Scene />);
    await commands.tap('[aria-label="Dome"]');
    expect(screen.getByRole('option', { name: 'Dome' })).toHaveAttribute('aria-selected', 'true');
  });

  it('takes its strings from UIProvider', () => {
    render(
      // The lead adds CanvasMessages to the Messages union; until then the override needs a cast.
      <UIProvider messages={{ canvasZoomIn: 'Agrandir' }}>
        <Scene />
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: 'Agrandir' })).toBeInTheDocument();
  });
});
