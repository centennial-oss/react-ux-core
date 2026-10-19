import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { planetImages } from '../../../test/mediaImages';
import { Button } from '../../components/Button/Button';
import { Lightbox } from './Lightbox';

// Planet images drawn on a canvas in code: deterministic, nothing downloaded.
const planets = planetImages();

const meta = {
  title: 'Media/Lightbox',
  component: Lightbox,
  args: { images: planets },
} satisfies Meta<typeof Lightbox>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Open on the third planet: previous and next, swipe, arrow keys, the thumbnail strip and a download button. */
export const Open: Story = {
  tags: ['visual-page'],
  args: { defaultOpen: true, defaultIndex: 2, hasDownload: true },
};

/** A single image: no previous, next or thumbnails. */
export const SingleImage: Story = {
  tags: ['visual-page'],
  args: { images: planets.slice(3, 4), defaultOpen: true },
};

/** Opened from a button and controlled by the page; focus returns to the button on close. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function Controlled(args) {
    const [isOpen, setOpen] = useState(false);
    const [index, setIndex] = useState(0);
    return (
      <div className="flex flex-col items-start gap-2">
        <Button
          onPress={() => {
            setOpen(true);
          }}
        >
          View planets
        </Button>
        <p className="text-sm text-fg-muted">Last viewed: {planets[index]?.caption}</p>
        <Lightbox
          {...args}
          isOpen={isOpen}
          onOpenChange={setOpen}
          index={index}
          onIndexChange={setIndex}
        />
      </div>
    );
  },
};
