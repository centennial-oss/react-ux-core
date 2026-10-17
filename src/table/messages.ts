// English defaults of the table entry point's strings (see `Messages` in provider/messages.ts).
import { useEntryMessages } from '../provider/context';
import type { CoreMessages, TableMessages } from '../provider/messages';
import { defaultEditableTableMessages, type EditableTableMessages } from './editableMessages';
import { defaultFlowsheetMessages, type FlowsheetMessages } from './flowsheetMessages';

export const defaultTableMessages: TableMessages = {
  sortedBy: ({ column, direction }) => `Sorted by ${column}, ${direction}`,
  notSorted: 'Not sorted',
  selectAllRows: 'Select all rows on this page',
  selectRow: ({ row }) => `Select ${row}`,
  selectedCount: ({ count }) => `${count} selected`,
  clearSelection: 'Clear selection',
  select: 'Select',
  search: 'Search',
  showRowDetails: ({ row }) => `Details for ${row}`,
  rowActions: ({ row }) => `Actions for ${row}`,
  previousPage: 'Previous page',
  nextPage: 'Next page',
  rowsPerPage: 'Rows per page',
  rowRange: ({ start, end, total }) => `${start}–${end} of ${total}`,
  approximateRows: ({ total }) => `About ${total} rows`,
  rowCount: ({ count }) => (count === 1 ? '1 row' : `${count} rows`),
  updating: 'Updating',
  columns: 'Columns',
  exportPage: 'This page as CSV',
  exportAll: 'All rows as CSV',
  filters: 'Filters',
  filterAndSort: 'Filter & sort',
  resultSummary: ({ label, count }) => `${label} · ${count}`,
  any: 'Any',
  minimum: 'Minimum',
  maximum: 'Maximum',
  noMatchingRows: 'No matching rows',
};

/** The strings `/table` components read: the core strings and `/table`'s own. */
export type TableStrings = CoreMessages & TableMessages;

/** Every `/table` string, with EditableTable's, LineItemsEditor's and Flowsheet's. */
export type TableEntryStrings = TableStrings & EditableTableMessages & FlowsheetMessages;

/** Every `/table` default, made once so the merged strings stay memoised. */
const defaults: TableMessages & EditableTableMessages & FlowsheetMessages = {
  ...defaultTableMessages,
  ...defaultEditableTableMessages,
  ...defaultFlowsheetMessages,
};

/** `/table`'s strings, with the app's overrides from `UIProvider`. */
export function useTableMessages(): TableEntryStrings {
  return useEntryMessages(defaults);
}
