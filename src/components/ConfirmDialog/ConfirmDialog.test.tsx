import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Button } from '../Button';
import { DialogTrigger } from '../Dialog';
import { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';

function Example(props: Partial<ConfirmDialogProps>) {
  return (
    <DialogTrigger>
      <Button>Delete meter</Button>
      <ConfirmDialog
        title="Delete meter M-1042?"
        body="Its readings will be removed from all reports."
        consequence="This can't be undone."
        tone="danger"
        confirmLabel="Delete"
        onConfirm={() => undefined}
        {...props}
      />
    </DialogTrigger>
  );
}

async function open() {
  await userEvent.click(screen.getByRole('button', { name: 'Delete meter' }));
  const dialog = await screen.findByRole('alertdialog');
  await expect.poll(() => dialog.contains(document.activeElement), { timeout: 2000 }).toBe(true);
  return dialog;
}

const deferred = () => {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('ConfirmDialog', () => {
  it('is an alertdialog with the consequence and a danger confirm button', async () => {
    render(<Example />);
    const dialog = await open();
    expect(dialog).toHaveAccessibleName('Delete meter M-1042?');
    expect(screen.getByText("This can't be undone.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' }).className).toContain('bg-danger-solid');
  });

  it('cancels without confirming', async () => {
    const onConfirm = vi.fn();
    render(<Example onConfirm={onConfirm} />);
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await expect.poll(() => screen.queryByRole('alertdialog'), { timeout: 3000 }).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('enables Confirm only after the confirm text is typed exactly, and Enter confirms', async () => {
    const onConfirm = vi.fn();
    render(<Example confirmPhrase="M-1042" onConfirm={onConfirm} />);
    await open();
    const confirm = screen.getByRole('button', { name: 'Delete' });
    expect(confirm).toBeDisabled();
    const field = screen.getByRole('textbox', { name: 'Type M-1042 to confirm' });
    await userEvent.type(field, 'm-1042');
    expect(confirm).toBeDisabled();
    await userEvent.clear(field);
    await userEvent.type(field, 'M-1042');
    expect(confirm).toBeEnabled();
    await userEvent.keyboard('{Enter}');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows a pending state while an async confirm runs, then closes', async () => {
    const pending = deferred();
    render(<Example onConfirm={() => pending.promise} />);
    const dialog = await open();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(dialog).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    pending.resolve();
    await expect.poll(() => screen.queryByRole('alertdialog'), { timeout: 3000 }).toBeNull();
  });

  it('shows the error inline and stays open when an async confirm fails', async () => {
    const pending = deferred();
    render(<Example onConfirm={() => pending.promise} />);
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    pending.reject(new Error('The meter is still sending readings.'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The meter is still sending readings.',
    );
    expect(screen.getByRole('alertdialog')).not.toHaveAttribute('aria-busy');
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
  });

  it('falls back to a generic message for errors without one', async () => {
    render(<Example onConfirm={() => Promise.reject(new Error(''))} />);
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
  });

  it('starts fresh when reopened', async () => {
    render(<Example confirmPhrase="M-1042" />);
    await open();
    await userEvent.type(screen.getByRole('textbox', { name: 'Type M-1042 to confirm' }), 'M-10');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await expect.poll(() => screen.queryByRole('alertdialog'), { timeout: 3000 }).toBeNull();
    await open();
    expect(screen.getByRole('textbox', { name: 'Type M-1042 to confirm' })).toHaveValue('');
  });

  it('has no accessibility violations', async () => {
    render(<Example confirmPhrase="M-1042" />);
    await expectNoAxeViolations(await open());
  });
});
