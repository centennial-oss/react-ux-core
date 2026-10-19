import type { Meta, StoryObj } from '@storybook/react-vite';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useState } from 'react';
import { Button } from '../../components/Button/Button';
import { TextField } from '../../components/TextField/TextField';
import { createAssetStore, documentAssets, planetAssets } from '../../../test/mediaFiles';
import { AssetPicker } from './AssetPicker';
import type { MediaAsset, MediaAssetPage } from './assets';
import { MediaLibrary } from './MediaLibrary';

// An in-memory library stands in for the app's server: planet images (Mars and Neptune lack alt text), a PDF, a tone
// and a CSV. Uploads become object URLs.
const assets = [...planetAssets(), ...documentAssets()];

function useStore(pageSize?: number) {
  const [store] = useState(() => createAssetStore(assets, { pageSize }));
  return store;
}

const meta = {
  title: 'Media/MediaLibrary',
  component: MediaLibrary,
  parameters: { layout: 'padded' },
  args: { loadAssets: (): Promise<MediaAssetPage> => Promise.resolve({ assets: [] }) },
} satisfies Meta<typeof MediaLibrary>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Managing the library: search, filter by type, switch to the list, upload (drop or choose files), select a tile to
 * edit its name, alt text and tags in the details panel (a drawer on narrow screens), or select several to delete.
 */
export const Manage: Story = {
  render: function ManageStory() {
    const store = useStore(8);
    return (
      <MediaLibrary
        loadAssets={store.loadAssets}
        onUpload={store.onUpload}
        onUpdate={store.onUpdate}
        onDelete={store.onDelete}
        workerSrc={workerSrc}
      />
    );
  },
};

/** The list view. */
export const ListView: Story = {
  render: function ListViewStory() {
    const store = useStore();
    return <MediaLibrary loadAssets={store.loadAssets} defaultView="list" height="28rem" />;
  },
};

/** Picking several images (`selectionMode="multiple"`), handed to `onSelect` by Choose. */
export const PickMultiple: Story = {
  tags: ['!visual'],
  render: function PickStory() {
    const store = useStore();
    const [chosen, setChosen] = useState<MediaAsset[]>([]);
    return (
      <div className="flex flex-col gap-3">
        <MediaLibrary
          loadAssets={store.loadAssets}
          selectionMode="multiple"
          defaultType="image"
          onSelect={setChosen}
          height="28rem"
        />
        <p className="text-sm text-fg-muted">{chosen.map((asset) => asset.name).join(', ')}</p>
      </div>
    );
  },
};

/** An empty library, ready for the first upload. */
export const Empty: Story = {
  render: function EmptyStory() {
    const [store] = useState(() => createAssetStore([]));
    return <MediaLibrary loadAssets={store.loadAssets} onUpload={store.onUpload} height="20rem" />;
  },
};

/** Loading the files failed: an error with Retry. */
export const LoadError: Story = {
  args: {
    loadAssets: () => Promise.reject(new Error('Network error')),
    height: '20rem',
  },
};

/** The first page is still loading. */
export const Loading: Story = {
  tags: ['!visual'],
  args: {
    loadAssets: () => new Promise<MediaAssetPage>(() => undefined),
    height: '20rem',
  },
};

/**
 * An observatory blog post's featured image: AssetPicker opens the library in a dialog (upload, describe and pick
 * an image there) and shows the chosen image's thumbnail, flagging missing alt text.
 */
export const FeaturedImagePicker: Story = {
  render: function PickerStory() {
    const store = useStore();
    const [image, setImage] = useState<MediaAsset | null>(null);
    return (
      <form
        className="flex max-w-xl flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <TextField label="Title" defaultValue="Saturn at opposition" />
        <AssetPicker
          label="Featured image"
          description="Shown at the top of the post and in link previews."
          value={image}
          onChange={setImage}
          loadAssets={store.loadAssets}
          onUpload={store.onUpload}
          onUpdate={store.onUpdate}
          accept={['image/*']}
          defaultType="image"
          types={['image']}
        />
        <Button type="submit" tone="accent" className="self-start">
          Publish
        </Button>
      </form>
    );
  },
};

/** The picker with an image already chosen (Mars has no alt text, so it's flagged). */
export const PickerWithValue: Story = {
  render: function PickerValueStory() {
    const store = useStore();
    return (
      <div className="max-w-xl">
        <AssetPicker
          label="Featured image"
          defaultValue={assets.find((asset) => asset.id === 'mars')}
          loadAssets={store.loadAssets}
        />
      </div>
    );
  },
};
