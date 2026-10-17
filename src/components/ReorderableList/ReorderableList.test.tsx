import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { ReorderableList, type ReorderableItem } from './ReorderableList';

const hasTouch = navigator.maxTouchPoints > 0;

const items: ReorderableItem[] = [
  { id: 'a', label: 'Create the endpoint' },
  { id: 'b', label: 'Add the route' },
  { id: 'c', label: 'Test access' },
];

function List({ initial = ['a', 'b', 'c'] }: { initial?: string[] }) {
  const [order, setOrder] = useState(initial);
  return (
    <>
      <ReorderableList label="Steps" items={items} value={order} onChange={setOrder} />
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
    const rows = within(screen.getByRole('grid', { name: 'Steps' })).getAllByRole('row');
    expect(rows.map((row) => row.textContent.slice(0, 1))).toEqual(['1', '2', '3']);
  });

  it('moves with the buttons, disabled at the ends, with focus following and an announcement', async () => {
    render(<List />);
    expect(screen.getByRole('button', { name: 'Move Create the endpoint up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Test access down' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Move Add the route up' }));
    expect(order()).toBe('b,a,c');
    expect(screen.getByText('Add the route, moved to position 1 of 3')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    // At the top, focus moves to the item's other button.
    expect(screen.getByRole('button', { name: 'Move Add the route down' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Move Add the route down' }));
    expect(order()).toBe('a,b,c');
    expect(screen.getByRole('button', { name: 'Move Add the route down' })).toHaveFocus();
  });

  it.runIf(hasTouch)('moves with a touch tap on the buttons', async () => {
    render(<List />);
    await commands.tap('[aria-label="Move Test access up"]');
    expect(order()).toBe('a,c,b');
  });

  it('reorders by keyboard drag and drop from a handle', async () => {
    render(<List />);
    screen.getByRole('button', { name: 'Drag Create the endpoint' }).focus();
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
