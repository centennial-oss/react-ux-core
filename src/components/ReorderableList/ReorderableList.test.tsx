import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { ReorderableList, type ReorderableItem } from './ReorderableList';

const hasTouch = navigator.maxTouchPoints > 0;

const items: ReorderableItem[] = [
  { id: 'a', label: 'Mercury' },
  { id: 'b', label: 'Venus' },
  { id: 'c', label: 'Earth' },
];

function List({ initial = ['a', 'b', 'c'] }: { initial?: string[] }) {
  const [order, setOrder] = useState(initial);
  return (
    <>
      <ReorderableList label="Planets" items={items} value={order} onChange={setOrder} />
      <output data-testid="order">{order.join(',')}</output>
    </>
  );
}

function order() {
  return screen.getByTestId('order').textContent;
}

describe('ReorderableList', () => {
  it('numbers the rows in order', () => {
    render(<List />);
    const rows = within(screen.getByRole('grid', { name: 'Planets' })).getAllByRole('row');
    expect(rows.map((row) => row.textContent.slice(0, 1))).toEqual(['1', '2', '3']);
  });

  it('describes the list with its description, and drops it when the description goes', () => {
    const { rerender } = render(
      <ReorderableList label="Planets" description="Closest to the Sun first." items={items} />,
    );
    const grid = screen.getByRole('grid', { name: 'Planets' });
    expect(grid).toHaveAccessibleDescription('Closest to the Sun first.');
    rerender(<ReorderableList label="Planets" items={items} />);
    expect(grid).not.toHaveAttribute('aria-describedby');
  });

  it('moves with the buttons, disabled at the ends, with focus following and an announcement', async () => {
    render(<List />);
    expect(screen.getByRole('button', { name: 'Move Mercury up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Earth down' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Move Venus up' }));
    expect(order()).toBe('b,a,c');
    expect(screen.getByText('Venus, moved to position 1 of 3')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    // At the top, focus moves to the item's other button.
    expect(screen.getByRole('button', { name: 'Move Venus down' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Move Venus down' }));
    expect(order()).toBe('a,b,c');
    expect(screen.getByRole('button', { name: 'Move Venus down' })).toHaveFocus();
  });

  it.runIf(hasTouch)('moves with a touch tap on the buttons', async () => {
    render(<List />);
    await commands.tap('[aria-label="Move Earth up"]');
    expect(order()).toBe('a,c,b');
  });

  it('reorders by keyboard drag and drop from a handle', async () => {
    render(<List />);
    screen.getByRole('button', { name: 'Drag Mercury' }).focus();
    await userEvent.keyboard('{Enter}');
    // Drop targets are the gaps between rows: one step down is after the next row.
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    await expect.poll(order).toBe('b,a,c');
  });

  it('hides the handles and buttons when read-only, keeping numbers and feedback', () => {
    render(
      <ReorderableList
        label="Your order"
        items={items}
        value={['b', 'a', 'c']}
        isReadOnly
        feedback={{ a: { tone: 'danger', message: 'Should be step 1' } }}
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
    const [, row] = screen.getAllByRole('row');
    if (!row) {
      throw new Error('Expected three rows');
    }
    expect(row.textContent).toContain('Should be step 1');
    expect(within(row).getByRole('img', { name: 'Incorrect' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<List />);
    await expectNoAxeViolations(container);
  });
});

describe('ReorderableList locking while mounted', () => {
  it.each(['isReadOnly', 'isDisabled'] as const)(
    'locks with %s and unlocks again without breaking',
    async (lock) => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const onChange = vi.fn();
      const list = (props: { isReadOnly?: boolean; isDisabled?: boolean }) => (
        <ReorderableList
          label="Planets"
          items={items}
          value={['a', 'b', 'c']}
          onChange={onChange}
          {...props}
        />
      );
      const { rerender } = render(list({}));
      expect(screen.getByRole('button', { name: 'Drag Mercury' })).toBeInTheDocument();

      // Lock it after "Check answer", on the same mounted list.
      rerender(list({ [lock]: true }));
      expect(screen.queryByRole('button', { name: /^(Move|Drag) / })).toBeNull();
      const rows = within(screen.getByRole('grid', { name: 'Planets' })).getAllByRole('row');
      expect(rows.map((row) => row.textContent.slice(0, 1))).toEqual(['1', '2', '3']);
      await userEvent.keyboard('{Tab}{Enter}{ArrowDown}{Enter}');
      expect(onChange).not.toHaveBeenCalled();

      // Unlock: reordering works again.
      rerender(list({}));
      await userEvent.click(screen.getByRole('button', { name: 'Move Venus up' }));
      expect(onChange).toHaveBeenLastCalledWith(['b', 'a', 'c']);

      const hookErrors = errors.mock.calls.filter((call) =>
        call.some((part) => typeof part === 'string' && part.includes('order of Hooks')),
      );
      expect(hookErrors).toEqual([]);
      errors.mockRestore();
    },
  );
});
