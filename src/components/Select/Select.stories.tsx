import type { Meta, StoryObj } from '@storybook/react-vite';
import { Option, OptionSection } from '../ListBox';
import { Select } from './Select';

const regions = [
  { id: 'north', name: 'North', description: '412 meters' },
  { id: 'south', name: 'South', description: '298 meters' },
  { id: 'east', name: 'East', description: '127 meters' },
  { id: 'west', name: 'West', description: '336 meters' },
];

const meta = {
  title: 'Inputs/Select',
  component: Select,
  args: { label: 'Region', children: null },
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <Select label="Region" items={regions} description="Where the meter is installed">
        {(region) => (
          <Option id={region.id} description={region.description}>
            {region.name}
          </Option>
        )}
      </Select>
      <Select label="Region" items={regions} defaultValue="east">
        {(region) => <Option id={region.id}>{region.name}</Option>}
      </Select>
      <Select label="Region" items={regions} isRequired isInvalid errorMessage="Choose a region">
        {(region) => <Option id={region.id}>{region.name}</Option>}
      </Select>
      <Select label="Region" items={regions} isDisabled>
        {(region) => <Option id={region.id}>{region.name}</Option>}
      </Select>
    </div>
  ),
};

/** Sections with headings. On phones the list opens as a bottom sheet. */
export const Open: Story = {
  tags: ['visual-page'],
  render: () => (
    <div className="max-w-md">
      <Select label="Tariff" defaultOpen>
        <OptionSection title="Residential">
          <Option id="r1">Standard residential</Option>
          <Option id="r2">Time of use</Option>
        </OptionSection>
        <OptionSection title="Commercial">
          <Option id="c1">Small commercial</Option>
          <Option id="c2">Demand charge</Option>
        </OptionSection>
      </Select>
    </div>
  ),
};

/** `isClearable` adds a clear button while something is chosen; `onChange` may then receive null. */
export const Clearable: Story = {
  render: () => (
    <div className="max-w-xs">
      <Select label="Assignment status" defaultValue="submitted" isClearable>
        <Option id="draft">Draft</Option>
        <Option id="submitted">Submitted</Option>
        <Option id="graded">Graded</Option>
      </Select>
    </div>
  ),
};
