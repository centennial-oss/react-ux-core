import { render, screen, within } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import {
  invoiceAdjustments,
  invoiceItems,
  invoiceTaxRates,
  loadCatalogue,
} from '../../test/invoice';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import type { EditableTableMessages } from './editableMessages';
import { LineItemsEditor, type LineItemsEditorProps } from './LineItemsEditor';
import type { LineItem, LineItemsAdjustments } from './lineItems';

const isDesktop = navigator.maxTouchPoints === 0;

function Invoice({
  width = 1100,
  onItems,
  onAdjustments,
  ...props
}: Partial<LineItemsEditorProps> & {
  width?: number;
  onItems?: (items: LineItem[]) => void;
  onAdjustments?: (adjustments: LineItemsAdjustments) => void;
}) {
  const [items, setItems] = useState(invoiceItems);
  const [adjustments, setAdjustments] = useState(invoiceAdjustments);
  const next = useRef(0);
  return (
    <div style={{ width, padding: 8 }}>
      <LineItemsEditor
        aria-label="Invoice lines"
        items={items}
        onChange={(value) => {
          setItems(value);
          onItems?.(value);
        }}
        currency="USD"
        taxRates={invoiceTaxRates}
        loadProducts={loadCatalogue}
        adjustments={adjustments}
        onAdjustmentsChange={(value) => {
          setAdjustments(value);
          onAdjustments?.(value);
        }}
        createId={() => {
          next.current += 1;
          return `new-${String(next.current)}`;
        }}
        {...props}
      />
    </div>
  );
}

function totalsText() {
  const totals = screen.getByRole('region', { name: 'Totals' });
  return [...totals.querySelectorAll('dt')].map(
    (term) => `${term.textContent}: ${term.nextElementSibling?.textContent ?? ''}`,
  );
}

function overrides(messages: Partial<EditableTableMessages>): Partial<Messages> {
  return messages;
}

describe('LineItemsEditor', () => {
  it('shows line amounts and totals matching the reference to the cent', async () => {
    render(<Invoice />);
    const grid = await screen.findByRole('grid', { name: 'Invoice lines' });
    expect(within(grid).getAllByRole('row')).toHaveLength(9);
    expect(within(grid).getByText('$29.36')).toBeInTheDocument();
    expect(totalsText()).toEqual([
      'Subtotal: $331.84',
      'Discount (10%): -$33.20',
      'Sales tax 8.25%: $17.92',
      'Reduced rate 5%: $4.07',
      'Shipping: $9.95',
      'Total: $330.58',
    ]);
    expect(screen.getByRole('combobox', { name: 'Description, Planisphere' })).toHaveValue(
      'Planisphere',
    );
  });

  it('shows a read-only invoice with row and column headers', async () => {
    const { container } = render(<Invoice isReadOnly />);
    const table = screen.getByRole('table', { name: 'Invoice lines' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['Description', 'Quantity', 'Unit price', 'Tax', 'Amount']);
    const rowHeaders = within(table)
      .getAllByRole('rowheader')
      .map((header) => header.firstChild?.textContent);
    expect(rowHeaders.slice(0, 2)).toEqual(['Eyepiece, 25 mm', 'Star atlas']);
    expect(rowHeaders.slice(-2)).toEqual(['Shipping', 'Total']);
    const total = within(table).getByRole('rowheader', { name: 'Total' }).closest('tr');
    expect(total?.textContent).toEqual(expect.stringContaining('$330.58'));
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('folds the tax column into the description on a narrow invoice, keeping the totals aligned', async () => {
    const { container } = render(<Invoice isReadOnly width={340} />);
    const table = screen.getByRole('table', { name: 'Invoice lines' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['Description', 'Quantity', 'Unit price', 'Amount']);
    expect(within(table).getAllByText('Sales tax 8.25%')[0]).toBeVisible();
    const total = within(table).getByRole('rowheader', { name: 'Total' });
    expect(total).toHaveAttribute('colspan', '3');
    expect(table.getBoundingClientRect().width).toBeLessThanOrEqual(340);
    await expectNoAxeViolations(container);
  });

  it.skipIf(!isDesktop)(
    'adds a line from the catalogue, fills the price and announces the new total',
    async () => {
      const onItems = vi.fn<(items: LineItem[]) => void>();
      render(<Invoice onItems={onItems} />);
      await screen.findByRole('grid');
      await userEvent.click(screen.getByRole('button', { name: 'Add line' }));
      const input = screen.getByRole('combobox', { name: 'Description, Line 9' });
      await expect.poll(() => document.activeElement).toBe(input);
      await userEvent.keyboard('solar');
      const option = await screen.findByRole('option', { name: /Solar filter, 80 mm/ });
      await userEvent.click(option);
      await expect
        .poll(() => onItems.mock.lastCall?.[0].at(-1))
        .toEqual(
          expect.objectContaining({
            id: 'new-1',
            description: 'Solar filter, 80 mm',
            unitPrice: '72.00',
            taxRateId: 'std',
          }),
        );
      // 72.00 less 10% (7.20) is 64.80 taxed at 8.25% (5.346 → 5.35): 330.58 + 72.00 − 7.20 + 5.35.
      await expect.poll(() => totalsText().at(-1)).toBe('Total: $400.73');
      await expect
        .poll(() => screen.queryByText('Total $400.73'), { timeout: 3000 })
        .toBeInTheDocument();
    },
  );

  it.skipIf(!isDesktop)('duplicates a line and edits the order discount', async () => {
    const onAdjustments = vi.fn<(adjustments: LineItemsAdjustments) => void>();
    render(<Invoice onAdjustments={onAdjustments} />);
    await screen.findByRole('grid');
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Star atlas' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Duplicate' }));
    await expect
      .poll(() => screen.getAllByRole('combobox', { name: /Star atlas/ }))
      .toHaveLength(2);
    // 37.50 more, before the 10% discount (3.75) and 5% tax on 33.75 (1.69).
    await expect.poll(() => totalsText()[0]).toBe('Subtotal: $369.34');

    const discount = screen.getByRole('textbox', { name: 'Discount' });
    await userEvent.tripleClick(discount);
    await userEvent.keyboard('5%{Enter}');
    expect(onAdjustments).toHaveBeenLastCalledWith({
      discount: { type: 'percent', value: '5' },
      shipping: '9.95',
    });
    await userEvent.tripleClick(discount);
    await userEvent.keyboard('lots{Tab}');
    expect(discount).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a card per line in a narrow container, with no axe violations', async () => {
    const { container } = render(<Invoice width={340} />);
    const list = await screen.findByRole('list', { name: 'Invoice lines' });
    expect(list.querySelectorAll(':scope > li')).toHaveLength(8);
    expect(screen.getByRole('textbox', { name: 'Unit price, Moon filter' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('has no axe violations as a grid, and reads strings from UIProvider', async () => {
    const { container } = render(
      <UIProvider messages={overrides({ lineItemsTotal: 'Amount due' })}>
        <Invoice />
      </UIProvider>,
    );
    await screen.findByRole('grid');
    expect(totalsText().at(-1)).toBe('Amount due: $330.58');
    await expectNoAxeViolations(container);
  });
});
