import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { FileField } from './FileField';
import type { FileItem, UploadOptions } from './files';

const hasTouch = navigator.maxTouchPoints > 0;

function makeFile(name: string, size = 1024, type = 'application/pdf') {
  return new File([new Uint8Array(size)], name, { type });
}

function fileInput(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) {
    throw new Error('No file input');
  }
  return input;
}

/** The last list `onChange` reported. */
function lastItems(onChange: ReturnType<typeof vi.fn>) {
  return (onChange.mock.lastCall?.[0] ?? []) as FileItem[];
}

/** A fake upload the test drives: report progress, then resolve or reject. */
function controllableUpload() {
  const calls: {
    file: File;
    options: UploadOptions;
    resolve: (value: string) => void;
    reject: (error: unknown) => void;
  }[] = [];
  const upload = vi.fn(
    (file: File, options: UploadOptions) =>
      new Promise<string>((resolve, reject) => {
        calls.push({ file, options, resolve, reject });
      }),
  );
  return { upload, calls };
}

describe('FileField', () => {
  it('is a labelled, described group with a choose-files button and a drop zone', () => {
    render(<FileField label="Attachments" description="PDF only" />);
    const group = screen.getByRole('group', { name: 'Attachments' });
    expect(group).toHaveAccessibleDescription('PDF only');
    expect(within(group).getByRole('button', { name: 'Choose files' })).toBeInTheDocument();
    // React Aria's drop zone has a hidden button for keyboard and screen reader users, named by the zone's text.
    expect(within(group).getByRole('button', { name: /Drop files here/ })).toBeInTheDocument();
  });

  it('lists chosen files as pending items when it does no uploading', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <FileField label="Attachments" allowsMultiple onChange={onChange} />,
    );
    await userEvent.upload(fileInput(container), [
      makeFile('report.pdf', 2048),
      makeFile('notes.pdf'),
    ]);
    const items = lastItems(onChange);
    expect(items.map((item) => [item.file?.name, item.status])).toEqual([
      ['report.pdf', 'pending'],
      ['notes.pdf', 'pending'],
    ]);
    expect(new Set(items.map((item) => item.id)).size).toBe(2);
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(list.textContent).toContain('2 kB');
  });

  it('replaces the file when it holds only one', async () => {
    const onChange = vi.fn();
    const { container } = render(<FileField label="Contract" onChange={onChange} />);
    await userEvent.upload(fileInput(container), makeFile('draft.pdf'));
    await userEvent.upload(fileInput(container), makeFile('final.pdf'));
    expect(lastItems(onChange).map((item) => item.file?.name)).toEqual(['final.pdf']);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('turns away files of the wrong type or size, and too many files, with messages', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <FileField
        label="Attachments"
        allowsMultiple
        accept={['application/pdf', '.csv']}
        maxSize={5 * 1024 * 1024}
        maxFiles={2}
        onChange={onChange}
      />,
    );
    // The browser's file chooser offers only accepted types, but a user can still pick others.
    expect(fileInput(container).accept).toBe('application/pdf,.csv');
    await userEvent.upload(fileInput(container), [
      makeFile('photo.png', 10, 'image/png'),
      makeFile('huge.pdf', 6 * 1024 * 1024),
      makeFile('data.csv', 10, ''),
    ]);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('photo.png isn’t an accepted file type');
    expect(alert.textContent).toContain('huge.pdf is larger than 5 MB');
    expect(lastItems(onChange).map((item) => item.file?.name)).toEqual(['data.csv']);

    await userEvent.upload(fileInput(container), [makeFile('a.pdf'), makeFile('b.pdf')]);
    expect(screen.getByRole('alert').textContent).toContain('Choose up to 2 files');
    expect(lastItems(onChange).map((item) => item.file?.name)).toEqual(['data.csv', 'a.pdf']);
  });

  it('uploads each added file with progress, and keeps the result', async () => {
    const { upload, calls } = controllableUpload();
    const onChange = vi.fn();
    const { container } = render(
      <FileField label="Attachments" upload={upload} onChange={onChange} />,
    );
    await userEvent.upload(fileInput(container), makeFile('report.pdf'));
    expect(upload).toHaveBeenCalledTimes(1);
    expect(lastItems(onChange)[0]?.status).toBe('uploading');

    calls[0]?.options.onProgress(0.4);
    const progress = await screen.findByRole('progressbar', { name: 'Uploading report.pdf' });
    await expect.poll(() => progress.getAttribute('aria-valuenow')).toBe('40');

    calls[0]?.resolve('file_123');
    await expect.poll(() => lastItems(onChange)[0]?.status).toBe('done');
    expect(lastItems(onChange)[0]).toMatchObject({ progress: 1, result: 'file_123' });
    await expect.poll(() => screen.getByRole('listitem').dataset.status).toBe('done');
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('shows a failed upload’s error and retries it', async () => {
    const { upload, calls } = controllableUpload();
    const onChange = vi.fn();
    const { container } = render(
      <FileField label="Attachments" upload={upload} onChange={onChange} />,
    );
    await userEvent.upload(fileInput(container), makeFile('report.pdf'));
    calls[0]?.reject(new Error('The server is busy'));
    expect((await screen.findByRole('alert')).textContent).toBe('The server is busy');
    expect(lastItems(onChange)[0]).toMatchObject({ status: 'error', error: 'The server is busy' });

    await userEvent.click(screen.getByRole('button', { name: 'Retry report.pdf' }));
    expect(upload).toHaveBeenCalledTimes(2);
    expect(lastItems(onChange)[0]?.status).toBe('uploading');
    calls[1]?.resolve('file_456');
    await expect.poll(() => lastItems(onChange)[0]?.status).toBe('done');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('falls back to a generic message when the error has none', async () => {
    const { upload, calls } = controllableUpload();
    const { container } = render(<FileField label="Attachments" upload={upload} />);
    await userEvent.upload(fileInput(container), makeFile('report.pdf'));
    calls[0]?.reject('nope');
    expect((await screen.findByRole('alert')).textContent).toBe('report.pdf couldn’t be uploaded');
  });

  it('cancels a running upload, aborting its signal and removing the file', async () => {
    const { upload, calls } = controllableUpload();
    const onChange = vi.fn();
    const { container } = render(
      <FileField label="Attachments" upload={upload} onChange={onChange} />,
    );
    await userEvent.upload(fileInput(container), makeFile('report.pdf'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel upload report.pdf' }));
    expect(calls[0]?.options.signal.aborted).toBe(true);
    expect(lastItems(onChange)).toEqual([]);
    // A late result from the cancelled upload changes nothing.
    calls[0]?.resolve('late');
    calls[0]?.options.onProgress(1);
    await Promise.resolve();
    expect(lastItems(onChange)).toEqual([]);
  });

  it('removes a file with its remove button and keeps focus in the field', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <FileField label="Attachments" allowsMultiple onChange={onChange} />,
    );
    await userEvent.upload(fileInput(container), [makeFile('a.pdf'), makeFile('b.pdf')]);
    await userEvent.click(screen.getByRole('button', { name: 'Remove a.pdf' }));
    expect(lastItems(onChange).map((item) => item.file?.name)).toEqual(['b.pdf']);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Choose files' }));
  });

  it('aborts uploads still running when it unmounts', async () => {
    const { upload, calls } = controllableUpload();
    const { container, unmount } = render(<FileField label="Attachments" upload={upload} />);
    await userEvent.upload(fileInput(container), makeFile('report.pdf'));
    unmount();
    expect(calls[0]?.options.signal.aborted).toBe(true);
  });

  it('shows progress and errors the app reports through a controlled value', async () => {
    const report = makeFile('report.pdf');
    const notes = makeFile('notes.pdf');
    function Controlled() {
      const [items, setItems] = useState<FileItem[]>([
        { id: 'r', file: report, status: 'uploading', progress: 0.25 },
        { id: 'n', file: notes, status: 'error', error: 'Virus scan failed' },
      ]);
      return (
        <>
          <FileField label="Attachments" allowsMultiple value={items} onChange={setItems} />
          <button
            type="button"
            onClick={() => {
              setItems((current) =>
                current.map((item) => (item.id === 'r' ? { ...item, progress: 0.75 } : item)),
              );
            }}
          >
            Progress
          </button>
        </>
      );
    }
    render(<Controlled />);
    const progress = screen.getByRole('progressbar', { name: 'Uploading report.pdf' });
    expect(progress.getAttribute('aria-valuenow')).toBe('25');
    expect(screen.getByRole('alert').textContent).toBe('Virus scan failed');
    // The app runs these uploads, so there's no retry; removing still works.
    expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Progress' }));
    expect(progress.getAttribute('aria-valuenow')).toBe('75');
    await userEvent.click(screen.getByRole('button', { name: 'Remove notes.pdf' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('opens the file chooser from the keyboard', async () => {
    const { container } = render(<FileField label="Attachments" />);
    const click = vi.spyOn(fileInput(container), 'click').mockImplementation(() => undefined);
    screen.getByRole('button', { name: 'Choose files' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(click).toHaveBeenCalled();
  });

  it.runIf(hasTouch)('opens the file chooser with a tap', async () => {
    const { container } = render(<FileField label="Attachments" data-testid="field" />);
    const click = vi.spyOn(fileInput(container), 'click').mockImplementation(() => undefined);
    await commands.tap('[data-testid="field"] button:has-text("Choose files")');
    expect(click).toHaveBeenCalled();
  });

  it('shows the error message when invalid', () => {
    render(<FileField label="Attachments" isInvalid errorMessage="Attach the signed contract" />);
    const group = screen.getByRole('group', { name: 'Attachments' });
    expect(screen.getByText('Attach the signed contract')).toBeInTheDocument();
    expect(group).toHaveAccessibleDescription('Attach the signed contract');
    expect(group).toHaveAttribute('data-invalid', 'true');
  });

  it('disables choosing and removing when disabled', () => {
    render(
      <FileField
        label="Attachments"
        isDisabled
        defaultValue={[{ id: 'a', file: makeFile('a.pdf'), status: 'done' }]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Choose files' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove a.pdf' })).toBeDisabled();
    // A finished file says so to screen readers, not only with its check icon.
    expect(screen.getByRole('listitem').textContent).toContain('Uploaded');
  });

  it('keeps long file names inside narrow screens', async () => {
    const { container } = render(
      <div className="p-4">
        <FileField label="Attachments" />
      </div>,
    );
    await userEvent.upload(
      fileInput(container),
      makeFile(`${'quarterly-financial-statement-final-'.repeat(4)}v2.pdf`),
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('has no accessibility violations', async () => {
    const { upload } = controllableUpload();
    const { container } = render(
      <>
        <FileField
          label="Attachments"
          description="PDF, up to 5 MB"
          allowsMultiple
          upload={upload}
          defaultValue={[
            { id: 'a', file: makeFile('a.pdf'), status: 'done' },
            { id: 'b', file: makeFile('b.pdf'), status: 'uploading', progress: 0.5 },
            { id: 'c', file: makeFile('c.pdf'), status: 'error', error: 'Failed' },
          ]}
        />
        <FileField label="Contract" isRequired isInvalid errorMessage="Required" />
        <FileField aria-label="Disabled" isDisabled />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
