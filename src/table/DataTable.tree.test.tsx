import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { columnsFor } from './columns';
import { DataTable, type DataTableProps } from './DataTable';

interface Item {
  id: string;
  name: string;
  size: number;
  children?: Item[];
}

const items: Item[] = [
  {
    id: 'docs',
    name: 'Documents',
    size: 30,
    children: [
      { id: 'cv', name: 'Resume', size: 20 },
      {
        id: 'taxes',
        name: 'Taxes',
        size: 10,
        children: [{ id: 'y2025', name: '2025', size: 10 }],
      },
    ],
  },
  { id: 'notes', name: 'Notes', size: 5 },
  { id: 'pics', name: 'Pictures', size: 50, children: [] },
];

const col = columnsFor<Item>();
const columns = [
  col.field('name', { header: 'Name', isRowHeader: true, isSortable: true }),
  col.field('size', { header: 'Size', isSortable: true, align: 'end', mobile: true }),
];

function Tree(props: Partial<DataTableProps<Item>>) {
  return (
    <DataTable<Item>
      aria-label="Files"
      rows={items}
      columns={columns}
      getRowId={(row) => row.id}
      getRowChildren={(row) => row.children}
      {...props}
    />
  );
}

/** A wide container, so the table (not the cards) shows whatever the test screen size. */
function Wide({ children, width = 1100 }: { children: React.ReactNode; width?: number }) {
  return <div style={{ width }}>{children}</div>;
}

function names() {
  return screen.getAllByRole('rowheader').map((cell) => cell.textContent);
}

function rowOf(name: string) {
  const header = screen.getByRole('rowheader', { name: new RegExp(`^${name}`) });
  const row = header.closest('tr');
  if (!row) {
    throw new Error(`No row for ${name}`);
  }
  return row;
}

/** Clicks a checkbox through its label (the input itself is visually hidden). */
async function check(name: string) {
  await userEvent.click(screen.getByRole('checkbox', { name }).closest('label') ?? document.body);
}

/** A promise the test settles by hand. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('DataTable tree rows', () => {
  it('renders a treegrid with levels, positions and expandable rows', async () => {
    render(
      <Wide>
        <Tree />
      </Wide>,
    );
    const grid = screen.getByRole('treegrid', { name: 'Files' });
    expect(names()).toEqual(['Documents', 'Notes', 'Pictures']);
    const docs = rowOf('Documents');
    expect(docs).toHaveAttribute('aria-level', '1');
    expect(docs).toHaveAttribute('aria-posinset', '1');
    expect(docs).toHaveAttribute('aria-setsize', '3');
    expect(docs).toHaveAttribute('aria-expanded', 'false');
    // A leaf, and a row with no children, have no toggle.
    expect(rowOf('Notes')).not.toHaveAttribute('aria-expanded');
    expect(rowOf('Pictures')).not.toHaveAttribute('aria-expanded');
    expect(within(grid).getAllByRole('button', { name: /^Rows under/ })).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'Rows under Documents' }));
    expect(names()).toEqual(['Documents', 'Resume', 'Taxes', 'Notes', 'Pictures']);
    expect(docs).toHaveAttribute('aria-expanded', 'true');
    expect(rowOf('Taxes')).toHaveAttribute('aria-level', '2');
    expect(rowOf('Taxes')).toHaveAttribute('aria-posinset', '2');
    expect(rowOf('Taxes')).toHaveAttribute('aria-setsize', '2');
    await expectNoAxeViolations(grid);

    await userEvent.click(screen.getByRole('button', { name: 'Rows under Documents' }));
    expect(names()).toEqual(['Documents', 'Notes', 'Pictures']);
  });

  it('keeps a plain table without tree props', () => {
    render(
      <Wide>
        <DataTable<Item>
          aria-label="Files"
          rows={items}
          columns={columns}
          getRowId={(row) => row.id}
        />
      </Wide>,
    );
    expect(screen.getByRole('table', { name: 'Files' })).toBeInTheDocument();
    expect(screen.queryByRole('treegrid')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Rows under/ })).toBeNull();
  });

  it('moves between rows and opens and closes them with the arrow keys', async () => {
    render(
      <Wide>
        <Tree />
      </Wide>,
    );
    const docs = rowOf('Documents');
    // One row is the tab stop.
    expect(docs).toHaveAttribute('tabindex', '0');
    expect(rowOf('Notes')).toHaveAttribute('tabindex', '-1');
    docs.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(docs).toHaveAttribute('aria-expanded', 'true');
    expect(document.activeElement).toBe(docs);
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(rowOf('Resume'));
    expect(rowOf('Resume')).toHaveAttribute('tabindex', '0');
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(rowOf('Taxes'));
    await userEvent.keyboard('{ArrowRight}');
    expect(names()).toContain('2025');
    await userEvent.keyboard('{ArrowLeft}');
    expect(names()).not.toContain('2025');
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(docs);
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(rowOf('Pictures'));
    await userEvent.keyboard('{Home}');
    await userEvent.keyboard('{ArrowLeft}');
    expect(docs).toHaveAttribute('aria-expanded', 'false');
    expect(names()).toEqual(['Documents', 'Notes', 'Pictures']);
  });

  it('can be expanded from the app (controlled)', async () => {
    function Controlled() {
      const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set(['docs', 'taxes']));
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setExpanded(new Set());
            }}
          >
            Collapse all
          </button>
          <Tree expandedIds={expanded} onExpandedChange={setExpanded} />
        </>
      );
    }
    render(
      <Wide>
        <Controlled />
      </Wide>,
    );
    expect(names()).toEqual(['Documents', 'Resume', 'Taxes', '2025', 'Notes', 'Pictures']);
    expect(rowOf('2025')).toHaveAttribute('aria-level', '3');
    await userEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    expect(names()).toEqual(['Documents', 'Notes', 'Pictures']);
  });

  it('sorts each level on its own, keeping children under their parent', async () => {
    render(
      <Wide>
        <Tree defaultExpandedIds={new Set(['docs'])} />
      </Wide>,
    );
    const size = screen.getByRole('columnheader', { name: /Size/ });
    await userEvent.click(within(size).getByRole('button'));
    expect(names()).toEqual(['Notes', 'Documents', 'Taxes', 'Resume', 'Pictures']);
    await userEvent.click(within(size).getByRole('button'));
    expect(names()).toEqual(['Pictures', 'Documents', 'Resume', 'Taxes', 'Notes']);
    expect(rowOf('Resume')).toHaveAttribute('aria-posinset', '1');
  });

  it('pages top-level rows, each with its open children', async () => {
    render(
      <Wide>
        <Tree defaultExpandedIds={new Set(['docs'])} pagination={{ mode: 'client', pageSize: 2 }} />
      </Wide>,
    );
    expect(names()).toEqual(['Documents', 'Resume', 'Taxes', 'Notes']);
    expect(screen.getByText('1–2 of 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(names()).toEqual(['Pictures']);
  });

  it('selects groups with tri-state checkboxes', async () => {
    const onSelectionChange = vi.fn();
    function Selectable() {
      const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
      return (
        <Tree
          selectionMode="multiple"
          defaultExpandedIds={new Set(['docs', 'taxes'])}
          selectedKeys={selected}
          onSelectionChange={(keys) => {
            onSelectionChange(keys);
            setSelected(keys);
          }}
        />
      );
    }
    render(
      <Wide>
        <Selectable />
      </Wide>,
    );
    const docs = screen.getByRole('checkbox', { name: 'Select Documents' });
    await check('Select Resume');
    expect(docs).toBePartiallyChecked();
    expect([...(onSelectionChange.mock.lastCall?.[0] as Set<string>)]).toEqual(['cv']);

    // The last child completes the group, all the way up.
    await check('Select 2025');
    expect(docs).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select Taxes' })).toBeChecked();
    expect(new Set(onSelectionChange.mock.lastCall?.[0] as Set<string>)).toEqual(
      new Set(['cv', 'y2025', 'taxes', 'docs']),
    );

    // Clearing a child clears its ancestors.
    await check('Select Resume');
    expect(docs).toBePartiallyChecked();
    expect(new Set(onSelectionChange.mock.lastCall?.[0] as Set<string>)).toEqual(
      new Set(['y2025', 'taxes']),
    );

    // A group selects (and clears) everything under it.
    await check('Select Documents');
    expect(docs).toBeChecked();
    expect(new Set(onSelectionChange.mock.lastCall?.[0] as Set<string>)).toEqual(
      new Set(['docs', 'cv', 'taxes', 'y2025']),
    );
    await check('Select Documents');
    expect(onSelectionChange.mock.lastCall?.[0]).toEqual(new Set());
    expect(docs).not.toBeChecked();
    expect(docs).not.toBePartiallyChecked();

    // Select all takes children too, including collapsed ones.
    await check('Select all rows on this page');
    expect(new Set(onSelectionChange.mock.lastCall?.[0] as Set<string>)).toEqual(
      new Set(['docs', 'cv', 'taxes', 'y2025', 'notes', 'pics']),
    );
  });

  it('loads children on first expand, with loading and error states', async () => {
    const requests: { row: Item; result: ReturnType<typeof deferred<readonly Item[]>> }[] = [];
    const loadRowChildren = vi.fn((row: Item) => {
      const result = deferred<readonly Item[]>();
      requests.push({ row, result });
      return result.promise;
    });
    render(
      <Wide>
        <Tree
          rows={[
            { id: 'a', name: 'Alpha', size: 1 },
            { id: 'b', name: 'Beta', size: 2 },
          ]}
          getRowChildren={undefined}
          loadRowChildren={loadRowChildren}
          isRowExpandable={(row) => row.id === 'a'}
        />
      </Wide>,
    );
    expect(screen.getAllByRole('button', { name: /^Rows under/ })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Rows under Alpha' }));
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(loadRowChildren).toHaveBeenCalledOnce();
    expect(requests[0]?.row.id).toBe('a');

    requests[0]?.result.reject(new Error('offline'));
    await expect.poll(() => screen.queryByText('Couldn’t load these rows')).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(loadRowChildren).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Loading')).toBeInTheDocument();

    requests[1]?.result.resolve([{ id: 'a1', name: 'Alpha one', size: 1 }]);
    await expect.poll(() => names()).toEqual(['Alpha', 'Alpha one', 'Beta']);
    expect(rowOf('Alpha one')).toHaveAttribute('aria-level', '2');
    // Kept: collapsing and opening again doesn't reload.
    await userEvent.click(screen.getByRole('button', { name: 'Rows under Alpha' }));
    await userEvent.click(screen.getByRole('button', { name: 'Rows under Alpha' }));
    expect(names()).toEqual(['Alpha', 'Alpha one', 'Beta']);
    expect(loadRowChildren).toHaveBeenCalledTimes(2);
  });

  it('selects the loaded children of a selected group', async () => {
    const onSelectionChange = vi.fn();
    const loadRowChildren = vi.fn(() =>
      Promise.resolve([
        { id: 'a1', name: 'Alpha one', size: 1 },
        { id: 'a2', name: 'Alpha two', size: 1 },
      ]),
    );
    render(
      <Wide>
        <Tree
          rows={[{ id: 'a', name: 'Alpha', size: 1 }]}
          getRowChildren={undefined}
          loadRowChildren={loadRowChildren}
          selectionMode="multiple"
          onSelectionChange={onSelectionChange}
        />
      </Wide>,
    );
    await check('Select Alpha');
    await userEvent.click(screen.getByRole('button', { name: 'Rows under Alpha' }));
    await expect.poll(() => names()).toEqual(['Alpha', 'Alpha one', 'Alpha two']);
    expect(new Set(onSelectionChange.mock.lastCall?.[0] as Set<string>)).toEqual(
      new Set(['a', 'a1', 'a2']),
    );
    expect(screen.getByRole('checkbox', { name: 'Select Alpha two' })).toBeChecked();
  });

  it('keeps detail panels separate from child rows', async () => {
    render(
      <Wide>
        <Tree renderRowDetail={(row) => <p>About {row.name}</p>} />
      </Wide>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Details for Documents' }));
    expect(screen.getByText('About Documents')).toBeInTheDocument();
    expect(names()).toEqual(['Documents', 'Notes', 'Pictures']);
    await userEvent.click(screen.getByRole('button', { name: 'Rows under Documents' }));
    expect(names()).toEqual(['Documents', 'Resume', 'Taxes', 'Notes', 'Pictures']);
    expect(screen.getByText('About Documents')).toBeInTheDocument();
  });

  it('puts the tree in the chosen column', () => {
    render(
      <Wide>
        <Tree treeColumn="size" />
      </Wide>,
    );
    const toggle = screen.getByRole('button', { name: 'Rows under Documents' });
    expect(toggle.closest('td')?.textContent).toBe('30');
  });

  it('nests cards on phones', async () => {
    render(
      <Wide width={360}>
        <Tree selectionMode="multiple" />
      </Wide>,
    );
    expect(screen.queryByRole('treegrid')).toBeNull();
    const list = screen.getByRole('list', { name: 'Files' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    const toggle = screen.getByRole('button', { name: 'Rows under Documents' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const children = screen.getByRole('list', { name: 'Rows under Documents' });
    expect(toggle).toHaveAttribute('aria-controls', children.id);
    expect(
      within(children)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([expect.stringContaining('Resume'), expect.stringContaining('Taxes')]);
    await userEvent.click(screen.getByRole('button', { name: 'Select' }));
    await check('Select Resume');
    expect(screen.getByRole('checkbox', { name: 'Select Documents' })).toBePartiallyChecked();
    await expectNoAxeViolations(list);
  });

  it('shows loading and errors for lazy children in cards', async () => {
    const loadRowChildren = vi.fn(() => Promise.reject(new Error('offline')));
    render(
      <Wide width={360}>
        <Tree
          rows={[{ id: 'a', name: 'Alpha', size: 1 }]}
          getRowChildren={undefined}
          loadRowChildren={loadRowChildren}
        />
      </Wide>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Rows under Alpha' }));
    await expect.poll(() => screen.queryByText('Couldn’t load these rows')).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(loadRowChildren).toHaveBeenCalledTimes(2);
  });
});
