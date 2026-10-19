import type { Meta, StoryObj } from '@storybook/react-vite';
import { questions, type Question } from '../../test/questions';
import { Archive, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/Button/Button';
import { MenuItem } from '../components/Menu/Menu';
import { SearchField } from '../components/SearchField/SearchField';
import {
  MoneyCell,
  NumberCell,
  RelativeTimeCell,
  StatusCell,
  TagsCell,
  TwoLineCell,
} from './cells';
import { columnsFor } from './columns';
import { toCsv } from './csv';
import { DataTable } from './DataTable';
import { TableToolbar } from './TableToolbar';
import { filterTree } from './tree';
import type { FilterConfig, FilterValues, TableSort } from './types';

const meta = {
  title: 'Table/DataTable',
  component: DataTable,
  parameters: { layout: 'padded' },
  args: { rows: [], columns: [], getRowId: () => '' },
} satisfies Meta<typeof DataTable>;
export default meta;
type Story = StoryObj<typeof meta>;

interface Site {
  id: string;
  name: string;
  city: string;
  status: 'online' | 'degraded' | 'offline';
  usage: number;
  balance: number;
  tags: string[];
  lastReading: string;
}

const cities = ['Denver', 'Boulder', 'Austin', 'Toronto', 'Calgary', 'Ottawa'];
const statuses: Site['status'][] = ['online', 'online', 'online', 'degraded', 'offline'];
const tagSets = [['solar'], ['ev', 'solar'], [], ['battery'], ['vip', 'ev']];
// Readings are relative to now so "x minutes ago" stays the same from day to day.
const NOW = Date.now();

/** A deterministic set of sites (no randomness, so snapshots stay stable). */
const sites: Site[] = Array.from({ length: 240 }, (_, index) => ({
  id: `site-${String(index + 1).padStart(3, '0')}`,
  name: `${['North', 'South', 'East', 'West', 'Central'][index % 5] ?? ''} ${cities[index % cities.length] ?? ''} ${String(Math.floor(index / 30) + 1)}`,
  city: cities[index % cities.length] ?? '',
  status: statuses[Math.floor(index / 3) % statuses.length] ?? 'online',
  usage: ((index * 937) % 5000) + 120.5,
  balance: ((index * 613) % 90000) / 100 - 120,
  tags: tagSets[Math.floor(index / 2) % tagSets.length] ?? [],
  lastReading: new Date(NOW - ((index * 431) % 7200) * 60_000).toISOString(),
}));

const tones = { online: 'success', degraded: 'warning', offline: 'danger' } as const;
const statusLabels = { online: 'Online', degraded: 'Degraded', offline: 'Offline' } as const;
const col = columnsFor<Site>();
const columns = [
  col.field('name', { header: 'Site', isRowHeader: true, isSortable: true }),
  col.field('city', { header: 'City', isSortable: true, mobile: 'subtitle' }),
  col.field('status', {
    header: 'Status',
    isSortable: true,
    mobile: 'status',
    cell: ({ value }) => <StatusCell tone={tones[value]} label={statusLabels[value]} />,
  }),
  col.field('usage', {
    header: 'Usage',
    isSortable: true,
    align: 'end',
    mobile: true,
    cell: ({ value }) => (
      <NumberCell value={value} unit="kWh" formatOptions={{ maximumFractionDigits: 0 }} />
    ),
  }),
  col.field('balance', {
    header: 'Balance',
    isSortable: true,
    align: 'end',
    priority: 3,
    cell: ({ value }) => <MoneyCell value={value} currency="USD" />,
  }),
  col.field('tags', {
    header: 'Tags',
    priority: 3,
    cell: ({ value }) => <TagsCell tags={value} />,
  }),
  col.field('lastReading', {
    header: 'Last reading',
    priority: 3,
    cell: ({ value }) => <RelativeTimeCell value={value} />,
  }),
];

/** Client sorting and paging, selection with a bulk action, row links, row actions and detail. */
export const ClientSide: Story = {
  render: function ClientSideStory() {
    return (
      <DataTable<Site>
        aria-label="Sites"
        rows={sites.slice(0, 32)}
        columns={columns}
        getRowId={(row) => row.id}
        pagination={{ mode: 'client', pageSize: 8 }}
        selectionMode="multiple"
        bulkActions={(keys) => (
          <Button size="sm" variant="outline" icon={Archive}>
            {`Archive ${String(keys.size)}`}
          </Button>
        )}
        getRowHref={(row) => `#/sites/${row.id}`}
        rowActions={() => (
          <>
            <MenuItem id="edit">Edit</MenuItem>
            <MenuItem id="archive" tone="danger">
              Archive
            </MenuItem>
          </>
        )}
        renderRowDetail={(row) => (
          <p className="text-sm text-fg-muted">{`${row.name} has ${String(row.tags.length)} tags.`}</p>
        )}
      />
    );
  },
};

/** Loading skeleton rows, the empty state and the error state with Retry. */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <DataTable<Site>
        aria-label="Loading sites"
        rows={[]}
        columns={columns}
        getRowId={(row) => row.id}
        isLoading
      />
      <DataTable<Site>
        aria-label="No sites"
        rows={[]}
        columns={columns}
        getRowId={(row) => row.id}
      />
      <DataTable<Site>
        aria-label="Sites that failed"
        rows={[]}
        columns={columns}
        getRowId={(row) => row.id}
        error="The server didn’t respond."
        onRetry={() => undefined}
      />
    </div>
  ),
};

/** A long client-side list renders only the rows in view (with a sticky header inside its scroll area). */
export const Virtualised: Story = {
  tags: ['!visual'],
  render: () => (
    <DataTable<Site>
      aria-label="All sites"
      rows={sites}
      columns={columns}
      getRowId={(row) => row.id}
      density="compact"
      maxHeight="24rem"
      isVirtualized
    />
  ),
};

// ——— Cursor-paged, URL-style state ———

interface TableState {
  search: string;
  sort: TableSort | null;
  filters: FilterValues;
  hidden: string[];
  /** The keyset cursor: the id after which (or before which) the page starts. */
  after?: string;
  before?: string;
}

const PAGE_SIZE = 10;

const filterConfig: FilterConfig[] = [
  {
    id: 'status',
    label: 'Status',
    type: 'multiEnum',
    options: [
      { id: 'online', label: 'Online' },
      { id: 'degraded', label: 'Degraded' },
      { id: 'offline', label: 'Offline' },
    ],
  },
  {
    id: 'city',
    label: 'City',
    type: 'enum',
    options: cities.map((city) => ({ id: city, label: city })),
  },
  { id: 'usage', label: 'Usage', type: 'numberRange', unit: 'kWh' },
];

/** The table state as a query string, as an app would keep it in the URL. */
function toQuery(state: TableState): string {
  const params = new URLSearchParams();
  if (state.search) params.set('q', state.search);
  if (state.sort)
    params.set('sort', `${state.sort.direction === 'descending' ? '-' : ''}${state.sort.column}`);
  for (const [key, value] of Object.entries(state.filters)) {
    if (value !== undefined) params.set(`f.${key}`, JSON.stringify(value));
  }
  if (state.hidden.length > 0) params.set('hide', state.hidden.join(','));
  if (state.after) params.set('after', state.after);
  if (state.before) params.set('before', state.before);
  return params.toString();
}

function fromQuery(query: string): TableState {
  const params = new URLSearchParams(query);
  const sort = params.get('sort');
  const filters: Record<string, FilterValues[string]> = {};
  for (const [key, value] of params) {
    if (key.startsWith('f.')) filters[key.slice(2)] = JSON.parse(value) as FilterValues[string];
  }
  return {
    search: params.get('q') ?? '',
    sort: sort
      ? {
          column: sort.replace(/^-/, ''),
          direction: sort.startsWith('-') ? 'descending' : 'ascending',
        }
      : null,
    filters,
    hidden: params.get('hide')?.split(',').filter(Boolean) ?? [],
    after: params.get('after') ?? undefined,
    before: params.get('before') ?? undefined,
  };
}

interface Page {
  rows: Site[];
  hasNext: boolean;
  hasPrevious: boolean;
  approximateTotal: number;
}

/** A pretend keyset-paginated API: filter, sort, then take the page after (or before) a cursor id. */
function fetchPage(state: TableState): Promise<Page> {
  const { search, sort, filters } = state;
  const status = filters.status as readonly string[] | undefined;
  const usage = filters.usage as { min?: number; max?: number } | undefined;
  let matches = sites.filter(
    (site) =>
      (!search || site.name.toLowerCase().includes(search.toLowerCase())) &&
      (!status || status.includes(site.status)) &&
      (!filters.city || site.city === filters.city) &&
      (usage?.min === undefined || site.usage >= usage.min) &&
      (usage?.max === undefined || site.usage <= usage.max),
  );
  if (sort) {
    const key = sort.column as keyof Site;
    matches = [...matches].sort((a, b) => {
      const order = String(a[key]).localeCompare(String(b[key]), undefined, { numeric: true });
      return (sort.direction === 'ascending' ? order : -order) || a.id.localeCompare(b.id);
    });
  }
  const anchor = state.after ?? state.before;
  const index = anchor === undefined ? -1 : matches.findIndex((site) => site.id === anchor);
  const start = state.before !== undefined ? Math.max(0, index - PAGE_SIZE) : index + 1;
  const rows = matches.slice(start, start + PAGE_SIZE);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        rows,
        hasPrevious: start > 0,
        hasNext: start + PAGE_SIZE < matches.length,
        // Keyset APIs often only estimate the total.
        approximateTotal: Math.round(matches.length / 10) * 10,
      });
    }, 350);
  });
}

function CursorPagedSites() {
  // A stand-in for the address bar and the browser history.
  const [history, setHistory] = useState<string[]>(['sort=name']);
  const query = history.at(-1) ?? '';
  const state = useMemo(() => fromQuery(query), [query]);
  // The page and the query it was loaded for; it's loading while they differ.
  const [loaded, setLoaded] = useState<{ query: string; page: Page } | null>(null);
  const page = loaded?.page ?? null;
  const isLoading = loaded?.query !== query;

  useEffect(() => {
    let isCurrent = true;
    void fetchPage(state).then((next) => {
      if (isCurrent) {
        setLoaded({ query, page: next });
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [state, query]);

  const navigate = (next: Partial<TableState>, { keepCursor = false } = {}) => {
    const merged: TableState = { ...state, ...next };
    if (!keepCursor) {
      merged.after = undefined;
      merged.before = undefined;
    }
    setHistory((stack) => [...stack, toQuery(merged)]);
  };

  const rows = page?.rows ?? [];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-control border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-fg-muted">
        <Button
          size="sm"
          variant="ghost"
          isDisabled={history.length < 2}
          onPress={() => {
            setHistory((stack) => stack.slice(0, -1));
          }}
        >
          Back
        </Button>
        <span className="min-w-0 flex-1 break-all">{`/sites?${query}`}</span>
      </div>
      <TableToolbar
        label="Sites"
        count={page?.approximateTotal}
        search={state.search}
        onSearchChange={(search) => {
          navigate({ search });
        }}
        filters={filterConfig}
        filterValues={state.filters}
        onFilterValuesChange={(filters) => {
          navigate({ filters });
        }}
        columns={columns}
        hiddenColumns={new Set(state.hidden)}
        onHiddenColumnsChange={(hidden) => {
          navigate({ hidden: [...hidden] }, { keepCursor: true });
        }}
        onExport={({ scope }) => {
          if (scope === 'page') {
            // In an app: downloadCsv(toCsv(rows, columns), 'sites.csv')
            toCsv(rows, columns);
          }
        }}
        primaryAction={
          <Button tone="accent" icon={Plus}>
            New site
          </Button>
        }
      />
      <DataTable<Site>
        aria-label="Sites"
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        getRowHref={(row) => `#/sites/${row.id}`}
        sort={state.sort}
        onSortChange={(sort) => {
          navigate({ sort });
        }}
        sortMode="server"
        hiddenColumns={new Set(state.hidden)}
        isLoading={isLoading && page === null}
        isRefreshing={isLoading && page !== null}
        pagination={{
          mode: 'cursor',
          hasNext: page?.hasNext ?? false,
          hasPrevious: page?.hasPrevious ?? false,
          approximateTotal: page?.approximateTotal,
          onNext: () => {
            navigate({ after: rows.at(-1)?.id, before: undefined }, { keepCursor: true });
          },
          onPrevious: () => {
            navigate({ before: rows[0]?.id, after: undefined }, { keepCursor: true });
          },
        }}
      />
    </div>
  );
}

/**
 * A cursor-paged table whose whole state (search, filters, sort, hidden columns and the cursor) lives in a
 * URL-style query string, shown above it. Every change pushes a new "URL"; Back restores the previous state exactly.
 * The pretend server filters, sorts and returns a keyset page with an approximate total.
 */
export const CursorPagedWithUrlState: Story = {
  tags: ['!visual'],
  render: () => <CursorPagedSites />,
};

const questionColumn = columnsFor<Question>();

/**
 * Long titles clamp instead of widening the table: the question column is flexible (`isFlexible`), so it takes the
 * leftover width while the others keep their content's width, and its TwoLineCell clamps to two lines, with the full text in a tooltip (hover or keyboard focus) and as the
 * link's name. Domain is held to `maxWidth`. Phones show the same data as cards.
 */
export const LongTitles: Story = {
  render: () => (
    <DataTable<Question>
      aria-label="Question bank"
      rows={questions}
      getRowId={(row) => row.id}
      columns={[
        questionColumn.field('question', {
          header: 'Question',
          isRowHeader: true,
          isFlexible: true,
          cell: ({ row }) => (
            <TwoLineCell
              title={row.question}
              subtitle={row.domain}
              titleLines={2}
              href={`#${row.id}`}
            />
          ),
        }),
        questionColumn.field('domain', { header: 'Domain', maxWidth: '9rem', mobile: 'subtitle' }),
        questionColumn.field('difficulty', { header: 'Difficulty', mobile: true }),
        questionColumn.field('attempts', { header: 'Attempts', align: 'end', mobile: true }),
      ]}
    />
  ),
};

interface BudgetLine {
  id: string;
  name: string;
  owner: string;
  status: 'online' | 'degraded' | 'offline';
  budget: number;
  spent: number;
  children?: BudgetLine[];
}

const line = (
  id: string,
  name: string,
  owner: string,
  budget: number,
  spent: number,
  children?: BudgetLine[],
): BudgetLine => ({
  id,
  name,
  owner,
  status: spent > budget ? 'offline' : spent > budget * 0.9 ? 'degraded' : 'online',
  budget,
  spent,
  children,
});

/** A deterministic org budget: departments, teams and projects. */
const budget: BudgetLine[] = [
  line('eng', 'Engineering', 'Ada Park', 1_200_000, 1_030_000, [
    line('eng-web', 'Web', 'Lin Ito', 420_000, 398_000, [
      line('eng-web-checkout', 'Checkout rebuild', 'Sam Oduya', 180_000, 192_500),
      line('eng-web-a11y', 'Accessibility audit', 'Rae Kim', 60_000, 41_200),
    ]),
    line('eng-platform', 'Platform', 'Jo Varga', 560_000, 470_000, [
      line('eng-platform-k8s', 'Cluster upgrade', 'Ola Berg', 210_000, 201_000),
      line('eng-platform-obs', 'Observability', 'Kai Moreno', 150_000, 98_000),
    ]),
    line('eng-mobile', 'Mobile', 'Noor Haddad', 220_000, 162_000, []),
  ]),
  line('sales', 'Sales', 'Ben Archer', 640_000, 512_000, [
    line('sales-emea', 'EMEA', 'Ines Duarte', 300_000, 244_000),
    line('sales-apac', 'APAC', 'Tom Ng', 340_000, 268_000),
  ]),
  line('ops', 'Operations', 'Mia Lund', 280_000, 301_000),
];

const budgetColumn = columnsFor<BudgetLine>();
const budgetColumns = [
  budgetColumn.field('name', { header: 'Name', isRowHeader: true, isSortable: true }),
  budgetColumn.field('owner', { header: 'Owner', isSortable: true, mobile: 'subtitle' }),
  budgetColumn.field('status', {
    header: 'Status',
    mobile: 'status',
    cell: ({ value }) => (
      <StatusCell
        tone={tones[value]}
        label={{ online: 'On budget', degraded: 'Near limit', offline: 'Over' }[value]}
      />
    ),
  }),
  budgetColumn.field('budget', {
    header: 'Budget',
    isSortable: true,
    align: 'end',
    mobile: true,
    cell: ({ value }) => <MoneyCell value={value} currency="USD" />,
  }),
  budgetColumn.field('spent', {
    header: 'Spent',
    isSortable: true,
    align: 'end',
    mobile: true,
    priority: 3,
    cell: ({ value }) => <MoneyCell value={value} currency="USD" />,
  }),
];

/**
 * Tree rows: `getRowChildren` gives each row's children, shown indented under it in the row header column (or
 * `treeColumn`). The table becomes a `treegrid`: Up and Down move between rows, Right opens a row and then moves to
 * its first child, Left closes it and then moves to its parent. Selecting a group selects everything under it, and a
 * group is checked when all its children are and indeterminate when some are. Sorting orders each level on its own.
 * On phones, children become a nested list under their parent's card.
 */
export const TreeRows: Story = {
  render: () => (
    <DataTable<BudgetLine>
      aria-label="Budget"
      rows={budget}
      columns={budgetColumns}
      getRowId={(row) => row.id}
      getRowChildren={(row) => row.children}
      defaultExpandedIds={new Set(['eng', 'eng-web'])}
      selectionMode="multiple"
      defaultSelectedKeys={new Set(['eng-web-checkout'])}
      bulkActions={() => (
        <Button size="sm" variant="outline" icon={Archive}>
          Archive
        </Button>
      )}
      rowActions={() => (
        <>
          <MenuItem id="open">Open</MenuItem>
          <MenuItem id="move">Move</MenuItem>
        </>
      )}
    />
  ),
};

/** A pretend server: each department's teams and each team's projects, after a delay. Hardware always fails. */
function loadBudgetChildren(row: BudgetLine, signal: AbortSignal): Promise<readonly BudgetLine[]> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      if (row.id === 'hw') {
        reject(new Error('Service unavailable'));
        return;
      }
      resolve(
        Array.from({ length: 3 }, (_, index) => {
          const id = `${row.id}-${String(index + 1)}`;
          const share = Math.round(row.budget / 3);
          return line(id, `${row.name} ${String(index + 1)}`, row.owner, share, share * 0.8);
        }),
      );
    }, 900);
    signal.addEventListener('abort', () => {
      window.clearTimeout(timer);
    });
  });
}

/**
 * Lazy children: `loadRowChildren` runs the first time a row opens, with a loading row meanwhile and Retry if it
 * fails (Hardware always does here). Loaded rows are kept while the table is mounted. `isRowExpandable` says which
 * rows have children to load; here the loaded rows are expandable too, three levels deep.
 */
export const LazyTreeRows: Story = {
  tags: ['!visual'],
  render: () => (
    <DataTable<BudgetLine>
      aria-label="Budget"
      rows={[
        line('eng', 'Engineering', 'Ada Park', 1_200_000, 1_030_000),
        line('hw', 'Hardware', 'Eli Strand', 900_000, 640_000),
        line('ops', 'Operations', 'Mia Lund', 280_000, 301_000),
      ]}
      columns={budgetColumns}
      getRowId={(row) => row.id}
      loadRowChildren={loadBudgetChildren}
      isRowExpandable={(row) => row.id !== 'ops' && row.id.split('-').length < 3}
      selectionMode="multiple"
    />
  ),
};

/** The budget rows that match a search, or `undefined` for every row. */
function searchBudget(query: string) {
  return query === ''
    ? undefined
    : filterTree(budget, {
        getRowId: (row) => row.id,
        getRowChildren: (row) => row.children,
        matches: (row) => `${row.name} ${row.owner}`.toLowerCase().includes(query.toLowerCase()),
      });
}

function FilteredBudget() {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const filtered = useMemo(() => searchBudget(query), [query]);
  return (
    <div className="flex flex-col gap-3">
      <SearchField
        label="Search"
        value={query}
        onChange={(value) => {
          setQuery(value);
          // Open the rows above each match, so the matches show.
          setExpanded(searchBudget(value)?.ancestorKeys ?? new Set());
        }}
      />
      <DataTable<BudgetLine>
        aria-label="Budget"
        rows={filtered?.rows ?? budget}
        columns={budgetColumns}
        getRowId={(row) => row.id}
        getRowChildren={filtered?.getRowChildren ?? ((row) => row.children)}
        expandedIds={expanded}
        onExpandedChange={setExpanded}
      />
    </div>
  );
}

/**
 * Filtering a tree: `filterTree` keeps the rows that match and the rows above them (a matching row keeps all its
 * children), and returns those ancestors as `ancestorKeys` to expand. Search for "platform" or an owner's name.
 */
export const FilteredTreeRows: Story = {
  tags: ['!visual'],
  render: () => <FilteredBudget />,
};
