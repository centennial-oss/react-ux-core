import type { Meta, StoryObj } from '@storybook/react-vite';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  duplicateBins,
  inventoryColumns,
  makeProducts,
  newProduct,
  productId,
} from '../../../test/spreadsheet';
import { Button } from '../../components/Button/Button';
import { downloadCsv } from '../csv';
import type { FilterValues, TableSort } from '../types';
import { spreadsheetToCsv } from './csv';
import { Spreadsheet, type SpreadsheetProps } from './Spreadsheet';
import type { SpreadsheetColumn, SpreadsheetRow } from './types';

const meta = {
  title: 'Table/Spreadsheet',
  component: Spreadsheet,
  parameters: { layout: 'padded' },
  args: {
    rows: [],
    columns: [],
    getRowId: productId,
    editScope: 'all',
    density: 'regular',
    hasToolbar: true,
    hasStatusBar: true,
    maxHeight: '32rem',
  },
  argTypes: {
    editScope: {
      control: 'inline-radio',
      options: ['all', 'data', 'none'],
      description:
        'What users can change: `all` (columns and data), `data` (data only) or `none` (read-only).',
    },
    density: { control: 'inline-radio', options: ['compact', 'regular'] },
    rows: { control: false },
    columns: { control: false },
    getRowId: { control: false },
  },
} satisfies Meta<typeof Spreadsheet>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Holds the rows and columns, as an app would, so edits stick. */
function Sheet({
  initialRows,
  initialColumns = inventoryColumns,
  ...props
}: Partial<SpreadsheetProps> & {
  initialRows: SpreadsheetRow[];
  initialColumns?: SpreadsheetColumn[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [columns, setColumns] = useState(initialColumns);
  return (
    <Spreadsheet
      aria-label="Inventory"
      getRowId={productId}
      newRow={newProduct}
      validate={duplicateBins}
      {...props}
      rows={rows}
      columns={columns}
      onChange={setRows}
      onColumnsChange={setColumns}
    />
  );
}

/**
 * A warehouse inventory of 250 products in typed columns: text with a length limit and a format check, choices, whole
 * numbers with limits, decimals, currency, checkboxes and dates, under colour-coded groups. Use the **editScope**
 * control to switch between editing columns and data (`all`), data only (`data`) and read-only (`none`).
 *
 * Try it: select with click and drag, Shift+click, Shift+arrows, the row numbers or the headers; type to replace a
 * cell, Enter or F2 to edit it, Escape to cancel; Ctrl+C / Ctrl+V with another spreadsheet; Ctrl+D to fill down;
 * Ctrl+Z to undo; Delete to clear. Right-click (or long-press, or Shift+F10) for the cell menu, and use a header's
 * menu to sort, filter, hide or (in `all`) change the column. Drag selected row numbers to move rows. Every 37th
 * product shares the previous one's bin (a check across rows); every 53rd has a badly written bin (the column's own
 * check).
 */
export const Playground: Story = {
  render: (args) => <Sheet {...args} initialRows={makeProducts(250)} />,
};

/** Data only: values and rows change, the columns don't (no column settings, inserts or deletes). */
export const DataOnly: Story = {
  tags: ['!visual'],
  args: { editScope: 'data' },
  render: (args) => <Sheet {...args} initialRows={makeProducts(60)} />,
};

/**
 * Read-only: select, copy, sort, filter, search, hide and resize columns, and open a row (double-click its number),
 * but change nothing. Starts sorted by category, then name, and filtered to active products.
 */
export const ReadOnly: Story = {
  args: {
    editScope: 'none',
    defaultSorting: [
      { column: 'category', direction: 'ascending' },
      { column: 'name', direction: 'ascending' },
    ],
    defaultFilterValues: { active: true },
  },
  render: (args) => <Sheet {...args} initialRows={makeProducts(80)} />,
};

/**
 * 100,000 rows: only the rows and columns in view render, sorting and filtering keep a list of row ids, and undo keeps
 * only what each step changed. Scroll, sort a column, search, or select a column and look at the sum.
 */
export const HundredThousandRows: Story = {
  tags: ['!visual'],
  args: { editScope: 'data', density: 'compact', maxHeight: '36rem' },
  render: function LargeStory(args) {
    const rows = useMemo(() => makeProducts(100_000), []);
    return <Sheet {...args} initialRows={rows} />;
  },
};

/**
 * Columns from scratch: start with one column, then add columns (toolbar or a header's menu), rename and retype them
 * in Column settings (double-click a header), and reorder or delete them. The JSON below is what `onColumnsChange`
 * hands the app; Export CSV uses `spreadsheetToCsv` with `downloadCsv`.
 */
export const BuildAColumnSet: Story = {
  tags: ['!visual'],
  args: { editScope: 'all' },
  render: function SchemaStory(args) {
    const [rows, setRows] = useState<SpreadsheetRow[]>(() =>
      Array.from({ length: 5 }, () => newProduct()),
    );
    const [columns, setColumns] = useState<SpreadsheetColumn[]>([
      { id: 'title', label: 'Title', isRequired: true },
    ]);
    return (
      <div className="flex flex-col gap-3">
        <Spreadsheet
          {...args}
          aria-label="New sheet"
          rows={rows}
          columns={columns}
          getRowId={productId}
          newRow={newProduct}
          onChange={setRows}
          onColumnsChange={setColumns}
          maxHeight="20rem"
        />
        <div className="flex">
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onPress={() => {
              downloadCsv(spreadsheetToCsv(rows, columns), 'sheet.csv');
            }}
          >
            Export CSV
          </Button>
        </div>
        <pre className="max-h-48 overflow-auto rounded-card bg-surface-3 p-3 text-xs">
          {JSON.stringify(columns, null, 2)}
        </pre>
      </div>
    );
  },
};

/** Sorting, filters, search and hidden columns controlled by the app, for example to keep them in the URL. */
export const ControlledView: Story = {
  tags: ['!visual'],
  args: { editScope: 'data' },
  render: function ControlledStory(args) {
    const [sorting, setSorting] = useState<TableSort[]>([
      { column: 'onHand', direction: 'descending' },
    ]);
    const [filterValues, setFilterValues] = useState<FilterValues>({ category: ['electronics'] });
    const [search, setSearch] = useState('');
    const [hidden, setHidden] = useState<Set<string>>(new Set(['notes', 'sku']));
    return (
      <div className="flex flex-col gap-3">
        <Sheet
          {...args}
          initialRows={makeProducts(120)}
          sorting={sorting}
          onSortingChange={setSorting}
          filterValues={filterValues}
          onFilterValuesChange={setFilterValues}
          search={search}
          onSearchChange={setSearch}
          hiddenColumns={hidden}
          onHiddenColumnsChange={setHidden}
        />
        <pre className="rounded-card bg-surface-3 p-3 text-xs">
          {JSON.stringify({ sorting, filterValues, search, hidden: [...hidden] }, null, 2)}
        </pre>
      </div>
    );
  },
};
