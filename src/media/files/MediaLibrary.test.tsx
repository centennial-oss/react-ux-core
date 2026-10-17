import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import {
  createAssetStore,
  documentAssets,
  planetAssets,
  pngFile,
  zipFile,
} from '../../../test/mediaFiles';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { AssetPicker } from './AssetPicker';
import type { MediaAsset, MediaAssetPage, MediaUploadOptions } from './assets';
import { MediaLibrary } from './MediaLibrary';
import type { MediaFilesMessages } from './messages';

/** Overrides of this entry's strings (its interface joins `Messages` when the entry is wired up). */
const overrides = (strings: Partial<MediaFilesMessages>) => strings as unknown as Partial<Messages>;

const isDesktop = window.innerWidth >= 1024;
const isTouch = navigator.maxTouchPoints > 0;
const library = () => [...planetAssets(), ...documentAssets()];

function grid() {
  return screen.getByRole('listbox', { name: 'Files' });
}

async function tiles() {
  const list = await screen.findByRole('listbox', { name: 'Files' });
  return within(list).getAllByRole('option');
}

function tile(name: RegExp) {
  return within(grid()).getByRole('option', { name });
}

function fileInput(root: ParentNode = document) {
  const input = root.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) {
    throw new Error('No file input');
  }
  return input;
}

/** The details panel: beside the grid, or (in narrow containers) a drawer opened from the selection bar. */
async function details() {
  const open = screen.queryByRole('button', { name: 'Details' });
  if (open) {
    await userEvent.click(open);
    await screen.findByRole('dialog', { name: 'Details' });
  }
  const groups = await screen.findAllByRole('group', { name: 'Details' });
  const panel = groups[groups.length - 1];
  if (!panel) {
    throw new Error('No details panel');
  }
  return panel;
}

function liveText() {
  return Array.from(document.querySelectorAll('.sr-only[aria-live="polite"]'))
    .map((node) => node.textContent)
    .join(' ');
}

describe('MediaLibrary', () => {
  it('loads the first page, then the next by cursor', async () => {
    const store = createAssetStore(library(), { pageSize: 4 });
    const loadAssets = vi.fn(store.loadAssets);
    render(<MediaLibrary loadAssets={loadAssets} />);
    expect(await tiles()).toHaveLength(4);
    expect(loadAssets).toHaveBeenLastCalledWith(
      { search: '', type: undefined },
      expect.any(AbortSignal),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await expect.poll(async () => (await tiles()).length).toBe(8);
    expect(loadAssets).toHaveBeenLastCalledWith(
      { search: '', type: undefined, cursor: '4' },
      expect.any(AbortSignal),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await expect.poll(async () => (await tiles()).length).toBe(11);
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });

  it('searches once typing pauses, aborting the request it replaces', async () => {
    const store = createAssetStore(library());
    const signals: AbortSignal[] = [];
    const loadAssets = vi.fn(
      (query: Parameters<typeof store.loadAssets>[0], signal: AbortSignal) => {
        signals.push(signal);
        return store.loadAssets(query, signal);
      },
    );
    render(<MediaLibrary loadAssets={loadAssets} />);
    await tiles();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search files' }), 'sat');
    await expect.poll(() => loadAssets.mock.lastCall?.[0].search).toBe('sat');
    expect(loadAssets.mock.calls.filter(([query]) => query.search !== '')).toHaveLength(1);
    await expect.poll(async () => (await tiles()).length).toBe(1);
    expect(tile(/saturn\.png/)).toBeInTheDocument();
    expect(signals[0]?.aborted).toBe(true);
  });

  it('filters by type', async () => {
    const store = createAssetStore(library());
    render(<MediaLibrary loadAssets={store.loadAssets} />);
    expect(await tiles()).toHaveLength(11);
    await userEvent.click(screen.getByRole('button', { name: /Type/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Documents' }));
    await expect.poll(async () => (await tiles()).length).toBe(2);
    expect(tile(/statement\.pdf/)).toBeInTheDocument();
  });

  it('names tiles by file name and kind, and flags images without alt text', async () => {
    const store = createAssetStore(library());
    render(<MediaLibrary loadAssets={store.loadAssets} />);
    await tiles();
    expect(tile(/mars\.png/)).toHaveAccessibleName(/Image/);
    expect(tile(/mars\.png/)).toHaveAccessibleName(/Missing alt text/);
    expect(tile(/saturn\.png/)).not.toHaveAccessibleName(/Missing alt text/);
    expect(tile(/statement\.pdf/)).toHaveAccessibleName(/PDF/);
  });

  it('edits an image’s alt text and tags in the details panel', async () => {
    const store = createAssetStore(library());
    const onUpdate = vi.fn(store.onUpdate);
    render(<MediaLibrary loadAssets={store.loadAssets} onUpdate={onUpdate} />);
    await tiles();
    await userEvent.click(tile(/mars\.png/));
    const panel = await details();
    const alt = within(panel).getByRole('textbox', { name: 'Alt text' });
    expect(within(panel).getByText('Missing alt text')).toBeInTheDocument();
    await userEvent.type(alt, 'Mars, the red planet');
    await userEvent.type(
      within(panel).getByRole('textbox', { name: 'Add a tag' }),
      'rovers{Enter}',
    );
    expect(within(panel).getByRole('list', { name: 'Tags' }).textContent).toContain('rovers');
    await userEvent.click(within(panel).getByRole('button', { name: 'Save' }));
    await expect.poll(() => onUpdate.mock.calls.length).toBe(1);
    expect(onUpdate.mock.calls[0]?.[0]).toMatchObject({
      id: 'mars',
      alt: 'Mars, the red planet',
      tags: ['inner planets', 'rovers'],
    });
    await expect.poll(liveText).toContain('Changes saved');
    expect(tile(/mars\.png/)).not.toHaveAccessibleName(/Missing alt text/);
  });

  it('uploads dropped or chosen files with progress, and announces them', async () => {
    const store = createAssetStore(library());
    let report: MediaUploadOptions['onProgress'] = () => undefined;
    let finish: (assets: MediaAsset[]) => void = () => undefined;
    const onUpload = vi.fn(
      (files: File[], options: MediaUploadOptions) =>
        new Promise<MediaAsset[]>((resolve) => {
          report = options.onProgress;
          finish = () => {
            resolve(
              files.map((file, index) => ({
                id: `new-${String(index)}`,
                name: file.name,
                url: URL.createObjectURL(file),
                type: file.type,
              })),
            );
          };
        }),
    );
    const { container } = render(
      <MediaLibrary loadAssets={store.loadAssets} onUpload={onUpload} accept="image/*" />,
    );
    await tiles();
    await userEvent.upload(fileInput(container), [
      pngFile('m42.png'),
      pngFile('m45.png'),
      zipFile(),
    ]);
    expect(onUpload.mock.calls[0]?.[0].map((file) => file.name)).toEqual(['m42.png', 'm45.png']);
    expect(screen.getByRole('alert').textContent).toContain('observations.zip');
    const progress = screen.getByRole('progressbar', { name: 'Uploading 2 files' });
    expect(liveText()).toContain('Uploading 2 files');
    report(0.5);
    await expect.poll(() => progress.getAttribute('aria-valuenow')).toBe('50');
    finish([]);
    await expect.poll(liveText).toContain('Uploaded 2 files');
    expect(screen.queryByRole('progressbar')).toBeNull();
    const all = await tiles();
    expect(all).toHaveLength(13);
    expect(all[0]).toHaveAccessibleName(/m42\.png/);
  });

  it('shows an upload’s failure', async () => {
    const store = createAssetStore(library());
    const { container } = render(
      <MediaLibrary
        loadAssets={store.loadAssets}
        onUpload={() => Promise.reject(new Error('Storage is full'))}
      />,
    );
    await tiles();
    await userEvent.upload(fileInput(container), pngFile('m1.png'));
    await expect.poll(liveText).toContain('Storage is full');
    expect(container.textContent).toContain('Storage is full');
  });

  it('deletes the selected files after confirming', async () => {
    const store = createAssetStore(library());
    const onDelete = vi.fn(store.onDelete);
    render(<MediaLibrary loadAssets={store.loadAssets} onDelete={onDelete} />);
    await tiles();
    await userEvent.click(tile(/mercury\.png/));
    await userEvent.click(tile(/venus\.png/));
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Delete 2 files?' });
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
    await expect.poll(() => onDelete.mock.calls.length).toBe(1);
    expect(onDelete).toHaveBeenCalledWith(['mercury', 'venus']);
    await expect.poll(async () => (await tiles()).length).toBe(9);
    expect(liveText()).toContain('Deleted 2 files');
    expect(screen.queryByText('2 selected')).toBeNull();
  });

  it.skipIf(!isDesktop)(
    'moves between tiles with the arrow keys and selects with Space',
    async () => {
      const store = createAssetStore(library());
      render(<MediaLibrary loadAssets={store.loadAssets} selectionMode="multiple" />);
      const [first] = await tiles();
      if (!first) {
        throw new Error('No tiles');
      }
      await userEvent.click(first);
      await userEvent.keyboard('{ArrowRight}');
      expect(tile(/venus\.png/)).toHaveFocus();
      await userEvent.keyboard(' ');
      expect(tile(/venus\.png/)).toHaveAttribute('aria-selected', 'true');
      expect(tile(/mercury\.png/)).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('button', { name: 'Choose 2 files' })).toBeInTheDocument();
    },
  );

  it.skipIf(!isTouch)('selects a tile with a tap', async () => {
    const store = createAssetStore(library());
    render(<MediaLibrary loadAssets={store.loadAssets} selectionMode="single" />);
    await tiles();
    await commands.tap('[role="option"][data-key="earth"]');
    expect(tile(/earth\.png/)).toHaveAttribute('aria-selected', 'true');
  });

  it('hands the chosen assets to onSelect', async () => {
    const store = createAssetStore(library());
    const onSelect = vi.fn<(assets: MediaAsset[]) => void>();
    render(
      <MediaLibrary loadAssets={store.loadAssets} selectionMode="single" onSelect={onSelect} />,
    );
    await tiles();
    await userEvent.click(tile(/jupiter\.png/));
    await userEvent.click(screen.getByRole('button', { name: 'Choose' }));
    expect(onSelect.mock.calls[0]?.[0].map((asset) => asset.id)).toEqual(['jupiter']);
  });

  it('switches to the list view', async () => {
    const store = createAssetStore(library());
    render(<MediaLibrary loadAssets={store.loadAssets} />);
    await tiles();
    const list = screen.getByRole('radio', { name: 'List' });
    await userEvent.click(list.closest('label') ?? list);
    expect(screen.getByRole('radio', { name: 'List' })).toBeChecked();
    expect(tile(/saturn\.png/)).toHaveAccessibleName(/Image/);
  });

  it('shows an empty library, and a failed load with Retry', async () => {
    const { unmount } = render(
      <MediaLibrary loadAssets={createAssetStore([]).loadAssets} onUpload={vi.fn()} />,
    );
    expect(await screen.findByText('No files yet')).toBeInTheDocument();
    unmount();
    let fail = true;
    const store = createAssetStore(library());
    render(
      <MediaLibrary
        loadAssets={(query, signal) =>
          fail ? Promise.reject(new Error('offline')) : store.loadAssets(query, signal)
        }
      />,
    );
    expect(await screen.findByText('Couldn’t load the files')).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await tiles()).toHaveLength(11);
  });

  it('takes its strings from UIProvider', async () => {
    const store = createAssetStore(library());
    render(
      <UIProvider messages={overrides({ libraryFiles: 'Fichiers', library: 'Médiathèque' })}>
        <MediaLibrary loadAssets={store.loadAssets} />
      </UIProvider>,
    );
    expect(screen.getByRole('region', { name: 'Médiathèque' })).toBeInTheDocument();
    expect(await screen.findByRole('listbox', { name: 'Fichiers' })).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const store = createAssetStore(library());
    const { container } = render(
      <MediaLibrary
        loadAssets={store.loadAssets}
        onUpload={store.onUpload}
        onUpdate={store.onUpdate}
        onDelete={store.onDelete}
      />,
    );
    await tiles();
    await userEvent.click(tile(/saturn\.png/));
    await expectNoAxeViolations(container);
  });
});

function BlogForm({ onChange }: { onChange: (asset: MediaAsset | null) => void }) {
  const [store] = useState(() => createAssetStore(planetAssets().slice(0, 2)));
  const [image, setImage] = useState<MediaAsset | null>(null);
  return (
    <form className="flex flex-col gap-3 p-2">
      <AssetPicker
        label="Featured image"
        value={image}
        onChange={(next) => {
          setImage(next);
          onChange(next);
        }}
        loadAssets={store.loadAssets}
        onUpload={store.onUpload}
        onUpdate={store.onUpdate}
        accept="image/*"
        defaultType="image"
      />
    </form>
  );
}

describe('AssetPicker', () => {
  it('uploads 10 images, describes one and picks it as a blog post’s featured image', async () => {
    const onChange = vi.fn();
    render(<BlogForm onChange={onChange} />);
    const field = screen.getByRole('group', { name: 'Featured image' });
    expect(field.textContent).toContain('Nothing chosen');
    await userEvent.click(within(field).getByRole('button', { name: 'Choose' }));
    const dialog = await screen.findByRole('dialog', { name: 'Featured image' });
    await within(dialog).findByRole('listbox', { name: 'Files' });
    const photos = Array.from({ length: 10 }, (_, index) =>
      pngFile(`night-${String(index + 1)}.png`, index + 1),
    );
    await userEvent.upload(fileInput(dialog), photos);
    await expect.poll(liveText).toContain('Uploaded 10 files');
    await expect.poll(async () => (await tiles()).length).toBe(12);
    const uploaded = within(grid()).getByRole('option', { name: /night-7\.png/ });
    expect(uploaded).toHaveAccessibleName(/Missing alt text/);
    await userEvent.click(uploaded);
    const panel = await details();
    await userEvent.type(
      within(panel).getByRole('textbox', { name: 'Alt text' }),
      'The Milky Way over the observatory dome',
    );
    await userEvent.click(within(panel).getByRole('button', { name: 'Save' }));
    await expect.poll(liveText).toContain('Changes saved');
    const drawer = screen.queryByRole('dialog', { name: 'Details' });
    if (drawer) {
      await userEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
      await expect
        .poll(() => screen.queryByRole('dialog', { name: 'Details' }), { timeout: 3000 })
        .toBeNull();
    }
    await userEvent.click(within(dialog).getByRole('button', { name: 'Choose' }));
    await expect.poll(() => screen.queryByRole('dialog', { name: 'Featured image' })).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: 'night-7.png',
        alt: 'The Milky Way over the observatory dome',
      }),
    );
    expect(field.textContent).toContain('night-7.png');
    expect(field.textContent).not.toContain('Missing alt text');
    expect(field.querySelector('img')).toHaveAttribute('src', expect.stringMatching(/^blob:/));
    expect(within(field).getByRole('button', { name: 'Change' })).toBeInTheDocument();
    await userEvent.click(within(field).getByRole('button', { name: 'Remove' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    await expectNoAxeViolations(field);
  });

  it('flags a chosen image without alt text', () => {
    const [mars] = planetAssets().filter((asset) => asset.id === 'mars');
    render(
      <AssetPicker
        label="Featured image"
        defaultValue={mars}
        loadAssets={(): Promise<MediaAssetPage> => Promise.resolve({ assets: [] })}
      />,
    );
    const field = screen.getByRole('group', { name: 'Featured image' });
    expect(field.textContent).toContain('mars.png');
    expect(field.textContent).toContain('Missing alt text');
  });
});
