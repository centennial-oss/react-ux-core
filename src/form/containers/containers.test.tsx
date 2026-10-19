import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Button } from '../../components/Button/Button';
import { DialogTrigger } from '../../components/Dialog/Dialog';
import type { FormConfig, SubmitContext, SubmitResult } from '../types';
import { CardForm } from './CardForm';
import { DialogForm } from './DialogForm';
import { PageForm } from './PageForm';
import { WizardForm } from './WizardForm';

interface Meter {
  label: string;
  serial: string;
}

type Action = (values: Meter, context: SubmitContext<Meter>) => Promise<SubmitResult>;

function meterConfig(update: Action): FormConfig<Meter> {
  return {
    defaultValues: { label: 'Main', serial: 'A-1' },
    fields: [
      { type: 'text', name: 'label', label: 'Label', isRequired: true },
      { type: 'text', name: 'serial', label: 'Serial' },
    ],
    actions: { update },
  };
}

function textbox(name: string | RegExp, root: HTMLElement = document.body) {
  return within(root).getByRole('textbox', { name });
}

describe('DialogForm', () => {
  function Example({ update }: { update: Action }) {
    return (
      <DialogTrigger>
        <Button>Edit meter</Button>
        <DialogForm title="Edit meter" config={meterConfig(update)} />
      </DialogTrigger>
    );
  }

  it('puts the buttons in the dialog footer and closes after a successful save', async () => {
    const update = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    render(<Example update={update} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit meter' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit meter' });
    await userEvent.type(textbox(/Label/, dialog), ' meter');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await expect.poll(() => update.mock.calls.length).toBe(1);
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
  });

  it('asks before discarding changes and starts over when reopened', async () => {
    render(<Example update={() => Promise.resolve({ ok: true })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit meter' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit meter' });
    await userEvent.type(textbox(/Label/, dialog), ' meter');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(confirm.textContent).toContain('Discard unsaved changes?');
    await userEvent.click(within(confirm).getByRole('button', { name: 'Discard' }));
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Edit meter' }));
    expect(textbox(/Label/, await screen.findByRole('dialog'))).toHaveValue('Main');
  });

  it('cannot be dismissed while saving', async () => {
    let finish: () => void = () => undefined;
    const update = vi.fn<Action>(
      () =>
        new Promise((resolve) => {
          finish = () => {
            resolve({ ok: true });
          };
        }),
    );
    render(<Example update={update} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit meter' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit meter' });
    await userEvent.type(textbox('Serial', dialog), '9');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await expect.poll(() => update.mock.calls.length).toBe(1);
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    finish();
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    render(<Example update={() => Promise.resolve({ ok: true })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit meter' }));
    await expectNoAxeViolations(await screen.findByRole('dialog'));
  });
});

describe('CardForm', () => {
  it('shows the record read-only until Edit, with the buttons in the card footer', async () => {
    const update = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    render(
      <CardForm title="Meter" config={meterConfig(update)} defaultMode="view" hasEditToggle />,
    );
    expect(screen.getByRole('heading', { name: 'Meter' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.type(textbox('Serial'), '9');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await expect.poll(() => update.mock.calls.length).toBe(1);
    // Back to view mode with the saved value.
    await expect.poll(() => screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('A-19')).toBeInTheDocument();
  });
});

describe('PageForm', () => {
  it('renders a heading, the fields and the action bar, with Cancel', async () => {
    const onCancel = vi.fn();
    render(
      <PageForm
        title="New meter"
        config={{ ...meterConfig(() => Promise.resolve({ ok: true })), actions: undefined }}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'New meter' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <PageForm title="Meter" config={meterConfig(() => Promise.resolve({ ok: true }))} />,
    );
    await expectNoAxeViolations(container);
  });
});

describe('WizardForm', () => {
  interface Refund {
    account: string;
    amount: number | null;
    reason: string;
  }
  type RefundAction = (values: Refund, context: SubmitContext<Refund>) => Promise<SubmitResult>;

  function Wizard({ create }: { create: RefundAction }) {
    return (
      <DialogTrigger>
        <Button>Refund</Button>
        <WizardForm<Refund>
          title="Issue a refund"
          hasSummaryStep
          steps={[
            { id: 'who', title: 'Account', fields: ['account'] },
            { id: 'what', title: 'Amount', fields: ['amount', 'reason'] },
          ]}
          config={{
            defaultValues: { account: '', amount: null, reason: '' },
            fields: [
              { type: 'text', name: 'account', label: 'Account', isRequired: true },
              { type: 'number', name: 'amount', label: 'Amount', isRequired: true },
              { type: 'textarea', name: 'reason', label: 'Reason' },
            ],
            actions: { create, submitLabel: 'Issue refund' },
          }}
        />
      </DialogTrigger>
    );
  }

  it('validates each step before Next, summarises, and submits on confirm', async () => {
    const create = vi.fn<RefundAction>(() => Promise.resolve({ ok: true }));
    render(<Wizard create={create} />);
    await userEvent.click(screen.getByRole('button', { name: 'Refund' }));
    const dialog = await screen.findByRole('dialog', { name: 'Issue a refund' });
    expect(dialog.textContent).toContain('Step 1 of 3');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
    await expect.poll(() => dialog.textContent).toContain('1 field needs attention');
    await expect.poll(() => document.activeElement).toBe(textbox(/Account/, dialog));
    await userEvent.keyboard('ACC-7');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
    await expect.poll(() => dialog.textContent).toContain('Step 2 of 3');
    await userEvent.type(textbox(/Amount/, dialog), '25');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
    await expect.poll(() => dialog.textContent).toContain('Step 3 of 3');
    expect(dialog.textContent).toContain('ACC-7');
    expect(dialog.textContent).toContain('25');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Issue refund' }));
    await expect.poll(() => create.mock.calls.length).toBe(1);
    expect(create.mock.calls[0]?.[0]).toEqual({ account: 'ACC-7', amount: 25, reason: null });
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
  });

  it('returns to the step of a field the server rejected', async () => {
    const create = vi.fn<RefundAction>(() =>
      Promise.resolve({ ok: false, fieldErrors: { account: 'Account is closed' } }),
    );
    render(<Wizard create={create} />);
    await userEvent.click(screen.getByRole('button', { name: 'Refund' }));
    const dialog = await screen.findByRole('dialog', { name: 'Issue a refund' });
    await userEvent.type(textbox(/Account/, dialog), 'ACC-1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
    await userEvent.type(textbox(/Amount/, dialog), '5');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Issue refund' }));
    await expect.poll(() => dialog.textContent).toContain('Step 1 of 3');
    expect(dialog.textContent).toContain('Account is closed');
  });
});
