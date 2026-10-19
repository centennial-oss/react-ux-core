import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ColorField, type ColorValue } from './ColorField';

const meta = {
  title: 'Inputs/ColorField',
  component: ColorField,
} satisfies Meta<typeof ColorField>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The chart palette (which follows the theme) plus a custom colour. */
export const States: Story = {
  render: () => {
    const [value, setValue] = useState<ColorValue>('chart-3');
    return (
      <div className="flex max-w-md flex-col gap-6">
        <ColorField
          label="Series colour"
          value={value}
          onChange={setValue}
          description={`Value: ${value}`}
        />
        <ColorField label="Custom colour" defaultValue="#7a3df0" />
        <ColorField
          label="Palette only"
          swatches={['chart-1', 'chart-2', 'chart-3', 'chart-4']}
          allowsCustom={false}
          isRequired
          isInvalid
          errorMessage="Choose a colour."
        />
        <ColorField label="Disabled" defaultValue="chart-5" isDisabled />
      </div>
    );
  },
};
