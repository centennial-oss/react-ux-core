import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { listPeople } from '../../../test/listItems';
import { enableVirtualizer } from '../../../test/virtualizer';
import { UIProvider } from '../../provider/UIProvider';
import type { ListViewItem } from '../ListView/ListView';
import { TransferList } from './TransferList';

enableVirtualizer();

const hasTouch = navigator.maxTouchPoints > 0;
const isDesktop = window.innerWidth >= 1024;

const planets: ListViewItem[] = [
  { id: 'mercury', label: 'Mercury' },
  { id: 'venus', label: 'Venus', keywords: ['morning star'] },
  { id: 'earth', label: 'Earth', description: 'Home' },
  { id: 'mars', label: 'Mars' },
  { id: 'pluto', label: 'Plutó', isDisabled: true },
];

function Controlled({
  initial = ['earth'],
  isReorderable = false,
}: {
  initial?: string[];
  isReorderable?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <TransferList
        label="Planets to visit"
        items={planets}
        value={value}
        onChange={setValue}
        isReorderable={isReorderable}
      />
      <output data-testid="value">{value.join(',')}</output>
    </>
  );
}

function value() {
  return screen.getByTestId('value').textContent;
}

function list(name: 'Available' | 'Chosen') {
  return screen.getByRole('grid', { name });
}

function rowsOf(name: 'Available' | 'Chosen') {
  return within(list(name))
    .queryAllByRole('row')
    .map((row) => row.textContent);
}

function row(name: 'Available' | 'Chosen', label: string) {
  const found = within(list(name))
    .getAllByRole('row')
    .find((candidate) => candidate.textContent.startsWith(label));
  if (!found) {
    throw new Error(`No row ${label} in ${name}`);
  }
  return found;
}

/** A row's checkbox, by its visible box (the input itself is visually hidden). */
function checkbox(name: 'Available' | 'Chosen', label: string) {
  const box = within(row(name, label)).getByRole('checkbox').closest('label');
  if (!box) {
    throw new Error(`No checkbox for ${label}`);
  }
  return box;
}

/** The select-all checkbox of a side, by its visible box. */
function selectAll(name: 'Available' | 'Chosen') {
  const box = screen.getByRole('checkbox', { name: `Select all in ${name}` }).closest('label');
  if (!box) {
    throw new Error(`No select-all for ${name}`);
  }
  return box;
}

const button = (name: string) => screen.getByRole('button', { name });

describe('TransferList', () => {
  it('splits the items between the two lists, chosen in the value’s order', async () => {
    render(<Controlled initial={['mars', 'mercury']} />);
    expect(screen.getByRole('group', { name: 'Planets to visit' })).toBeInTheDocument();
    await expect.poll(() => rowsOf('Chosen')).toEqual(['Mars', 'Mercury']);
    expect(rowsOf('Available')).toEqual(['Venus', 'EarthHome', 'Plutó']);
    expect(screen.getByText('0 of 3 selected')).toBeInTheDocument();
    expect(screen.getByText('0 of 2 selected')).toBeInTheDocument();
  });

  it('moves the selected rows across and back, announcing each move', async () => {
    render(<Controlled />);
    expect(button('Move selected to Chosen')).toBeDisabled();
    await userEvent.click(checkbox('Available', 'Venus'));
    await userEvent.click(checkbox('Available', 'Mercury'));
    expect(screen.getByText('2 of 4 selected')).toBeInTheDocument();
    await userEvent.click(button('Move selected to Chosen'));
    // Added in the available list's order, after what was already chosen.
    expect(value()).toBe('earth,mercury,venus');
    expect(screen.getByText('2 moved to Chosen')).toHaveAttribute('aria-live', 'polite');
    expect(button('Move selected to Chosen')).toBeDisabled();
    // The button disabled itself, so focus goes back to the list the rows came from.
    expect(list('Available').contains(document.activeElement)).toBe(true);

    await userEvent.click(checkbox('Chosen', 'Earth'));
    await userEvent.click(button('Move selected to Available'));
    expect(value()).toBe('mercury,venus');
    await expect.poll(() => screen.queryByText('1 moved to Available')).not.toBeNull();
  });

  it('moves every shown row that isn’t disabled with Move all', async () => {
    render(<Controlled />);
    await userEvent.click(button('Move all to Chosen'));
    expect(value()).toBe('earth,mercury,venus,mars');
    expect(rowsOf('Available')).toEqual(['Plutó']);
    expect(button('Move all to Chosen')).toBeDisabled();
    await userEvent.click(button('Move all to Available'));
    expect(value()).toBe('');
  });

  it('selects every shown row with select-all, partly checked in between', async () => {
    render(<Controlled />);
    const all = screen.getByRole('checkbox', { name: 'Select all in Available' });
    await userEvent.click(checkbox('Available', 'Mars'));
    expect(all).toBePartiallyChecked();
    await userEvent.click(selectAll('Available'));
    expect(all).toBeChecked();
    expect(screen.getByText('3 of 4 selected')).toBeInTheDocument();
    await userEvent.click(selectAll('Available'));
    expect(all).not.toBeChecked();
    expect(screen.getByText('0 of 4 selected')).toBeInTheDocument();
  });

  it('filters each side by label, description and keywords, ignoring case and accents', async () => {
    render(<Controlled initial={['earth', 'pluto']} />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search Available' }), 'MORNING');
    await expect.poll(() => rowsOf('Available')).toEqual(['Venus']);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search Chosen' }), 'pluto');
    await expect.poll(() => rowsOf('Chosen')).toEqual(['Plutó']);
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search Chosen' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search Chosen' }), 'home');
    await expect.poll(() => rowsOf('Chosen')).toEqual(['EarthHome']);
    // Move all moves only what the search shows.
    await userEvent.click(button('Move all to Chosen'));
    expect(value()).toBe('earth,pluto,venus');
  });

  it.runIf(isDesktop)('works from the keyboard alone', async () => {
    render(<Controlled />);
    // Select all, search, then the list.
    await userEvent.keyboard('{Tab}{Tab}{Tab}');
    expect(row('Available', 'Mercury')).toHaveFocus();
    await userEvent.keyboard('{ArrowDown} ');
    expect(row('Available', 'Venus')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Tab}');
    expect(button('Move selected to Chosen')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(value()).toBe('earth,venus');
    expect(list('Available').contains(document.activeElement)).toBe(true);
  });

  it.runIf(isDesktop)('drags rows to the other list by keyboard drag and drop', async () => {
    render(<Controlled />);
    // Into the list (past select-all and search), down to Mars, then right to its drag handle.
    await userEvent.keyboard('{Tab}{Tab}{Tab}{ArrowDown}{ArrowDown}{ArrowRight}');
    expect(
      within(row('Available', 'Mars')).getByRole('button', { name: 'Drag Mars' }),
    ).toHaveFocus();
    // Enter starts the drag; the available list won't take its own rows back, so the chosen list is the target.
    await userEvent.keyboard('{Enter}');
    expect(list('Chosen').contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Enter}');
    await expect.poll(value).toBe('earth,mars');
  });

  it.runIf(isDesktop)('reorders the chosen list by drag and drop when reorderable', async () => {
    render(<Controlled initial={['earth', 'mars', 'venus']} isReorderable />);
    row('Chosen', 'Earth').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(
      within(row('Chosen', 'Earth')).getByRole('button', { name: 'Drag Earth' }),
    ).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    await expect.poll(value).toBe('mars,earth,venus');
  });

  it.runIf(isDesktop)('shows a drop line where dragged rows will land', async () => {
    render(<Controlled initial={['earth', 'venus']} />);
    await userEvent.keyboard('{Tab}{Tab}{Tab}{ArrowDown}{ArrowRight}');
    await userEvent.keyboard('{Enter}');
    // From the chosen list's own target, down to the first gap between its rows.
    await userEvent.keyboard('{ArrowDown}');
    const line = document.activeElement?.closest('[role="row"]');
    expect(line).toHaveAttribute('data-drop-target');
    expect(line && getComputedStyle(line).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    await userEvent.keyboard('{Escape}');
  });

  it.runIf(isDesktop)(
    'takes drops on the available list itself, not between its rows',
    async () => {
      render(<Controlled initial={['earth']} />);
      row('Chosen', 'Earth').focus();
      await userEvent.keyboard('{ArrowRight}{Enter}');
      // The rows go back in the items' order, so there are no in-between places to offer.
      expect(list('Available').contains(document.activeElement)).toBe(true);
      expect(within(list('Available')).queryAllByRole('button', { name: /^Insert / })).toEqual([]);
      await userEvent.keyboard('{Enter}');
      await expect.poll(value).toBe('');
    },
  );

  it('does no per-row work when it renders again with the same items and value', async () => {
    let reads = 0;
    const counted = listPeople(500).map((person) => {
      const item: ListViewItem = { ...person };
      Object.defineProperty(item, 'isDisabled', {
        enumerable: true,
        get: () => {
          reads += 1;
          return false;
        },
      });
      return item;
    });
    function Parent() {
      const [tick, setTick] = useState(0);
      return (
        <>
          <TransferList aria-label="People" items={counted} defaultValue={['person-3']} />
          <button
            type="button"
            onClick={() => {
              setTick((current) => current + 1);
            }}
          >
            Render again {tick}
          </button>
        </>
      );
    }
    render(<Parent />);
    await expect.poll(() => rowsOf('Available').length).toBeGreaterThan(3);
    reads = 0;
    await userEvent.click(screen.getByRole('button', { name: /^Render again/ }));
    expect(reads).toBe(0);
  });

  it.runIf(hasTouch)('moves with touch taps', async () => {
    render(<Controlled />);
    await commands.tap('[data-side="available"] [role="row"][data-key="mars"] label');
    await commands.tap('[data-move="one-chosen"]');
    expect(value()).toBe('earth,mars');
  });

  it('is uncontrolled with defaultValue, reporting changes', async () => {
    const onChange = vi.fn();
    render(
      <TransferList
        aria-label="Planets"
        items={planets}
        defaultValue={['venus']}
        onChange={onChange}
      />,
    );
    await userEvent.click(button('Move all to Available'));
    expect(onChange).toHaveBeenLastCalledWith([]);
    // The empty state is the list's only row.
    await expect.poll(() => rowsOf('Chosen')).toEqual(['No items']);
  });

  it('disables everything with isDisabled', () => {
    render(
      <TransferList aria-label="Planets" items={planets} defaultValue={['venus']} isDisabled />,
    );
    for (const name of ['Move selected to Chosen', 'Move all to Chosen', 'Move all to Available']) {
      expect(button(name)).toBeDisabled();
    }
    expect(screen.getByRole('searchbox', { name: 'Search Available' })).toBeDisabled();
    expect(row('Chosen', 'Venus')).toHaveAttribute('aria-disabled', 'true');
  });

  it('uses the app’s titles, and its strings from UIProvider', () => {
    const { unmount } = render(
      <TransferList aria-label="Crew" items={planets} availableLabel="Bench" chosenLabel="Team" />,
    );
    expect(screen.getByRole('grid', { name: 'Bench' })).toBeInTheDocument();
    expect(button('Move all to Team')).toBeInTheDocument();
    unmount();
    render(
      <UIProvider
        messages={{
          transferAvailable: 'Verfügbar',
          transferChosen: 'Ausgewählt',
          transferMoveAll: ({ list: target }) => `Alle nach ${target}`,
          transferSelectedCount: ({ count, total }) => `${count}/${total}`,
        }}
      >
        <TransferList aria-label="Planeten" items={planets} />
      </UIProvider>,
    );
    expect(screen.getByRole('grid', { name: 'Verfügbar' })).toBeInTheDocument();
    expect(button('Alle nach Ausgewählt')).toBeInTheDocument();
    expect(screen.getByText('0/5')).toBeInTheDocument();
  });

  it('stays fast with thousands of items, drawing only the rows in view', async () => {
    const people = listPeople(5_000);
    const started = performance.now();
    render(
      <TransferList aria-label="People" items={people} defaultValue={['person-1', 'person-2']} />,
    );
    const available = screen.getByRole('grid', { name: 'Available' });
    await expect.poll(() => within(available).queryAllByRole('row').length).toBeGreaterThan(3);
    expect(within(available).getAllByRole('row').length).toBeLessThan(40);
    expect(available).toHaveAttribute('aria-rowcount', '4998');
    await userEvent.click(button('Move all to Chosen'));
    const chosen = screen.getByRole('grid', { name: 'Chosen' });
    await expect.poll(() => chosen.getAttribute('aria-rowcount')).toBe('5000');
    expect(within(chosen).getAllByRole('row').length).toBeLessThan(40);
    expect(performance.now() - started).toBeLessThan(5_000);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Controlled />);
    await expectNoAxeViolations(container);
  });

  it('keeps a phone-width page from scrolling sideways', () => {
    render(
      <div className="w-[360px] max-w-full">
        <Controlled />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });
});
