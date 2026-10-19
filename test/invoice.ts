// An observatory shop invoice: the LineItemsEditor fixture shared by its stories and tests. Eight lines, two tax
// rates (8.25% and a reduced 5%) and a 10% order discount; the expected totals are worked out by hand in
// src/table/lineItems.test.ts.
import type { CatalogueProduct } from '../src/table/LineItemsEditor';
import type { LineItem, LineItemsAdjustments, TaxRate } from '../src/table/lineItems';

export const invoiceTaxRates: TaxRate[] = [
  { id: 'std', label: 'Sales tax', percent: '8.25' },
  { id: 'red', label: 'Reduced rate', percent: '5' },
];

export const invoiceItems: LineItem[] = [
  { id: 'l1', description: 'Eyepiece, 25 mm', quantity: '2', unitPrice: '49.99', taxRateId: 'std' },
  { id: 'l2', description: 'Star atlas', quantity: '3', unitPrice: '12.50', taxRateId: 'red' },
  { id: 'l3', description: 'Red flashlight', quantity: '1', unitPrice: '18.75', taxRateId: 'std' },
  {
    id: 'l4',
    description: 'Lens cleaning kit',
    quantity: '4',
    unitPrice: '7.33',
    taxRateId: 'std',
  },
  { id: 'l5', description: 'Planisphere', quantity: '1.5', unitPrice: '21.99', taxRateId: 'red' },
  {
    id: 'l6',
    description: 'Moon filter',
    quantity: '2',
    unitPrice: '15.45',
    taxRateId: 'std',
    discount: { type: 'percent', value: '5' },
  },
  { id: 'l7', description: 'Observing log', quantity: '5', unitPrice: '3.99', taxRateId: 'red' },
  { id: 'l8', description: 'Tripod adapter', quantity: '1', unitPrice: '64.00', taxRateId: 'std' },
];

export const invoiceAdjustments: LineItemsAdjustments = {
  discount: { type: 'percent', value: '10' },
  shipping: '9.95',
};

export const catalogue: CatalogueProduct[] = [
  { id: 'p-barlow', label: 'Barlow lens, 2×', unitPrice: '39.00' },
  { id: 'p-eyepiece-10', label: 'Eyepiece, 10 mm', unitPrice: '54.50' },
  { id: 'p-eyepiece-25', label: 'Eyepiece, 25 mm', unitPrice: '49.99' },
  { id: 'p-filter-moon', label: 'Moon filter', unitPrice: '15.45' },
  { id: 'p-filter-solar', label: 'Solar filter, 80 mm', unitPrice: '72.00' },
  { id: 'p-atlas', label: 'Star atlas', unitPrice: '12.50' },
  { id: 'p-dew', label: 'Dew heater strap', unitPrice: '28.25' },
];

/** Catalogue search: products whose label contains the query, resolved at once (deterministic, no network). */
export function loadCatalogue(query: string, signal: AbortSignal): Promise<CatalogueProduct[]> {
  if (signal.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }
  const text = query.trim().toLowerCase();
  return Promise.resolve(
    catalogue.filter((product) => text === '' || product.label.toLowerCase().includes(text)),
  );
}
