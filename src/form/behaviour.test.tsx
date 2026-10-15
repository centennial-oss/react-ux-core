import { render, screen, within } from '@testing-library/react';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { z } from 'zod';
import { UIProvider } from '../provider/UIProvider';
import { ConfigForm } from './ConfigForm';
import { createFieldRegistry } from './registry';
import type { FieldRendererProps, FormConfig, SubmitContext, SubmitResult } from './types';
import type { ConfigFormHandle } from './useFormController';

type Action<V> = (values: V, context: SubmitContext<V>) => Promise<SubmitResult>;

function textbox(name: string | RegExp) {
  return screen.getByRole('textbox', { name });
}

async function clickButton(name: string) {
  await userEvent.click(screen.getByRole('button', { name }));
}

describe('validation', () => {
  interface Account {
    password: string;
    confirm: string;
    isBusiness: boolean;
    vat: string;
  }

  const accountConfig = (create: Action<Account>): FormConfig<Account> => ({
    defaultValues: { password: '', confirm: '', isBusiness: false, vat: '' },
    schema: z
      .object({
        password: z.string(),
        confirm: z.string(),
        isBusiness: z.boolean(),
        vat: z.string().min(1, 'VAT is required'),
      })
      .refine((values) => values.password === values.confirm, {
        path: ['confirm'],
        message: 'Passwords don’t match',
      }),
    fields: [
      { type: 'text', name: 'password', label: 'Password' },
      { type: 'text', name: 'confirm', label: 'Confirm' },
      { type: 'checkbox', name: 'isBusiness', label: 'Business' },
      {
        type: 'text',
        name: 'vat',
        label: 'VAT',
        visibleWhen: (values: Account) => values.isBusiness,
      },
    ],
    actions: { create },
  });

  it('shows cross-field schema errors on the right field, and ignores hidden fields', async () => {
    const create = vi.fn<Action<Account>>(() => Promise.resolve({ ok: true }));
    render(<ConfigForm config={accountConfig(create)} />);
    await userEvent.type(textbox('Password'), 'secret');
    await userEvent.type(textbox('Confirm'), 'other');
    await userEvent.tab();
    await expect.poll(() => screen.queryByText('Passwords don’t match')).not.toBeNull();
    await userEvent.clear(textbox('Confirm'));
    await userEvent.type(textbox('Confirm'), 'secret');
    await expect.poll(() => screen.queryByText('Passwords don’t match')).toBeNull();
    // The hidden VAT field's schema rule doesn't block the submit, and its value isn't sent.
    await clickButton('Create');
    await expect.poll(() => create.mock.calls.length).toBe(1);
    expect(create.mock.calls[0]?.[0]).toEqual({
      password: 'secret',
      confirm: 'secret',
      isBusiness: false,
    });
  });

  it('keeps a schema error on another field when a valid field is left', async () => {
    render(<ConfigForm config={accountConfig(vi.fn<Action<Account>>())} />);
    await userEvent.type(textbox('Password'), 'secret');
    await userEvent.type(textbox('Confirm'), 'other');
    await userEvent.tab();
    await expect.poll(() => screen.queryByText('Passwords don’t match')).not.toBeNull();
    // Leaving Password (valid) also runs the form's async validator, which must not clear Confirm's error.
    await userEvent.click(textbox('Password'));
    await userEvent.tab();
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)));
    expect(screen.getByText('Passwords don’t match')).toBeInTheDocument();
  });

  it('validates a shown conditional field', async () => {
    const create = vi.fn<Action<Account>>(() => Promise.resolve({ ok: true }));
    render(<ConfigForm config={accountConfig(create)} />);
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Business' }).closest('label') ?? document.body,
    );
    expect(textbox('VAT')).toBeInTheDocument();
    await clickButton('Create');
    await expect.poll(() => screen.queryByText('VAT is required')).not.toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it('runs an async check after the field is left, debounced, and blocks submit until it passes', async () => {
    const validate = vi.fn(async (value: string) => {
      await Promise.resolve();
      return value === 'taken' ? 'That name is taken' : undefined;
    });
    const create = vi.fn<Action<{ name: string }>>(() => Promise.resolve({ ok: true }));
    render(
      <ConfigForm
        config={{
          defaultValues: { name: '' },
          fields: [{ type: 'text', name: 'name', label: 'Name', validate, debounceMs: 50 }],
          actions: { create },
        }}
      />,
    );
    await userEvent.type(textbox('Name'), 'taken');
    // Typing in a fresh field calls it once (to learn it's async), not once per key.
    expect(validate.mock.calls.length).toBeLessThanOrEqual(1);
    await userEvent.tab();
    await expect.poll(() => screen.queryByText('That name is taken')).not.toBeNull();
    await clickButton('Create');
    await expect.poll(() => document.activeElement).toBe(textbox('Name'));
    expect(create).not.toHaveBeenCalled();
    await userEvent.clear(textbox('Name'));
    await userEvent.type(textbox('Name'), 'free');
    await expect.poll(() => screen.queryByText('That name is taken')).toBeNull();
    await clickButton('Create');
    await expect.poll(() => create.mock.calls.length).toBe(1);
  });

  it('applies emptyAs per field when submitting', async () => {
    interface Optional {
      a: string;
      b: string;
      c: string;
      d: number | null;
      e: string;
    }
    const create = vi.fn<Action<Optional>>(() => Promise.resolve({ ok: true }));
    render(
      <ConfigForm<Optional>
        config={{
          defaultValues: { a: '', b: '', c: '', d: null, e: 'kept' },
          emptyAs: 'null',
          fields: [
            { type: 'text', name: 'a', label: 'A' },
            { type: 'text', name: 'b', label: 'B', emptyAs: 'omit' },
            { type: 'text', name: 'c', label: 'C', emptyAs: 'empty-string' },
            { type: 'number', name: 'd', label: 'D', emptyAs: 'omit' },
            { type: 'text', name: 'e', label: 'E' },
          ],
          actions: { create },
        }}
      />,
    );
    await clickButton('Create');
    await expect.poll(() => create.mock.calls.length).toBe(1);
    expect(create.mock.calls[0]?.[0]).toEqual({ a: null, c: '', e: 'kept' });
  });
});

describe('dependent fields', () => {
  interface Place {
    country: string;
    region: string;
    city: string;
  }

  it('resets dependents (and theirs) in the same update as the parent change', async () => {
    const seen: Place[] = [];
    // A renderer that records every combination of values it's drawn with.
    function Probe({ field }: FieldRendererProps) {
      seen.push({ ...(field.getValues() as Place) });
      return (
        <input
          aria-label={field.name}
          value={typeof field.value === 'string' ? field.value : ''}
          onChange={(event) => {
            field.onChange(event.target.value);
          }}
        />
      );
    }
    const registry = createFieldRegistry({ probe: Probe });
    render(
      <ConfigForm<Place, 'probe'>
        registry={registry}
        config={{
          defaultValues: { country: 'us', region: 'co', city: 'denver' },
          fields: [
            { type: 'probe', name: 'country', label: 'Country' },
            {
              type: 'probe',
              name: 'region',
              label: 'Region',
              dependsOn: { fields: ['country'], onChange: 'reset' },
            },
            {
              type: 'probe',
              name: 'city',
              label: 'City',
              dependsOn: { fields: ['region'], onChange: 'reset' },
            },
          ],
        }}
      />,
    );
    const country = screen.getByRole('textbox', { name: 'country' });
    await userEvent.type(country, 'x');
    expect(screen.getByRole('textbox', { name: 'region' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'city' })).toHaveValue('');
    // No render ever showed the changed country with the old region or city.
    const stale = seen.filter(
      (values) => values.country !== 'us' && (values.region === 'co' || values.city === 'denver'),
    );
    expect(stale).toEqual([]);
    expect(seen.some((values) => values.country === 'usx')).toBe(true);
  });

  it('computes dependent values with a function', async () => {
    const create = vi.fn<Action<{ plan: string; price: number | null }>>(() =>
      Promise.resolve({ ok: true }),
    );
    render(
      <ConfigForm
        config={{
          defaultValues: { plan: 'basic', price: 10 },
          fields: [
            {
              type: 'radio',
              name: 'plan',
              label: 'Plan',
              items: [
                { id: 'basic', label: 'Basic' },
                { id: 'pro', label: 'Pro' },
              ],
            },
            {
              type: 'number',
              name: 'price',
              label: 'Price',
              dependsOn: {
                fields: ['plan'],
                onChange: (values) => ({ price: values.plan === 'pro' ? 25 : 10 }),
              },
            },
          ],
          actions: { create },
        }}
      />,
    );
    await userEvent.click(
      screen.getByRole('radio', { name: 'Pro' }).closest('label') ?? document.body,
    );
    await expect.poll(() => textbox('Price')).toHaveValue('25');
  });
});

describe('submit lifecycle', () => {
  interface Tariff {
    name: string;
    amount: number | null;
  }

  const tariffFields: FormConfig<Tariff>['fields'] = [
    { type: 'text', name: 'name', label: 'Name' },
    { type: 'number', name: 'amount', label: 'Amount' },
  ];

  it('shows and announces server field errors, and puts unplaced ones in the form banner', async () => {
    const create = vi.fn<Action<Tariff>>(() =>
      Promise.resolve({
        ok: false,
        formError: 'Some values were rejected.',
        fieldErrors: { name: 'Name is already used', 'missing.path': 'Ask an administrator' },
      }),
    );
    render(
      <ConfigForm
        config={{
          defaultValues: { name: 'Flat', amount: 1 },
          fields: tariffFields,
          actions: { create },
        }}
      />,
    );
    await clickButton('Create');
    await expect.poll(() => screen.queryByText('Name is already used')).not.toBeNull();
    const banner = screen.getByRole('alert');
    expect(banner.textContent).toContain('Some values were rejected.');
    expect(banner.textContent).toContain('Ask an administrator');
    expect(screen.getByRole('status').textContent).toBe('1 field needs attention');
    await expect.poll(() => document.activeElement).toBe(textbox('Name'));
    // Values stay for a retry; editing the field clears its server error.
    expect(textbox('Name')).toHaveValue('Flat');
    await userEvent.type(textbox('Name'), ' 2');
    await expect.poll(() => screen.queryByText('Name is already used')).toBeNull();
  });

  it('reports a thrown action as a form error', async () => {
    const create = vi.fn<Action<Tariff>>(() => Promise.reject(new Error('Network down')));
    render(
      <ConfigForm
        config={{
          defaultValues: { name: '', amount: null },
          fields: tariffFields,
          actions: { create },
        }}
      />,
    );
    await clickButton('Create');
    await expect.poll(() => screen.queryByRole('alert')?.textContent).toContain('Network down');
  });

  it('asks for confirmation and resubmits with isConfirmed', async () => {
    const create = vi.fn<Action<Tariff>>((_values, context) =>
      Promise.resolve(
        context.isConfirmed
          ? { ok: true }
          : {
              ok: 'confirm',
              warning: 'This tariff overlaps another.',
              confirmLabel: 'Save anyway',
            },
      ),
    );
    render(
      <ConfigForm
        config={{
          defaultValues: { name: 'Flat', amount: 1 },
          fields: tariffFields,
          actions: { create },
        }}
      />,
    );
    await clickButton('Create');
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain('This tariff overlaps another.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save anyway' }));
    await expect.poll(() => create.mock.calls.length).toBe(2);
    expect(create.mock.calls[1]?.[1].isConfirmed).toBe(true);
  });

  it('blocks a double submit and keeps the button pending', async () => {
    let finish: () => void = () => undefined;
    const create = vi.fn<Action<Tariff>>(
      () =>
        new Promise((resolve) => {
          finish = () => {
            resolve({ ok: true });
          };
        }),
    );
    render(
      <ConfigForm
        config={{
          defaultValues: { name: 'Flat', amount: 1 },
          fields: tariffFields,
          actions: { create },
        }}
      />,
    );
    const button = screen.getByRole('button', { name: 'Create' });
    await userEvent.click(button);
    await expect.poll(() => create.mock.calls.length).toBe(1);
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button, { force: true });
    expect(create).toHaveBeenCalledTimes(1);
    finish();
    await expect.poll(() => button.getAttribute('aria-busy')).toBeNull();
  });

  it('submits with Enter in a single-line field', async () => {
    const create = vi.fn<Action<Tariff>>(() => Promise.resolve({ ok: true }));
    render(
      <ConfigForm
        config={{
          defaultValues: { name: '', amount: null },
          fields: tariffFields,
          actions: { create },
        }}
      />,
    );
    await userEvent.type(textbox('Name'), 'Flat{Enter}');
    await expect.poll(() => create.mock.calls.length).toBe(1);
  });

  it('passes dirty fields and a patch to update, and shows a success toast', async () => {
    const update = vi.fn<Action<Tariff>>(() =>
      Promise.resolve({ ok: true, message: 'Tariff saved' }),
    );
    render(
      <UIProvider>
        <ConfigForm
          config={{
            defaultValues: { name: 'Flat', amount: 5 },
            fields: tariffFields,
            actions: { update },
          }}
        />
      </UIProvider>,
    );
    await userEvent.clear(textbox('Amount'));
    await userEvent.tab();
    await clickButton('Save');
    await expect.poll(() => update.mock.calls.length).toBe(1);
    expect(update.mock.calls[0]?.[1]).toMatchObject({
      dirtyFields: ['amount'],
      patch: { amount: null },
    });
    expect(await screen.findAllByText('Tariff saved')).not.toHaveLength(0);
    // Saved values become the new defaults: nothing to revert.
    await expect.poll(() => screen.queryByRole('button', { name: 'Revert' })).toBeNull();
  });
});

describe('dirty state, revert and delete', () => {
  interface Meter {
    label: string;
  }

  it('shows Revert while changed and Delete only while unchanged', async () => {
    const onDirtyChange = vi.fn<(isDirty: boolean) => void>();
    const remove = vi.fn(() => Promise.resolve<SubmitResult>({ ok: true }));
    render(
      <ConfigForm
        onDirtyChange={onDirtyChange}
        config={{
          defaultValues: { label: 'Main' },
          fields: [{ type: 'text', name: 'label', label: 'Label' }],
          actions: {
            update: vi.fn<Action<Meter>>(() => Promise.resolve({ ok: true })),
            delete: remove,
          },
        }}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Revert' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    await userEvent.type(textbox('Label'), ' meter');
    await expect.poll(() => onDirtyChange.mock.lastCall?.[0]).toBe(true);
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    await clickButton('Revert');
    expect(textbox('Label')).toHaveValue('Main');
    await expect.poll(() => onDirtyChange.mock.lastCall?.[0]).toBe(false);
    // Delete always asks first.
    await clickButton('Delete');
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain('This can’t be undone.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await expect.poll(() => remove.mock.calls.length).toBe(1);
  });

  it('re-seeds from new defaults when resetKey changes, and through the ref', async () => {
    const ref = createRef<ConfigFormHandle<Meter>>();
    function Harness() {
      const [record, setRecord] = useState({ id: 1, label: 'Main' });
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setRecord({ id: 2, label: 'Backup' });
            }}
          >
            Next record
          </button>
          <ConfigForm
            ref={ref}
            resetKey={record.id}
            config={{
              defaultValues: { label: record.label },
              fields: [{ type: 'text', name: 'label', label: 'Label' }],
              actions: { update: () => Promise.resolve<SubmitResult>({ ok: true }) },
            }}
          />
        </>
      );
    }
    render(<Harness />);
    await userEvent.type(textbox('Label'), ' edited');
    await clickButton('Next record');
    await expect.poll(() => textbox('Label')).toHaveValue('Backup');
    expect(ref.current?.isDirty()).toBe(false);
    ref.current?.reset({ label: 'Spare' });
    await expect.poll(() => textbox('Label')).toHaveValue('Spare');
    expect(ref.current?.getValues()).toEqual({ label: 'Spare' });
  });

  it('switches between view and edit with the edit toggle', async () => {
    render(
      <ConfigForm
        defaultMode="view"
        hasEditToggle
        config={{
          defaultValues: { label: 'Main' },
          fields: [{ type: 'text', name: 'label', label: 'Label' }],
          actions: { update: () => Promise.resolve<SubmitResult>({ ok: true }) },
        }}
      />,
    );
    expect(screen.queryByRole('textbox')).toBeNull();
    await clickButton('Edit');
    await userEvent.type(textbox('Label'), ' meter');
    await clickButton('Cancel');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('Main')).toBeInTheDocument();
  });
});

describe('layout', () => {
  it('opens a collapsed section to focus its invalid field on submit', async () => {
    render(
      <ConfigForm
        config={{
          defaultValues: { name: 'Ada', notes: '' },
          layout: [
            { id: 'main', title: 'Main', fields: ['name'] },
            {
              id: 'more',
              title: 'More',
              isCollapsible: true,
              defaultExpanded: false,
              fields: ['notes'],
            },
          ],
          fields: [
            { type: 'text', name: 'name', label: 'Name' },
            { type: 'text', name: 'notes', label: 'Notes', isRequired: true },
          ],
          actions: { create: () => Promise.resolve({ ok: true }) },
        }}
      />,
    );
    expect(screen.getByRole('button', { name: 'More' })).toHaveAttribute('aria-expanded', 'false');
    await clickButton('Create');
    await expect.poll(() => document.activeElement).toBe(textbox(/Notes/));
    expect(screen.getByRole('button', { name: 'More' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows fields that no section lists, and display entries', () => {
    render(
      <ConfigForm
        config={{
          defaultValues: { a: '', b: '' },
          layout: [{ id: 'one', title: 'One', fields: ['a'] }],
          fields: [
            { type: 'text', name: 'a', label: 'A' },
            {
              type: 'banner',
              id: 'note',
              tone: 'warning',
              title: 'Heads up',
              content: 'Read this.',
            },
            { type: 'text', name: 'b', label: 'B' },
          ],
        }}
      />,
    );
    expect(textbox('B')).toBeInTheDocument();
    expect(screen.getByText('Read this.')).toBeInTheDocument();
  });

  it('throws a clear error for an unregistered type', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() =>
      render(
        <ConfigForm<{ x: string }, 'mystery'>
          config={{
            defaultValues: { x: '' },
            fields: [{ type: 'mystery', name: 'x', label: 'X' }],
          }}
        />,
      ),
    ).toThrow(/no renderer for field type "mystery"/);
  });
});
