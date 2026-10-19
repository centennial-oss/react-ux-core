import { act, render, screen, within } from '@testing-library/react';
import { Profiler, useCallback, useEffect, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import type { LayoutEntry } from '../layout/engine';
import type { GridSpec } from '../layout/metrics';
import { DashboardGrid, type DashboardGridItem, type DashboardGridProps } from './DashboardGrid';
import type { DashboardGridItemEnv } from './GridCell';

const isDesktop = window.innerWidth >= 1024;
const isPhone = window.innerWidth < 640;

const items: DashboardGridItem[] = [
  { id: 'a', label: 'Alpha', kind: 'Chart', layout: { x: 0, y: 0, w: 4, h: 2 } },
  { id: 'b', label: 'Beta', kind: 'Table', layout: { x: 8, y: 0, w: 4, h: 2 } },
  { id: 'c', label: 'Gamma', kind: 'Map', layout: { x: 0, y: 2, w: 4, h: 2 } },
];

const renders: Record<string, number> = {};

function Item({ item, env }: { item: DashboardGridItem; env: DashboardGridItemEnv }) {
  useEffect(() => {
    renders[item.id] = (renders[item.id] ?? 0) + 1;
  });
  return (
    <div
      role="group"
      aria-label={item.label}
      className="size-full rounded-card border border-border bg-surface-2 p-2"
    >
      <p>{`${item.label} ${String(env.cell.w)}x${String(env.cell.h)} ${env.isNearViewport ? 'near' : 'far'}`}</p>
      {env.onMoveResize && (
        <button type="button" onClick={env.onMoveResize}>
          {`Arrange ${item.label}`}
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          env.onExpandChange(!env.isExpanded);
        }}
      >
        {`Expand ${item.label}`}
      </button>
    </div>
  );
}

function Grid(
  props: Partial<DashboardGridProps<DashboardGridItem>> & { grid?: Partial<GridSpec> },
) {
  const renderItem = useCallback(
    (item: DashboardGridItem, env: DashboardGridItemEnv) => <Item item={item} env={env} />,
    [],
  );
  return (
    <UIProvider>
      <DashboardGrid
        items={items}
        renderItem={renderItem}
        aria-label="Operations"
        height="600px"
        {...props}
      />
    </UIProvider>
  );
}

const cell = (id: string) => document.querySelector<HTMLElement>(`[data-item-id="${id}"]`);
const live = () => document.querySelector('[aria-live="polite"]')?.textContent ?? '';
const box = (id: string) => {
  const rect = cell(id)?.getBoundingClientRect();
  return {
    left: Math.round(rect?.left ?? 0),
    top: Math.round(rect?.top ?? 0),
    width: Math.round(rect?.width ?? 0),
  };
};

function pointer(
  element: Element,
  type: string,
  clientX: number,
  clientY: number,
  pointerType = 'mouse',
) {
  element.dispatchEvent(
    new PointerEvent(type, {
      clientX,
      clientY,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      pointerId: 9,
      pointerType,
      bubbles: true,
      cancelable: true,
    }),
  );
}

/** The grid's step between columns and rows, measured from cells 8 columns and 2 rows apart. */
function steps() {
  const a = cell('a')?.getBoundingClientRect();
  const b = cell('b')?.getBoundingClientRect();
  const c = cell('c')?.getBoundingClientRect();
  return { x: ((b?.left ?? 0) - (a?.left ?? 0)) / 8, y: ((c?.top ?? 0) - (a?.top ?? 0)) / 2 };
}

describe('DashboardGrid', () => {
  it('is a labelled region with its items in reading order (A11Y-02, GRID-08)', () => {
    render(<Grid />);
    const region = screen.getByRole('region', { name: 'Operations' });
    expect(
      within(region)
        .getAllByRole('group')
        .map((group) => group.getAttribute('aria-label')),
    ).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(region.style.getPropertyValue('--dashboard-scale')).toBe('1');
  });

  it('auto-places items given only sizes, without overlap (GRID-06, acceptance 1)', () => {
    render(
      <Grid
        items={[
          { id: 'a', label: 'Alpha', layout: { w: 6, h: 2 } },
          { id: 'b', label: 'Beta', layout: { w: 6, h: 2 } },
          { id: 'c', label: 'Gamma', layout: { w: 12, h: 2 } },
        ]}
      />,
    );
    const [a, b, c] = ['a', 'b', 'c'].map(box);
    if (isDesktop) {
      expect(a?.top).toBe(b?.top);
      expect((b?.left ?? 0) > (a?.left ?? 0)).toBe(true);
    }
    expect((c?.top ?? 0) > (a?.top ?? 0)).toBe(true);
  });

  it.runIf(isPhone)(
    'stacks items full width in reading order on a phone (RESP-14, acceptance 5)',
    () => {
      render(
        <Grid
          items={[
            { id: 'b', label: 'Beta', layout: { x: 6, y: 0, w: 6, h: 3 }, stackedHeight: 5 },
            { id: 'a', label: 'Alpha', layout: { x: 0, y: 0, w: 6, h: 2 } },
          ]}
        />,
      );
      const groups = screen.getAllByRole('group');
      expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual(['Alpha', 'Beta']);
      const [alpha, beta] = [
        cell('a')?.getBoundingClientRect(),
        cell('b')?.getBoundingClientRect(),
      ];
      expect(Math.round(alpha?.width ?? 0)).toBe(Math.round(beta?.width ?? 0));
      expect((beta?.top ?? 0) > (alpha?.bottom ?? 0)).toBe(true);
      // Beta's hint is 5 rows; Alpha's own height (2) is held to at least 4.
      expect(Math.round(beta?.height ?? 0) > Math.round(alpha?.height ?? 0)).toBe(true);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        document.documentElement.clientWidth,
      );
    },
  );

  it.runIf(!isDesktop && !isPhone)(
    'derives a narrower layout and offers no dragging there (RESP-04, RESP-06)',
    () => {
      render(<Grid isEditable />);
      expect(screen.getByText('Arrange widgets on a wider screen')).toBeTruthy();
      expect(screen.queryByRole('button', { name: /^Move Alpha/ })).toBeNull();
      expect(screen.getByText(/Alpha 2x2/)).toBeTruthy();
    },
  );

  it('marks items near the viewport so they can load (WID-16)', async () => {
    render(<Grid />);
    await expect.poll(() => screen.getByText(/^Alpha/).textContent).toContain('near');
  });

  it('stops rendering once settled', async () => {
    let commits = 0;
    render(
      <Profiler
        id="grid"
        onRender={() => {
          commits += 1;
        }}
      >
        <Grid isEditable />
      </Profiler>,
    );
    const settled = async () => {
      const before = commits;
      await new Promise((resolve) => setTimeout(resolve, 200));
      return commits - before;
    };
    await expect.poll(settled, { timeout: 5000 }).toBe(0);
  });

  it('passes axe in view and edit mode', async () => {
    const { container, rerender } = render(<Grid />);
    await expectNoAxeViolations(container);
    rerender(<Grid isEditable />);
    await expectNoAxeViolations(container);
  });
});

describe.runIf(isDesktop)('DashboardGrid editing', () => {
  it('labels each handle with the widget’s title, type, position and size (EDIT-32)', () => {
    render(<Grid isEditable />);
    expect(
      screen.getByRole('button', { name: 'Move Alpha (Chart), column 1, row 1, 4 by 2' }),
    ).toBeTruthy();
  });

  it('moves and resizes from the keyboard, announcing each step (acceptance 11)', async () => {
    const onLayoutChange = vi.fn();
    render(<Grid isEditable onLayoutChange={onLayoutChange} />);
    const handle = screen.getByRole('button', { name: /^Move Alpha/ });
    handle.focus();
    await userEvent.keyboard('{Enter}');
    expect(live()).toContain('Moving Alpha');
    await userEvent.keyboard('{ArrowRight}');
    expect(live()).toBe('Alpha, column 2, row 1');
    await userEvent.keyboard('{ArrowRight}');
    expect(live()).toBe('Alpha, column 3, row 1');
    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
    expect(live()).toBe('Alpha, 4 by 3');
    await userEvent.keyboard('{Enter}');
    expect(live()).toBe('Alpha placed at column 3, row 1, 4 by 3.');
    const layout = onLayoutChange.mock.calls[0]?.[0] as LayoutEntry[];
    expect(layout.find((item) => item.id === 'a')).toMatchObject({ x: 2, y: 0, w: 4, h: 3 });
    // Focus stays on the moved widget's handle (EDIT-33).
    await expect
      .poll(() => document.activeElement?.getAttribute('aria-label'))
      .toMatch(/^Move Alpha/);
  });

  it('puts the widget back with Escape', async () => {
    const onLayoutChange = vi.fn();
    render(<Grid isEditable onLayoutChange={onLayoutChange} />);
    screen.getByRole('button', { name: /^Move Alpha/ }).focus();
    await userEvent.keyboard('{Enter}{ArrowRight}{Escape}');
    expect(live()).toBe('Alpha is back where it was.');
    expect(onLayoutChange).not.toHaveBeenCalled();
  });

  it('drags a widget onto another with a live preview, and commits on release (acceptance 10)', async () => {
    const onLayoutChange = vi.fn();
    render(<Grid isEditable onLayoutChange={onLayoutChange} />);
    const step = steps();
    const before = { a: box('a'), c: box('c') };
    const handle = screen.getByRole('button', { name: /^Move Alpha/ });
    const start = handle.getBoundingClientRect();
    const x = start.left + start.width / 2;
    const y = start.top + start.height / 2;
    // Settled first: every item near the viewport, so nothing changes for them but the drag.
    await expect
      .poll(() => screen.getAllByRole('group').every((group) => group.textContent.includes('near')))
      .toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 100));
    for (const key of Object.keys(renders)) {
      renders[key] = 0;
    }
    pointer(handle, 'pointerdown', x, y);
    pointer(handle, 'pointermove', x, y + step.y / 2);
    pointer(handle, 'pointermove', x, y + step.y * 2);
    // The placeholder shows where Alpha lands; Gamma has already moved up into its place.
    await expect.poll(() => document.querySelector('.border-dashed') !== null).toBe(true);
    await expect.poll(() => box('c').top).toBe(before.a.top);
    expect(cell('a')?.style.translate).not.toBe('');
    // Only what moves re-renders, and no widget re-renders its content (PERF-02).
    expect(renders).toEqual({ a: 0, b: 0, c: 0 });
    pointer(handle, 'pointerup', x, y + step.y * 2);
    const layout = onLayoutChange.mock.calls[0]?.[0] as LayoutEntry[];
    expect(layout.find((item) => item.id === 'a')).toMatchObject({ x: 0, y: 2 });
    expect(layout.find((item) => item.id === 'c')).toMatchObject({ x: 0, y: 0 });
    expect(live()).toBe('Alpha placed at column 1, row 3, 4 by 2.');
    expect(cell('a')?.style.translate).toBe('');
  });

  it('cancels a drag with Escape, restoring the layout (EDIT-12)', async () => {
    const onLayoutChange = vi.fn();
    render(<Grid isEditable onLayoutChange={onLayoutChange} />);
    const step = steps();
    const before = box('c');
    const handle = screen.getByRole('button', { name: /^Move Alpha/ });
    const start = handle.getBoundingClientRect();
    const x = start.left + 10;
    const y = start.top + 10;
    pointer(handle, 'pointerdown', x, y, 'touch');
    pointer(handle, 'pointermove', x, y + step.y * 2, 'touch');
    await expect.poll(() => box('c').top).not.toBe(before.top);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => box('c').top).toBe(before.top);
    expect(document.querySelector('.border-dashed')).toBeNull();
    pointer(handle, 'pointerup', x, y + step.y * 2, 'touch');
    expect(onLayoutChange).not.toHaveBeenCalled();
  });

  it('resizes from an edge, held to the item’s limits (EDIT-16, EDIT-17)', async () => {
    const onLayoutChange = vi.fn();
    render(
      <Grid
        isEditable
        onLayoutChange={onLayoutChange}
        items={items.map((item) => (item.id === 'a' ? { ...item, maxSize: { w: 6, h: 8 } } : item))}
      />,
    );
    const step = steps();
    const edge = cell('a')?.querySelector('[data-resize-anchor="e"]');
    if (!edge) {
      throw new Error('No resize edge');
    }
    const rect = edge.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    pointer(edge, 'pointerdown', x, y);
    pointer(edge, 'pointermove', x + step.x * 5, y);
    // Wider than its maximum of 6 is held to 6, during the drag (EDIT-17).
    await expect.poll(() => document.querySelector('.border-dashed')?.textContent).toBe('6 × 2');
    pointer(edge, 'pointerup', x + step.x * 5, y);
    const layout = onLayoutChange.mock.calls[0]?.[0] as LayoutEntry[];
    expect(layout.find((item) => item.id === 'a')).toMatchObject({ x: 0, w: 6, h: 2 });
  });

  it('moves and resizes with the Move/Resize dialog (EDIT-18)', async () => {
    const onLayoutChange = vi.fn();
    render(<Grid isEditable onLayoutChange={onLayoutChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Arrange Gamma' }));
    const dialog = await screen.findByRole('dialog', { name: 'Move or resize Gamma' });
    const column = within(dialog).getByRole('textbox', { name: 'Column' });
    await userEvent.clear(column);
    await userEvent.type(column, '5');
    const width = within(dialog).getByRole('textbox', { name: 'Width' });
    await userEvent.clear(width);
    await userEvent.type(width, '6');
    await userEvent.tab();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));
    const layout = onLayoutChange.mock.calls[0]?.[0] as LayoutEntry[];
    expect(layout.find((item) => item.id === 'c')).toMatchObject({ x: 4, w: 6 });
  });

  it('keeps an uncontrolled layout, and follows a controlled one (ARCH-02)', async () => {
    function Controlled() {
      const [layout, setLayout] = useState<LayoutEntry[]>([
        { id: 'a', x: 0, y: 0, w: 4, h: 2 },
        { id: 'b', x: 8, y: 0, w: 4, h: 2 },
        { id: 'c', x: 4, y: 0, w: 4, h: 2 },
      ]);
      return (
        <>
          <Grid isEditable layout={layout} onLayoutChange={setLayout} />
          <output>{JSON.stringify(layout.find((item) => item.id === 'a'))}</output>
        </>
      );
    }
    render(<Controlled />);
    expect(
      screen.getByRole('button', { name: /^Move Gamma \(Map\), column 5, row 1/ }),
    ).toBeTruthy();
    screen.getByRole('button', { name: /^Move Alpha/ }).focus();
    await userEvent.keyboard('{Enter}{Shift>}{ArrowDown}{/Shift}{Enter}');
    await expect.poll(() => document.querySelector('output')?.textContent).toContain('"h":3');
  });

  it('never moves locked items, which show no handle (EDIT-15, EDIT-21)', () => {
    render(
      <Grid
        isEditable
        items={items.map((item) => (item.id === 'b' ? { ...item, isLocked: true } : item))}
      />,
    );
    expect(screen.queryByRole('button', { name: /^Move Beta/ })).toBeNull();
    expect(screen.getByRole('button', { name: /^Move Alpha/ })).toBeTruthy();
  });

  it('expands an item over the grid until closed (WID-08)', async () => {
    render(<Grid />);
    await userEvent.click(screen.getByRole('button', { name: 'Expand Beta' }));
    const region = screen.getByRole('region', { name: 'Operations' });
    await expect
      .poll(() => box('b').width)
      .toBeGreaterThan(region.getBoundingClientRect().width / 2);
    expect(cell('a')?.hasAttribute('inert')).toBe(true);
    act(() => {
      cell('b')?.querySelector('button')?.focus();
    });
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => cell('a')?.hasAttribute('inert')).toBe(false);
  });
});
