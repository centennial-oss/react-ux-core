// ConfigForm with the `tags` field type.

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { ConfigForm } from './ConfigForm';
import type { FormConfig, SubmitResult, TagsFieldConfig } from './types';

interface Invite {
  team: string;
  emails: string[];
  topics: string[];
}

type Action = (values: Invite) => Promise<SubmitResult>;

function emailProblem(tag: string): string | undefined {
  return tag.includes('@') ? undefined : 'Not an email address';
}

function inviteForm(
  create: Action,
  overrides: Partial<Invite> = {},
  emails: Partial<TagsFieldConfig<Invite>> = {},
): FormConfig<Invite> {
  return {
    defaultValues: { team: '', emails: [], topics: [], ...overrides },
    fields: [
      { type: 'text', name: 'team', label: 'Team' },
      {
        type: 'tags',
        name: 'emails',
        label: 'Emails',
        validateTag: emailProblem,
        dependsOn: { fields: ['team'], onChange: 'reset' },
        ...emails,
      },
      { type: 'tags', name: 'topics', label: 'Topics', suggestions: ['Billing', 'Outages'] },
    ],
    actions: { create },
  };
}

function emails() {
  return screen.getByRole('textbox', { name: 'Emails' });
}

// Tags fields load their input the first time a form shows one.
function findEmails() {
  return screen.findByRole('textbox', { name: 'Emails' });
}

function submit() {
  return userEvent.click(screen.getByRole('button', { name: 'Create' }));
}

describe('tags fields', () => {
  it('edit and submit a list of strings, with an empty list kept as one', async () => {
    const create = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    render(<ConfigForm config={inviteForm(create)} />);
    await userEvent.type(await findEmails(), 'ada@example.com{Enter}grace@example.com,');
    await submit();
    await expect.poll(() => create.mock.calls.length).toBe(1);
    expect(create.mock.calls[0]?.[0]).toEqual({
      team: null,
      emails: ['ada@example.com', 'grace@example.com'],
      topics: [],
    });
  });

  it('fail validation with an invalid tag, shown once, until it is fixed', async () => {
    const create = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    render(<ConfigForm config={inviteForm(create, { emails: ['ada@example.com', 'grace'] })} />);
    await submit();
    await expect.poll(() => emails().getAttribute('aria-invalid')).toBe('true');
    expect(emails()).toHaveAccessibleDescription('grace: Not an email address');
    expect(create).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Remove grace' }));
    await submit();
    await expect.poll(() => create.mock.calls.length).toBe(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({ emails: ['ada@example.com'] });
  });

  it('mark invalid tags only once the form shows the field’s errors', async () => {
    const create = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    render(<ConfigForm config={inviteForm(create, { emails: ['grace'] })} />);
    expect(await findEmails()).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('row', { name: 'grace' })).toBeInTheDocument();
    await submit();
    await expect.poll(() => emails().getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('row', { name: 'grace Not an email address' })).toBeInTheDocument();
  });

  it('require a tag, and refuse more than maxItems', async () => {
    const create = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    render(<ConfigForm config={inviteForm(create, {}, { isRequired: true, maxItems: 2 })} />);
    await submit();
    await expect.poll(() => emails().getAttribute('aria-invalid')).toBe('true');
    expect(emails()).toHaveAccessibleDescription('Required');
    await userEvent.type(emails(), 'a@x.org,b@x.org,c@x.org{Enter}');
    expect(emails()).toHaveValue('c@x.org');
    await submit();
    await expect.poll(() => create.mock.calls.length).toBe(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({ emails: ['a@x.org', 'b@x.org'] });
  });

  it('reset to an empty list when a field they depend on changes', async () => {
    render(
      <ConfigForm
        config={inviteForm(() => Promise.resolve({ ok: true }), { emails: ['ada@example.com'] })}
      />,
    );
    expect(await screen.findByRole('row', { name: 'ada@example.com' })).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Team' }), 'x');
    expect(screen.queryByRole('row', { name: 'ada@example.com' })).toBeNull();
  });

  it('offer their suggestions', async () => {
    render(<ConfigForm config={inviteForm(() => Promise.resolve({ ok: true }))} />);
    expect(await screen.findByRole('combobox', { name: 'Topics' })).toBeInTheDocument();
  });

  it('show the tags as text in view mode', () => {
    const config: FormConfig<Pick<Invite, 'emails' | 'topics'>> = {
      defaultValues: { emails: ['ada@example.com', 'grace@example.com'], topics: [] },
      fields: [
        { type: 'tags', name: 'emails', label: 'Emails' },
        { type: 'tags', name: 'topics', label: 'Topics' },
      ],
    };
    render(<ConfigForm mode="view" config={config} />);
    const row = (label: string) =>
      screen.getByText(label, { selector: 'dt, dt *' }).closest('div')?.textContent ?? '';
    expect(row('Emails')).toContain('ada@example.com, grace@example.com');
    expect(row('Topics')).toContain('Not set');
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
