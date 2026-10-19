import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { BROKEN_IMAGE_SRC, largeImageUrl, starfieldImage } from '../../../test/mediaImages';
import { ImageViewer } from './ImageViewer';
import type { MediaImage } from './types';

// Images drawn on a canvas in code: deterministic, nothing downloaded.
const starfield: MediaImage = {
  id: 'starfield',
  src: starfieldImage(),
  alt: 'A ringed planet and a small blue moon against a field of stars',
  width: 1600,
  height: 1000,
};

const meta = {
  title: 'Media/ImageViewer',
  component: ImageViewer,
  args: { image: starfield },
} satisfies Meta<typeof ImageViewer>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The whole image fits the frame. Scroll or pinch to zoom, drag to pan, double-click for 100%. */
export const Default: Story = {};

/** `fill`: the image covers the frame and can be panned to see the rest. */
export const Fill: Story = { args: { fit: 'fill' } };

/** `actual`: the image starts at its own pixel size (100%). */
export const ActualSize: Story = { args: { fit: 'actual', height: '20rem' } };

/** Without the toolbar; gestures and keys still work. */
export const WithoutControls: Story = { args: { hasControls: false, height: '16rem' } };

/** Zoom limited to between 50% and 200%. */
export const ZoomLimits: Story = { args: { minZoom: 0.5, maxZoom: 2 } };

/** A broken image shows an error with its alt text and a retry button. */
export const Broken: Story = {
  args: {
    image: { id: 'broken', src: BROKEN_IMAGE_SRC, alt: 'Saturn photographed from the observatory' },
  },
};

/** A 6000 × 4000 image generated in the browser; it should zoom smoothly to 400% on a phone. */
export const LargeImage: Story = {
  tags: ['!visual'],
  render: function LargeImage(args) {
    const [src, setSrc] = useState<string | null>(null);
    useEffect(() => {
      let url: string | null = null;
      let isCurrent = true;
      void largeImageUrl().then((created) => {
        url = created;
        if (isCurrent) {
          setSrc(created);
        } else {
          URL.revokeObjectURL(created);
        }
      });
      return () => {
        isCurrent = false;
        if (url) {
          URL.revokeObjectURL(url);
        }
      };
    }, []);
    if (src === null) {
      return <p className="text-sm text-fg-muted">Drawing a 6000 × 4000 image…</p>;
    }
    return (
      <ImageViewer
        {...args}
        image={{
          id: 'large',
          src,
          alt: 'A banded planet against a dense star field',
          width: 6000,
          height: 4000,
        }}
      />
    );
  },
};

/**
 * A real 6000 × 4000 photo, if one has been added as `.storybook/public/media/photo-6000x4000.jpg`. Without it the
 * viewer shows its error state.
 */
export const RealPhoto: Story = {
  tags: ['!visual'],
  args: {
    image: {
      id: 'photo',
      src: 'media/photo-6000x4000.jpg',
      alt: 'A 6000 by 4000 pixel photograph',
    },
  },
};
