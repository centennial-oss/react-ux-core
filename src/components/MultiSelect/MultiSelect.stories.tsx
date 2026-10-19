import type { Meta, StoryObj } from '@storybook/react-vite';
import { Option } from '../ListBox';
import { MultiSelect } from './MultiSelect';

const regions = [
  { id: 'north', name: 'North' },
  { id: 'south', name: 'South' },
  { id: 'east', name: 'East' },
  { id: 'west', name: 'West' },
  { id: 'central', name: 'Central' },
];

const meta = {
  title: 'Inputs/MultiSelect',
  component: MultiSelect,
  args: { label: 'Regions', children: () => <span /> },
} satisfies Meta<typeof MultiSelect>;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <MultiSelect label="Regions" items={regions} placeholder="Add regions">
        {(region) => <Option id={region.id}>{region.name}</Option>}
      </MultiSelect>
      <MultiSelect label="Regions" items={regions} defaultValue={['north', 'east', 'central']}>
        {(region) => <Option id={region.id}>{region.name}</Option>}
      </MultiSelect>
      <MultiSelect
        label="Regions"
        items={regions}
        isRequired
        isInvalid
        errorMessage="Choose at least one region"
      >
        {(region) => <Option id={region.id}>{region.name}</Option>}
      </MultiSelect>
    </div>
  ),
};
