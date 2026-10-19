import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { BitrateField } from './BitrateField';
import { ByteSizeField } from './ByteSizeField';
import { DurationField } from './DurationField';
import { formatBitrate, formatBytes, formatDuration } from './format';

const meta = {
  title: 'Inputs/UnitField',
  component: DurationField,
  args: { label: 'TTL', defaultValue: 5_400_000 },
} satisfies Meta<typeof DurationField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** Durations in milliseconds. Type "90s", "2h" or "1h30m"; the unit Select follows. */
export const Duration: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-6">
      <DurationField label="Cache TTL" defaultValue={5_400_000} description="Shown as 1h 30m" />
      <DurationField
        label="Retention (single unit)"
        defaultValue={5_400_000}
        display="single"
        description="Shown as 90 minutes"
      />
      <DurationField
        label="Request timeout"
        units={['ms', 's', 'm']}
        defaultValue={1500}
        allowsCompound={false}
      />
      <DurationField label="Empty" units={['m', 'h', 'd', 'w']} placeholder="e.g. 2h" />
    </div>
  ),
};

/** Byte sizes in bytes, in binary (`iec`, the default) or decimal (`si`) units. */
export const ByteSize: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-6">
      <ByteSizeField label="Buffer size" defaultValue={536_870_912} />
      <ByteSizeField label="Storage quota (SI)" system="si" defaultValue={1_500_000_000} />
    </div>
  ),
};

/** Bitrates in bits per second: 4,500,000 bps shows as 4.5 Mbps. */
export const Bitrate: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-6">
      <BitrateField label="Video bitrate" defaultValue={4_500_000} />
      <BitrateField label="Audio bitrate" defaultValue={128_000} size="sm" />
    </div>
  ),
};

/** Min and max are checked in the base unit, with messages in friendly units. */
export const States: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-6">
      <DurationField
        label="Session length"
        maxValue={86_400_000}
        defaultValue={90_000_000}
        description="Up to a day"
      />
      <ByteSizeField label="Upload limit" minValue={1_048_576} defaultValue={1024} />
      <BitrateField label="Disabled" defaultValue={2_000_000} isDisabled />
      <DurationField label="Read-only" defaultValue={60_000} isReadOnly />
      <DurationField label="Side label" labelPosition="side" defaultValue={3_600_000} />
    </div>
  ),
};

/** The formatters, for showing values elsewhere (tables, summaries). */
export const Formatters: Story = {
  render: () => (
    <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-fg">
      <dt className="text-fg-muted">formatDuration</dt>
      <dd>{formatDuration(5_400_000, { locale: 'en-US' })}</dd>
      <dt className="text-fg-muted">long</dt>
      <dd>{formatDuration(5_400_000, { locale: 'en-US', unitDisplay: 'long' })}</dd>
      <dt className="text-fg-muted">formatBytes</dt>
      <dd>{formatBytes(1_610_612_736, { locale: 'en-US' })}</dd>
      <dt className="text-fg-muted">formatBitrate</dt>
      <dd>{formatBitrate(4_500_000, { locale: 'en-US' })}</dd>
    </dl>
  ),
};

/** Controlled: the value is always in the base unit. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function ControlledStory() {
    const [value, setValue] = useState<number | null>(5_400_000);
    return (
      <div className="flex max-w-sm flex-col gap-2">
        <DurationField label="TTL" value={value} onChange={setValue} />
        <p className="text-sm text-fg-muted">
          Value: {value === null ? 'empty' : `${String(value)} ms`}
        </p>
      </div>
    );
  },
};
