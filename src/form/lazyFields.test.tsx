// Field types whose renderers load the first time a form shows one: the built-in ones with large inputs, and custom
// ones made with lazyField.

import { render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { ConfigForm } from './ConfigForm';
import { lazyField } from './fields/lazy';
import { TextFieldRenderer } from './fields/text';
import { createFieldRegistry } from './registry';
import type { FieldRendererProps, FormConfig, SubmitResult, TextFieldConfig } from './types';

const upload = () => Promise.resolve('stored/x');

// Each type's first render in this file shows its placeholder, so these come first and use each type once.
const lazyTypes = [
  { type: 'tags' },
  { type: 'rating' },
  { type: 'oneTimeCode' },
  { type: 'masked', mask: '(999) 999-9999' },
  { type: 'timeRange' },
  { type: 'file', upload, describeFile: () => ({ name: 'x' }) },
  { type: 'files', upload, describeFile: () => ({ name: 'x' }) },
];

describe('built-in types that load on first use', () => {
  it.each(lazyTypes)(
    '$type shows its label in a placeholder as tall as the field until the input loads',
    async (field) => {
      const { container } = render(
        <ConfigForm
          config={
            {
              defaultValues: { x: null },
              fields: [{ ...field, name: 'x', label: 'Label', description: 'Help' }],
            } as unknown as FormConfig<{ x: unknown }>
          }
        />,
      );
      const slot = container.querySelector<HTMLElement>('[data-form-field="x"]');
      expect(slot?.querySelector('[data-field-status="loading"]')).not.toBeNull();
      expect(screen.getByText('Label')).toBeVisible();
      expect(screen.getByText('Help')).toBeVisible();
      const placeholderHeight = slot?.getBoundingClientRect().height;

      await expect.poll(() => slot?.querySelector('[data-field-status="loading"]')).toBeNull();
      expect(slot?.getBoundingClientRect().height).toBe(placeholderHeight);
    },
  );

  it('shows a placeholder for the rating stars in view mode until they load', async () => {
    render(
      <ConfigForm
        mode="view"
        config={{
          defaultValues: { stars: 4 },
          fields: [{ type: 'rating', name: 'stars', label: 'Stars' }],
        }}
      />,
    );
    const value = screen.getByText('Stars', { selector: 'dt, dt *' }).closest('div');
    expect(value?.querySelector('dd [data-field-status="loading"]')).not.toBeNull();
    expect(await screen.findByRole('img', { name: '4 out of 5' })).toBeVisible();
  });

  it('moves focus to an invalid one on submit', async () => {
    render(
      <ConfigForm
        config={{
          defaultValues: { name: 'Ada', stars: null as number | null },
          fields: [
            { type: 'text', name: 'name', label: 'Name' },
            { type: 'rating', name: 'stars', label: 'Stars', isRequired: true },
          ],
          actions: { create: () => Promise.resolve({ ok: true }) },
        }}
      />,
    );
    const stars = await screen.findByRole('slider', { name: /Stars/ });
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await expect.poll(() => document.activeElement).toBe(stars);
    expect(stars).toHaveAttribute('aria-invalid', 'true');
  });
});

interface Profile {
  hasNickname: boolean;
  nickname: string;
}

type Action = (values: Profile) => Promise<SubmitResult>;
type TextRenderer = ComponentType<FieldRendererProps<TextFieldConfig<unknown>, string>>;

/** A custom `slowText` type whose renderer (the built-in text one) loads when the test says so. */
function slowTextRegistry() {
  let finish: (renderer: TextRenderer) => void = () => undefined;
  const load = vi.fn(
    () =>
      new Promise<TextRenderer>((resolve) => {
        finish = resolve;
      }),
  );
  const registry = createFieldRegistry({ slowText: lazyField(load, 'h-10 min-h-hit') });
  return {
    registry,
    load,
    finishLoading: () => {
      finish(TextFieldRenderer);
    },
  };
}

function profileForm(create: Action, overrides: Partial<Profile> = {}) {
  return {
    defaultValues: { hasNickname: true, nickname: '', ...overrides },
    fields: [
      { type: 'checkbox', name: 'hasNickname', label: 'Has a nickname' },
      {
        type: 'slowText',
        name: 'nickname',
        label: 'Nickname',
        isRequired: true,
        visibleWhen: (values) => values.hasNickname,
      },
    ],
    actions: { create },
  } satisfies FormConfig<Profile, 'slowText'>;
}

describe('a field whose renderer is still loading', () => {
  it('validates, shows its error, then gets its input with the error wired to it', async () => {
    const create = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    const { registry, finishLoading } = slowTextRegistry();
    render(<ConfigForm<Profile, 'slowText'> registry={registry} config={profileForm(create)} />);
    expect(screen.getByText('Nickname')).toBeVisible();
    expect(screen.queryByRole('textbox')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Required')).toBeVisible();
    expect(create).not.toHaveBeenCalled();

    finishLoading();
    const nickname = await screen.findByRole('textbox', { name: 'Nickname' });
    expect(nickname).toHaveAttribute('aria-invalid', 'true');
    expect(nickname).toHaveAccessibleDescription('Required');
    await userEvent.type(nickname, 'Ada');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await expect.poll(() => create.mock.calls.length).toBe(1);
    expect(create.mock.calls[0]?.[0]).toEqual({ hasNickname: true, nickname: 'Ada' });
  });

  it('submits its value', async () => {
    const create = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    const { registry } = slowTextRegistry();
    render(
      <ConfigForm<Profile, 'slowText'>
        registry={registry}
        config={profileForm(create, { nickname: 'Grace' })}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await expect.poll(() => create.mock.calls.length).toBe(1);
    expect(create.mock.calls[0]?.[0]).toEqual({ hasNickname: true, nickname: 'Grace' });
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { registry } = slowTextRegistry();
    const { container } = render(
      <ConfigForm<Profile, 'slowText'>
        registry={registry}
        config={profileForm(() => Promise.resolve({ ok: true }))}
      />,
    );
    expect(container.querySelector('[data-field-status="loading"]')).not.toBeNull();
    await expectNoAxeViolations(container);
  });

  it('loads with the form even while hidden, so it appears with its input', async () => {
    const { registry, load, finishLoading } = slowTextRegistry();
    render(
      <ConfigForm<Profile, 'slowText'>
        registry={registry}
        config={profileForm(() => Promise.resolve({ ok: true }), { hasNickname: false })}
      />,
    );
    expect(screen.queryByText('Nickname')).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
    finishLoading();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const checkbox = screen.getByRole('checkbox', { name: 'Has a nickname' });
    await userEvent.click(checkbox.closest('label') ?? checkbox);
    expect(screen.getByRole('textbox', { name: 'Nickname' })).toBeVisible();
  });
});
