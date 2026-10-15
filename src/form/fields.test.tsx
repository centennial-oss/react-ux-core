import { CalendarDate, Time, parseAbsolute } from '@internationalized/date';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { UIProvider } from '../provider/UIProvider';
import { ConfigForm } from './ConfigForm';
import type { FieldOption, FormConfig, SubmitResult } from './types';

const options: FieldOption[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
];
const upload = vi.fn(() => Promise.resolve('stored/new.pdf'));
const describeFile = (reference: unknown) => ({ name: String(reference).replace('stored/', '') });

/** One case per field type (and value format): its config and a held value. */
const cases: { name: string; field: Record<string, unknown>; value: unknown; shown: string }[] = [
  { name: 'text', field: { type: 'text' }, value: 'Ada', shown: 'Ada' },
  { name: 'email', field: { type: 'email' }, value: 'ada@example.com', shown: 'ada@example.com' },
  { name: 'phone', field: { type: 'phone' }, value: '+1 555 0100', shown: '+1 555 0100' },
  {
    name: 'url',
    field: { type: 'url' },
    value: 'https://example.com',
    shown: 'https://example.com',
  },
  { name: 'password', field: { type: 'password' }, value: 'secret', shown: '••••••••' },
  { name: 'textarea', field: { type: 'textarea' }, value: 'Two\nlines', shown: 'Two' },
  { name: 'number', field: { type: 'number', unit: 'kW' }, value: 42, shown: '42 kW' },
  {
    name: 'money (decimal)',
    field: { type: 'money', currency: 'USD' },
    value: '12.50',
    shown: '$12.50',
  },
  {
    name: 'money (minor units)',
    field: { type: 'money', currency: 'USD', moneyAs: 'minor' },
    value: 1250,
    shown: '$12.50',
  },
  { name: 'percent (fraction)', field: { type: 'percent' }, value: 0.25, shown: '25%' },
  {
    name: 'percent (whole)',
    field: { type: 'percent', percentAs: 'whole' },
    value: 25,
    shown: '25%',
  },
  { name: 'select', field: { type: 'select', items: options }, value: 'b', shown: 'Bravo' },
  { name: 'combobox', field: { type: 'combobox', items: options }, value: 'b', shown: 'Bravo' },
  {
    name: 'multiselect',
    field: { type: 'multiselect', items: options },
    value: ['a', 'b'],
    shown: 'Alpha, Bravo',
  },
  {
    name: 'checkboxGroup',
    field: { type: 'checkboxGroup', items: options },
    value: ['a'],
    shown: 'Alpha',
  },
  { name: 'radio', field: { type: 'radio', items: options }, value: 'a', shown: 'Alpha' },
  { name: 'pillbox', field: { type: 'pillbox', items: options }, value: 'b', shown: 'Bravo' },
  { name: 'checkbox', field: { type: 'checkbox' }, value: true, shown: 'Yes' },
  { name: 'switch', field: { type: 'switch' }, value: false, shown: 'No' },
  {
    name: 'date',
    field: { type: 'date' },
    value: new CalendarDate(2026, 3, 14),
    shown: 'Mar 14, 2026',
  },
  {
    name: 'date (ISO)',
    field: { type: 'date', valueFormat: 'iso' },
    value: '2026-03-14',
    shown: 'Mar 14, 2026',
  },
  {
    name: 'dateRange',
    field: { type: 'dateRange' },
    value: { start: new CalendarDate(2026, 3, 1), end: new CalendarDate(2026, 3, 31) },
    shown: 'Mar 1',
  },
  {
    name: 'dateRange (ISO)',
    field: { type: 'dateRange', valueFormat: 'iso' },
    value: { start: '2026-03-01', end: '2026-03-31' },
    shown: 'Mar 1',
  },
  { name: 'time', field: { type: 'time' }, value: new Time(7, 30), shown: '7:30 AM' },
  {
    name: 'time (ISO)',
    field: { type: 'time', valueFormat: 'iso' },
    value: '07:30:00',
    shown: '7:30 AM',
  },
  {
    name: 'dateTime',
    field: { type: 'dateTime', timeZone: 'America/Denver' },
    value: parseAbsolute('2026-03-14T16:30:00Z', 'America/Denver'),
    shown: '10:30 AM',
  },
  {
    name: 'dateTime (ISO)',
    field: { type: 'dateTime', valueFormat: 'iso', timeZone: 'America/Denver' },
    value: '2026-03-14T16:30:00.000Z',
    shown: '10:30 AM',
  },
  {
    name: 'timeRange',
    field: { type: 'timeRange' },
    value: { kind: 'relative', from: '-24h', to: 'now' },
    shown: 'Last 24 hours',
  },
  {
    name: 'file',
    field: { type: 'file', upload, describeFile },
    value: 'stored/contract.pdf',
    shown: 'contract.pdf',
  },
  {
    name: 'files',
    field: { type: 'files', upload, describeFile },
    value: ['stored/a.pdf', 'stored/b.pdf'],
    shown: 'a.pdf, b.pdf',
  },
];

function formFor(field: Record<string, unknown>, value: unknown, create = vi.fn()) {
  return {
    defaultValues: { x: value },
    fields: [{ ...field, name: 'x', label: 'Field' }],
    actions: { create },
  } as unknown as FormConfig<{ x: unknown }>;
}

describe('field types', () => {
  it.each(cases)('$name round-trips its value', async ({ field, value }) => {
    const create = vi.fn<(values: unknown) => Promise<SubmitResult>>(() =>
      Promise.resolve({ ok: true }),
    );
    render(
      <UIProvider timeZone="UTC">
        <ConfigForm config={formFor(field, value, create)} />
      </UIProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await expect.poll(() => create.mock.calls.length).toBe(1);
    expect(create.mock.calls[0]?.[0]).toEqual({ x: value });
  });

  it('view mode renders every type readably', () => {
    const config = {
      defaultValues: Object.fromEntries(
        cases.map((entry, index) => [`f${String(index)}`, entry.value]),
      ),
      fields: cases.map((entry, index) => ({
        ...entry.field,
        name: `f${String(index)}`,
        label: entry.name,
      })),
    } as unknown as FormConfig<Record<string, unknown>>;
    render(
      <UIProvider locale="en-US" timeZone="UTC">
        <ConfigForm config={config} mode="view" />
      </UIProvider>,
    );
    for (const entry of cases) {
      const term = screen.getByText(entry.name, { selector: 'dt, dt *' });
      const row = term.closest('div');
      expect(row?.textContent, entry.name).toContain(entry.shown);
    }
    // Inputs aren't rendered in view mode.
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('edits update the held value for each kind of input', async () => {
    const create = vi.fn<(values: unknown) => Promise<SubmitResult>>(() =>
      Promise.resolve({ ok: true }),
    );
    const config = {
      defaultValues: {
        name: '',
        count: null,
        price: null,
        share: null,
        plan: null,
        isOn: false,
        kind: 'a',
        size: null,
      },
      fields: [
        { type: 'text', name: 'name', label: 'Name' },
        { type: 'number', name: 'count', label: 'Count' },
        { type: 'money', name: 'price', label: 'Price', currency: 'USD' },
        { type: 'percent', name: 'share', label: 'Share' },
        { type: 'radio', name: 'plan', label: 'Plan', items: options },
        { type: 'checkbox', name: 'isOn', label: 'On' },
        { type: 'pillbox', name: 'kind', label: 'Kind', items: options },
        { type: 'select', name: 'size', label: 'Size', items: options },
      ],
      actions: { create },
    } as unknown as FormConfig<Record<string, unknown>>;
    render(<ConfigForm config={config} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada');
    await userEvent.type(screen.getByRole('textbox', { name: 'Count' }), '7');
    await userEvent.type(screen.getByRole('textbox', { name: 'Price' }), '12.5');
    await userEvent.type(screen.getByRole('textbox', { name: 'Share' }), '30');
    const plan = within(screen.getByRole('radiogroup', { name: 'Plan' }));
    await userEvent.click(
      plan.getByRole('radio', { name: 'Bravo' }).closest('label') ?? document.body,
    );
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'On' }).closest('label') ?? document.body,
    );
    const kind = screen.getByRole('radiogroup', { name: 'Kind' });
    await userEvent.click(
      within(kind).getByRole('radio', { name: 'Bravo' }).closest('label') ?? kind,
    );
    await userEvent.click(screen.getByRole('button', { name: /Size/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Alpha' }));
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await expect.poll(() => create.mock.calls.length).toBe(1);
    expect(create.mock.calls[0]?.[0]).toEqual({
      name: 'Ada',
      count: 7,
      price: '12.50',
      share: 0.3,
      plan: 'b',
      isOn: true,
      kind: 'b',
      size: 'a',
    });
  });
});
