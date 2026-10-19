import type { Meta, StoryObj } from '@storybook/react-vite';
import { ImageUp } from 'lucide-react';
import { useState } from 'react';
import { starfieldImage } from '../../../test/mediaImages';
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

function pngFile(name: string, seed: number) {
  const url = starfieldImage({ width: 160, height: 120, seed });
  const binary = atob(url.slice(url.indexOf(',') + 1));
  return new File([Uint8Array.from(binary, (character) => character.charCodeAt(0))], name, {
    type: 'image/png',
  });
}

const droppedFiles = [
  pngFile('orion.png', 4),
  new File([new Uint8Array(2048)], 'telescope-manual.pdf', { type: 'application/pdf' }),
  new File([new Uint8Array(22)], 'frames.zip', { type: 'application/zip' }),
];

/**
 * `hasPreviews` shows the files most recently dropped or pasted as thumbnails: images themselves, other files as the
 * icon for their kind. Here `files` sets them, as an app would after its own checks.
 */
export const WithPreviews: Story = {
  render: () => (
    <div className="max-w-md">
      <DropZone hasPreviews files={droppedFiles} />
    </div>
  ),
};

/** Drop or paste files to see them previewed (the zone keeps the last ones dropped). */
export const PreviewsOnDrop: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="max-w-md">
      <DropZone hasPreviews />
    </div>
  ),
};
