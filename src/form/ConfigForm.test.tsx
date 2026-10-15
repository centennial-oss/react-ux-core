import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { ConfigForm } from './ConfigForm';
import type { FormConfig, SubmitResult } from './types';

interface Customer {
  name: string;
  email: string;
  notes: string;
}

function config(overrides: Partial<FormConfig<Customer>> = {}): FormConfig<Customer> {
  return {
    defaultValues: { name: '', email: '', notes: '' },
    fields: [
      { type: 'text', name: 'name', label: 'Name', isRequired: true },
      { type: 'email', name: 'email', label: 'Email' },
      { type: 'textarea', name: 'notes', label: 'Notes' },
    ],
    actions: { create: vi.fn(() => Promise.resolve<SubmitResult>({ ok: true })) },
    ...overrides,
  };
}

describe('ConfigForm', () => {
  it('renders the configured fields and submits typed values', async () => {
    const create = vi.fn<(values: Customer) => Promise<SubmitResult>>(() =>
      Promise.resolve({ ok: true }),
    );
    render(<ConfigForm config={config({ actions: { create } })} />);
    await userEvent.type(screen.getByRole('textbox', { name: /Name/ }), 'Ada');
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'ada@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await expect.poll(() => create.mock.calls.length).toBe(1);
    expect(create.mock.calls[0]?.[0]).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
      notes: null,
    });
  });

  it('shows a required error after leaving the field, then clears it while typing', async () => {
    render(<ConfigForm config={config()} />);
    const name = screen.getByRole('textbox', { name: /Name/ });
    await userEvent.click(name);
    expect(screen.queryByText('Required')).toBeNull();
    await userEvent.tab();
    await expect.poll(() => screen.queryByText('Required')).not.toBeNull();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    await userEvent.type(name, 'A');
    await expect.poll(() => screen.queryByText('Required')).toBeNull();
  });

  it('focuses the first invalid field on a failed submit and announces it', async () => {
    const create = vi.fn(() => Promise.resolve<SubmitResult>({ ok: true }));
    render(<ConfigForm config={config({ actions: { create } })} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await expect
      .poll(() => document.activeElement)
      .toBe(screen.getByRole('textbox', { name: /Name/ }));
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByText(/Enter an email address/)).toBeInTheDocument();
    expect(screen.getByRole('status').textContent).toBe('2 fields need attention');
    expect(create).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ConfigForm config={config()} />);
    await expectNoAxeViolations(container);
  });
});
