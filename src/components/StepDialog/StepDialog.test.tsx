import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Button } from '../Button';
import { DialogTrigger } from '../Dialog';
import { StepDialog, type DialogStep, type StepDialogProps } from './StepDialog';

const customerStep: DialogStep = {
  id: 'customer',
  title: 'Customer',
  content: <p>Choose a customer</p>,
  summary: [{ label: 'Customer', value: 'Acme Corporation' }],
};
const amountStep: DialogStep = {
  id: 'amount',
  title: 'Amount',
  content: <p>Enter the refund amount</p>,
  summary: [{ label: 'Amount', value: '$120.00' }],
};
const baseSteps = [customerStep, amountStep];

function Example(props: Partial<StepDialogProps>) {
  return (
    <DialogTrigger>
      <Button>Issue refund</Button>
      <StepDialog title="Issue refund" steps={baseSteps} onConfirm={() => undefined} {...props} />
    </DialogTrigger>
  );
}

async function open() {
  await userEvent.click(screen.getByRole('button', { name: 'Issue refund' }));
  const dialog = await screen.findByRole('dialog', { name: 'Issue refund' });
  await expect.poll(() => dialog.contains(document.activeElement), { timeout: 2000 }).toBe(true);
  return dialog;
}

describe('StepDialog', () => {
  it('shows progress and the first step, with Back disabled', async () => {
    render(<Example />);
    await open();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Customer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
  });

  it('moves between steps and puts focus on the new step heading', async () => {
    render(<Example />);
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    const heading = screen.getByRole('heading', { name: 'Amount' });
    await expect.poll(() => document.activeElement).toBe(heading);
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'Customer' })).toBeInTheDocument();
  });

  it('disables Next while canAdvance is false', async () => {
    render(<Example steps={[{ ...customerStep, canAdvance: false }, amountStep]} />);
    await open();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('stays on the step and shows the message when validation fails', async () => {
    const validate = vi
      .fn<() => Promise<boolean | string>>()
      .mockResolvedValueOnce('Choose a customer first.')
      .mockResolvedValueOnce(true);
    render(<Example steps={[{ ...customerStep, validate }, amountStep]} />);
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a customer first.');
    expect(screen.getByRole('heading', { name: 'Customer' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('heading', { name: 'Amount' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('lists every collected value on the summary step, then confirms and closes', async () => {
    const onConfirm = vi.fn();
    render(<Example hasSummaryStep onConfirm={onConfirm} confirmLabel="Issue refund" />);
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.getByText('$120.00')).toBeInTheDocument();
    const confirmButtons = screen.getAllByRole('button', { name: 'Issue refund' });
    await userEvent.click(
      confirmButtons[confirmButtons.length - 1] ?? confirmButtons[0] ?? document.body,
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
  });

  it('shows a failed confirm inline and stays open', async () => {
    render(<Example onConfirm={() => Promise.reject(new Error('Refund limit exceeded.'))} />);
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Refund limit exceeded.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('starts at the first step when reopened', async () => {
    render(<Example />);
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
    await open();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    render(<Example hasSummaryStep />);
    await expectNoAxeViolations(await open());
  });
});
