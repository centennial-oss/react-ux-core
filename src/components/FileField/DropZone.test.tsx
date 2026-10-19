import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { DropZone } from './DropZone';
import { FileField } from './FileField';
import type { FileItem } from './files';

function makeFile(name: string, size = 16, type = 'text/csv') {
  return new File([new Uint8Array(size)], name, { type });
}

/**
 * A DataTransfer as a real drag of files from the desktop delivers it. Browsers fill in `effectAllowed` and each
 * file's file-system entry only for trusted drags (React Aria reads both), so the test supplies them.
 */
function transferOf(files: File[], text?: string) {
  const data = new DataTransfer();
  for (const file of files) {
    data.items.add(file);
  }
  if (text !== undefined) {
    data.setData('text/plain', text);
  }
  Object.defineProperty(data, 'effectAllowed', { value: 'all' });
  return data;
}

beforeEach(() => {
  vi.spyOn(DataTransferItem.prototype, 'webkitGetAsEntry').mockImplementation(function (
    this: DataTransferItem,
  ) {
    return this.kind === 'file' ? ({ isFile: true, isDirectory: false } as FileSystemEntry) : null;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** A real drag over and drop onto `target`: the browser events React Aria listens to, with a DataTransfer. */
function dragOver(target: Element, dataTransfer: DataTransfer) {
  const { left, top } = target.getBoundingClientRect();
  const init = {
    bubbles: true,
    cancelable: true,
    dataTransfer,
    clientX: left + 5,
    clientY: top + 5,
  };
  target.dispatchEvent(new DragEvent('dragenter', init));
  target.dispatchEvent(new DragEvent('dragover', init));
  return init;
}

function drop(target: Element, dataTransfer: DataTransfer) {
  const init = dragOver(target, dataTransfer);
  target.dispatchEvent(new DragEvent('drop', init));
}

describe('DropZone', () => {
  it('highlights while files are dragged over it and reports dropped files', async () => {
    const onDrop = vi.fn();
    render(<DropZone onDrop={onDrop} data-testid="zone" />);
    const zone = screen.getByTestId('zone');
    const files = [makeFile('a.csv'), makeFile('b.csv')];
    dragOver(zone, transferOf(files));
    await expect.poll(() => zone.hasAttribute('data-drop-target')).toBe(true);
    zone.dispatchEvent(
      new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transferOf(files) }),
    );
    await expect.poll(() => onDrop.mock.calls.length).toBe(1);
    const dropped = onDrop.mock.lastCall?.[0] as File[];
    expect(dropped.map((file) => file.name)).toEqual(['a.csv', 'b.csv']);
    await expect.poll(() => zone.hasAttribute('data-drop-target')).toBe(false);
  });

  it('ignores dropped content that isn’t a file', async () => {
    const onDrop = vi.fn();
    render(<DropZone onDrop={onDrop} data-testid="zone" />);
    const zone = screen.getByTestId('zone');
    drop(zone, transferOf([], 'just some text'));
    // Give React Aria's async drop handling a chance to run.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('takes pasted files while focused, for keyboard and screen reader users', async () => {
    const onDrop = vi.fn();
    render(<DropZone onDrop={onDrop} />);
    const target = screen.getByRole('button', { name: /Drop files here/ });
    await userEvent.tab();
    expect(document.activeElement).toBe(target);
    target.dispatchEvent(
      new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: transferOf([makeFile('pasted.csv')]),
      }),
    );
    await expect.poll(() => onDrop.mock.calls.length).toBe(1);
    expect((onDrop.mock.lastCall?.[0] as File[])[0]?.name).toBe('pasted.csv');
  });

  it('refuses drops while disabled', async () => {
    const onDrop = vi.fn();
    render(<DropZone onDrop={onDrop} isDisabled data-testid="zone" />);
    const zone = screen.getByTestId('zone');
    drop(zone, transferOf([makeFile('a.csv')]));
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
    expect(onDrop).not.toHaveBeenCalled();
    expect(zone).toHaveAttribute('data-disabled', 'true');
  });

  it('feeds dropped files through FileField’s checks', async () => {
    const onChange = vi.fn();
    render(
      <FileField
        label="Data"
        allowsMultiple
        accept={['.csv']}
        onChange={onChange}
        data-testid="field"
      />,
    );
    const zone = screen.getByTestId('field').querySelector('.border-dashed');
    if (!zone) {
      throw new Error('No drop zone');
    }
    drop(zone, transferOf([makeFile('a.csv'), makeFile('b.png', 16, 'image/png')]));
    await expect.poll(() => onChange.mock.calls.length).toBe(1);
    expect((onChange.mock.lastCall?.[0] as FileItem[]).map((item) => item.file?.name)).toEqual([
      'a.csv',
    ]);
    expect((await screen.findByRole('alert')).textContent).toContain(
      'b.png isn’t an accepted file type',
    );
  });

  it('shows a custom label and extra content', () => {
    render(
      <DropZone label="Drop a CSV">
        <span>or paste one</span>
      </DropZone>,
    );
    expect(screen.getByText('Drop a CSV')).toBeInTheDocument();
    expect(screen.getByText('or paste one')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Drop a CSV/ })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <DropZone />
        <DropZone label="Disabled" isDisabled />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
