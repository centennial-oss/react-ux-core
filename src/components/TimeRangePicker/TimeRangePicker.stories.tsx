import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { resolveTimeRange, type TimeRange } from './resolveTimeRange';
import { TimeRangePicker } from './TimeRangePicker';

const meta = {
  title: 'Inputs/TimeRangePicker',
  component: TimeRangePicker,
  args: {
    label: 'Time range',
    defaultValue: { kind: 'relative', from: '-24h', to: 'now' },
    timeZone: 'America/Denver',
  },
} satisfies Meta<typeof TimeRangePicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

// Fixed absolute instants (never "now") keep the visual snapshots stable.
const firstWeekOfMarch: TimeRange = {
  kind: 'absolute',
  start: '2025-03-01T07:00:00.000Z',
  end: '2025-03-08T07:00:00.000Z',
};

/** A preset, a "last N units" range, an absolute range, no range yet, and disabled. */
export const States: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-5">
      <TimeRangePicker label="Preset" defaultValue={{ kind: 'relative', from: '-7d', to: 'now' }} />
      <TimeRangePicker
        label="Relative"
        defaultValue={{ kind: 'relative', from: '-3h', to: 'now' }}
      />
      <TimeRangePicker label="Absolute" defaultValue={firstWeekOfMarch} timeZone="America/Denver" />
      <TimeRangePicker label="Empty" />
      <TimeRangePicker aria-label="Disabled range" isDisabled size="sm" />
    </div>
  ),
};

/** Presets first, then relative and absolute entry. A popover on tablet and desktop, a full-screen sheet on phones. */
export const Open: Story = {
  tags: ['visual-page'],
  render: () => (
    <TimeRangePicker
      label="Time range"
      defaultValue={{ kind: 'relative', from: '-24h', to: 'now' }}
      defaultOpen
      className="max-w-xs"
    />
  ),
};

/** Apps keep the value (a plain object, here shown as JSON for a URL) and resolve it to instants when fetching. */
export const InTheUrl: Story = {
  tags: ['!visual'],
  render: function InTheUrlStory() {
    const [range, setRange] = useState<TimeRange>({ kind: 'relative', from: '-24h', to: 'now' });
    const { start, end } = resolveTimeRange(range, Date.now(), 'America/Denver');
    return (
      <div className="flex max-w-md flex-col gap-3 text-sm">
        <TimeRangePicker
          label="Time range"
          value={range}
          onChange={setRange}
          timeZone="America/Denver"
        />
        <code className="break-all text-fg-muted">
          ?range={encodeURIComponent(JSON.stringify(range))}
        </code>
        <span className="text-fg-muted">
          {start.toISOString()} → {end.toISOString()}
        </span>
      </div>
    );
  },
};
