import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import {
  invoiceAdjustments,
  invoiceItems,
  invoiceTaxRates,
  loadCatalogue,
} from '../../test/invoice';
import { LineItemsEditor, type LineItemsEditorProps } from './LineItemsEditor';
import type { LineItem, LineItemsAdjustments, TaxRate } from './lineItems';

const meta = {
  title: 'Table/LineItemsEditor',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Invoice({
  initialItems = invoiceItems,
  initialAdjustments = invoiceAdjustments,
  ...props
}: Partial<LineItemsEditorProps> & {
  initialItems?: LineItem[];
  initialAdjustments?: LineItemsAdjustments;
}) {
  const [items, setItems] = useState(initialItems);
  const [adjustments, setAdjustments] = useState(initialAdjustments);
  const next = useRef(0);
  return (
    <LineItemsEditor
      aria-label="Invoice lines"
      items={items}
      onChange={setItems}
      currency="USD"
      taxRates={invoiceTaxRates}
      loadProducts={loadCatalogue}
      adjustments={adjustments}
      onAdjustmentsChange={setAdjustments}
      createId={() => {
        next.current += 1;
        return `line-${String(next.current)}`;
      }}
      {...props}
    />
  );
}

/**
 * An observatory shop invoice: eight lines, two tax rates and a 10% order discount. Type in a description for
 * catalogue suggestions (choosing one fills the price); each line's actions duplicate, move and remove it. The total
 * is announced a moment after it changes, and the editor prints as the invoice view.
 */
export const Editable: Story = {
  render: () => <Invoice />,
};

/** The invoice view: a plain table with row and column headers and the totals in its footer. It prints cleanly. */
export const InvoiceView: Story = {
  render: () => <Invoice isReadOnly />,
};

const vat: TaxRate[] = [
  { id: 'vat', label: 'VAT', percent: '20', isInclusive: true },
  { id: 'vat-reduced', label: 'VAT', percent: '5.5', isInclusive: true },
];

/** Prices that include VAT (the tax is shown as "Includes VAT 20%"), with a discount column and a fixed order discount. */
export const InclusiveTaxAndLineDiscounts: Story = {
  render: () => (
    <Invoice
      currency="EUR"
      taxRates={vat}
      hasLineDiscounts
      loadProducts={undefined}
      initialItems={[
        {
          id: 'a',
          description: 'Refractor, 80 mm',
          quantity: '1',
          unitPrice: '449.00',
          taxRateId: 'vat',
        },
        {
          id: 'b',
          description: 'Star atlas',
          quantity: '2',
          unitPrice: '24.90',
          taxRateId: 'vat-reduced',
          discount: { type: 'percent', value: '15' },
        },
        {
          id: 'c',
          description: 'Dew heater strap',
          quantity: '1',
          unitPrice: '32.00',
          taxRateId: 'vat',
          discount: { type: 'amount', value: '2.00' },
        },
      ]}
      initialAdjustments={{ discount: { type: 'amount', value: '20.00' } }}
    />
  ),
};

/** Values show until a cell is edited (Enter, F2 or a double-click), like EditableTable's default. */
export const CellEditing: Story = {
  render: () => <Invoice editMode="cell" />,
};

/** No lines yet. */
export const Empty: Story = {
  render: () => <Invoice initialItems={[]} initialAdjustments={{}} />,
};
