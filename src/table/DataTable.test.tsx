import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { MenuItem } from '../components/Menu/Menu';
import { UIProvider } from '../provider/UIProvider';
import type { LinkComponentProps } from '../provider/link';
import { MoneyCell } from './cells';
import { columnsFor } from './columns';
import { DataTable, type DataTableProps } from './DataTable';

interface Customer {
  id: string;
  name: string;
  city: string;
  balance: number;
  plan: string;
}

const customers: Customer[] = [
  { id: 'c1', name: 'Acme', city: 'Denver', balance: 1200, plan: 'Flat' },
  { id: 'c2', name: 'Globex', city: 'Austin', balance: 50, plan: 'Time of use' },
  { id: 'c3', name: 'Initech', city: 'Boulder', balance: 830.5, plan: 'Flat' },
];

const col = columnsFor<Customer>();
const columns = [
  col.field('name', { header: 'Name', isRowHeader: true, isSortable: true }),
  col.field('city', { header: 'City', isSortable: true, mobile: 'subtitle' }),
  col.field('balance', {
    header: 'Balance',
    isSortable: true,
    align: 'end',
    mobile: true,
    cell: ({ value }) => <MoneyCell value={value} currency="USD" />,
  }),
  col.field('plan', { header: 'Plan', priority: 3 }),
];

function Table(props: Partial<DataTableProps<Customer>>) {
  return (
    <DataTable<Customer>
      aria-label="Customers"
      rows={customers}
      columns={columns}
      getRowId={(row) => row.id}
      {...props}
    />
  );
}

/** A wide container, so the table (not the cards) shows whatever the test screen size. */
function Wide({ children, width = 1100 }: { children: React.ReactNode; width?: number }) {
  return <div style={{ width }}>{children}</div>;
}

function bodyNames() {
  return screen.getAllByRole('rowheader').map((cell) => cell.textContent);
}

describe('DataTable', () => {
  it('renders a labelled table with row headers', () => {
    render(
      <Wide>
        <Table />
      </Wide>,
    );
    const table = screen.getByRole('table', { name: 'Customers' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Name', 'City', 'Balance', 'Plan']);
    expect(bodyNames()).toEqual(['Acme', 'Globex', 'Initech']);
    expect(within(table).getByText('$1,200.00')).toBeInTheDocument();
  });

  it('sorts on the client from header buttons, with aria-sort and an announcement', async () => {
    render(
      <Wide>
        <Table />
      </Wide>,
    );
    const balance = screen.getByRole('columnheader', { name: /Balance/ });
    expect(balance).toHaveAttribute('aria-sort', 'none');
    await userEvent.click(within(balance).getByRole('button'));
    expect(bodyNames()).toEqual(['Globex', 'Initech', 'Acme']);
    expect(balance).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('status').textContent).toBe('Sorted by Balance, ascending');
    await userEvent.click(within(balance).getByRole('button'));
    expect(bodyNames()).toEqual(['Acme', 'Initech', 'Globex']);
    await userEvent.click(within(balance).getByRole('button'));
    expect(bodyNames()).toEqual(['Acme', 'Globex', 'Initech']);
    expect(screen.getByRole('status').textContent).toBe('Not sorted');
  });

  it('reports server sorts without reordering', async () => {
    const onSortChange = vi.fn();
    render(
      <Wide>
        <Table sortMode="server" sort={null} onSortChange={onSortChange} />
      </Wide>,
    );
    await userEvent.click(
      within(screen.getByRole('columnheader', { name: /City/ })).getByRole('button'),
    );
    expect(onSortChange).toHaveBeenCalledWith({ column: 'city', direction: 'ascending' });
    expect(bodyNames()).toEqual(['Acme', 'Globex', 'Initech']);
  });

  it('pages on the client', async () => {
    render(
      <Wide>
        <Table pagination={{ mode: 'client', pageSize: 2 }} />
      </Wide>,
    );
    expect(bodyNames()).toEqual(['Acme', 'Globex']);
    expect(screen.getByText('1–2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(bodyNames()).toEqual(['Initech']);
    expect(screen.getByText('3–3 of 3')).toBeInTheDocument();
  });

  it('asks the app for offset and cursor pages', async () => {
    const onPageChange = vi.fn();
    const { unmount } = render(
      <Wide>
        <Table pagination={{ mode: 'offset', pageIndex: 1, pageSize: 3, total: 9, onPageChange }} />
      </Wide>,
    );
    expect(screen.getByText('4–6 of 9')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    unmount();
    const onNext = vi.fn();
    const onPrevious = vi.fn();
    render(
      <Wide>
        <Table
          pagination={{
            mode: 'cursor',
            hasNext: true,
            hasPrevious: false,
            onNext,
            onPrevious,
            approximateTotal: 1200,
          }}
        />
      </Wide>,
    );
    expect(screen.getByText('About 1,200 rows')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('selects rows, all on the page, and shows the bulk-action bar', async () => {
    const onSelectionChange = vi.fn();
    render(
      <Wide>
        <Table
          selectionMode="multiple"
          onSelectionChange={onSelectionChange}
          bulkActions={(keys) => <button type="button">Archive {keys.size}</button>}
        />
      </Wide>,
    );
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Globex' }).closest('label') ?? document.body,
    );
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['c2']));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select all rows on this page' }).closest('label') ??
        document.body,
    );
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['c1', 'c2', 'c3']));
    expect(screen.getByRole('button', { name: 'Archive 3' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.queryByText(/selected/)).toBeNull();
  });

  it('links rows: a real link in the row header, and a click anywhere on the row', async () => {
    const navigate = vi.fn();
    function Link({ href, children, onClick, ...rest }: LinkComponentProps) {
      return (
        <a
          {...rest}
          href={href}
          onClick={(event) => {
            event.preventDefault();
            onClick?.(event);
            navigate(href);
          }}
        >
          {children}
        </a>
      );
    }
    render(
      <UIProvider LinkComponent={Link}>
        <Wide>
          <Table selectionMode="multiple" getRowHref={(row) => `/customers/${row.id}`} />
        </Wide>
      </UIProvider>,
    );
    const link = screen.getByRole('link', { name: 'Globex' });
    expect(link).toHaveAttribute('href', '/customers/c2');
    await userEvent.click(screen.getByText('Austin'));
    expect(navigate).toHaveBeenLastCalledWith('/customers/c2');
    // Controls in the row don't navigate.
    navigate.mockClear();
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Acme' }).closest('label') ?? document.body,
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('opens row actions and expandable detail', async () => {
    const onRowAction = vi.fn();
    render(
      <Wide>
        <Table
          rowActions={() => <MenuItem id="archive">Archive</MenuItem>}
          onRowAction={onRowAction}
          renderRowDetail={(row) => <p>Notes for {row.name}</p>}
        />
      </Wide>,
    );
    const toggle = screen.getByRole('button', { name: 'Details for Acme' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Notes for Acme')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Globex' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Archive' }));
    expect(onRowAction).toHaveBeenCalledWith('archive', customers[1]);
  });

  it('hides columns by choice and by priority as the container narrows', () => {
    const { unmount } = render(
      <Wide>
        <Table hiddenColumns={new Set(['city'])} />
      </Wide>,
    );
    expect(screen.queryByRole('columnheader', { name: /City/ })).toBeNull();
    unmount();
    render(
      <Wide width={800}>
        <Table />
      </Wide>,
    );
    // Priority 3 (Plan) hides below 1024 px.
    expect(screen.queryByRole('columnheader', { name: /Plan/ })).toBeNull();
    expect(screen.getByRole('columnheader', { name: /City/ })).toBeInTheDocument();
  });

  it('shows cards in a narrow container, with selection after Select', async () => {
    render(
      <Wide width={360}>
        <Table selectionMode="multiple" />
      </Wide>,
    );
    expect(screen.queryByRole('table')).toBeNull();
    const list = screen.getByRole('list', { name: 'Customers' });
    const cards = within(list).getAllByRole('listitem');
    expect(cards).toHaveLength(3);
    expect(cards[0]?.textContent).toContain('Denver');
    expect(cards[0]?.textContent).toContain('Balance');
    expect(screen.queryByRole('checkbox')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Select' }));
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
  });

  it('offers Load more on phones when the app appends pages', async () => {
    const onLoadMore = vi.fn();
    render(
      <Wide width={360}>
        <Table
          pagination={{
            mode: 'cursor',
            hasNext: true,
            hasPrevious: false,
            onNext: vi.fn(),
            onPrevious: vi.fn(),
            onLoadMore,
          }}
        />
      </Wide>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('shows loading, empty, error and refreshing states', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <Wide>
        <Table rows={[]} isLoading />
      </Wide>,
    );
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    rerender(
      <Wide>
        <Table rows={[]} />
      </Wide>,
    );
    expect(screen.getByText('No matching rows')).toBeInTheDocument();
    rerender(
      <Wide>
        <Table rows={[]} error="The server didn’t respond." onRetry={onRetry} />
      </Wide>,
    );
    expect(screen.getByText('The server didn’t respond.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
    rerender(
      <Wide>
        <Table isRefreshing />
      </Wide>,
    );
    expect(bodyNames()).toHaveLength(3);
    expect(screen.getByRole('progressbar', { name: 'Updating' })).toBeInTheDocument();
    rerender(
      <Wide>
        <Table />
      </Wide>,
    );
    await expect.poll(() => screen.getByRole('status').textContent).toBe('3 rows');
  });

  it('renders only the rows in view when virtualised', () => {
    const many = Array.from({ length: 1000 }, (_, index) => ({
      id: `r${String(index)}`,
      name: `Customer ${String(index)}`,
      city: 'Denver',
      balance: index,
      plan: 'Flat',
    }));
    render(
      <Wide>
        <Table rows={many} isVirtualized maxHeight="20rem" />
      </Wide>,
    );
    const rendered = screen.getAllByRole('rowheader').length;
    expect(rendered).toBeGreaterThan(5);
    expect(rendered).toBeLessThan(100);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Wide>
        <Table
          selectionMode="multiple"
          rowActions={() => <MenuItem id="archive">Archive</MenuItem>}
          renderRowDetail={() => 'Detail'}
          pagination={{ mode: 'client', pageSize: 2 }}
        />
      </Wide>,
    );
    await expectNoAxeViolations(container);
  });
});
