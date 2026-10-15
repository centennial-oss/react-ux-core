import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlignCenter, AlignLeft, AlignRight, LayoutGrid, List, Map as MapIcon } from 'lucide-react';
import { useState } from 'react';
import { Pillbox } from './Pillbox';

const VIEWS = [
  { id: 'list', label: 'List', icon: List },
  { id: 'grid', label: 'Grid', icon: LayoutGrid },
  { id: 'map', label: 'Map', icon: MapIcon },
] as const;

const PERIODS = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
] as const;

const meta = {
  title: 'Display/Pillbox',
  component: Pillbox,
  args: { 'aria-label': 'Period', options: PERIODS, defaultValue: 'week' },
} satisfies Meta<typeof Pillbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** Text options. Arrow keys move between options; Enter or Space chooses. */
export const Basic: Story = { tags: ['!visual'] };

/** Icons with labels. */
export const WithIcons: Story = {
  render: () => <Pillbox aria-label="View" options={VIEWS} defaultValue="grid" />,
};

/** Icon-only: each option's label is its accessible name. */
export const IconOnly: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Pillbox aria-label="View" options={VIEWS} isIconOnly defaultValue="list" />
      <Pillbox
        aria-label="Text alignment"
        isIconOnly
        size="sm"
        options={[
          { id: 'start', label: 'Align start', icon: AlignLeft },
          { id: 'center', label: 'Align centre', icon: AlignCenter },
          { id: 'end', label: 'Align end', icon: AlignRight },
        ]}
      />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Pillbox aria-label="Small" size="sm" options={PERIODS} defaultValue="day" />
      <Pillbox aria-label="Medium" size="md" options={PERIODS} defaultValue="day" />
    </div>
  ),
};

/** A disabled option, and a disabled group. */
export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Pillbox
        aria-label="Period"
        defaultValue="day"
        options={[
          { id: 'day', label: 'Day' },
          { id: 'week', label: 'Week', isDisabled: true },
          { id: 'month', label: 'Month' },
        ]}
      />
      <Pillbox aria-label="View" options={VIEWS} defaultValue="grid" isDisabled />
    </div>
  ),
};

/** Full width: the pills share the space. Labels truncate rather than widen the page. */
export const FullWidth: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-3">
      <Pillbox aria-label="View" options={VIEWS} className="w-full" />
      <Pillbox
        aria-label="Reporting period"
        className="w-full"
        options={[
          { id: 'today', label: 'Today' },
          { id: 'week', label: 'This week' },
          { id: 'month', label: 'This month' },
          { id: 'quarter', label: 'This quarter' },
        ]}
      />
    </div>
  ),
};

/** Controlled with `value` / `onChange`; `onChange` receives the option id union. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function ControlledStory() {
    const [view, setView] = useState<(typeof VIEWS)[number]['id']>('map');
    return (
      <div className="flex flex-col items-start gap-2">
        <span id="controlled-label" className="text-sm font-medium text-fg">
          Layout
        </span>
        <Pillbox
          aria-labelledby="controlled-label"
          options={VIEWS}
          value={view}
          onChange={setView}
        />
        <p className="text-sm text-fg-muted">Showing the {view} view.</p>
      </div>
    );
  },
};
