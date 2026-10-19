import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { starfieldImage } from '../../../test/mediaImages';
import { DropZone } from './DropZone';
import { FileField } from './FileField';
import { FileThumbnail } from './FileThumbnail';

function pngFile(name: string) {
  const url = starfieldImage({ width: 40, height: 30, seed: 2 });
  const binary = atob(url.slice(url.indexOf(',') + 1));
  return new File([Uint8Array.from(binary, (character) => character.charCodeAt(0))], name, {
    type: 'image/png',
  });
}

function makeFile(name: string, type: string) {
  return new File([new Uint8Array(64)], name, { type });
}

function fileInput(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) {
    throw new Error('No file input');
  }
  return input;
}

describe('FileField hasPreviews', () => {
  it('shows image thumbnails from object URLs and typed icons for other files', async () => {
    const { container } = render(<FileField label="Photos" allowsMultiple hasPreviews />);
    await userEvent.upload(fileInput(container), [
      pngFile('orion.png'),
      makeFile('frames.zip', 'application/zip'),
    ]);
    const rows = within(screen.getByRole('list')).getAllByRole('listitem');
    await expect.poll(() => rows[0]?.querySelector('img')?.getAttribute('src')).toMatch(/^blob:/);
    expect(rows[0]?.querySelector('[data-kind]')).toHaveAttribute('data-kind', 'image');
    expect(rows[1]?.querySelector('[data-kind]')).toHaveAttribute('data-kind', 'archive');
    expect(rows[1]?.querySelector('img')).toBeNull();
    // Thumbnails are decorative: the row still reads as the file's name.
    expect(rows[0]?.querySelector('[data-kind]')).toHaveAttribute('aria-hidden', 'true');
    await expectNoAxeViolations(container);
  });

  it('revokes a thumbnail’s object URL when its file is removed', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const { container } = render(<FileField label="Photo" hasPreviews />);
    await userEvent.upload(fileInput(container), pngFile('vega.png'));
    const row = within(screen.getByRole('list')).getByRole('listitem');
    await expect.poll(() => row.querySelector('img')?.getAttribute('src')).toMatch(/^blob:/);
    const url = row.querySelector('img')?.getAttribute('src');
    await userEvent.click(screen.getByRole('button', { name: 'Remove vega.png' }));
    expect(revoke).toHaveBeenCalledWith(url);
    revoke.mockRestore();
  });

  it('shows a stored item’s previewSrc, and no thumbnails without hasPreviews', () => {
    const src = starfieldImage({ width: 40, height: 30, seed: 5 });
    const { rerender } = render(
      <FileField
        label="Photo"
        value={[
          { id: 'a', name: 'stored.png', type: 'image/png', previewSrc: src, status: 'done' },
        ]}
        hasPreviews
      />,
    );
    expect(screen.getByRole('listitem').querySelector('img')).toHaveAttribute('src', src);
    rerender(
      <FileField
        label="Photo"
        value={[
          { id: 'a', name: 'stored.png', type: 'image/png', previewSrc: src, status: 'done' },
        ]}
      />,
    );
    expect(screen.getByRole('listitem').querySelector('[data-kind]')).toBeNull();
  });
});

describe('DropZone hasPreviews', () => {
  beforeEach(() => {
    vi.spyOn(DataTransferItem.prototype, 'webkitGetAsEntry').mockImplementation(function (
      this: DataTransferItem,
    ) {
      return this.kind === 'file'
        ? ({ isFile: true, isDirectory: false } as FileSystemEntry)
        : null;
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows thumbnails of the files dropped last', async () => {
    const onDrop = vi.fn();
    render(<DropZone hasPreviews onDrop={onDrop} />);
    const zone = screen.getByText('Drop files here').parentElement;
    if (!zone) {
      throw new Error('No zone');
    }
    const data = new DataTransfer();
    data.items.add(pngFile('m31.png'));
    data.items.add(makeFile('notes.txt', 'text/plain'));
    Object.defineProperty(data, 'effectAllowed', { value: 'all' });
    const { left, top } = zone.getBoundingClientRect();
    const init = {
      bubbles: true,
      cancelable: true,
      dataTransfer: data,
      clientX: left + 5,
      clientY: top + 5,
    };
    zone.dispatchEvent(new DragEvent('dragenter', init));
    zone.dispatchEvent(new DragEvent('dragover', init));
    zone.dispatchEvent(new DragEvent('drop', init));
    await expect.poll(() => onDrop.mock.calls.length).toBe(1);
    const list = await screen.findByRole('list');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['m31.png', 'notes.txt']);
  });

  it('shows the files it is given, and nothing without hasPreviews', () => {
    const { rerender } = render(
      <DropZone hasPreviews files={[makeFile('a.pdf', 'application/pdf')]} />,
    );
    expect(screen.getByRole('listitem').querySelector('[data-kind]')).toHaveAttribute(
      'data-kind',
      'pdf',
    );
    rerender(<DropZone files={[makeFile('a.pdf', 'application/pdf')]} />);
    expect(screen.queryByRole('list')).toBeNull();
  });
});

describe('FileThumbnail', () => {
  it('falls back to the icon when the image fails to load', async () => {
    render(<FileThumbnail name="broken.png" type="image/png" src="data:image/png;base64,AAAA" />);
    const thumbnail = document.querySelector('[data-kind="image"]');
    await expect.poll(() => thumbnail?.querySelector('svg')).not.toBeNull();
    expect(thumbnail?.querySelector('img')).toBeNull();
  });
});
