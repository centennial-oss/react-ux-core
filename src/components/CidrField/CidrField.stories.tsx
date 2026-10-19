import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { mixedCidrEntries } from '../../../test/cidr';
import { CidrField } from './CidrField';
import { CidrList } from './CidrList';

const meta = {
  title: 'Inputs/CidrField',
  component: CidrField,
  args: { label: 'Origin range' },
} satisfies Meta<typeof CidrField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** Valid blocks show their range and address count (exact for IPv6); invalid ones explain why. */
export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <CidrField label="Office network" defaultValue="10.0.0.0/8" />
      <CidrField label="Observatory prefix" defaultValue="2001:db8:4f::/48" />
      <CidrField label="Single host" defaultValue="203.0.113.7/32" />
      <CidrField label="Invalid" defaultValue="10.0.0.0/33" />
      <CidrField label="IPv4 only" family="ipv4" defaultValue="2001:db8::/32" />
      <CidrField
        label="With a warning"
        defaultValue="0.0.0.0/0"
        warningMessage="This allows every IPv4 address."
      />
      <CidrField label="Disabled" isDisabled defaultValue="192.0.2.0/24" />
    </div>
  ),
};

/** Type `10.0.0.5/8` and leave the field: the host bits are cleared, with a note. Bare addresses become /32 or /128. */
export const Normalisation: Story = {
  tags: ['!visual'],
  render: function NormalisationStory() {
    const [value, setValue] = useState('10.0.0.5/8');
    return (
      <div className="flex max-w-md flex-col gap-2">
        <CidrField label="Range" value={value} onChange={setValue} />
        <p className="text-sm text-fg-muted">Value: {value}</p>
      </div>
    );
  },
};

/** A list with overlaps, an invalid entry and two adjacent /25s that merge into a /24. */
export const List: StoryObj<typeof CidrList> = {
  render: () => (
    <div className="max-w-xl">
      <CidrList
        label="Allowlist"
        description="Requests from these ranges skip the challenge."
        defaultValue={[...mixedCidrEntries.slice(0, 4), '2001:db8::/32', '2001:db8:1::/48', 'bad']}
      />
    </div>
  ),
};

/** Paste many lines into the add field to add them all. */
export const EmptyList: StoryObj<typeof CidrList> = {
  render: () => (
    <div className="max-w-xl">
      <CidrList label="Blocked ranges" family="ipv4" maxItems={50} />
    </div>
  ),
};

/** The 20 mixed entries from the acceptance criteria. */
export const LongList: StoryObj<typeof CidrList> = {
  tags: ['!visual'],
  render: () => (
    <div className="max-w-xl">
      <CidrList label="Allowlist" defaultValue={[...mixedCidrEntries]} hasRangeInfo={false} />
    </div>
  ),
};
