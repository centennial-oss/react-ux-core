import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tag } from 'lucide-react';
import { useState } from 'react';
import { Chip } from './Chip';

const meta = {
  title: 'Display/Chip',
  component: Chip,
  args: { children: 'Region: North' },
} satisfies Meta<typeof Chip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(['neutral', 'accent', 'success', 'warning', 'danger'] as const).map((tone) => (
        <Chip key={tone} tone={tone} icon={Tag}>
          {tone}
        </Chip>
      ))}
      <Chip size="sm">Small</Chip>
    </div>
  ),
};

/** Active filters: each chip has its own remove button. */
export const Removable: Story = {
  render: function RemovableStory() {
    const [filters, setFilters] = useState([
      'Region: North',
      'Status: Active',
      'Tariff: Commercial',
    ]);
    return (
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Chip
            key={filter}
            onRemove={() => {
              setFilters((current) => current.filter((item) => item !== filter));
            }}
          >
            {filter}
          </Chip>
        ))}
        <Chip onRemove={() => undefined} isDisabled>
          Locked filter
        </Chip>
      </div>
    );
  },
};
