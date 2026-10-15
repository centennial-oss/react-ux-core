import type { Meta, StoryObj } from '@storybook/react-vite';
import { ImageUp } from 'lucide-react';
import { useState } from 'react';
import { DropZone } from './DropZone';

const meta = {
  title: 'Inputs/DropZone',
  component: DropZone,
} satisfies Meta<typeof DropZone>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** The bare drop target: drop files on it, or focus it and paste. It only reports the files. */
export const Basic: Story = {
  render: function BasicStory() {
    const [names, setNames] = useState<string[]>([]);
    return (
      <div className="flex max-w-md flex-col gap-3 text-sm">
        <DropZone
          onDrop={(files) => {
            setNames(files.map((file) => file.name));
          }}
        />
        {names.length > 0 && <p className="text-fg-muted">{names.join(', ')}</p>}
      </div>
    );
  },
};

export const CustomContent: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-4">
      <DropZone label="Drop a photo of the meter" icon={ImageUp}>
        <span className="text-xs">JPEG or PNG</span>
      </DropZone>
      <DropZone label="Uploads are paused" isDisabled />
    </div>
  ),
};
