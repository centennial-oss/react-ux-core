import { render, screen, within } from '@testing-library/react';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { csvFile, jsonFile, mp3File, pdfFile, pngFile, zipFile } from '../../../test/mediaFiles';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { FilePreview } from './FilePreview';
import { FilePreviewList } from './FilePreviewList';
import type { MediaFilesMessages } from './messages';

/** Overrides of this entry's strings (its interface joins `Messages` when the entry is wired up). */
const overrides = (strings: Partial<MediaFilesMessages>) => strings as unknown as Partial<Messages>;

const isDesktop = window.innerWidth >= 1024;
const isTouch = navigator.maxTouchPoints > 0;

describe('FilePreview', () => {
  it('shows a PNG, a PDF, an MP3 and a ZIP as an image, a first page, a play button and an icon', async () => {
    const files = [pngFile('saturn.png'), pdfFile('statement.pdf'), mp3File(), zipFile()];
    render(
      <div className="flex flex-wrap gap-2 p-2">
        {files.map((file) => (
          <FilePreview key={file.name} file={file} workerSrc={workerSrc} />
        ))}
      </div>,
    );
    // The PNG: a thumbnail image from an object URL.
    const image = screen.getByRole('button', { name: 'Preview saturn.png' });
    await expect.poll(() => image.querySelector('img')?.getAttribute('src')).toMatch(/^blob:/);
    // The PDF: page 1 drawn on a canvas.
    const pdf = screen.getByRole('button', { name: 'Preview statement.pdf' });
    await expect
      .poll(() => pdf.querySelector('[data-status]')?.getAttribute('data-status'), {
        timeout: 10_000,
      })
      .toBe('ready');
    expect(pdf.querySelector('canvas')?.width).toBeGreaterThan(0);
    // The MP3: an inline player with a play button, no preview button.
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Preview chime.mp3' })).toBeNull();
    // The ZIP: the archive icon.
    const zip = screen.getByRole('button', { name: 'Preview observations.zip' });
    expect(zip.closest('[data-kind]')).toHaveAttribute('data-kind', 'archive');
    expect(zip.querySelector('svg')).not.toBeNull();
    expect(zip.parentElement?.textContent).toEqual(expect.stringContaining('Archive · 22 byte'));
  });

  it('opens a dialog labelled with the file name, and closes with Escape', async () => {
    render(<FilePreview file={jsonFile('mars.json')} />);
    const thumbnail = screen.getByRole('button', { name: 'Preview mars.json' });
    expect(thumbnail).toHaveAttribute('aria-haspopup', 'dialog');
    await userEvent.click(thumbnail);
    const dialog = await screen.findByRole('dialog', { name: 'mars.json' });
    await expect.poll(() => dialog.textContent).toEqual(expect.stringContaining('Phobos'));
    await expectNoAxeViolations(dialog);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
  });

  it.skipIf(!isDesktop)('opens from the keyboard and returns focus to the thumbnail', async () => {
    render(<FilePreview file={zipFile('frames.zip')} presentation="dialog" />);
    await userEvent.tab();
    const chip = screen.getByRole('button', { name: 'Preview frames.zip' });
    expect(chip).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    const dialog = await screen.findByRole('dialog', { name: 'frames.zip' });
    expect(within(dialog).getByRole('button', { name: 'Download' })).toBeInTheDocument();
    expect(dialog.textContent).toEqual(expect.stringContaining('There’s no preview'));
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => document.activeElement).toBe(chip);
  });

  it.skipIf(!isTouch)('opens with a tap', async () => {
    render(<FilePreview file={csvFile('readings.csv')} />);
    await commands.tap('button[aria-label="Preview readings.csv"]');
    expect(await screen.findByRole('dialog', { name: 'readings.csv' })).toBeInTheDocument();
  });

  it('revokes the object URL on unmount', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const { unmount } = render(<FilePreview file={pngFile('moon.png')} />);
    const button = screen.getByRole('button', { name: 'Preview moon.png' });
    await expect.poll(() => button.querySelector('img')?.getAttribute('src')).toMatch(/^blob:/);
    const url = button.querySelector('img')?.getAttribute('src');
    unmount();
    expect(revoke).toHaveBeenCalledWith(url);
    revoke.mockRestore();
  });

  it('shows JSON inline in a CodeBlock, and cuts text past the size limit', async () => {
    const { rerender } = render(<FilePreview file={jsonFile('mars.json')} presentation="inline" />);
    const block = await screen.findByRole('figure', { name: 'mars.json' });
    expect(block.textContent).toEqual(expect.stringContaining('"Deimos"'));
    rerender(
      <FilePreview file={csvFile('long.csv', 200)} presentation="inline" maxTextSize={256} />,
    );
    await expect
      .poll(() => document.body.textContent)
      .toEqual(expect.stringContaining('Showing the first 256 byte'));
    const code = await screen.findByRole('figure', { name: 'long.csv' });
    expect(code.textContent.length).toBeLessThan(400);
  });

  it('gives a remote file without a viewer its icon, size and a download button', async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    render(
      <FilePreview
        presentation="inline"
        file={{ name: 'raw.zip', url: 'https://example.com/raw.zip', type: '', size: 5_242_880 }}
      />,
    );
    expect(document.body.textContent).toEqual(expect.stringContaining('Archive · 5 MB'));
    await userEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  it('takes its strings from UIProvider', () => {
    render(
      <UIProvider
        messages={overrides({
          filePreview: ({ name }) => `Aperçu de ${name}`,
          fileKindArchive: 'Archive ZIP',
        })}
      >
        <FilePreview file={zipFile('a.zip')} />
      </UIProvider>,
    );
    const button = screen.getByRole('button', { name: 'Aperçu de a.zip' });
    expect(button.parentElement?.textContent).toEqual(expect.stringContaining('Archive ZIP'));
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <div className="flex flex-wrap gap-2 p-2">
        <FilePreview file={pngFile('saturn.png')} />
        <FilePreview file={zipFile()} presentation="dialog" />
        <FilePreview file={mp3File()} />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});

describe('FilePreviewList', () => {
  it('lists attachments with remove buttons named by file', async () => {
    const onRemove = vi.fn();
    render(
      <div className="p-2">
        <FilePreviewList files={[pngFile('a.png'), zipFile('b.zip')]} onRemove={onRemove} />
      </div>,
    );
    const list = screen.getByRole('list', { name: 'Attachments' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Remove b.zip' }));
    expect(onRemove).toHaveBeenCalledWith(1);
    await expectNoAxeViolations(list);
  });

  it('calls onPreview instead of opening the dialog', async () => {
    const onPreview = vi.fn();
    render(
      <FilePreviewList files={[zipFile('b.zip')]} presentation="dialog" onPreview={onPreview} />,
    );
    const chip = screen.getByRole('button', { name: 'Preview b.zip' });
    expect(chip).not.toHaveAttribute('aria-haspopup');
    await userEvent.click(chip);
    expect(onPreview).toHaveBeenCalledWith(0);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
