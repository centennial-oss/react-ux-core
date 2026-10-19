import { describe, expect, it } from 'vitest';
import { kpis, regionTable, START, HOUR } from '../../../test/dashboard';
import {
  categoricalShape,
  gaugeShape,
  geoShape,
  latestStats,
  statsShape,
  tableShape,
  timeSeriesShape,
  timeSeriesToTable,
  type TimeSeriesData,
} from './shapes';

const series: TimeSeriesData = {
  series: [
    {
      id: 'a',
      label: 'Alpha',
      unit: 'kWh',
      data: [
        { t: START, v: 1 },
        { t: START + HOUR, v: 2.5 },
        { t: START + 2 * HOUR, v: null },
      ],
    },
    { id: 'b', label: 'Beta', data: [{ t: START + HOUR, v: 7 }] },
  ],
};

describe('data shapes (§8.8)', () => {
  it('guard the data they describe', () => {
    expect(timeSeriesShape.guard(series)).toBe(true);
    expect(timeSeriesShape.guard({ series: [{ id: 1 }] })).toBe(false);
    expect(statsShape.guard(kpis)).toBe(true);
    expect(statsShape.guard({ items: [{ label: 'x', value: {} }] })).toBe(false);
    expect(tableShape.guard(regionTable)).toBe(true);
    expect(tableShape.guard({ columns: [], rows: 'none' })).toBe(false);
    expect(categoricalShape.guard({ categories: ['a'], series: [{ id: 's', data: [1] }] })).toBe(
      true,
    );
    expect(geoShape.guard({ markers: [{ id: 'm', label: 'M', position: [0, 0] }] })).toBe(true);
    expect(gaugeShape.guard({ value: null, maxValue: 100 })).toBe(true);
    expect(gaugeShape.guard({ value: '5', maxValue: 100 })).toBe(false);
  });

  it('know when they are empty', () => {
    expect(timeSeriesShape.isEmpty(series)).toBe(false);
    expect(
      timeSeriesShape.isEmpty({ series: [{ id: 'a', label: 'A', data: [{ t: 0, v: null }] }] }),
    ).toBe(true);
    expect(statsShape.isEmpty({ items: [] })).toBe(true);
    expect(tableShape.isEmpty({ ...regionTable, rows: [] } as never)).toBe(true);
    expect(
      categoricalShape.isEmpty({
        categories: ['a'],
        series: [{ id: 's', label: 'S', data: [null] }],
      }),
    ).toBe(true);
    expect(geoShape.isEmpty({})).toBe(true);
    expect(gaugeShape.isEmpty({ value: null, maxValue: 1 })).toBe(true);
  });
});

describe('timeSeriesToTable (DATA-20)', () => {
  it('makes one row per time, newest first, with a column per series', () => {
    const table = timeSeriesToTable(series, { timeZone: 'UTC', locale: 'en-US' });
    expect(table.columns.map((column) => column.id)).toEqual(['time', 'a', 'b']);
    expect(table.columns[1]?.header).toBe('Alpha (kWh)');
    expect(table.rows.map((row) => row.time)).toEqual([START + 2 * HOUR, START + HOUR, START]);
    expect(table.rows[1]).toMatchObject({ a: 2.5, b: 7 });
    expect(table.getRowId?.(table.rows[0] ?? {})).toBe(String(START + 2 * HOUR));
  });

  it('orders oldest first when asked, and takes header labels', () => {
    const table = timeSeriesToTable(series, {
      timeZone: 'UTC',
      locale: 'en-US',
      order: 'oldestFirst',
      labels: { time: 'Zeit', series: 'Reihe' },
    });
    expect(table.rows[0]?.time).toBe(START);
    expect(table.columns[0]?.header).toBe('Zeit');
  });

  it('makes one row per series, with a column per time', () => {
    const table = timeSeriesToTable(series, {
      timeZone: 'UTC',
      locale: 'en-US',
      orientation: 'rowPerSeries',
    });
    expect(table.columns).toHaveLength(4);
    expect(table.rows.map((row) => row.series)).toEqual(['Alpha (kWh)', 'Beta']);
    expect(table.rows[0]?.[`t${String(START)}`]).toBe(1);
  });
});

describe('latestStats (DATA-20)', () => {
  it('takes each series’ latest reading, with its values as the sparkline', () => {
    expect(latestStats(series).items).toEqual([
      {
        id: 'a',
        label: 'Alpha',
        value: 2.5,
        unit: 'kWh',
        sparkline: [1, 2.5],
        timestamp: START + HOUR,
      },
      { id: 'b', label: 'Beta', value: 7, sparkline: [7], timestamp: START + HOUR },
    ]);
  });
});
