// Built-in data shapes (§8.8): named contracts that reuse the types of the components they feed (WID-06), each with a
// runtime guard and an emptiness test, plus the conversion helpers of DATA-20. Only types come from the chart, table
// and map entries, so the dashboard core loads none of their code (ARCH-04).

import type { ChartEvent } from '../../chart/events';
import type { ChartBand, ChartThreshold } from '../../chart/setup';
import type { CategorySeries } from '../../chart/CategoryChart';
import type { GaugeThresholds } from '../../chart/Gauge';
import type { TimeSeries } from '../../chart/TimeSeriesChart';
import { formatTime, formatValue } from '../../chart/format';
import { numberColumn, timeColumn, withUnit } from '../../chart/tableColumns';
import type { StatDelta } from '../../components/StatTile/StatTile';
import type { ChoroplethLayer } from '../../map/choropleth';
import type { MapMarker } from '../../map/types';
import type { DataTableColumn } from '../../table/types';
import { toEpochMs } from '../../utils/time';
import { defaultDashboardMessages } from '../messages';
import type { DataShapeDefinition, JsonValue } from '../types';

/** Makes a data shape, with full type inference (DATA-19). */
export function defineDataShape<TData>(
  definition: DataShapeDefinition<TData>,
): DataShapeDefinition<TData> {
  return definition;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isArrayOf = <T>(value: unknown, item: (entry: unknown) => entry is T): value is T[] =>
  Array.isArray(value) && value.every(item);

/** `timeSeries`: what TimeSeriesChart draws. */
export interface TimeSeriesData {
  series: readonly TimeSeries[];
  thresholds?: readonly ChartThreshold[];
  bands?: readonly ChartBand[];
  events?: readonly ChartEvent[];
}

const isSeries = (value: unknown): value is TimeSeries =>
  isObject(value) &&
  typeof value.id === 'string' &&
  typeof value.label === 'string' &&
  Array.isArray(value.data);

/** Empty when no series has a reading. */
export const timeSeriesShape = defineDataShape<TimeSeriesData>({
  id: 'timeSeries',
  guard: (value): value is TimeSeriesData => isObject(value) && isArrayOf(value.series, isSeries),
  isEmpty: (data) => data.series.every((entry) => entry.data.every((point) => point.v === null)),
});

/** `categorical`: what CategoryChart draws as bars or a donut. */
export interface CategoricalData {
  categories: readonly string[];
  series: readonly CategorySeries[];
}

const isCategorySeries = (value: unknown): value is CategorySeries =>
  isObject(value) && typeof value.id === 'string' && Array.isArray(value.data);

/** Empty when there are no values. */
export const categoricalShape = defineDataShape<CategoricalData>({
  id: 'categorical',
  guard: (value): value is CategoricalData =>
    isObject(value) &&
    isArrayOf(value.categories, (entry): entry is string => typeof entry === 'string') &&
    isArrayOf(value.series, isCategorySeries),
  isEmpty: (data) => data.series.every((entry) => entry.data.every((point) => point === null)),
});

/** One figure, as a StatTile shows it. A number is formatted by the widget; a string is shown as it is. */
export interface StatTileData {
  label: string;
  value: number | string | null;
  unit?: string;
  delta?: StatDelta;
  /** The recent values, drawn faintly behind the figure. */
  sparkline?: readonly number[];
  /** Identifies the variant shown (BI-04), such as the source's name. */
  caption?: string;
  /** Where the figure comes from, for the tile's footer (BI-05). */
  sources?: readonly string[];
  /** When the figure was measured: epoch milliseconds or an ISO 8601 string (BI-05). */
  timestamp?: number | string;
}

/** A tile: a figure, or several variants of it that rotate (BI-04). */
export interface StatItem extends StatTileData {
  id?: string;
  variants?: readonly StatTileData[];
}

/** `stats`: a group of figures. */
export interface StatsData {
  items: readonly StatItem[];
}

const isStat = (value: unknown): value is StatItem =>
  isObject(value) &&
  typeof value.label === 'string' &&
  (value.value === null || typeof value.value === 'number' || typeof value.value === 'string');

/** Empty when there are no items. */
export const statsShape = defineDataShape<StatsData>({
  id: 'stats',
  guard: (value): value is StatsData => isObject(value) && isArrayOf(value.items, isStat),
  isEmpty: (data) => data.items.length === 0,
});

/** `table`: what DataTable shows. */
export interface TableData<Row extends object = Record<string, unknown>> {
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  /** A stable id per row. Defaults to the row's `id`, or its position. */
  getRowId?: (row: Row) => string;
}

/** Empty when there are no rows. */
export const tableShape = defineDataShape<TableData>({
  id: 'table',
  guard: (value): value is TableData =>
    isObject(value) &&
    isArrayOf(
      value.columns,
      (entry): entry is DataTableColumn<Record<string, unknown>> =>
        isObject(entry) && typeof entry.id === 'string',
    ) &&
    isArrayOf(value.rows, isObject),
  isEmpty: (data) => data.rows.length === 0,
});

/** A place on a map that can set a dashboard filter (BI-07): its `filterValue`, or else its id. */
export interface GeoMarker extends MapMarker {
  filterValue?: JsonValue;
}

/** `geo`: what Map draws. */
export interface GeoData {
  markers?: readonly GeoMarker[];
  choropleth?: ChoroplethLayer;
  /** Fit the view to the data when it changes. */
  fitTo?: 'data';
}

/** Empty when there are no markers and no shapes. */
export const geoShape = defineDataShape<GeoData>({
  id: 'geo',
  guard: (value): value is GeoData =>
    isObject(value) &&
    (value.markers === undefined ||
      isArrayOf(
        value.markers,
        (entry): entry is GeoMarker => isObject(entry) && typeof entry.id === 'string',
      )) &&
    (value.choropleth === undefined || isObject(value.choropleth)),
  isEmpty: (data) =>
    (data.markers?.length ?? 0) === 0 && (data.choropleth?.shapes.features.length ?? 0) === 0,
});

/** `gauge`: what Gauge and MeterBar show. */
export interface GaugeData {
  value: number | null;
  maxValue: number;
  thresholds?: GaugeThresholds;
  unit?: string;
}

/** Empty when the value is null. */
export const gaugeShape = defineDataShape<GaugeData>({
  id: 'gauge',
  guard: (value): value is GaugeData =>
    isObject(value) &&
    (value.value === null || typeof value.value === 'number') &&
    typeof value.maxValue === 'number',
  isEmpty: (data) => data.value === null,
});

/** The built-in shapes, by id. */
export const builtInDataShapes: readonly DataShapeDefinition[] = [
  timeSeriesShape,
  categoricalShape,
  statsShape,
  tableShape,
  geoShape,
  gaugeShape,
] as DataShapeDefinition[];

/** Options for `timeSeriesToTable`. */
export interface TimeSeriesToTableOptions {
  /** One row per time with a column per series (the default), or one row per series with a column per time. */
  orientation?: 'rowPerTime' | 'rowPerSeries';
  /** The time zone times are shown in. */
  timeZone: string;
  /** The locale numbers and times are shown in. Defaults to the browser's. */
  locale?: string;
  /** Newest time first (the default) or oldest first. */
  order?: 'newestFirst' | 'oldestFirst';
  /** Headers for the time and series columns. Default to the dashboard's English strings. */
  labels?: { time: string; series: string };
}

type Row = Record<string, unknown>;

/** Pivots time series into a table (DATA-20): newest time first, by default. */
export function timeSeriesToTable(
  data: TimeSeriesData,
  options: TimeSeriesToTableOptions,
): TableData<Row> {
  const locale = options.locale ?? Intl.DateTimeFormat().resolvedOptions().locale;
  const labels = options.labels ?? {
    time: defaultDashboardMessages.tableTime,
    series: defaultDashboardMessages.tableSeries,
  };
  const times = new Set<number>();
  for (const entry of data.series) {
    for (const point of entry.data) {
      times.add(toEpochMs(point.t));
    }
  }
  const sign = (options.order ?? 'newestFirst') === 'newestFirst' ? -1 : 1;
  const ordered = [...times].sort((a, b) => sign * (a - b));
  const showTime = (time: number) => formatTime(time, locale, options.timeZone);

  if (options.orientation === 'rowPerSeries') {
    const columns: DataTableColumn<Row>[] = [
      { id: 'series', header: labels.series, isRowHeader: true, value: (row) => row.series },
      ...ordered.map((time) =>
        numberColumn(`t${String(time)}`, showTime(time), (value) => formatValue(value, locale), {
          isSortable: true,
        }),
      ),
    ];
    const rows = data.series.map((entry) => {
      const row: Row = { __key: entry.id, series: withUnit(entry.label, entry.unit) };
      for (const point of entry.data) {
        row[`t${String(toEpochMs(point.t))}`] = point.v;
      }
      return row;
    });
    return { columns, rows, getRowId: (row) => String(row.__key) };
  }

  const byTime = new Map<number, Row>(ordered.map((time) => [time, { __key: time, time }]));
  for (const entry of data.series) {
    for (const point of entry.data) {
      const row = byTime.get(toEpochMs(point.t));
      if (row) {
        row[entry.id] = point.v;
      }
    }
  }
  const columns = [
    timeColumn(labels.time, showTime),
    // Times alone say nothing: the series' columns show in narrow tables too.
    ...data.series.map((entry) =>
      numberColumn(
        entry.id,
        withUnit(entry.label, entry.unit),
        (value) => formatValue(value, locale),
        { isSortable: true, mobile: true, priority: 1 },
      ),
    ),
  ];
  return { columns, rows: [...byTime.values()], getRowId: (row) => String(row.__key) };
}

/** Stat items from each series' latest reading, with the series' values as the sparkline (DATA-20). */
export function latestStats(data: TimeSeriesData): StatsData {
  return {
    items: data.series.map((entry) => {
      const values: number[] = [];
      let latest: { v: number; t: number } | undefined;
      for (const point of entry.data) {
        if (point.v !== null) {
          values.push(point.v);
          const time = toEpochMs(point.t);
          if (latest === undefined || time >= latest.t) {
            latest = { v: point.v, t: time };
          }
        }
      }
      const item: StatItem = {
        id: entry.id,
        label: entry.label,
        value: latest?.v ?? null,
        sparkline: values,
      };
      if (entry.unit !== undefined) {
        item.unit = entry.unit;
      }
      if (latest !== undefined) {
        item.timestamp = latest.t;
      }
      return item;
    }),
  };
}
