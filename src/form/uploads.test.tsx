import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { ConfigForm } from './ConfigForm';
import type { FormConfig, SubmitContext, SubmitResult } from './types';

interface Attachments {
  files: (File | string)[];
}

type Action = (values: Attachments, context: SubmitContext<Attachments>) => Promise<SubmitResult>;
type Upload = (
  file: File,
  options: { onProgress: (progress: number) => void; signal: AbortSignal },
) => Promise<string>;

function makeFile(name: string) {
  return new File([new Uint8Array(2048)], name, { type: 'application/pdf' });
}

function fileInput(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) {
    throw new Error('No file input');
  }
  return input;
}

function attachmentsConfig(upload: Upload, update: Action): FormConfig<Attachments> {
  return {
    defaultValues: { files: ['stored/existing.pdf'] },
    fields: [
      {
        type: 'files',
        name: 'files',
        label: 'Attachments',
        upload,
        describeFile: (reference) => ({
          name: String(reference).replace('stored/', ''),
          size: 1024,
        }),
      },
    ],
    actions: { update },
  };
}

describe('file uploads on submit', () => {
  it('lists uploaded references by name, uploads new files first, and submits references', async () => {
    const upload = vi.fn<Upload>((file, { onProgress }) => {
      onProgress(0.5);
      return Promise.resolve(`stored/${file.name}`);
    });
    const update = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    const { container } = render(<ConfigForm config={attachmentsConfig(upload, update)} />);
    expect(screen.getByText('existing.pdf')).toBeInTheDocument();
    await userEvent.upload(fileInput(container), makeFile('new.pdf'));
    expect(screen.getByText('new.pdf')).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await expect.poll(() => update.mock.calls.length).toBe(1);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0].files).toEqual(['stored/existing.pdf', 'stored/new.pdf']);
  });

  it('fails the submit with a field error, and retries only the failed file', async () => {
    let shouldFail = true;
    const upload = vi.fn<Upload>((file) =>
      file.name === 'bad.pdf' && shouldFail
        ? Promise.reject(new Error('The server rejected bad.pdf'))
        : Promise.resolve(`stored/${file.name}`),
    );
    const update = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    const { container } = render(<ConfigForm config={attachmentsConfig(upload, update)} />);
    await userEvent.upload(fileInput(container), [makeFile('good.pdf'), makeFile('bad.pdf')]);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await expect
      .poll(() => screen.queryAllByText('The server rejected bad.pdf').length)
      .toBeGreaterThan(0);
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe('1 field needs attention');
    expect(upload).toHaveBeenCalledTimes(2);
    // Retry: good.pdf was already uploaded and isn't sent again.
    shouldFail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await expect.poll(() => update.mock.calls.length).toBe(1);
    expect(upload).toHaveBeenCalledTimes(3);
    expect(upload.mock.calls[2]?.[0].name).toBe('bad.pdf');
    expect(update.mock.calls[0]?.[0].files).toEqual([
      'stored/existing.pdf',
      'stored/good.pdf',
      'stored/bad.pdf',
    ]);
  });

  it('cancels an upload when its file is removed while uploading', async () => {
    let seenSignal: AbortSignal | undefined;
    const upload = vi.fn<Upload>(
      (_file, { signal }) =>
        new Promise((_resolve, reject) => {
          seenSignal = signal;
          signal.addEventListener('abort', () => {
            reject(new DOMException('Cancelled', 'AbortError'));
          });
        }),
    );
    const update = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    const { container } = render(<ConfigForm config={attachmentsConfig(upload, update)} />);
    await userEvent.upload(fileInput(container), makeFile('slow.pdf'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    const cancel = await screen.findByRole('button', { name: /Cancel upload/ });
    await userEvent.click(cancel);
    await expect.poll(() => seenSignal?.aborted).toBe(true);
    expect(update).not.toHaveBeenCalled();
    await expect.poll(() => screen.queryByText('slow.pdf')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ConfigForm
        config={attachmentsConfig(
          () => Promise.resolve('stored/x'),
          () => Promise.resolve({ ok: true }),
        )}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
