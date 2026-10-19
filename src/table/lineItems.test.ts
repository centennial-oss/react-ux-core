import { describe, expect, it } from 'vitest';
import { invoiceAdjustments, invoiceItems, invoiceTaxRates } from '../../test/invoice';
import { computeTotals, discountText, parseDiscount, type LineItem } from './lineItems';

describe('computeTotals', () => {
  it('matches a hand-worked invoice of 8 lines, 2 tax rates and a 10% discount to the cent', () => {
    // Line amounts (quantity × price, rounded half-even, less the line's own discount):
    //   l1 2 × 49.99 = 99.98
    //   l2 3 × 12.50 = 37.50
    //   l3 1 × 18.75 = 18.75
    //   l4 4 × 7.33  = 29.32
    //   l5 1.5 × 21.99 = 32.985 → 32.98 (a tie, rounded to the even cent)
    //   l6 2 × 15.45 = 30.90, less 5% (1.545 → 1.54) = 29.36
    //   l7 5 × 3.99  = 19.95
    //   l8 1 × 64.00 = 64.00
    // Subtotal: 331.84.
    //
    // 10% order discount per line: 9.998 → 10.00, 3.75, 1.875 → 1.88, 2.932 → 2.93, 3.298 → 3.30, 2.936 → 2.94,
    // 1.995 → 2.00, 6.40. Discount: 33.20 (not 33.18: rounding is per line).
    //
    // Taxable: l1 89.98, l2 33.75, l3 16.87, l4 26.39, l5 29.68, l6 26.42, l7 17.95, l8 57.60.
    // Sales tax 8.25% (l1, l3, l4, l6, l8): 7.42335 → 7.42, 1.391775 → 1.39, 2.177175 → 2.18, 2.17965 → 2.18,
    //   4.752 → 4.75. Sum 17.92 on 217.26.
    // Reduced 5% (l2, l5, l7): 1.6875 → 1.69, 1.484 → 1.48, 0.8975 → 0.90. Sum 4.07 on 81.38.
    // Tax: 21.99. Total: 331.84 − 33.20 + 21.99 + 9.95 shipping = 330.58.
    const totals = computeTotals(invoiceItems, invoiceTaxRates, invoiceAdjustments);
    expect(totals.lines.map((line) => line.amount)).toEqual([
      '99.98',
      '37.50',
      '18.75',
      '29.32',
      '32.98',
      '29.36',
      '19.95',
      '64.00',
    ]);
    expect(totals.lines.map((line) => line.orderDiscount)).toEqual([
      '10.00',
      '3.75',
      '1.88',
      '2.93',
      '3.30',
      '2.94',
      '2.00',
      '6.40',
    ]);
    expect(totals.lines.map((line) => line.tax)).toEqual([
      '7.42',
      '1.69',
      '1.39',
      '2.18',
      '1.48',
      '2.18',
      '0.90',
      '4.75',
    ]);
    expect(totals.subtotal).toBe('331.84');
    expect(totals.discount).toBe('33.20');
    expect(totals.taxByRate).toEqual([
      {
        rateId: 'std',
        label: 'Sales tax',
        percent: '8.25',
        isInclusive: false,
        taxable: '217.26',
        amount: '17.92',
      },
      {
        rateId: 'red',
        label: 'Reduced rate',
        percent: '5',
        isInclusive: false,
        taxable: '81.38',
        amount: '4.07',
      },
    ]);
    expect(totals.tax).toBe('21.99');
    expect(totals.inclusiveTax).toBe('0.00');
    expect(totals.shipping).toBe('9.95');
    expect(totals.total).toBe('330.58');
  });

  it('takes inclusive tax out of the price instead of adding it', () => {
    const items: LineItem[] = [
      { id: 'a', description: 'Telescope', quantity: '1', unitPrice: '120.00', taxRateId: 'vat' },
      { id: 'b', description: 'Chart', quantity: '1', unitPrice: '10.00', taxRateId: 'vat' },
    ];
    const totals = computeTotals(items, [
      { id: 'vat', label: 'VAT', percent: '20', isInclusive: true },
    ]);
    // 120 × 20 / 120 = 20.00; 10 × 20 / 120 = 1.666… → 1.67.
    expect(totals.lines.map((line) => line.tax)).toEqual(['20.00', '1.67']);
    expect(totals.tax).toBe('21.67');
    expect(totals.inclusiveTax).toBe('21.67');
    expect(totals.total).toBe('130.00');
  });

  it('spreads a fixed order discount across lines in proportion, the last line taking the remainder', () => {
    const items: LineItem[] = ['a', 'b', 'c'].map((id) => ({
      id,
      description: id,
      quantity: '1',
      unitPrice: '1.00',
      taxRateId: 't',
    }));
    const totals = computeTotals(items, [{ id: 't', label: 'Tax', percent: '10' }], {
      discount: { type: 'amount', value: '1.00' },
    });
    expect(totals.lines.map((line) => line.orderDiscount)).toEqual(['0.33', '0.33', '0.34']);
    expect(totals.discount).toBe('1.00');
    // Taxable 0.67, 0.67, 0.66: 10% of each rounds to 0.07.
    expect(totals.tax).toBe('0.21');
    expect(totals.total).toBe('2.21');
  });

  it('rounds to the currency minor units and treats unfinished input as zero', () => {
    const totals = computeTotals(
      [
        { id: 'a', description: 'A', quantity: '3', unitPrice: '333.5' },
        { id: 'b', description: 'B', quantity: '', unitPrice: '100' },
        { id: 'c', description: 'C', quantity: '2', unitPrice: 'abc' },
      ],
      [],
      {},
      { minorUnits: 0 },
    );
    // 1000.5 → 1000 (half to even).
    expect(totals.lines.map((line) => line.amount)).toEqual(['1000', '0', '0']);
    expect(totals.total).toBe('1000');
  });
});

describe('parseDiscount', () => {
  it('reads percentages and amounts', () => {
    expect(parseDiscount('10%')).toEqual({ type: 'percent', value: '10' });
    expect(parseDiscount(' 12.5 % ')).toEqual({ type: 'percent', value: '12.5' });
    expect(parseDiscount('5.00')).toEqual({ type: 'amount', value: '5.00' });
    expect(parseDiscount('')).toBeNull();
    expect(parseDiscount('ten')).toBeUndefined();
    expect(discountText({ type: 'percent', value: '10' })).toBe('10%');
    expect(discountText(undefined)).toBe('');
  });
});
