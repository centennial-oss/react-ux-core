import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Bookmark,
  Building2,
  Factory,
  FileText,
  Folder,
  Gauge,
  LayoutGrid,
  MapPin,
  Plus,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { demoLayers, demoLayerToggles } from '../../../test/layers';
import { MenuItem } from '../Menu/Menu';
import { OverflowMenu } from '../Menu/MenuButtons';
import { moveTreeNodes } from './move';
import { Tree } from './Tree';
import type { TreeNode, TreeNodeLevel2 } from './types';

const meta = {
  title: 'Display/Tree',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const newBadge = <Plus aria-label="New" className="size-4 text-accent-fg" />;

function component(name: string, stories: string[], isNew = false): TreeNodeLevel2 {
  const id = name.toLowerCase();
  return {
    id,
    label: name,
    icon: LayoutGrid,
    tone: 'accent',
    badge: isNew ? newBadge : undefined,
    children: [
      { id: `${id}-docs`, label: 'Docs', icon: FileText, tone: 'warning' },
      ...stories.map((story) => ({
        id: `${id}-${story.toLowerCase().replaceAll(' ', '-')}`,
        label: story,
        icon: Bookmark,
        tone: 'success' as const,
      })),
    ],
  };
}

const library: TreeNode[] = [
  {
    id: 'inputs',
    label: 'Inputs',
    children: [
      component('Checkbox', ['States']),
      component('DatePicker', ['Playground', 'States', 'Side Labels', 'Open With Limits']),
      component('TextField', ['Playground', 'States', 'Side Labels']),
      component('ColorField', ['States'], true),
      component('ScheduleEditor', ['Limits', 'With Problems'], true),
    ],
  },
  {
    id: 'display',
    label: 'Display',
    children: [component('Badge', ['Tones']), component('Pillbox', ['Sizes', 'With Icons'])],
  },
];

/**
 * A Storybook-style sidebar: category headings, components with coloured icons and "new" badges, and their pages.
 * Only pages are selectable (`selectableNodes="leaves"`): pressing a component opens it. Each row has a menu.
 */
export const Sidebar: Story = {
  render: function Render() {
    const [selected, setSelected] = useState('datepicker-docs');
    return (
      <div className="w-72">
        <Tree
          aria-label="Components"
          items={library}
          hasCategories
          selectableNodes="leaves"
          selectedId={selected}
          onSelectionChange={setSelected}
          renderActions={(node) => (
            <OverflowMenu size="sm" aria-label={`More for ${node.label}`}>
              <MenuItem id="copy-link">Copy link</MenuItem>
              <MenuItem id="open">Open in a new tab</MenuItem>
            </OverflowMenu>
          )}
        />
        <p className="mt-4 text-xs text-fg-muted">{`Selected: ${selected}`}</p>
      </div>
    );
  },
};

const sites: TreeNode[] = [
  {
    id: 'acme',
    label: 'Acme Energy',
    icon: Building2,
    children: [
      {
        id: 'north',
        label: 'North region',
        icon: Folder,
        children: [
          {
            id: 'plant-12',
            label: 'Plant 12',
            icon: Factory,
            tone: 'warning',
            badge: <span className="text-xs text-fg-muted tabular-nums">48</span>,
            children: [
              {
                id: 'feeder-a',
                label: 'Feeder A',
                icon: Zap,
                children: [
                  { id: 'meter-1042', label: 'Meter M-1042', icon: Gauge, tone: 'danger' },
                  { id: 'meter-1043', label: 'Meter M-1043', icon: Gauge, tone: 'success' },
                ],
              },
              { id: 'feeder-b', label: 'Feeder B', icon: Zap },
            ],
          },
          { id: 'plant-14', label: 'Plant 14', icon: Factory, tone: 'success' },
        ],
      },
      {
        id: 'south',
        label: 'South region',
        icon: Folder,
        children: [{ id: 'depot-3', label: 'Depot 3', icon: MapPin, isDisabled: true }],
      },
    ],
  },
];

/** Five levels deep (the most a tree shows), with tones for status, a count badge and a disabled node. */
export const FiveLevels: Story = {
  render: () => (
    <div className="w-72">
      <Tree aria-label="Sites" items={sites} defaultSelectedId="meter-1042" />
    </div>
  ),
};

/**
 * A design tool's layers panel: drag a layer by its handle (or with the keyboard: focus a row, press the right arrow
 * to reach the handle, then Enter, the arrow keys and Enter) to reorder it or move it into another frame. Each row
 * has visibility and lock toggles; a hidden or locked layer always shows its toggle. Moves are announced.
 */
export const LayersPanel: Story = {
  render: function Render() {
    const [layers, setLayers] = useState(demoLayers);
    const [selected, setSelected] = useState('title');
    const [values, setValues] = useState<Record<string, Record<string, boolean>>>({
      backdrop: { locked: true },
      tagline: { visible: false },
    });
    return (
      <div className="w-72 rounded-card border border-border bg-surface-1 p-2">
        <Tree
          aria-label="Layers"
          items={layers}
          selectedId={selected}
          onSelectionChange={setSelected}
          defaultExpandedIds={['page-1', 'page-2', 'header', 'hero']}
          isReorderable
          onMove={(move) => {
            setLayers((current) => moveTreeNodes(current, move));
          }}
          rowToggles={demoLayerToggles}
          toggleValues={values}
          onToggleChange={(nodeId, toggleId, value) => {
            setValues((current) => ({
              ...current,
              [nodeId]: { ...current[nodeId], [toggleId]: value },
            }));
          }}
        />
      </div>
    );
  },
};
