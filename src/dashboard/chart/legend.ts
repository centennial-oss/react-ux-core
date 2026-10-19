// A chart widget's part in the consolidated legend (§9.3): it publishes one entry per series (CTX-11), hides and
// highlights series from the page's legend state (CTX-12), and hides its own legend when the page has a legend widget
// (CTX-13). Toggling the chart's own legend changes the page's state too, so matching series follow everywhere.

import { useEffect, useMemo } from 'react';
import type { DashboardContextApi, DashboardLegendEntry, WidgetRenderProps } from '../types';

/** A series as the legend sees it. */
export interface LegendItem {
  id: string;
  label: string;
  /** The resolved colour the chart draws it with. */
  color: string;
  kind: DashboardLegendEntry['kind'];
  lineStyle?: DashboardLegendEntry['lineStyle'];
  /** Merges entries across widgets on purpose (CTX-11). */
  legendKey?: string;
}

/** An item's legend key: its own, or its label, colour, kind and line style (CTX-11). */
export function legendKeyOf(item: LegendItem): string {
  return (
    item.legendKey ?? [item.label, item.color, item.kind, item.lineStyle ?? 'solid'].join('\u001f')
  );
}

/** What the chart takes to follow the page's legend. */
export interface ChartLegendProps {
  hiddenSeries: ReadonlySet<string>;
  highlightedSeries: string | null;
  onHiddenSeriesChange: (ids: Set<string>) => void;
  onHighlightedSeriesChange: (id: string | null) => void;
  hasLegend: boolean;
}

/** Publishes the items and maps the page's legend state onto the chart's series. */
export function useChartLegend({
  items,
  dashboard,
  setLegendEntries,
  legend,
}: {
  items: readonly LegendItem[];
  dashboard: DashboardContextApi;
  setLegendEntries: WidgetRenderProps<unknown, unknown>['setLegendEntries'];
  /** The widget's `legend` option: `auto` hides the chart's own legend when the page has a legend widget. */
  legend: 'auto' | 'show' | 'hide';
}): ChartLegendProps {
  const entries = useMemo(
    () =>
      items.map((item) => {
        const entry: Omit<DashboardLegendEntry, 'widgetId'> = {
          key: legendKeyOf(item),
          label: item.label,
          color: item.color,
          kind: item.kind,
        };
        if (item.lineStyle !== undefined) {
          entry.lineStyle = item.lineStyle;
        }
        return entry;
      }),
    [items],
  );
  const entriesKey = JSON.stringify(entries);
  useEffect(() => {
    setLegendEntries(JSON.parse(entriesKey) as Omit<DashboardLegendEntry, 'widgetId'>[]);
  }, [entriesKey, setLegendEntries]);

  const {
    hiddenLegendKeys,
    highlightedLegendKey,
    toggleLegendKey,
    setHighlightedLegendKey,
    hasLegendWidget,
  } = dashboard;
  const keyById = useMemo(
    () => new Map(items.map((item) => [item.id, legendKeyOf(item)])),
    [items],
  );
  const hiddenSeries = useMemo(
    () =>
      new Set(
        items
          .filter((item) => hiddenLegendKeys.has(keyById.get(item.id) ?? ''))
          .map((item) => item.id),
      ),
    [items, hiddenLegendKeys, keyById],
  );
  const highlightedSeries =
    highlightedLegendKey === null
      ? null
      : (items.find((item) => keyById.get(item.id) === highlightedLegendKey)?.id ?? null);
  return {
    hiddenSeries,
    highlightedSeries,
    onHiddenSeriesChange: (ids) => {
      for (const item of items) {
        if (ids.has(item.id) !== hiddenSeries.has(item.id)) {
          toggleLegendKey(keyById.get(item.id) ?? item.id);
        }
      }
    },
    onHighlightedSeriesChange: (id) => {
      setHighlightedLegendKey(id === null ? null : (keyById.get(id) ?? null));
    },
    hasLegend: legend === 'show' || (legend === 'auto' && !hasLegendWidget),
  };
}
