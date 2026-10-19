// ConfigForm with the `rating` and `oneTimeCode` field types.

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { ConfigForm } from './ConfigForm';
import type { FormConfig, SubmitResult } from './types';

interface Review {
  phone: string;
  stars: number | null;
  code: string;
}

type Action = (values: Review) => Promise<SubmitResult>;

function reviewForm(create: Action, overrides: Partial<Review> = {}): FormConfig<Review> {
  return {
    defaultValues: { phone: '', stars: null, code: '', ...overrides },
    fields: [
      { type: 'text', name: 'phone', label: 'Phone' },
      { type: 'rating', name: 'stars', label: 'Stars', step: 0.5 },
      {
        type: 'oneTimeCode',
        name: 'code',
        label: 'Code',
        groupSizes: [3, 3],
        dependsOn: { fields: ['phone'], onChange: 'reset' },
      },
    ],
    actions: { create },
  };
}

describe('rating and one-time code fields', () => {
  it('edit and submit their values', async () => {
    const create = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    render(<ConfigForm config={reviewForm(create)} />);
    // Both inputs load the first time a form shows one.
    (await screen.findByRole('slider', { name: 'Stars' })).focus();
    await userEvent.keyboard('{End}{ArrowLeft}');
    await userEvent.click(await screen.findByRole('textbox', { name: 'Code' }));
    await userEvent.keyboard('482913');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await expect.poll(() => create.mock.calls.length).toBe(1);
    expect(create.mock.calls[0]?.[0]).toEqual({ phone: null, stars: 4.5, code: '482913' });
  });

  it('require a rating, and a complete code', async () => {
    const create = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    const config = reviewForm(create, { code: '123' });
    render(
      <ConfigForm
        config={{
          ...config,
          fields: config.fields.map((field) =>
            field.type === 'rating' ? { ...field, isRequired: true } : field,
          ),
        }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    const stars = await screen.findByRole('slider', { name: 'Stars' });
    await expect.poll(() => stars.getAttribute('aria-invalid')).toBe('true');
    expect(stars).toHaveAccessibleDescription('Required');
    const code = await screen.findByRole('textbox', { name: 'Code' });
    expect(code).toHaveAttribute('aria-invalid', 'true');
    expect(code.getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.getByText('Use at least 6 characters')).toBeVisible();
    expect(create).not.toHaveBeenCalled();

    stars.focus();
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.click(code);
    await userEvent.keyboard('{End}456');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await expect.poll(() => create.mock.calls.length).toBe(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({ stars: 0.5, code: '123456' });
  });

  it('clear an optional rating, but not a required one', async () => {
    render(
      <ConfigForm
        config={{
          defaultValues: { optional: 3, required: 3 },
          fields: [
            { type: 'rating', name: 'optional', label: 'Optional' },
            { type: 'rating', name: 'required', label: 'Required', isRequired: true },
          ],
        }}
      />,
    );
    (await screen.findByRole('slider', { name: 'Optional' })).focus();
    await userEvent.keyboard('{Delete}');
    expect(screen.getByRole('slider', { name: 'Optional' })).toHaveAttribute(
      'aria-valuetext',
      'No rating',
    );
    screen.getByRole('slider', { name: /^Required/ }).focus();
    await userEvent.keyboard('{Delete}');
    expect(screen.getByRole('slider', { name: /^Required/ })).toHaveValue('3');
  });

  it('reset a code to empty when a field it depends on changes', async () => {
    const create = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    render(<ConfigForm config={reviewForm(create, { code: '482913' })} />);
    expect(await screen.findByRole('textbox', { name: 'Code' })).toHaveValue('482913');
    await userEvent.type(screen.getByRole('textbox', { name: 'Phone' }), '5');
    expect(screen.getByRole('textbox', { name: 'Code' })).toHaveValue('');
  });

  it('show stars and the code in view mode, with masked codes hidden', async () => {
    render(
      <ConfigForm
        mode="view"
        config={{
          defaultValues: { stars: 4, none: null as number | null, code: '482913', pin: '1234' },
          fields: [
            { type: 'rating', name: 'stars', label: 'Stars' },
            { type: 'rating', name: 'none', label: 'None' },
            { type: 'oneTimeCode', name: 'code', label: 'Code' },
            { type: 'oneTimeCode', name: 'pin', label: 'PIN', codeLength: 4, isMasked: true },
          ],
        }}
      />,
    );
    // The stars load the first time a form shows a rating.
    expect(await screen.findByRole('img', { name: '4 out of 5' })).toBeVisible();
    expect(screen.queryByRole('slider')).toBeNull();
    const row = (label: string) =>
      screen.getByText(label, { selector: 'dt, dt *' }).closest('div')?.textContent ?? '';
    expect(row('None')).toContain('Not set');
    expect(row('Code')).toContain('482913');
    expect(row('PIN')).toContain('••••••••');
    expect(row('PIN')).not.toContain('1234');
  });
});
