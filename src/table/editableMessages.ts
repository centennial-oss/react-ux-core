// English defaults of `/table`'s strings for EditableTable (FR-030) and LineItemsEditor (FR-051). They merge into
// `useTableMessages()`, so apps override them through `UIProvider`'s `messages` like any other table string.

/** Strings for EditableTable and LineItemsEditor. */
export interface EditableTableMessages {
  /** A row's name when the table has no `getRowLabel` ("Row 3"). */
  editableRow: (params: { index: number }) => string;
  /** An editor's accessible name: its column and row ("Exposure, Rung 3"). */
  editableCell: (params: { column: string; row: string }) => string;
  /** How to use the grid, read with the table. */
  editableInstructions: string;
  /** The add-row button. */
  editableAddRow: string;
  /** Beside the add-row button once the table is full. */
  editableMaxRows: (params: { max: number }) => string;
  /** A required cell left empty. */
  editableRequired: (params: { column: string }) => string;
  /** The heading of the error summary above the table, also announced when the count changes. */
  editableErrorCount: (params: { count: number }) => string;
  /** One error in the summary: its row, column and message. */
  editableErrorItem: (params: { row: string; column: string; message: string }) => string;
  /** The duplicate-row action in a row's menu. */
  editableDuplicate: string;
  /** A phone card's duplicate button ("Duplicate Rung 3"). */
  editableDuplicateRow: (params: { row: string }) => string;
  /** A phone card's remove button ("Remove Rung 3"). */
  editableRemoveRow: (params: { row: string }) => string;
  /** Announced after a row is added. */
  editableRowAdded: (params: { row: string }) => string;
  /** Announced after a row is removed. */
  editableRowRemoved: (params: { row: string }) => string;
  /** Announced after a row is duplicated. */
  editableRowDuplicated: (params: { row: string }) => string;
  /** LineItemsEditor: the table's name. */
  lineItems: string;
  /** A line's name when it has no description ("Line 3"). */
  lineItemsLine: (params: { index: number }) => string;
  lineItemsDescription: string;
  lineItemsQuantity: string;
  lineItemsUnitPrice: string;
  lineItemsTax: string;
  /** The tax select's option for an untaxed line. */
  lineItemsNoTax: string;
  lineItemsDiscount: string;
  /** Help for the discount fields: a percentage or an amount. */
  lineItemsDiscountHint: string;
  /** The line amount column. */
  lineItemsAmount: string;
  /** The add-line button. */
  lineItemsAddLine: string;
  /** The totals block's name. */
  lineItemsTotals: string;
  lineItemsSubtotal: string;
  lineItemsShipping: string;
  lineItemsTotal: string;
  /** A tax rate's row in the totals ("Sales tax 8.25%"). */
  lineItemsTaxRate: (params: { label: string; percent: string }) => string;
  /** An inclusive tax rate's row: the tax is already in the prices ("Includes VAT 20%"). */
  lineItemsTaxIncluded: (params: { label: string; percent: string }) => string;
  /** A percentage discount in the totals ("Discount (10%)"). */
  lineItemsDiscountPercent: (params: { percent: string }) => string;
  /** Announced (debounced) when the total changes. */
  lineItemsTotalChanged: (params: { total: string }) => string;
  /** A quantity that isn't a number of zero or more. */
  lineItemsInvalidQuantity: string;
  /** A unit price that isn't an amount. */
  lineItemsInvalidPrice: string;
  /** A discount that isn't a percentage or an amount. */
  lineItemsInvalidDiscount: string;
}

export const defaultEditableTableMessages: EditableTableMessages = {
  editableRow: ({ index }) => `Row ${String(index)}`,
  editableCell: ({ column, row }) => `${column}, ${row}`,
  editableInstructions:
    'Use the arrow keys to move between cells. Press Enter to edit a cell, Escape to cancel, and Tab to move to the next cell while editing.',
  editableAddRow: 'Add row',
  editableMaxRows: ({ max }) => `Up to ${String(max)} rows`,
  editableRequired: ({ column }) => `${column} is required`,
  editableErrorCount: ({ count }) =>
    count === 1 ? '1 problem to fix' : `${String(count)} problems to fix`,
  editableErrorItem: ({ row, column, message }) => `${row}, ${column}: ${message}`,
  editableDuplicate: 'Duplicate',
  editableDuplicateRow: ({ row }) => `Duplicate ${row}`,
  editableRemoveRow: ({ row }) => `Remove ${row}`,
  editableRowAdded: ({ row }) => `${row} added`,
  editableRowRemoved: ({ row }) => `${row} removed`,
  editableRowDuplicated: ({ row }) => `${row} duplicated`,
  lineItems: 'Line items',
  lineItemsLine: ({ index }) => `Line ${String(index)}`,
  lineItemsDescription: 'Description',
  lineItemsQuantity: 'Quantity',
  lineItemsUnitPrice: 'Unit price',
  lineItemsTax: 'Tax',
  lineItemsNoTax: 'No tax',
  lineItemsDiscount: 'Discount',
  lineItemsDiscountHint: 'A percentage such as 10% or an amount such as 5.00',
  lineItemsAmount: 'Amount',
  lineItemsAddLine: 'Add line',
  lineItemsTotals: 'Totals',
  lineItemsSubtotal: 'Subtotal',
  lineItemsShipping: 'Shipping',
  lineItemsTotal: 'Total',
  lineItemsTaxRate: ({ label, percent }) => `${label} ${percent}%`,
  lineItemsTaxIncluded: ({ label, percent }) => `Includes ${label} ${percent}%`,
  lineItemsDiscountPercent: ({ percent }) => `Discount (${percent}%)`,
  lineItemsTotalChanged: ({ total }) => `Total ${total}`,
  lineItemsInvalidQuantity: 'Enter a quantity of zero or more',
  lineItemsInvalidPrice: 'Enter an amount such as 12.50',
  lineItemsInvalidDiscount: 'Enter a percentage such as 10% or an amount such as 5.00',
};
