// ConfigForm with the `masked` field type.

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { ConfigForm } from './ConfigForm';
import type { FormConfig, SubmitResult } from './types';

interface Contact {
  country: string;
  phone: string;
  birthday: string;
}

type Action = (values: Contact) => Promise<SubmitResult>;

function contactForm(create: Action, overrides: Partial<Contact> = {}): FormConfig<Contact> {
  return {
    defaultValues: { country: '', phone: '', birthday: '', ...overrides },
    fields: [
      { type: 'text', name: 'country', label: 'Country' },
      {
        type: 'masked',
        name: 'phone',
        label: 'Phone',
        description: 'Like (555) 123-4567',
        mask: '(999) 999-9999',
        autoComplete: 'tel-national',
        dependsOn: { fields: ['country'], onChange: 'reset' },
      },
      {
        type: 'masked',
        name: 'birthday',
        label: 'Birthday',
        mask: '99/99/9999',
        valueFormat: 'formatted',
        placeholderChar: '_',
      },
    ],
    actions: { create },
  };
}

describe('masked fields', () => {
  it('edit and submit raw or formatted values', async () => {
    const create = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    render(<ConfigForm config={contactForm(create)} />);
    // The input loads the first time a form shows one.
    const phone = await screen.findByRole('textbox', { name: 'Phone' });
    expect(phone).toHaveAttribute('inputmode', 'numeric');
    expect(phone).toHaveAttribute('autocomplete', 'tel-national');
    expect(phone).toHaveAccessibleDescription('Like (555) 123-4567 10 digits');
    await userEvent.click(phone);
    await userEvent.keyboard('5551234567');
    expect(phone).toHaveValue('(555) 123-4567');
    await userEvent.click(screen.getByRole('textbox', { name: 'Birthday' }));
    await userEvent.keyboard('03141990');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await expect.poll(() => create.mock.calls.length).toBe(1);
    expect(create.mock.calls[0]?.[0]).toEqual({
      country: null,
      phone: '5551234567',
      birthday: '03/14/1990',
    });
  });

  it('fail an incomplete value once it’s left, not while it’s typed', async () => {
    const create = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    render(<ConfigForm config={contactForm(create)} />);
    const phone = await screen.findByRole('textbox', { name: 'Phone' });
    await userEvent.click(phone);
    await userEvent.keyboard('555');
    expect(phone).not.toHaveAttribute('aria-invalid');
    await userEvent.click(screen.getByRole('textbox', { name: 'Country' }));
    await expect.poll(() => phone.getAttribute('aria-invalid')).toBe('true');
    expect(phone).toHaveAccessibleDescription(
      'Like (555) 123-4567 Enter the complete value 10 digits',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(create).not.toHaveBeenCalled();
    await expect.poll(() => document.activeElement).toBe(phone);
    await userEvent.keyboard('{End}1234567');
    await expect.poll(() => phone.hasAttribute('aria-invalid')).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await expect.poll(() => create.mock.calls.length).toBe(1);
  });

  it('fail an incomplete formatted value, and require a value when asked', async () => {
    const create = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    const config = contactForm(create, { birthday: '03/14' });
    render(
      <ConfigForm
        config={{
          ...config,
          fields: config.fields.map((field) =>
            field.type === 'masked' && field.name === 'phone'
              ? { ...field, isRequired: true }
              : field,
          ),
        }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    const phone = await screen.findByRole('textbox', { name: /^Phone/ });
    await expect.poll(() => phone.getAttribute('aria-invalid')).toBe('true');
    expect(phone).toHaveAccessibleDescription('Like (555) 123-4567 Required 10 digits');
    const birthday = screen.getByRole('textbox', { name: 'Birthday' });
    expect(birthday).toHaveAttribute('aria-invalid', 'true');
    expect(birthday).toHaveAccessibleDescription('Enter the complete value 8 digits');
    expect(create).not.toHaveBeenCalled();
  });

  it('reset to empty when a field they depend on changes', async () => {
    render(
      <ConfigForm
        config={contactForm(() => Promise.resolve({ ok: true }), { phone: '5551234567' })}
      />,
    );
    expect(await screen.findByRole('textbox', { name: 'Phone' })).toHaveValue('(555) 123-4567');
    await userEvent.type(screen.getByRole('textbox', { name: 'Country' }), 'C');
    expect(screen.getByRole('textbox', { name: 'Phone' })).toHaveValue('');
  });

  it('show the formatted text in view mode', () => {
    render(
      <ConfigForm
        mode="view"
        config={{
          defaultValues: { phone: '5551234567', birthday: '03/14/1990', fax: '' },
          fields: [
            { type: 'masked', name: 'phone', label: 'Phone', mask: '(999) 999-9999' },
            {
              type: 'masked',
              name: 'birthday',
              label: 'Birthday',
              mask: '99/99/9999',
              valueFormat: 'formatted',
            },
            { type: 'masked', name: 'fax', label: 'Fax', mask: '(999) 999-9999' },
          ],
        }}
      />,
    );
    const row = (label: string) =>
      screen.getByText(label, { selector: 'dt, dt *' }).closest('div')?.textContent ?? '';
    expect(row('Phone')).toContain('(555) 123-4567');
    expect(row('Birthday')).toContain('03/14/1990');
    expect(row('Fax')).toContain('Not set');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <ConfigForm config={contactForm(() => Promise.resolve({ ok: true }))} />,
    );
    await screen.findByRole('textbox', { name: 'Phone' });
    await expectNoAxeViolations(container);
  });
});
