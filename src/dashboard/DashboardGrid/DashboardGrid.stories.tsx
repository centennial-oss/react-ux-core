import type { Meta, StoryObj } from '@storybook/react-vite';
import { useCallback, useState } from 'react';
import type { LayoutEntry } from '../layout/engine';
import { DashboardGrid, type DashboardGridItem } from './DashboardGrid';
import type { DashboardGridItemEnv } from './GridCell';

const meta = {
  title: 'Dashboard/DashboardGrid',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const panels: DashboardGridItem[] = [
  { id: 'load', label: 'Grid load', kind: 'Panel', layout: { x: 0, y: 0, w: 8, h: 4 } },
  { id: 'alerts', label: 'Alerts', kind: 'Panel', layout: { x: 8, y: 0, w: 4, h: 2 } },
  { id: 'crews', label: 'Crews', kind: 'Panel', layout: { x: 8, y: 2, w: 4, h: 2 } },
  {
    id: 'feeders',
    label: 'Feeders',
    kind: 'Panel',
    layout: { x: 0, y: 4, w: 6, h: 3 },
    minSize: { w: 3, h: 2 },
  },
  { id: 'outages', label: 'Outages', kind: 'Panel', layout: { x: 6, y: 4, w: 6, h: 3 } },
];

/** A host's own panel: the grid knows nothing about what it draws (ARCH-02). */
function Panel({ item, env }: { item: DashboardGridItem; env: DashboardGridItemEnv }) {
  return (
    <section
      aria-label={item.label}
      className="flex size-full min-h-0 flex-col gap-1 overflow-hidden rounded-card border border-border bg-surface-2 p-3 ps-12 text-fg shadow-raised"
    >
      <h3 className="truncate text-sm font-semibold">{item.label}</h3>
      <p className="text-xs text-fg-muted tabular-nums">{`${String(env.cell.w)} × ${String(env.cell.h)}`}</p>
    </section>
  );
}

function usePanelRenderer() {
  return useCallback(
    (item: DashboardGridItem, env: DashboardGridItemEnv) => <Panel item={item} env={env} />,
    [],
  );
}

/** Panels on the default 12-column grid. Phones stack them; tablets halve the columns. */
export const Basic: Story = {
  render: function Render() {
    return (
      <DashboardGrid
        aria-label="Operations"
        items={panels}
        renderItem={usePanelRenderer()}
        height="36rem"
      />
    );
  },
};

/**
 * Edit mode: drag a panel by its handle, or resize it from its edges and corners, with a live preview. Keyboard:
 * focus a handle, press Enter, then the arrow keys move it and Shift with the arrow keys resizes it; Enter places it
 * and Escape puts it back. Every step is announced.
 */
export const Editable: Story = {
  render: function Render() {
    return (
      <DashboardGrid
        aria-label="Operations"
        items={panels}
        renderItem={usePanelRenderer()}
        isEditable
        height="36rem"
      />
    );
  },
};

/** The layout controlled by the app, which keeps it (here, shown below the grid). */
export const ControlledLayout: Story = {
  tags: ['!visual'],
  render: function Render() {
    const [layout, setLayout] = useState<LayoutEntry[]>();
    return (
      <div className="flex flex-col gap-2">
        <DashboardGrid
          aria-label="Operations"
          items={panels}
          renderItem={usePanelRenderer()}
          isEditable
          layout={layout}
          onLayoutChange={setLayout}
          height="30rem"
        />
        <pre className="max-h-40 overflow-auto px-3 text-xs">
          {JSON.stringify(layout ?? 'not changed yet')}
        </pre>
      </div>
    );
  },
};

/** A locked panel stays put; the others move around it (EDIT-15). */
export const Locked: Story = {
  render: function Render() {
    const items = panels.map((panel) =>
      panel.id === 'alerts' ? { ...panel, isLocked: true } : panel,
    );
    return (
      <DashboardGrid
        aria-label="Operations"
        items={items}
        renderItem={usePanelRenderer()}
        isEditable
        height="36rem"
      />
    );
  },
};

/** Rows of a fixed height, 24 columns, compact spacing and no compaction: settings come from props (GRID-01). */
export const GridSettings: Story = {
  render: function Render() {
    return (
      <DashboardGrid
        aria-label="Operations"
        items={panels.map((panel) => ({
          ...panel,
          layout: { ...panel.layout, x: (panel.layout.x ?? 0) * 2, w: panel.layout.w * 2 },
        }))}
        renderItem={usePanelRenderer()}
        grid={{
          columns: 24,
          rowSizing: 'fixed',
          rowHeight: '3rem',
          density: 'compact',
          compaction: 'none',
        }}
        height="36rem"
      />
    );
  },
};

/** Scaled up as on a large display (RESP-07): the gaps, padding and `--dashboard-scale` grow with it. */
export const LargeDisplayScale: Story = {
  render: function Render() {
    return (
      <DashboardGrid
        aria-label="Operations"
        items={panels}
        renderItem={usePanelRenderer()}
        grid={{ contentScale: 1.5 }}
        height="36rem"
      />
    );
  },
};
