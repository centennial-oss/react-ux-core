import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { pasteText } from '../../../test/clipboard';
import { inventoryColumns, makeProducts, productId } from '../../../test/spreadsheet';
import { Spreadsheet, type SpreadsheetProps } from './Spreadsheet';
import type { SpreadsheetColumn, SpreadsheetRow } from './types';

const hasTouch = navigator.maxTouchPoints > 0;
const isDesktop = !hasTouch;

const columns: SpreadsheetColumn[] = [
  { id: 'name', label: 'Name', isRequired: true, maxLength: 12 },
  { id: 'qty', label: 'Qty', type: 'number', minValue: 0, step: 1 },
  {
    id: 'kind',
    label: 'Kind',
    type: 'enum',
    options: [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ],
  },
  { id: 'done', label: 'Done', type: 'boolean' },
  { id: 'due', label: 'Due', type: 'date' },
];

function makeRows(count: number): SpreadsheetRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `r${String(index + 1)}`,
    name: `Item ${String(index + 1)}`,
    qty: index * 10,
    kind: index % 2 === 0 ? 'a' : 'b',
    done: index % 3 === 0,
    due: `2026-01-${String((index % 28) + 1).padStart(2, '0')}`,
  }));
}

let nextId = 0;
const newRow = (): SpreadsheetRow => {
  nextId++;
  return { id: `new-${String(nextId)}` };
};
const getRowId = (row: SpreadsheetRow) => String(row.id);

interface SheetProps extends Partial<SpreadsheetProps> {
  initialRows?: SpreadsheetRow[];
  initialColumns?: SpreadsheetColumn[];
}

/** Holds rows and columns as an app would; `onChange` and `onColumnsChange` spy on what it hears. */
function Sheet({ initialRows = makeRows(30), initialColumns = columns, ...props }: SheetProps) {
  const [rows, setRows] = useState(initialRows);
  const [sheetColumns, setColumns] = useState(initialColumns);
  return (
    <div style={{ padding: 8 }}>
      <Spreadsheet
        aria-label="Items"
        getRowId={getRowId}
        newRow={newRow}
        {...props}
        rows={rows}
        columns={sheetColumns}
        onChange={(next) => {
          props.onChange?.(next);
          setRows(next);
        }}
        onColumnsChange={(next) => {
          props.onColumnsChange?.(next);
          setColumns(next);
        }}
      />
    </div>
  );
}

const grid = () => screen.getByRole('grid', { name: 'Items' });

/** The cell at a view row and visible column (one header row). */
function cell(row: number, col: number, headerRows = 1): HTMLElement {
  const element = document.querySelector<HTMLElement>(
    `[role="row"][aria-rowindex="${String(row + headerRows + 1)}"] [aria-colindex="${String(col + 2)}"]`,
  );
  if (!element) {
    throw new Error(`No cell ${String(row)}/${String(col)}`);
  }
  return element;
}

const activeCell = () => {
  const id = grid().getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
};

const selectedCount = () =>
  grid().querySelectorAll('[role="gridcell"][aria-selected="true"]').length;

const lastRows = (spy: ReturnType<typeof vi.fn>) => spy.mock.lastCall?.[0] as SpreadsheetRow[];

async function openMenuItem(name: RegExp | string) {
  const menu = await screen.findByRole('menu');
  await expect.poll(() => document.querySelector('[data-entering]'), { timeout: 2000 }).toBeNull();
  await userEvent.click(within(menu).getByRole('menuitem', { name }));
}

describe('Spreadsheet', () => {
  it('renders an ARIA grid of typed, formatted cells, with only the rows in view', () => {
    render(<Sheet initialRows={makeRows(5000)} />);
    const sheet = grid();
    expect(sheet).toHaveAttribute('aria-rowcount', '5001');
    expect(sheet).toHaveAttribute('aria-colcount', '6');
    expect(sheet).toHaveAttribute('aria-multiselectable', 'true');
    expect(
      within(sheet)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['', 'Name', 'Qty', 'Kind', 'Done', 'Due']);
    expect(cell(0, 0).textContent).toBe('Item 1');
    expect(cell(1, 2).textContent).toBe('Beta');
    expect(cell(0, 3).textContent).toBe('Yes');
    expect(cell(0, 4).textContent).toBe('Jan 1, 2026');
    // Virtualised: a window of rows, not 5,000.
    expect(sheet.querySelectorAll('[role="rowgroup"] > [role="row"]').length).toBeLessThan(80);
    expect(screen.getByText('5,000 rows')).toBeInTheDocument();
  });

  it.skipIf(!isDesktop)(
    'edits by typing, keeps the edit with Enter and moves down, storing the parsed value',
    async () => {
      const onChange = vi.fn();
      render(<Sheet onChange={onChange} />);
      await userEvent.click(cell(0, 1));
      await userEvent.keyboard('42');
      const editor = screen.getByRole('textbox', { name: 'Qty, row 1' });
      expect(editor).toHaveValue('42');
      await userEvent.keyboard('{Enter}');
      expect(lastRows(onChange)[0]?.qty).toBe(42);
      expect(activeCell()).toBe(cell(1, 1));
      expect(document.activeElement).toBe(grid());

      // F2 edits the existing text; choices take a label.
      await userEvent.keyboard('{ArrowRight}{F2}');
      const choice = screen.getByRole('combobox', { name: 'Kind, row 2' });
      expect(choice).toHaveValue('Beta');
      await userEvent.clear(choice);
      await userEvent.keyboard('alp{Enter}');
      expect(lastRows(onChange)[1]?.kind).toBe('a');
    },
  );

  it.skipIf(!isDesktop)(
    "keeps a value that doesn't fit out, says why, and cancels with Escape",
    async () => {
      const onChange = vi.fn();
      render(<Sheet onChange={onChange} />);
      await userEvent.click(cell(2, 1));
      await userEvent.keyboard('1.5{Enter}');
      expect(screen.getByRole('alert').textContent).toBe('Enter a whole number');
      const editor = screen.getByRole('textbox', { name: 'Qty, row 3' });
      expect(editor).toHaveAttribute('aria-invalid', 'true');
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('textbox', { name: 'Qty, row 3' })).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
      expect(cell(2, 1).textContent).toBe('20');
    },
  );

  it.skipIf(!isDesktop)('moves and extends the selection with the keyboard', async () => {
    render(<Sheet />);
    await userEvent.click(cell(0, 0));
    await userEvent.keyboard('{ArrowRight}{Shift>}{ArrowDown}{ArrowDown}{ArrowRight}{/Shift}');
    expect(activeCell()).toBe(cell(0, 1));
    expect(selectedCount()).toBe(6);
    expect(screen.getByText('Count: 6')).toBeInTheDocument();
    expect(screen.getByText('Sum: 30')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(selectedCount()).toBe(1);
    await userEvent.keyboard('{Control>}{End}{/Control}');
    expect(activeCell()?.getAttribute('aria-colindex')).toBe('6');
    expect(grid().getAttribute('aria-activedescendant')).toContain('r29');
    await userEvent.keyboard('{Control>}a{/Control}');
    expect(selectedCount()).toBeGreaterThan(30);
  });

  it('copies the selection as tab-separated text, and pastes with type checks, adding rows', async () => {
    const onChange = vi.fn();
    const { container } = render(<Sheet initialRows={makeRows(3)} onChange={onChange} />);
    await userEvent.click(cell(0, 0));
    await userEvent.click(cell(1, 1), { modifiers: ['Shift'] });
    const copy = new ClipboardEvent('copy', {
      clipboardData: new DataTransfer(),
      bubbles: true,
      cancelable: true,
    });
    grid().dispatchEvent(copy);
    expect(copy.clipboardData?.getData('text/plain')).toBe('Item 1\t0\nItem 2\t10');

    await userEvent.click(cell(1, 1));
    pasteText(grid(), '7\tbeta\nlots\tAlpha\n9\tGamma\n');
    const rows = lastRows(onChange);
    expect(rows).toHaveLength(4);
    expect(rows[1]).toMatchObject({ qty: 7, kind: 'b' });
    expect(rows[2]).toMatchObject({ qty: 20, kind: 'a' });
    expect(rows[3]).toMatchObject({ qty: 9 });
    expect(rows[3]?.kind).toBeUndefined();
    await expect
      .poll(() => container.querySelector('[aria-live]')?.textContent)
      .toBe("Pasted 4 cells; 2 values didn't fit and were skipped");
  });

  it.skipIf(!isDesktop)('clears with Delete, and undoes and redoes', async () => {
    const onChange = vi.fn();
    render(<Sheet onChange={onChange} />);
    await userEvent.click(cell(0, 0));
    await userEvent.click(cell(1, 1), { modifiers: ['Shift'] });
    await userEvent.keyboard('{Delete}');
    expect(lastRows(onChange).slice(0, 2)).toMatchObject([
      { name: null, qty: null },
      { name: null, qty: null },
    ]);
    expect(cell(0, 0)).toHaveAttribute('aria-invalid', 'true');
    await userEvent.keyboard('{Control>}z{/Control}');
    expect(lastRows(onChange)[0]).toMatchObject({ name: 'Item 1', qty: 0 });
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled();
    await userEvent.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(lastRows(onChange)[1]).toMatchObject({ name: null, qty: null });
  });

  it.skipIf(!isDesktop)('fills down and toggles checkboxes with Space', async () => {
    const onChange = vi.fn();
    render(<Sheet onChange={onChange} />);
    await userEvent.click(cell(0, 2));
    await userEvent.click(cell(3, 2), { modifiers: ['Shift'] });
    await userEvent.keyboard('{Control>}d{/Control}');
    expect(
      lastRows(onChange)
        .slice(0, 4)
        .map((row) => row.kind),
    ).toEqual(['a', 'a', 'a', 'a']);

    // Clicking the checkbox itself toggles it; click beside it to select the cell.
    await userEvent.click(cell(1, 3), { position: { x: 4, y: 4 } });
    expect(cell(1, 3).textContent).toBe('No');
    await userEvent.keyboard(' ');
    expect(lastRows(onChange)[1]?.done).toBe(true);
  });

  it('inserts rows from the cell menu', async () => {
    const onChange = vi.fn();
    render(<Sheet initialRows={makeRows(5)} onChange={onChange} />);
    await userEvent.click(cell(2, 0));
    await userEvent.click(cell(2, 0), { button: 'right' });
    await openMenuItem(/Insert row above/);
    const rows = lastRows(onChange);
    expect(rows).toHaveLength(6);
    expect(rows[2]?.id).toMatch(/^new-/);
    expect(rows[3]?.id).toBe('r3');
  });

  it('sorts from a column menu without changing the data', async () => {
    const onChange = vi.fn();
    const onSortingChange = vi.fn();
    render(
      <Sheet initialRows={makeRows(12)} onChange={onChange} onSortingChange={onSortingChange} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Qty options' }));
    await openMenuItem('Sort descending');
    expect(onSortingChange).toHaveBeenLastCalledWith([{ column: 'qty', direction: 'descending' }]);
    expect(cell(0, 0).textContent).toBe('Item 12');
    expect(screen.getByRole('columnheader', { name: /Qty/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    // The row number is the row's place in the data.
    expect(document.querySelector('[data-row-header="0"]')?.textContent).toBe('12');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Sorted by Qty ↓')).toBeInTheDocument();
  });

  it('filters and searches, and counts the rows shown', () => {
    const { rerender } = render(
      <Spreadsheet
        aria-label="Items"
        rows={makeRows(20)}
        columns={columns}
        getRowId={getRowId}
        filterValues={{ kind: ['b'], qty: { min: 100 } }}
      />,
    );
    expect(screen.getByText('5 of 20 rows')).toBeInTheDocument();
    expect(cell(0, 0).textContent).toBe('Item 12');
    expect(screen.getByText('Kind: Beta')).toBeInTheDocument();
    rerender(
      <Spreadsheet
        aria-label="Items"
        rows={makeRows(20)}
        columns={columns}
        getRowId={getRowId}
        search="item 1"
      />,
    );
    expect(screen.getByText('11 of 20 rows')).toBeInTheDocument();
  });

  it('is read-only with editScope none, and copying still works', async () => {
    render(<Sheet editScope="none" />);
    const sheet = grid();
    expect(sheet).toHaveAttribute('aria-readonly', 'true');
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add row' })).toBeNull();
    await userEvent.click(cell(0, 0));
    await userEvent.keyboard('x');
    expect(screen.queryByRole('textbox', { name: /row 1/ })).toBeNull();
    await userEvent.click(cell(0, 0), { button: 'right' });
    const menu = await screen.findByRole('menu');
    const items = within(menu)
      .getAllByRole('menuitem')
      .map((item) => item.textContent);
    expect(items.some((text) => text.startsWith('Copy'))).toBe(true);
    expect(items.some((text) => /Cut|Paste|Delete|Insert|Clear/.test(text))).toBe(false);
  });

  it('changes columns only with editScope all', async () => {
    const onColumnsChange = vi.fn();
    const { unmount } = render(<Sheet onColumnsChange={onColumnsChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Kind options' }));
    let menu = await screen.findByRole('menu');
    expect(within(menu).queryByRole('menuitem', { name: /Insert column/ })).toBeNull();
    expect(within(menu).getByRole('menuitem', { name: /Hide column/ })).toBeInTheDocument();
    unmount();

    render(<Sheet editScope="all" onColumnsChange={onColumnsChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Kind options' }));
    menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: /Column settings/ })).toBeInTheDocument();
    await openMenuItem(/Insert column after/);
    const next = onColumnsChange.mock.lastCall?.[0] as SpreadsheetColumn[];
    expect(next.map((column) => column.label)).toEqual([
      'Name',
      'Qty',
      'Kind',
      'Column 6',
      'Done',
      'Due',
    ]);
    expect(screen.getByRole('columnheader', { name: /Column 6/ })).toBeInTheDocument();
  });

  it('shows problems from validate and from the columns, and counts them', () => {
    render(
      <Sheet
        initialRows={[
          ...makeRows(2),
          { id: 'bad', name: 'A name that is too long', qty: -1, kind: 'zeta' },
        ]}
        validate={() => ({ r1: { qty: 'Already taken' } })}
      />,
    );
    expect(cell(0, 1)).toHaveAttribute('aria-invalid', 'true');
    expect(cell(0, 1)).toHaveAttribute('title', 'Already taken');
    expect(cell(2, 0)).toHaveAttribute('title', 'Use 12 characters or fewer');
    expect(cell(2, 1)).toHaveAttribute('title', 'Must be 0 or more');
    expect(cell(2, 2)).toHaveAttribute('title', 'Choose one of: Alpha, Beta');
    expect(screen.getByText('1 problem')).toBeInTheDocument();
  });

  it('shows column groups as headings', () => {
    render(
      <Spreadsheet
        aria-label="Items"
        rows={makeProducts(10)}
        columns={inventoryColumns}
        getRowId={productId}
      />,
    );
    const headings = [...grid().querySelectorAll('[aria-colspan]')].map((heading) => [
      heading.textContent,
      heading.getAttribute('aria-colspan'),
    ]);
    // Only the groups over the columns in view render (all three on wide screens).
    const groups = [
      ['Product', '4'],
      ['Stock', '3'],
      ['Sales', '3'],
    ];
    expect(headings.length).toBeGreaterThanOrEqual(2);
    expect(headings).toEqual(groups.slice(0, headings.length));
    expect(cell(0, 0, 2).textContent).toBe('SKU-00001');
  });

  it('has no axe violations', async () => {
    const { container } = render(<Sheet initialRows={makeRows(8)} />);
    await userEvent.click(cell(1, 1));
    await expectNoAxeViolations(container);
  });
});
