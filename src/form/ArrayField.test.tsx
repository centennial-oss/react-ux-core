import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { ConfigForm } from './ConfigForm';
import type { FormConfig, SubmitContext, SubmitResult } from './types';

interface Team {
  people: { name: string; email: string }[];
}

type Action = (values: Team, context: SubmitContext<Team>) => Promise<SubmitResult>;

function teamConfig(
  overrides: {
    minItems?: number;
    maxItems?: number;
    isRequired?: boolean;
    isCollapsible?: boolean;
  } = {},
  create: Action = () => Promise.resolve({ ok: true }),
): FormConfig<Team> {
  return {
    defaultValues: {
      people: [
        { name: 'Ada', email: 'ada@example.com' },
        { name: 'Grace', email: 'grace@example.com' },
      ],
    },
    fields: [
      {
        type: 'array',
        name: 'people',
        label: 'People',
        newItem: { name: '', email: '' },
        itemLabel: (item) => (item.name === '' ? 'New person' : item.name),
        fields: [
          { type: 'text', name: 'name', label: 'Name', isRequired: true },
          { type: 'email', name: 'email', label: 'Email' },
        ],
        ...overrides,
      },
    ],
    actions: { create },
  };
}

function items() {
  return within(screen.getByRole('group', { name: 'People' })).getAllByRole('listitem');
}

function names() {
  return screen
    .getAllByRole('textbox', { name: /Name/ })
    .map((input) => (input as HTMLInputElement).value);
}

describe('ArrayField', () => {
  it('lists items with their summaries and submits them', async () => {
    const create = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    render(<ConfigForm config={teamConfig({}, create)} />);
    expect(items().map((item) => item.querySelector('h4')?.textContent)).toEqual(['Ada', 'Grace']);
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await expect.poll(() => create.mock.calls.length).toBe(1);
    expect(create.mock.calls[0]?.[0].people).toHaveLength(2);
  });

  it('adds an item and focuses its first field', async () => {
    render(<ConfigForm config={teamConfig()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add item' }));
    expect(items()).toHaveLength(3);
    await expect
      .poll(() => document.activeElement)
      .toBe(within(items()[2] ?? document.body).getByRole('textbox', { name: /Name/ }));
    await userEvent.keyboard('Katherine');
    await expect.poll(() => items()[2]?.querySelector('h4')?.textContent).toBe('Katherine');
  });

  it('removes an item and moves focus to the next one', async () => {
    render(<ConfigForm config={teamConfig()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove item 1' }));
    expect(names()).toEqual(['Grace']);
    await expect.poll(() => items()[0]?.contains(document.activeElement)).toBe(true);
  });

  it('reorders from the keyboard, keeping values with their item and announcing the move', async () => {
    render(<ConfigForm config={teamConfig()} />);
    // Type into the first item, then move it down: the typed value travels with it.
    await userEvent.type(
      screen.getAllByRole('textbox', { name: /Name/ })[0] ?? document.body,
      ' L.',
    );
    screen.getByRole('button', { name: 'Move item 1 down' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(names()).toEqual(['Grace', 'Ada L.']);
    expect(
      within(screen.getByRole('group', { name: 'People' })).getByRole('status').textContent,
    ).toBe('Moved to position 2 of 2');
    // At the end, focus moves to the item's other move button.
    await expect
      .poll(() => document.activeElement?.getAttribute('aria-label'))
      .toBe('Move item 2 up');
    await userEvent.keyboard('{Enter}');
    expect(names()).toEqual(['Ada L.', 'Grace']);
  });

  it('respects minItems and maxItems', async () => {
    render(<ConfigForm config={teamConfig({ minItems: 2, maxItems: 3 })} />);
    expect(screen.getByRole('button', { name: 'Remove item 1' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Add item' }));
    expect(screen.getByRole('button', { name: 'Add item' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove item 1' })).toBeEnabled();
  });

  it('validates item fields and shows the group error after a submit', async () => {
    const create = vi.fn<Action>(() => Promise.resolve({ ok: true }));
    render(<ConfigForm config={teamConfig({ isRequired: true }, create)} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add item' }));
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await expect
      .poll(() => document.activeElement)
      .toBe(within(items()[2] ?? document.body).getByRole('textbox', { name: /Name/ }));
    expect(create).not.toHaveBeenCalled();
    // Removing every item leaves the required group invalid.
    for (let index = 0; index < 3; index += 1) {
      await userEvent.click(screen.getByRole('button', { name: 'Remove item 1' }));
    }
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await expect.poll(() => screen.queryByText('Required')).not.toBeNull();
  });

  it('opens a collapsed item to show its invalid field', async () => {
    render(<ConfigForm config={teamConfig({ isCollapsible: true })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Item 2' }));
    const second = items()[1] ?? document.body;
    expect(within(second).queryByRole('textbox', { name: /Name/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Item 2' }));
    await userEvent.clear(within(second).getByRole('textbox', { name: /Name/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Item 2' }));
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await expect
      .poll(() => document.activeElement)
      .toBe(within(second).getByRole('textbox', { name: /Name/ }));
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ConfigForm config={teamConfig({ isCollapsible: true })} />);
    await expectNoAxeViolations(container);
  });
});
