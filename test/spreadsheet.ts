// A warehouse inventory of products: the Spreadsheet fixture shared by its stories and tests. Rows are generated from
// a seed, so every run (and every visual snapshot) gets the same sheet. Sample data only.
import type {
  SpreadsheetColumn,
  SpreadsheetErrors,
  SpreadsheetRow,
} from '../src/table/spreadsheet/types';

const BIN = /^[A-Z]-\d{2}-\d{2}$/;

export const inventoryColumns: SpreadsheetColumn[] = [
  { id: 'sku', label: 'SKU', group: 'Product', width: '104px', isReadOnly: true },
  { id: 'name', label: 'Name', group: 'Product', width: '200px', isRequired: true, maxLength: 32 },
  {
    id: 'category',
    label: 'Category',
    type: 'enum',
    group: 'Product',
    options: [
      { id: 'furniture', label: 'Furniture' },
      { id: 'electronics', label: 'Electronics' },
      { id: 'stationery', label: 'Stationery' },
      { id: 'kitchen', label: 'Kitchen' },
    ],
  },
  {
    id: 'unit',
    label: 'Unit',
    type: 'enum',
    group: 'Product',
    width: '88px',
    options: [
      { id: 'each', label: 'Each' },
      { id: 'box', label: 'Box' },
      { id: 'pack', label: 'Pack' },
    ],
  },
  {
    id: 'bin',
    label: 'Bin',
    group: 'Stock',
    width: '96px',
    maxLength: 7,
    validate: (value) =>
      typeof value === 'string' && !BIN.test(value)
        ? 'Use aisle-rack-shelf, such as C-04-02'
        : undefined,
  },
  {
    id: 'onHand',
    label: 'On hand',
    type: 'number',
    group: 'Stock',
    width: '96px',
    minValue: 0,
    maxValue: 9999,
    step: 1,
  },
  {
    id: 'weight',
    label: 'Weight (kg)',
    type: 'number',
    group: 'Stock',
    minValue: 0,
    formatOptions: { maximumFractionDigits: 2 },
  },
  { id: 'active', label: 'Active', type: 'boolean', group: 'Sales', width: '88px' },
  { id: 'lastOrdered', label: 'Last ordered', type: 'date', group: 'Sales' },
  {
    id: 'price',
    label: 'Unit price',
    type: 'number',
    group: 'Sales',
    minValue: 0,
    formatOptions: { style: 'currency', currency: 'USD' },
  },
  { id: 'notes', label: 'Notes', width: '220px' },
];

/** Product names with their category and usual unit. */
const PRODUCTS: readonly [name: string, category: string, unit: string][] = [
  ['Office chair', 'furniture', 'each'],
  ['Standing desk', 'furniture', 'each'],
  ['Bookshelf', 'furniture', 'each'],
  ['Filing cabinet', 'furniture', 'each'],
  ['Monitor arm', 'electronics', 'each'],
  ['USB-C cable', 'electronics', 'pack'],
  ['Wireless mouse', 'electronics', 'each'],
  ['Keyboard', 'electronics', 'each'],
  ['Desk lamp', 'electronics', 'each'],
  ['Notebook', 'stationery', 'pack'],
  ['Gel pens', 'stationery', 'box'],
  ['Sticky notes', 'stationery', 'pack'],
  ['Stapler', 'stationery', 'each'],
  ['Coffee mug', 'kitchen', 'box'],
  ['Water bottle', 'kitchen', 'each'],
  ['Paper towels', 'kitchen', 'pack'],
];
const VARIANTS = ['black', 'white', 'grey', 'blue', 'large', 'small', 'compact', 'recycled'];
const NOTES = ['', '', '', 'Fragile', 'Seasonal', 'Check supplier', 'Discontinue soon', ''];

/** A small seeded random generator (mulberry32), so generated sheets are the same every time. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `count` products with ids `p1`, `p2`, …. Every 37th product shares the previous one's bin (a problem
 * `duplicateBins` finds), and every 53rd has a bin that isn't written aisle-rack-shelf (a problem the column's own
 * check finds).
 */
export function makeProducts(count: number, seed = 7): SpreadsheetRow[] {
  const random = seeded(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;
  const rows: SpreadsheetRow[] = [];
  for (let number = 1; number <= count; number++) {
    const [name, category, unit] = pick(PRODUCTS);
    const day = 1 + Math.floor(random() * 28);
    const month = 1 + Math.floor(random() * 12);
    // Bins fill in order (aisle A–Z, racks and shelves 01–99), so each product has its own.
    const place = number - 1;
    const aisle = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(place / 9801) % 26] ?? 'A';
    const rack = String((Math.floor(place / 99) % 99) + 1).padStart(2, '0');
    const shelf = String((place % 99) + 1).padStart(2, '0');
    const previous = rows.at(-1);
    let bin = `${aisle}-${rack}-${shelf}`;
    if (number % 37 === 0 && previous) {
      bin = String(previous.bin);
    } else if (number % 53 === 0) {
      bin = `${aisle}${rack}-${shelf}`;
    }
    rows.push({
      id: `p${String(number)}`,
      sku: `SKU-${String(number).padStart(5, '0')}`,
      name: `${name}, ${pick(VARIANTS)}`,
      category,
      unit,
      bin,
      onHand: Math.floor(random() * 400),
      weight: Math.round((0.1 + random() * 24) * 100) / 100,
      active: random() > 0.15,
      lastOrdered: `202${String(3 + Math.floor(random() * 4))}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      price: Math.round((2 + random() * 600) * 100) / 100,
      notes: pick(NOTES) || null,
    });
  }
  return rows;
}

/** Product ids are kept on each row under `id` (not a column). */
export function productId(row: SpreadsheetRow): string {
  return String(row.id);
}

let nextProduct = 1_000_000;

/** A new, empty product with a fresh id. */
export function newProduct(): SpreadsheetRow {
  nextProduct++;
  return { id: `new-${String(nextProduct)}`, active: false };
}

/** Flags products stored in the same bin as an earlier product (a check across rows). */
export function duplicateBins(rows: readonly SpreadsheetRow[]): SpreadsheetErrors {
  const seen = new Map<string, string>();
  const errors: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    if (typeof row.bin !== 'string' || row.bin === '') {
      continue;
    }
    const first = seen.get(row.bin);
    if (first === undefined) {
      seen.set(row.bin, String(row.sku));
    } else {
      errors[productId(row)] = { bin: `Bin already holds ${first}` };
    }
  }
  return errors;
}
