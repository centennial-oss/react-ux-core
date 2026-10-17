import { render, screen, within } from '@testing-library/react';
import { FileText, LayoutGrid } from 'lucide-react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { demoLayers, demoLayerToggles } from '../../../test/layers';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import type { TreeMessages } from './messages';
import { moveTreeNodes, type TreeMove } from './move';
import { Tree, type TreeProps } from './Tree';
import type { AnyTreeNode, TreeNode } from './types';

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

/** The tree as nested ids, for readable comparisons. */
function shape(nodes: readonly AnyTreeNode[]): string {
  return nodes
    .map((node) => (node.children ? `${node.id}(${shape(node.children)})` : node.id))
    .join(',');
}

function Layers(props: Partial<TreeProps> & { onMoved?: (move: TreeMove) => void }) {
  const { onMoved, ...rest } = props;
  const [layers, setLayers] = useState(demoLayers);
  const [values, setValues] = useState<Record<string, Record<string, boolean>>>({});
  return (
    <>
      <Tree
        aria-label="Layers"
        items={layers}
        defaultExpandedIds={['page-1', 'page-2', 'header', 'hero']}
        isReorderable
        onMove={(move) => {
          onMoved?.(move);
          setLayers((current) => moveTreeNodes(current, move));
        }}
        rowToggles={demoLayerToggles}
        toggleValues={values}
        onToggleChange={(nodeId, toggleId, value) => {
          setValues((current) => ({
            ...current,
            [nodeId]: { ...current[nodeId], [toggleId]: value },
          }));
        }}
        {...rest}
      />
      <output data-testid="shape">{shape(layers)}</output>
    </>
  );
}

/** Moves keyboard focus to a node's row, then to its drag handle, and starts a keyboard drag. */
async function keyboardDrag(id: string) {
  await userEvent.tab();
  for (
    let step = 0;
    step < 12 && document.activeElement?.getAttribute('data-key') !== id;
    step += 1
  ) {
    await userEvent.keyboard('{ArrowDown}');
  }
  // From a row, the right arrow moves into its controls, the handle first.
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^Drag /);
  await userEvent.keyboard('{Enter}');
}

/** Steps down through the drop targets to the one named `label` and drops there; returns the targets passed. */
async function dropAt(label: string): Promise<string[]> {
  const passed: string[] = [];
  for (let step = 0; step < 20; step += 1) {
    const current = document.activeElement?.getAttribute('aria-label') ?? '';
    passed.push(current);
    if (current === label) {
      break;
    }
    await userEvent.keyboard('{ArrowDown}');
  }
  await userEvent.keyboard('{Enter}');
  return passed;
}

describe('Tree drag and drop and row toggles', () => {
  it('adds no handles or toggles unless asked', () => {
    render(<Tree aria-label="Layers" items={demoLayers} defaultExpandedIds={['page-1']} />);
    expect(screen.queryByRole('button', { name: /^Drag / })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Visible/ })).toBeNull();
  });

  it('reorders and re-parents by keyboard drag and drop, announcing each move', async () => {
    const onMoved = vi.fn();
    render(<Layers onMoved={onMoved} />);
    await keyboardDrag('footer');
    await dropAt('Insert between Header and Hero');
    expect(onMoved).toHaveBeenLastCalledWith({ ids: ['footer'], parentId: 'page-1', index: 1 });
    expect(screen.getByTestId('shape').textContent).toBe(
      'page-1(header(logo,title),footer,hero(backdrop,tagline)),page-2()',
    );
    expect(screen.getByText('Moved Footer into Page 1, position 2')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });

  it('moves a node into another page, never into its own descendants', async () => {
    const onMoved = vi.fn();
    render(<Layers onMoved={onMoved} />);
    await keyboardDrag('header');
    const targets = await dropAt('Drop on Page 2');
    // Header's own rows aren't offered: a node can't go into itself.
    expect(targets).not.toContain('Drop on Logo');
    expect(targets).not.toContain('Drop on Header');
    expect(onMoved).toHaveBeenLastCalledWith({ ids: ['header'], parentId: 'page-2', index: 1 });
    expect(screen.getByTestId('shape').textContent).toBe(
      'page-1(hero(backdrop,tagline)),page-2(footer,header(logo,title))',
    );
    expect(screen.getByText('Moved Header into Page 2, position 2')).toBeInTheDocument();
  });

  it('switches row toggles, which report their node and show their state', async () => {
    const onToggleChange = vi.fn();
    render(
      <Tree
        aria-label="Layers"
        items={demoLayers}
        defaultExpandedIds={['page-1']}
        rowToggles={demoLayerToggles}
        toggleValues={{ hero: { visible: false, locked: true } }}
        onToggleChange={onToggleChange}
      />,
    );
    expect(screen.getByRole('button', { name: 'Visible, Header' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Visible, Hero' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Locked, Hero' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Visible, Header' }));
    expect(onToggleChange).toHaveBeenLastCalledWith('header', 'visible', false);
    // A toggle doesn't select its row.
    expect(row('Header')).toHaveAttribute('aria-selected', 'false');
  });

  it.runIf(navigator.maxTouchPoints > 0)('switches a toggle with a touch tap', async () => {
    render(<Layers />);
    await commands.tap('[aria-label="Locked, Logo"]');
    expect(screen.getByRole('button', { name: 'Locked, Logo' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('turns reordering on and off while mounted without breaking', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const tree = (isReorderable: boolean) => (
      <Tree
        aria-label="Layers"
        items={demoLayers}
        defaultExpandedIds={['page-1']}
        isReorderable={isReorderable}
      />
    );
    const { rerender } = render(tree(false));
    rerender(tree(true));
    expect(screen.getByRole('button', { name: 'Drag Header' })).toBeInTheDocument();
    rerender(tree(false));
    expect(screen.queryByRole('button', { name: 'Drag Header' })).toBeNull();
    await userEvent.click(row('Header'));
    expect(row('Header')).toHaveAttribute('aria-selected', 'true');
    const hookErrors = errors.mock.calls.filter((call) =>
      call.some((part) => typeof part === 'string' && part.includes('order of Hooks')),
    );
    expect(hookErrors).toEqual([]);
    errors.mockRestore();
  });

  it('takes its strings from UIProvider', () => {
    const overrides: Partial<TreeMessages> = {
      treeDragNode: ({ item }) => `Move ${item}`,
      treeRowToggle: ({ toggle, item }) => `${item}: ${toggle}`,
    };
    // Until TreeMessages joins the Messages union, the overrides need widening.
    const treeMessages = overrides as unknown as Partial<Messages>;
    render(
      <UIProvider messages={treeMessages}>
        <Layers />
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: 'Move Header' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Header: Visible' })).toBeInTheDocument();
  });

  it('has no accessibility violations with handles and toggles', async () => {
    const { container } = render(<Layers />);
    await expectNoAxeViolations(container);
  });
});
