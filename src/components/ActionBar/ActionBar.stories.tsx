import type { Meta, StoryObj } from '@storybook/react-vite';
import { Archive, Download, FolderInput, Tag, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { columnsFor } from '../../table/columns';
import { DataTable } from '../../table/DataTable';
import { Button } from '../Button/Button';
import type { ToolbarItem } from '../Toolbar/Toolbar';
import { ActionBar } from './ActionBar';

const ITEMS: ToolbarItem[] = [
  { id: 'archive', label: 'Archive', icon: Archive, priority: 2 },
  { id: 'move', label: 'Move', icon: FolderInput, priority: 1 },
  { id: 'label', label: 'Label', icon: Tag },
  { id: 'assign', label: 'Assign', icon: UserPlus },
  { id: 'export', label: 'Export', icon: Download },
  { id: 'delete', label: 'Delete', icon: Trash2, tone: 'danger', priority: 2, group: 'Delete' },
];

const meta = {
  title: 'Actions/ActionBar',
  component: ActionBar,
  args: { selectedCount: 3, onClearSelection: () => undefined, items: ITEMS },
} satisfies Meta<typeof ActionBar>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The count, the clear button and the actions. Actions that don't fit move into "More actions". */
export const Basic: Story = {};

/** On a narrow screen most actions move into the menu; the highest priorities (Archive, Delete) stay longest. */
export const Narrow: Story = {
  render: (args) => (
    <div className="max-w-full" style={{ width: 340 }}>
      <ActionBar {...args} selectedCount={12} />
    </div>
  ),
};

/** Extra controls in `children` stay in the bar beside the overflowing items. */
export const WithChildren: Story = {
  args: { items: ITEMS.slice(0, 3) },
  render: (args) => (
    <ActionBar {...args}>
      <Button size="md" variant="soft" tone="accent">
        Select all 240
      </Button>
    </ActionBar>
  ),
};

interface Invoice {
  id: string;
  customer: string;
  amount: number;
  status: string;
}

const customers = ['Acme Corp', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Stark Industries'];
const invoices: Invoice[] = Array.from({ length: 12 }, (_, index) => ({
  id: `INV-${String(1040 + index)}`,
  customer: customers[index % customers.length] ?? '',
  amount: ((index * 7919) % 900000) / 100 + 50,
  status: ['Draft', 'Sent', 'Paid', 'Overdue'][index % 4] ?? '',
}));
const col = columnsFor<Invoice>();
const columns = [
  col.field('id', { header: 'Invoice', isRowHeader: true }),
  col.field('customer', { header: 'Customer', mobile: 'subtitle' }),
  col.field('status', { header: 'Status', mobile: true }),
  col.field('amount', { header: 'Amount', align: 'end' }),
];

/**
 * With DataTable selection: select rows and the bar slides in below the table, sticking to the bottom of the view
 * while the table scrolls past. Escape in the bar, or its clear button, clears the selection; actions run on the
 * selected rows.
 */
export const WithDataTable: Story = {
  tags: ['!visual'],
  render: function WithDataTableStory() {
    const [rows, setRows] = useState(invoices);
    const [selected, setSelected] = useState<ReadonlySet<string>>(
      new Set(['INV-1041', 'INV-1043']),
    );
    const [log, setLog] = useState('');
    return (
      <div className="flex flex-col gap-3">
        <DataTable<Invoice>
          aria-label="Invoices"
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          selectionMode="multiple"
          selectedKeys={selected}
          onSelectionChange={setSelected}
        />
        <p className="text-sm text-fg-muted" aria-live="polite">
          {log}
        </p>
        <ActionBar
          selectedCount={selected.size}
          onClearSelection={() => {
            setSelected(new Set());
          }}
          items={ITEMS}
          onAction={(key) => {
            if (key === 'delete') {
              setRows(rows.filter((row) => !selected.has(row.id)));
              setSelected(new Set());
            }
            setLog(`${String(key)}: ${[...selected].join(', ')}`);
          }}
        />
      </div>
    );
  },
};
