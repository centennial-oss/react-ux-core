// The table widget (§10.3): DataTable filling its frame and scrolling inside it with a sticky header, virtualized for
// long lists, in card layout on narrow frames. It shows `table` data, or `timeSeries` pivoted by `timeSeriesToTable`.

import { Table2 } from 'lucide-react';
import { useMemo } from 'react';
import { useLocale } from 'react-aria-components';
import type { DataTableProps } from '../../table/DataTable';
import { CARD_WIDTH, DataTable } from '../../table/DataTable';
import { ScrollRegion } from '../../components/ScrollRegion/ScrollRegion';
import type { TableSort } from '../../table/types';
import { tableShape, timeSeriesShape, timeSeriesToTable, type TableData } from '../data/shapes';
import type { DashboardStrings } from '../messages';
import type { JsonObject, WidgetSize } from '../types';
import { widgetFromComponent } from '../widgets/define';
import { unscaled } from '../widgets/scale';
import { ScaledContent } from '../widgets/ScaledContent';

/** The table widget's options. */
export interface TableWidgetOptions extends JsonObject {
  /** Defaults to `regular`. */
  density: 'regular' | 'compact';
  /** The column the table is sorted by at first, or empty for the rows' own order. */
  sortColumn: string;
  sortDirection: 'ascending' | 'descending';
  /** For time series: one row per time (the default) or one per series. */
  fromSeries: 'rowPerTime' | 'rowPerSeries';
}

/** Lists longer than this render only the rows in view. */
const VIRTUALIZE_FROM = 200;

type Row = Record<string, unknown>;

const noRows: readonly Row[] = [];

export interface TableWidgetViewProps {
  data: TableData<Row> | undefined;
  /** Time series to pivot, when the source produces them. */
  series: Parameters<typeof timeSeriesToTable>[0] | undefined;
  options: TableWidgetOptions;
  title: string;
  size: WidgetSize;
  messages: DashboardStrings;
  timeZone: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error?: DataTableProps<Row>['error'];
  onRetry?: () => void;
  emptyState?: DataTableProps<Row>['emptyState'];
  /** The sort the user chose, kept as the widget's state (Q3); undefined until they choose one. */
  sort: TableSort | null | undefined;
  onSortChange: (sort: TableSort | null) => void;
}

/** A sort kept in widget state: a column and a direction, or null for the rows' own order. */
function sortOf(state: JsonObject | undefined): TableSort | null | undefined {
  const value = state?.sort;
  if (value === null) {
    return null;
  }
  return typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof value.column === 'string' &&
    (value.direction === 'ascending' || value.direction === 'descending')
    ? { column: value.column, direction: value.direction }
    : undefined;
}

/** The table, sized to the frame (BI-06). */
function TableWidgetView({
  data,
  series,
  options,
  title,
  size,
  messages,
  timeZone,
  isLoading,
  isRefreshing,
  error,
  onRetry,
  emptyState,
  sort,
  onSortChange,
}: TableWidgetViewProps) {
  const { locale } = useLocale();
  const table = useMemo(
    () =>
      series
        ? timeSeriesToTable(series, {
            orientation: options.fromSeries,
            timeZone,
            locale,
            labels: { time: messages.tableTime, series: messages.tableSeries },
          })
        : data,
    [series, data, options.fromSeries, timeZone, locale, messages.tableTime, messages.tableSeries],
  );
  const rows = table?.rows ?? noRows;
  // Rows without an id are known by their position: a map, so a long table doesn't search for each row.
  const positions = useMemo(() => new Map(rows.map((row, index) => [row, index])), [rows]);
  const getRowId =
    table?.getRowId ??
    ((row: Row) =>
      typeof row.id === 'string' || typeof row.id === 'number'
        ? String(row.id)
        : String(positions.get(row) ?? 0));
  const defaultSort: TableSort | null =
    options.sortColumn === ''
      ? null
      : { column: options.sortColumn, direction: options.sortDirection };
  // Large displays zoom the table as a whole (RESP-08): its sizes are in the zoomed content's pixels.
  const height = `${String(Math.max(120, Math.floor(unscaled(size.height, size.scale))))}px`;
  // Rows become cards in a narrow frame (as DataTable decides): the cards scroll in a focusable region (BI-06).
  const isCards = unscaled(size.width, size.scale) < CARD_WIDTH;
  const dataTable = (
    <DataTable
      aria-label={messages.tableWidgetData({ title })}
      rows={rows}
      columns={table?.columns ?? []}
      getRowId={getRowId}
      density={options.density}
      sort={sort === undefined ? defaultSort : sort}
      onSortChange={onSortChange}
      // The frame gives the table its height in pixels (GRID-13): it scrolls inside with a sticky header.
      maxHeight={isCards ? undefined : height}
      isVirtualized={rows.length > VIRTUALIZE_FROM}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      error={error}
      onRetry={onRetry}
      emptyState={emptyState}
      className="border-0 shadow-none"
    />
  );
  return (
    <ScaledContent scale={size.scale}>
      {isCards ? (
        <ScrollRegion
          aria-label={messages.tableWidgetData({ title })}
          maxHeight={height}
          className="flex-1 rounded-none border-0 bg-transparent p-1"
        >
          {dataTable}
        </ScrollRegion>
      ) : (
        dataTable
      )}
    </ScaledContent>
  );
}

/** The table widget type (P0): `table` data, or `timeSeries` pivoted into rows. */
export const tableWidget = widgetFromComponent<TableWidgetOptions, unknown, TableWidgetViewProps>({
  type: 'ccux.table',
  displayName: (messages) => messages.tableWidget,
  description: (messages) => messages.tableWidgetDescription,
  icon: Table2,
  category: (messages) => messages.widgetCategoryTables,
  dataShape: tableShape.id,
  alsoAccepts: [timeSeriesShape.id],
  defaultSize: { w: 4, h: 5 },
  minSize: { w: 3, h: 3 },
  minPixelSize: { width: 240, height: 160 },
  stackedHeight: 8,
  hasOwnStates: true,
  defaultOptions: {
    density: 'regular',
    sortColumn: '',
    sortDirection: 'ascending',
    fromSeries: 'rowPerTime',
  },
  optionsSchema: [
    {
      type: 'pillbox',
      name: 'density',
      label: (m) => m.optionDensity,
      items: [
        { id: 'regular', label: (m) => m.optionDensityRegular },
        { id: 'compact', label: (m) => m.optionDensityCompact },
      ],
    },
    {
      type: 'pillbox',
      name: 'fromSeries',
      label: (m) => m.optionFromSeries,
      items: [
        { id: 'rowPerTime', label: (m) => m.optionRowPerTime },
        { id: 'rowPerSeries', label: (m) => m.optionRowPerSeries },
      ],
    },
  ],
  toProps: (data, options, env) => ({
    data: tableShape.guard(data) ? data : undefined,
    series: timeSeriesShape.guard(data) ? data : undefined,
    options,
    title: env.title,
    size: env.frameSize,
    messages: env.messages,
    timeZone: env.dashboard.timeZone,
    isLoading: env.isLoading,
    isRefreshing: env.isRefreshing,
    error: env.error,
    onRetry: env.onRetry,
    emptyState: env.emptyState,
    sort: sortOf(env.widgetState),
    onSortChange: (sort) => {
      env.setWidgetState({ ...env.widgetState, sort: sort ? { ...sort } : null });
    },
  }),
  component: TableWidgetView,
});
