import type { Meta, StoryObj } from '@storybook/react-vite';
import { planetImages } from '../../../test/mediaImages';
import { ImageGallery } from './ImageGallery';

// Planet images drawn on a canvas in code: deterministic, nothing downloaded.
const planets = planetImages();

const meta = {
  title: 'Media/ImageGallery',
  component: ImageGallery,
  args: { images: planets },
} satisfies Meta<typeof ImageGallery>;
export default meta;
type Story = StoryObj<typeof meta>;

/** As many 8rem columns as fit; choosing a thumbnail opens the lightbox. */
export const Default: Story = {};

/** Captions under the thumbnails, with bigger tiles and a download button in the lightbox. */
export const WithCaptions: Story = {
  args: { hasCaptions: true, minItemWidth: '12rem', hasDownload: true },
};
