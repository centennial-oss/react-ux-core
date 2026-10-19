import { render, screen, within } from '@testing-library/react';
import { Archive, Download, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import type { ToolbarItem } from '../Toolbar/Toolbar';
import { ActionBar, type ActionBarProps } from './ActionBar';

const hasTouch = navigator.maxTouchPoints > 0;

const ITEMS: ToolbarItem[] = [
  { id: 'archive', label: 'Archive', icon: Archive, priority: 2 },
  { id: 'export', label: 'Export', icon: Download, priority: 1 },
  { id: 'label', label: 'Add label', icon: Tag },
  { id: 'delete', label: 'Delete', icon: Trash2, tone: 'danger', priority: 2 },
];

/** A selection the test drives: buttons outside the bar select one more item or clear it. */
function Selection({ initial = 0, ...props }: Partial<ActionBarProps> & { initial?: number }) {
  const [count, setCount] = useState(initial);
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setCount(count + 1);
        }}
      >
        Select one more
      </button>
      <button
        type="button"
        onClick={() => {
          setCount(0);
        }}
      >
        Deselect all
      </button>
      <ActionBar
        items={ITEMS}
        {...props}
        selectedCount={count}
        onClearSelection={() => {
          props.onClearSelection?.();
          setCount(0);
        }}
      />
    </div>
  );
}

function bar() {
  return screen.queryByRole('group', { name: /selected$/ });
}

function getBar() {
  return screen.getByRole('group', { name: /selected$/ });
}

function liveRegion() {
  return document.querySelector('[aria-live="polite"]');
}

describe('ActionBar', () => {
  it('shows while anything is selected, with the count and a labelled toolbar', async () => {
    render(<Selection />);
    expect(bar()).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Select one more' }));
    expect(bar()).toHaveAccessibleName('1 selected');
    expect(within(getBar()).getByRole('toolbar')).toHaveAccessibleName(
      'Actions for selected items',
    );
    expect(screen.getByRole('button', { name: 'Clear selection' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Select one more' }));
    expect(bar()).toHaveAccessibleName('2 selected');
  });

  it('announces each change of the count politely', async () => {
    render(<Selection />);
    // Nothing is announced on the first render.
    expect(liveRegion()?.textContent).toBe('');
    await userEvent.click(screen.getByRole('button', { name: 'Select one more' }));
    await expect.poll(() => liveRegion()?.textContent).toBe('1 selected');
    await userEvent.click(screen.getByRole('button', { name: 'Select one more' }));
    await expect.poll(() => liveRegion()?.textContent).toBe('2 selected');
    await userEvent.click(screen.getByRole('button', { name: 'Deselect all' }));
    await expect.poll(() => liveRegion()?.textContent).toBe('0 selected');
  });

  it('clears the selection from its button, then slides away', async () => {
    const onClearSelection = vi.fn();
    render(<Selection initial={3} onClearSelection={onClearSelection} />);
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(onClearSelection).toHaveBeenCalledOnce();
    // It keeps its last count while it leaves.
    expect(bar() === null || bar()?.textContent.includes('3 selected') === true).toBe(true);
    await expect.poll(() => bar()).toBeNull();
  });

  it('clears the selection with Escape, and returns focus to where it was', async () => {
    const onClearSelection = vi.fn();
    render(<Selection onClearSelection={onClearSelection} />);
    const select = screen.getByRole('button', { name: 'Select one more' });
    select.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{Tab}{Tab}');
    expect(screen.getByRole('button', { name: 'Clear selection' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(onClearSelection).toHaveBeenCalledOnce();
    expect(select).toHaveFocus();
    await expect.poll(() => bar()).toBeNull();
  });

  it('moves focus into the list when the element it came from is deleted with the selection', async () => {
    function DeletableList() {
      const [rows, setRows] = useState(['a', 'b', 'c', 'd']);
      const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
      return (
        <>
          <ul aria-label="Rows">
            {rows.map((row) => (
              <li key={row}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.has(row)}
                    onChange={() => {
                      const next = new Set(selected);
                      if (!next.delete(row)) {
                        next.add(row);
                      }
                      setSelected(next);
                    }}
                  />
                  {`Row ${row}`}
                </label>
              </li>
            ))}
          </ul>
          <ActionBar
            selectedCount={selected.size}
            onClearSelection={() => {
              setSelected(new Set());
            }}
            items={[{ id: 'delete', label: 'Delete', icon: Trash2, tone: 'danger' }]}
            onAction={() => {
              setRows(rows.filter((row) => !selected.has(row)));
              setSelected(new Set());
            }}
          />
        </>
      );
    }
    render(<DeletableList />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Row a' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Row b' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.queryByRole('checkbox', { name: 'Row a' })).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Row c' })).toHaveFocus();
  });

  it('can’t be reached or read while it leaves', async () => {
    render(<Selection initial={2} />);
    const leaving = getBar();
    await userEvent.click(screen.getByRole('button', { name: 'Deselect all' }));
    expect(leaving.isConnected).toBe(true);
    expect(leaving).toHaveAttribute('inert');
    await userEvent.keyboard('{Tab}');
    expect(leaving.contains(document.activeElement)).toBe(false);
    await expect.poll(() => leaving.isConnected).toBe(false);
  });

  it('runs the actions and reports their ids', async () => {
    const onAction = vi.fn();
    render(<Selection initial={2} onAction={onAction} />);
    const toolbar = within(getBar()).getByRole('toolbar');
    const archive = within(toolbar).getByRole('button', { name: 'Archive' });
    await userEvent.click(archive);
    expect(onAction).toHaveBeenCalledExactlyOnceWith('archive');
  });

  it('moves what doesn’t fit into More actions, and Escape there closes only the menu', async () => {
    const onAction = vi.fn();
    const onClearSelection = vi.fn();
    render(
      <div style={{ width: 300, maxWidth: '100%' }}>
        <Selection initial={4} onAction={onAction} onClearSelection={onClearSelection} />
      </div>,
    );
    const more = screen.getByRole('button', { name: 'More actions' });
    // The highest priority stays in the bar (Archive and Delete tie, so Delete, the later one, goes first).
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    await userEvent.click(more);
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Add label' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('menu')).toBeNull();
    expect(onClearSelection).not.toHaveBeenCalled();
    expect(bar()).not.toBeNull();
    await userEvent.click(more);
    await userEvent.click(
      within(await screen.findByRole('menu')).getByRole('menuitem', { name: 'Add label' }),
    );
    expect(onAction).toHaveBeenCalledExactlyOnceWith('label');
  });

  it.runIf(hasTouch)('clears when its button is tapped', async () => {
    const onClearSelection = vi.fn();
    render(<Selection initial={1} onClearSelection={onClearSelection} />);
    await commands.tap('button[aria-label="Clear selection"]');
    expect(onClearSelection).toHaveBeenCalledOnce();
  });

  it('takes its strings from UIProvider', () => {
    render(
      <UIProvider
        messages={{
          selectedCount: ({ count }) => `${String(count)} sélectionnés`,
          clearSelection: 'Effacer la sélection',
          selectionActions: 'Actions de la sélection',
        }}
      >
        <Selection initial={2} />
      </UIProvider>,
    );
    expect(screen.getByRole('group', { name: '2 sélectionnés' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Effacer la sélection' })).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: 'Actions de la sélection' })).toBeInTheDocument();
  });

  it('never makes the page scroll sideways, and has no axe violations', async () => {
    const { container } = render(<Selection initial={12} />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
    await expectNoAxeViolations(container);
  });

  it('wraps controls of its own that don’t fit, instead of overflowing the bar', () => {
    render(
      <div style={{ width: 280, maxWidth: '100%' }}>
        <ActionBar selectedCount={3} onClearSelection={() => undefined}>
          {['Archive', 'Move to folder', 'Add label', 'Delete'].map((label) => (
            <button key={label} type="button" style={{ whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
        </ActionBar>
      </div>,
    );
    const box = getBar().getBoundingClientRect();
    for (const button of within(getBar()).getAllByRole('button')) {
      const { left, right } = button.getBoundingClientRect();
      expect(left).toBeGreaterThanOrEqual(box.left);
      expect(right).toBeLessThanOrEqual(box.right);
    }
    // The count keeps its line beside the clear button; the controls go below it.
    const count = within(getBar()).getByText('3 selected').getBoundingClientRect();
    const archive = screen.getByRole('button', { name: 'Archive' }).getBoundingClientRect();
    expect(archive.top).toBeGreaterThanOrEqual(count.bottom);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it('keeps controls of its own beside the count when they fit', () => {
    render(
      <ActionBar selectedCount={3} onClearSelection={() => undefined}>
        <button type="button">Archive</button>
      </ActionBar>,
    );
    const count = within(getBar()).getByText('3 selected').getBoundingClientRect();
    const archive = screen.getByRole('button', { name: 'Archive' }).getBoundingClientRect();
    expect(archive.top).toBeLessThan(count.bottom);
    expect(archive.left).toBeGreaterThan(count.right);
  });

  it('sits above the app shell’s bottom bar', () => {
    const root = document.documentElement;
    root.style.setProperty('--rux-toast-bottom-offset', '56px');
    try {
      render(<ActionBar selectedCount={1} onClearSelection={() => undefined} />);
      // The bottom bar's height, then 1rem.
      expect(getComputedStyle(getBar()).bottom).toBe('72px');
    } finally {
      root.style.removeProperty('--rux-toast-bottom-offset');
    }
  });

  it('passes className and ref to the bar', () => {
    let element: HTMLDivElement | null = null;
    render(
      <ActionBar
        selectedCount={1}
        onClearSelection={() => undefined}
        className="fixed inset-x-4 bottom-4"
        ref={(node) => {
          element = node;
        }}
      />,
    );
    expect(element).toBe(bar());
    expect(bar()).toHaveClass('fixed');
  });
});
