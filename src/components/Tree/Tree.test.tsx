import { render, screen, within } from '@testing-library/react';
import { FileText, LayoutGrid } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Tree } from './Tree';
import type { TreeNode } from './types';

const items: TreeNode[] = [
  {
    id: 'inputs',
    label: 'Inputs',
    children: [
      {
        id: 'datepicker',
        label: 'DatePicker',
        icon: LayoutGrid,
        tone: 'accent',
        children: [
          { id: 'datepicker-docs', label: 'Docs', icon: FileText },
          { id: 'datepicker-states', label: 'States' },
        ],
      },
      { id: 'checkbox', label: 'Checkbox', children: [{ id: 'checkbox-states', label: 'States' }] },
    ],
  },
];

function row(name: string): HTMLElement {
  return screen.getByRole('row', { name });
}

describe('Tree', () => {
  it('opens categories and the selected node’s ancestors to start with', () => {
    render(
      <Tree
        aria-label="Components"
        items={items}
        hasCategories
        defaultSelectedId="datepicker-docs"
      />,
    );
    expect(row('Inputs')).toHaveAttribute('aria-expanded', 'true');
    expect(row('DatePicker')).toHaveAttribute('aria-expanded', 'true');
    expect(row('Docs')).toHaveAttribute('aria-selected', 'true');
    expect(row('Checkbox')).toHaveAttribute('aria-expanded', 'false');
  });

  it('selects nodes and reports them, and leaves-only trees open parents instead', async () => {
    const onSelectionChange = vi.fn();
    render(
      <Tree
        aria-label="Components"
        items={items}
        hasCategories
        selectableNodes="leaves"
        onSelectionChange={onSelectionChange}
      />,
    );
    await userEvent.click(row('Checkbox'));
    expect(row('Checkbox')).toHaveAttribute('aria-expanded', 'true');
    expect(onSelectionChange).not.toHaveBeenCalled();
    await userEvent.click(
      within(screen.getByRole('treegrid')).getAllByRole('row', { name: 'States' })[0] ??
        row('Inputs'),
    );
    expect(onSelectionChange).toHaveBeenLastCalledWith(
      'checkbox-states',
      expect.objectContaining({ label: 'States' }),
    );
  });

  it('moves and opens nodes with the keyboard', async () => {
    const onSelectionChange = vi.fn();
    render(<Tree aria-label="Components" items={items} onSelectionChange={onSelectionChange} />);
    await userEvent.tab();
    expect(row('Inputs')).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(row('Inputs')).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onSelectionChange).toHaveBeenLastCalledWith('datepicker', expect.anything());
  });

  it('shows at most five levels', () => {
    // Deeper data (from JSON, say) isn't shown; the types don't allow it.
    const deep = {
      id: 'l1',
      label: 'L1',
      children: [
        {
          id: 'l2',
          label: 'L2',
          children: [
            {
              id: 'l3',
              label: 'L3',
              children: [
                {
                  id: 'l4',
                  label: 'L4',
                  children: [{ id: 'l5', label: 'L5', children: [{ id: 'l6', label: 'L6' }] }],
                },
              ],
            },
          ],
        },
      ],
    } as unknown as TreeNode;
    render(
      <Tree aria-label="Deep" items={[deep]} defaultExpandedIds={['l1', 'l2', 'l3', 'l4', 'l5']} />,
    );
    expect(row('L5')).toBeInTheDocument();
    expect(row('L5')).not.toHaveAttribute('aria-expanded');
    expect(screen.queryByRole('row', { name: 'L6' })).toBeNull();
  });

  it('selects with a touch tap', async () => {
    if (navigator.maxTouchPoints === 0) {
      return;
    }
    const onSelectionChange = vi.fn();
    render(
      <Tree
        aria-label="Components"
        items={items}
        defaultExpandedIds={['inputs']}
        onSelectionChange={onSelectionChange}
      />,
    );
    await commands.tap('[role="row"][data-key="checkbox"]');
    expect(onSelectionChange).toHaveBeenLastCalledWith('checkbox', expect.anything());
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Tree
        aria-label="Components"
        items={items}
        hasCategories
        defaultSelectedId="datepicker-docs"
      />,
    );
    await expectNoAxeViolations(container);
  });
});
