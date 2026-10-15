import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { defaultMessages as coreMessages } from '../provider/messages';
import { defaultTableMessages } from './messages';
import { BooleanCell, MoneyCell, NumberCell, StatusCell, TagsCell, TwoLineCell } from './cells';
import { columnsFor } from './columns';
import { toCsv } from './csv';
import { describeFilter } from './filters';
import { TableToolbar, type TableToolbarProps } from './TableToolbar';
import type { FilterConfig, FilterValues } from './types';

const defaultMessages = { ...coreMessages, ...defaultTableMessages };

const filters: FilterConfig[] = [
  {
    id: 'status',
    label: 'Status',
    type: 'enum',
    options: [
      { id: 'active', label: 'Active' },
      { id: 'paused', label: 'Paused' },
    ],
  },
  {
    id: 'plans',
    label: 'Plans',
    type: 'multiEnum',
    options: [
      { id: 'flat', label: 'Flat' },
      { id: 'tou', label: 'Time of use' },
    ],
  },
  { id: 'usage', label: 'Usage', type: 'numberRange', unit: 'kWh' },
  { id: 'isSolar', label: 'Solar', type: 'boolean' },
];

interface Row {
  name: string;
  city: string;
}
const col = columnsFor<Row>();
const columns = [
  col.field('name', { header: 'Name', isRowHeader: true }),
  col.field('city', { header: 'City' }),
];

function Wide({ children, width = 1100 }: { children: React.ReactNode; width?: number }) {
  return <div style={{ width }}>{children}</div>;
}

function Toolbar(props: Partial<TableToolbarProps>) {
  const [values, setValues] = useState<FilterValues>(props.filterValues ?? {});
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  return (
    <TableToolbar
      {...props}
      label="Customers"
      count={1234}
      filters={filters}
      filterValues={values}
      onFilterValuesChange={(next) => {
        setValues(next);
        props.onFilterValuesChange?.(next);
      }}
      columns={columns}
      hiddenColumns={hidden}
      onHiddenColumnsChange={(next) => {
        setHidden(next);
        props.onHiddenColumnsChange?.(next);
      }}
    />
  );
}

describe('TableToolbar', () => {
  it('summarises results and shows active filters as removable chips', async () => {
    const onFilterValuesChange = vi.fn();
    render(
      <Wide>
        <Toolbar
          filterValues={{ status: 'active', usage: { min: 100 } }}
          onFilterValuesChange={onFilterValuesChange}
        />
      </Wide>,
    );
    expect(screen.getByText('Customers · 1,234')).toBeInTheDocument();
    expect(screen.getByText('Status: Active')).toBeInTheDocument();
    expect(screen.getByText('Usage: ≥ 100 kWh')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /Remove.*Status: Active|Status: Active/ }),
    );
    expect(onFilterValuesChange).toHaveBeenLastCalledWith({
      status: undefined,
      usage: { min: 100 },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(onFilterValuesChange).toHaveBeenLastCalledWith({});
  });

  it('changes filters from the filter panel', async () => {
    const onFilterValuesChange = vi.fn();
    render(
      <Wide>
        <Toolbar onFilterValuesChange={onFilterValuesChange} />
      </Wide>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const panel = await screen.findByRole('dialog', { name: 'Filters' });
    await userEvent.click(
      within(panel).getByRole('checkbox', { name: 'Time of use' }).closest('label') ?? panel,
    );
    expect(onFilterValuesChange).toHaveBeenLastCalledWith({ plans: ['tou'] });
    await userEvent.click(
      within(panel).getByRole('radio', { name: 'Yes' }).closest('label') ?? panel,
    );
    expect(onFilterValuesChange).toHaveBeenLastCalledWith({ plans: ['tou'], isSolar: true });
  });

  it('searches, toggles columns and exports', async () => {
    const onSearchChange = vi.fn();
    const onHiddenColumnsChange = vi.fn();
    const onExport = vi.fn();
    render(
      <Wide>
        <Toolbar
          search=""
          onSearchChange={onSearchChange}
          onHiddenColumnsChange={onHiddenColumnsChange}
          onExport={onExport}
          primaryAction={<button type="button">New customer</button>}
        />
      </Wide>,
    );
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'acme{Enter}');
    expect(onSearchChange).toHaveBeenLastCalledWith('acme');
    await userEvent.click(screen.getByRole('button', { name: 'Columns' }));
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'City' }));
    expect(onHiddenColumnsChange).toHaveBeenLastCalledWith(new Set(['city']));
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'All rows as CSV' }));
    expect(onExport).toHaveBeenCalledWith({ format: 'csv', scope: 'all' });
    expect(screen.getByRole('button', { name: 'New customer' })).toBeInTheDocument();
  });

  it('puts filters, columns and export in one sheet when narrow', async () => {
    const onExport = vi.fn();
    render(
      <Wide width={360}>
        <Toolbar search="" onSearchChange={vi.fn()} onExport={onExport} />
      </Wide>,
    );
    expect(screen.queryByRole('button', { name: 'Filters' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Filter & sort' }));
    const sheet = await screen.findByRole('dialog', { name: 'Filter & sort' });
    expect(within(sheet).getByRole('group', { name: 'Columns' })).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('button', { name: 'This page as CSV' }));
    expect(onExport).toHaveBeenCalledWith({ format: 'csv', scope: 'page' });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Wide>
        <Toolbar
          filterValues={{ status: 'active' }}
          search=""
          onSearchChange={vi.fn()}
          onExport={vi.fn()}
        />
      </Wide>,
    );
    await expectNoAxeViolations(container);
  });
});

describe('describeFilter', () => {
  it('describes every filter type', () => {
    const [, plans, usage, solar] = filters as [
      FilterConfig,
      FilterConfig,
      FilterConfig,
      FilterConfig,
    ];
    const text = (filter: FilterConfig, value: Parameters<typeof describeFilter>[1]) =>
      describeFilter(filter, value, defaultMessages, 'en-US');
    expect(text(plans, ['flat', 'tou'])).toBe('Plans: Flat, Time of use');
    expect(text(plans, [])).toBeUndefined();
    expect(text(usage, { min: 1, max: 5 })).toBe('Usage: 1 kWh–5 kWh');
    expect(text(usage, { max: 5 })).toBe('Usage: ≤ 5 kWh');
    expect(text(solar, false)).toBe('Solar: No');
    expect(
      text(
        { id: 'when', label: 'Read', type: 'dateRange' },
        { start: '2026-03-01', end: '2026-03-31' },
      ),
    ).toBe('Read: Mar 1 – 31, 2026');
    expect(
      text(
        {
          id: 'site',
          label: 'Site',
          type: 'asyncEntity',
          loadOptions: () => Promise.resolve([]),
          getOptionLabel: (id) => (id === 's1' ? 'North' : undefined),
        },
        's1',
      ),
    ).toBe('Site: North');
  });
});

describe('cells', () => {
  it('format money, numbers, booleans, statuses, tags and two lines', () => {
    render(
      <div>
        <MoneyCell value="12.5" currency="USD" />
        <MoneyCell value={1250} currency="USD" isMinorUnits />
        <NumberCell value={1234.5} unit="kWh" />
        <BooleanCell isTrue />
        <StatusCell tone="success" label="Online" />
        <TagsCell tags={['a', 'b', 'c', 'd']} max={2} />
        <TwoLineCell title="Acme" subtitle="Denver" />
      </div>,
    );
    expect(screen.getAllByText('$12.50')).toHaveLength(2);
    expect(screen.getByText('1,234.5 kWh')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('Denver')).toBeInTheDocument();
  });
});

describe('toCsv', () => {
  it('quotes fields and neutralises formulas', () => {
    expect(
      toCsv(
        [
          { name: 'Acme, Inc.', city: 'Denver' },
          { name: '=HYPERLINK("x")', city: 'He said "hi"' },
        ],
        columns,
      ),
    ).toBe('Name,City\r\n"Acme, Inc.",Denver\r\n"\'=HYPERLINK(""x"")","He said ""hi"""\r\n');
  });
});
