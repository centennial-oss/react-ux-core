import { describe, expect, it } from 'vitest';
import { inventoryColumns, makeProducts, productId } from '../../../test/spreadsheet';
import { defaultMessages } from '../../provider/messages';
import { defaultTableMessages } from '../messages';
import { parseTsv, toTsv } from './clipboard';
import { optionsFromText } from './ColumnSettingsDialog';
import { spreadsheetToCsv } from './csv';
import { columnAt, columnOffsets, widthInPixels } from './geometry';
import { applyRowChange, invertEntry, SheetHistory, type HistoryEntry } from './history';
import { defaultSpreadsheetMessages, type SpreadsheetStrings } from './messages';
import { clampSelection, selectionBounds } from './selection';
import type { SpreadsheetColumn, SpreadsheetRow } from './types';
import {
  columnFormat,
  matchesFilter,
  parseBoolean,
  parseDate,
  parseForColumn,
  parseNumber,
  type ColumnFormat,
} from './values';
import { computeView, isViewActive } from './view';

const messages: SpreadsheetStrings = {
  ...defaultMessages,
  ...defaultTableMessages,
  ...defaultSpreadsheetMessages,
};
const collator = new Intl.Collator('en-US', { numeric: true, sensitivity: 'base' });
const format = (column: SpreadsheetColumn, locale = 'en-US') =>
  columnFormat(column, locale, messages, collator);
const formats = new Map(inventoryColumns.map((column) => [column.id, format(column)]));
const formatOf = (id: string): ColumnFormat => {
  const found = formats.get(id);
  if (!found) {
    throw new Error(`No column ${id}`);
  }
  return found;
};

describe('parsing by type', () => {
  it('reads numbers as typed in the locale, with currency, grouping, percent and accounting negatives', () => {
    expect(parseNumber('1234.5', 'en-US')).toBe(1234.5);
    expect(parseNumber('1,234.5', 'en-US')).toBe(1234.5);
    expect(parseNumber('$1,234.50', 'en-US')).toBe(1234.5);
    expect(parseNumber('(12.50)', 'en-US')).toBe(-12.5);
    expect(parseNumber('1.234,5', 'de-DE')).toBe(1234.5);
    expect(parseNumber('1 234,5 €', 'fr-FR')).toBe(1234.5);
    expect(parseNumber('12%', 'en-US', true)).toBeCloseTo(0.12);
    expect(parseNumber('-3e2', 'en-US')).toBe(-300);
    expect(parseNumber('fast', 'en-US')).toBeNull();
    expect(parseNumber('1.2.3', 'en-US')).toBeNull();
  });

  it('reads ISO, locale-ordered and written dates, and rejects impossible ones', () => {
    expect(parseDate('2026-10-17', 'en-US')).toBe('2026-10-17');
    expect(parseDate('2026-2-3', 'en-US')).toBe('2026-02-03');
    expect(parseDate('10/17/2026', 'en-US')).toBe('2026-10-17');
    expect(parseDate('17.10.2026', 'de-DE')).toBe('2026-10-17');
    expect(parseDate('17/10/26', 'en-GB')).toBe('2026-10-17');
    expect(parseDate('Oct 17, 2026', 'en-US')).toBe('2026-10-17');
    expect(parseDate('2026-02-30', 'en-US')).toBeNull();
    expect(parseDate('13/45/2026', 'en-US')).toBeNull();
    expect(parseDate('soon', 'en-US')).toBeNull();
  });

  it('reads checkboxes from common words and the locale yes and no', () => {
    for (const word of ['true', 'YES', 'y', '1', 'x', '✓', 'Ja']) {
      expect(parseBoolean(word, 'Ja', 'Nein')).toBe(true);
    }
    for (const word of ['false', 'no', '0', '', 'nein']) {
      expect(parseBoolean(word, 'Ja', 'Nein')).toBe(false);
    }
    expect(parseBoolean('maybe', 'Yes', 'No')).toBeNull();
  });

  it('parses and checks typed text against each column (type, limits, choices, its own check)', () => {
    const row: SpreadsheetRow = {};
    const parse = (id: string, text: string) => parseForColumn(formatOf(id), text, row);
    expect(parse('onHand', '1,250')).toEqual({ value: 1250 });
    expect(parse('onHand', '12.5')).toEqual({ error: 'Enter a whole number' });
    expect(parse('onHand', '12000')).toEqual({ error: 'Must be 9,999 or less' });
    expect(parse('onHand', '-1')).toEqual({ error: 'Must be 0 or more' });
    expect(parse('onHand', 'abc')).toEqual({ error: 'Enter a number' });
    expect(parse('onHand', '')).toEqual({ value: null });
    expect(parse('category', 'kitchen')).toEqual({ value: 'kitchen' });
    expect(parse('category', 'ELECTRONICS')).toEqual({ value: 'electronics' });
    expect(parse('category', 'Toys')).toEqual({
      error: 'Choose one of: Furniture, Electronics, Stationery, Kitchen',
    });
    expect(parse('name', 'x'.repeat(33))).toEqual({ error: 'Use 32 characters or fewer' });
    expect(parse('bin', 'C-04-02')).toEqual({ value: 'C-04-02' });
    expect(parse('bin', 'C4-2')).toEqual({ error: 'Use aisle-rack-shelf, such as C-04-02' });
    expect(parse('active', 'yes')).toEqual({ value: true });
    expect(parse('active', 'perhaps')).toEqual({ error: 'Enter yes or no' });
    expect(parse('lastOrdered', '3/4/2026')).toEqual({ value: '2026-03-04' });
    expect(parse('price', '$1,200.00')).toEqual({ value: 1200 });
    const stepped = format({ id: 'q', label: 'Q', type: 'number', minValue: 1, step: 0.5 });
    expect(parseForColumn(stepped, '2.5', row)).toEqual({ value: 2.5 });
    expect(parseForColumn(stepped, '2.25', row)).toEqual({ error: 'Must be a multiple of 0.5' });
  });

  it('flags values already in the sheet that are empty-but-required or of the wrong type', () => {
    const row: SpreadsheetRow = {};
    expect(formatOf('name').check(null, row)).toBe('Required');
    expect(formatOf('name').check('Stapler', row)).toBeUndefined();
    expect(formatOf('onHand').check('12', row)).toBe('Enter a number');
    expect(formatOf('lastOrdered').check('2026-13-01', row)).toBe(
      'Enter a date, such as 2026-10-17',
    );
    expect(formatOf('category').check('toys', row)).toBe(
      'Choose one of: Furniture, Electronics, Stationery, Kitchen',
    );
    expect(formatOf('active').check(false, row)).toBeUndefined();
    expect(formatOf('notes').check(null, row)).toBeUndefined();
  });

  it('shows, edits and copies values in a way that reads back', () => {
    expect(formatOf('price').display(1234.5)).toBe('$1,234.50');
    expect(formatOf('price').edit(1234.5)).toBe('1234.5');
    expect(formatOf('onHand').display(1250)).toBe('1,250');
    expect(formatOf('weight').display(2.345)).toBe('2.35');
    expect(formatOf('lastOrdered').display('2026-10-17')).toBe('Oct 17, 2026');
    expect(formatOf('category').display('kitchen')).toBe('Kitchen');
    expect(formatOf('active').copy(true)).toBe('TRUE');
    expect(format({ id: 'n', label: 'N', type: 'number' }, 'de-DE').edit(1234.5)).toBe('1234,5');
    for (const id of ['price', 'lastOrdered', 'category', 'active', 'onHand', 'weight', 'bin']) {
      const columnFormat = formatOf(id);
      const value = makeProducts(1)[0]?.[id] ?? null;
      expect(columnFormat.parse(columnFormat.copy(value))).toEqual({ value });
    }
  });
});

describe('filters and the view', () => {
  const rows = makeProducts(200);

  it('matches each column type against its filter value', () => {
    expect(matchesFilter(formatOf('name'), 'Desk lamp, oak', 'LAMP')).toBe(true);
    expect(matchesFilter(formatOf('name'), 'Stapler, blue', 'lamp')).toBe(false);
    expect(matchesFilter(formatOf('onHand'), 10, { min: 5, max: 10 })).toBe(true);
    expect(matchesFilter(formatOf('onHand'), 12, { max: 10 })).toBe(false);
    expect(matchesFilter(formatOf('onHand'), null, { min: 1 })).toBe(false);
    expect(
      matchesFilter(formatOf('lastOrdered'), '2025-06-01', {
        start: '2025-01-01',
        end: '2025-12-31',
      }),
    ).toBe(true);
    expect(matchesFilter(formatOf('active'), null, false)).toBe(true);
    expect(matchesFilter(formatOf('category'), 'kitchen', ['kitchen', 'furniture'])).toBe(true);
    expect(matchesFilter(formatOf('category'), 'electronics', ['kitchen'])).toBe(false);
  });

  it('is inactive without criteria, so it costs nothing', () => {
    expect(isViewActive({ search: ' ', filterValues: {}, sorting: [] }, formats)).toBe(false);
    expect(isViewActive({ search: '', filterValues: { category: [] }, sorting: [] }, formats)).toBe(
      false,
    );
    expect(
      isViewActive(
        { search: '', filterValues: {}, sorting: [{ column: 'gone', direction: 'ascending' }] },
        formats,
      ),
    ).toBe(false);
    expect(isViewActive({ search: 'x', filterValues: {}, sorting: [] }, formats)).toBe(true);
  });

  it('filters, searches the visible columns, and sorts by several columns with empty values last', () => {
    const search = [...formats.values()];
    const ids = computeView(rows, productId, formats, search, {
      search: '',
      filterValues: { category: ['stationery', 'kitchen'], active: true },
      sorting: [
        { column: 'category', direction: 'descending' },
        { column: 'weight', direction: 'ascending' },
      ],
    });
    const byId = new Map(rows.map((row) => [productId(row), row]));
    const shown = ids
      .map((id) => byId.get(id))
      .filter((row): row is SpreadsheetRow => row !== undefined);
    expect(shown.length).toBeGreaterThan(10);
    expect(
      shown.every(
        (row) =>
          row.active === true && (row.category === 'stationery' || row.category === 'kitchen'),
      ),
    ).toBe(true);
    // Kitchen (later in the options) first when descending, then weight ascending within each category.
    const firstStationery = shown.findIndex((row) => row.category === 'stationery');
    expect(firstStationery).toBeGreaterThan(1);
    expect(shown.slice(0, firstStationery).every((row) => row.category === 'kitchen')).toBe(true);
    for (let index = 1; index < firstStationery; index++) {
      expect(Number(shown[index]?.weight)).toBeGreaterThanOrEqual(Number(shown[index - 1]?.weight));
    }

    const withEmpty = [{ id: 'e', notes: null }, ...rows.slice(0, 5)];
    for (const direction of ['ascending', 'descending'] as const) {
      const sorted = computeView(withEmpty, productId, formats, search, {
        search: '',
        filterValues: {},
        sorting: [{ column: 'notes', direction }],
      });
      expect(sorted.at(-1)).not.toBe('e');
      expect(withEmpty.find((row) => productId(row) === sorted.at(-1))?.notes ?? null).toBeNull();
    }

    const found = computeView(rows, productId, formats, [formatOf('sku')], {
      search: 'sku-0001',
      filterValues: {},
      sorting: [],
    });
    expect(found).toEqual(['p10', 'p11', 'p12', 'p13', 'p14', 'p15', 'p16', 'p17', 'p18', 'p19']);
    expect(
      computeView(rows, productId, formats, [formatOf('name')], {
        search: 'sku-0001',
        filterValues: {},
        sorting: [],
      }),
    ).toEqual([]);
  });
});

describe('history', () => {
  const rows = makeProducts(6);
  const [r1, r2, r3] = rows as [SpreadsheetRow, SpreadsheetRow, SpreadsheetRow];

  it('replaces, inserts and removes rows, and undoes each exactly', () => {
    const edited = { ...r2, name: 'Edited' };
    const added = [{ id: 'n1' }, { id: 'n2' }];
    const entry: HistoryEntry = {
      changes: [
        { type: 'replace', entries: [{ before: r2, after: edited }] },
        {
          type: 'insert',
          entries: [
            { index: 1, row: added[0] as SpreadsheetRow },
            { index: 2, row: added[1] as SpreadsheetRow },
          ],
        },
        {
          type: 'remove',
          entries: [
            { index: 0, row: r1 },
            { index: 4, row: r3 },
          ],
        },
      ],
    };
    let next: readonly SpreadsheetRow[] = rows;
    for (const change of entry.changes) {
      if (change.type !== 'columns') {
        next = applyRowChange(next, change, productId);
      }
    }
    expect(next.map(productId)).toEqual(['n1', 'n2', 'p2', 'p4', 'p5', 'p6']);
    expect(next[2]).toBe(edited);
    // The rows that didn't change are the same objects.
    expect(next[3]).toBe(rows[3]);

    for (const change of invertEntry(entry).changes) {
      if (change.type !== 'columns') {
        next = applyRowChange(next, change, productId);
      }
    }
    expect(next).toEqual(rows);
    expect(next.every((row, index) => row === rows[index])).toBe(true);
  });

  it('finds replaced rows by id when the app swapped the object', () => {
    const copy = { ...r2 };
    const swapped = [r1, copy, r3];
    const next = applyRowChange(
      swapped,
      { type: 'replace', entries: [{ before: r2, after: { ...r2, onHand: 1 } }] },
      productId,
    );
    expect(next[1]?.onHand).toBe(1);
  });

  it('keeps undo and redo bounded by steps and by the rows they hold', () => {
    const history = new SheetHistory(3, 10);
    const step = (count: number): HistoryEntry => ({
      changes: [
        {
          type: 'replace',
          entries: Array.from({ length: count }, () => ({ before: r1, after: r2 })),
        },
      ],
    });
    history.push(step(1));
    history.push(step(1));
    history.push(step(1));
    history.push(step(1));
    let undos = 0;
    while (history.undo()) {
      undos++;
    }
    expect(undos).toBe(3);
    expect(history.canRedo).toBe(true);
    history.push(step(8));
    expect(history.canRedo).toBe(false);
    history.push(step(8));
    // 16 rows held is over the budget of 10: the oldest step goes.
    expect(history.undo()).not.toBeNull();
    expect(history.undo()).toBeNull();
  });
});

describe('clipboard text', () => {
  it('writes and reads tab-separated cells, quoting tabs, line breaks and quotes', () => {
    const matrix = [
      ['a', 'b\tc', 'say "hi"'],
      ['line\nbreak', '', 'x'],
    ];
    const text = toTsv(matrix);
    expect(text).toBe('a\t"b\tc"\t"say ""hi"""\n"line\nbreak"\t\tx');
    expect(parseTsv(text)).toEqual(matrix);
  });

  it('reads what spreadsheets put on the clipboard (CRLF, a final line break, empty cells)', () => {
    expect(parseTsv('1\t2\r\n3\t4\r\n')).toEqual([
      ['1', '2'],
      ['3', '4'],
    ]);
    expect(parseTsv('\t\n')).toEqual([['', '']]);
    expect(parseTsv('')).toEqual([]);
    expect(parseTsv('plain')).toEqual([['plain']]);
  });
});

describe('geometry and selection', () => {
  it('reads CSS widths and finds columns by position', () => {
    expect(widthInPixels('160px', 99)).toBe(160);
    expect(widthInPixels('10rem', 99, 16)).toBe(160);
    expect(widthInPixels('20', 99)).toBe(48);
    expect(widthInPixels('50%', 99)).toBe(99);
    expect(widthInPixels(undefined, 99)).toBe(99);
    const offsets = columnOffsets([100, 50, 200]);
    expect(offsets).toEqual([0, 100, 150, 350]);
    expect(columnAt(offsets, -5)).toBe(0);
    expect(columnAt(offsets, 120)).toBe(1);
    expect(columnAt(offsets, 150)).toBe(2);
    expect(columnAt(offsets, 999)).toBe(2);
  });

  it('spans whole rows and columns, and stays inside the sheet', () => {
    const rows = { anchor: { row: 2, col: 1 }, focus: { row: 4, col: 1 }, kind: 'rows' as const };
    expect(selectionBounds(rows, 10, 5)).toEqual({ top: 2, bottom: 4, left: 0, right: 4 });
    const cols = {
      anchor: { row: 2, col: 3 },
      focus: { row: 2, col: 1 },
      kind: 'columns' as const,
    };
    expect(selectionBounds(cols, 10, 5)).toEqual({ top: 0, bottom: 9, left: 1, right: 3 });
    expect(clampSelection(rows, 3, 5)?.focus).toEqual({ row: 2, col: 1 });
    expect(clampSelection(rows, 0, 5)).toBeNull();
    expect(clampSelection(rows, 10, 5)).toBe(rows);
  });
});

describe('column settings and CSV', () => {
  it('keeps option ids through renames and reorders, and adds new ones by label', () => {
    const previous = [
      { id: 'r', label: 'Red' },
      { id: 'g', label: 'Green' },
    ];
    expect(optionsFromText('Green\nCrimson\n\nBlue\nBlue', previous)).toEqual([
      { id: 'g', label: 'Green' },
      { id: 'r', label: 'Crimson' },
      { id: 'Blue', label: 'Blue' },
    ]);
  });

  it('writes CSV with labels, plain values, choice labels and neutralised formulas', () => {
    const columns: SpreadsheetColumn[] = [
      { id: 'name', label: 'Name' },
      { id: 'kind', label: 'Type', type: 'enum', options: [{ id: 'v', label: 'VOD' }] },
      { id: 'on', label: 'On', type: 'boolean' },
      { id: 'n', label: 'N', type: 'number' },
    ];
    expect(
      spreadsheetToCsv(
        [{ name: '=SUM(A1)', kind: 'v', on: true, n: 1.5 }, { name: 'a, "b"' }],
        columns,
      ),
    ).toBe('Name,Type,On,N\r\n\'=SUM(A1),VOD,TRUE,1.5\r\n"a, ""b""",,,\r\n');
  });
});
