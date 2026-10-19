// The choropleth layer's pieces around the map: its colours (from HeatmapChart's scales), the legend and summary,
// the tooltip, and the list of regions sorted by value.

import type { Map as MapLibreMap } from 'maplibre-gl';
import { useMemo, type FocusEvent } from 'react';
import { ListBox, ListBoxItem, Text, useLocale } from 'react-aria-components';
import {
  heatColor,
  heatLegendStops,
  isFlatScale,
  resolveHeatScale,
  useHeatLook,
  type HeatLook,
  type ResolvedHeatScale,
} from '../chart/heat';
import { listBoxClasses } from '../components/ListBox/ListBoxParts';
import { cn } from '../utils/cn';
import { clamp } from '../utils/math';
import {
  choroplethRegions,
  formatRegionValue,
  regionExtremes,
  sortRegionsByValue,
  unionBounds,
  type Bounds,
  type ChoroplethLayer,
  type ChoroplethRegion,
} from './choropleth';
import { useMapMessages } from './messages';
import type { ActiveRegion } from './ChoroplethShapes';
import { useCamera } from './useMapLibre';

export interface ChoroplethModel {
  regions: ChoroplethRegion[];
  /** Each feature's id, in feature order. */
  ids: string[];
  /** The extent of every region together. */
  bounds: Bounds | null;
  /** Highest value first, regions without data last. */
  sorted: ChoroplethRegion[];
  byId: ReadonlyMap<string, ChoroplethRegion>;
  colors: ReadonlyMap<string, string>;
  scale: ResolvedHeatScale;
  look: HeatLook;
  hasMissing: boolean;
  /** Formats a region's value with the layer's unit ("No data" when null). */
  format: (value: number | null) => string;
  /** Names the highest and lowest regions, or null when no region has a value. */
  summary: string | null;
}

/**
 * The layer's regions, their colours on the scale, and its summary. Recomputed when the layer's parts change (not
 * when an app passes the same parts in a new object).
 */
export function useChoropleth(layer: ChoroplethLayer | undefined): ChoroplethModel | null {
  const messages = useMapMessages();
  const { locale } = useLocale();
  const look = useHeatLook();
  const { shapes, values: valuesById, getId, getName, unit } = layer ?? {};
  const { type, min, max, midpoint, colors: palette, steps } = layer?.scale ?? {};
  return useMemo(() => {
    if (!shapes || !valuesById) {
      return null;
    }
    const regions = choroplethRegions({ shapes, values: valuesById, getId, getName });
    const values = regions.flatMap((region) => (region.value === null ? [] : [region.value]));
    const scale = resolveHeatScale(values, { type, min, max, midpoint, colors: palette, steps });
    const colors = new Map<string, string>();
    for (const region of regions) {
      if (region.value !== null) {
        colors.set(region.id, heatColor(region.value, scale, look));
      }
    }
    const format = (value: number | null) =>
      value === null ? messages.noData : formatRegionValue(value, locale, unit);
    const extremes = regionExtremes(regions);
    return {
      regions,
      ids: regions.map((region) => region.id),
      bounds: unionBounds(regions.map((region) => region.bounds)),
      sorted: sortRegionsByValue(regions, locale),
      byId: new Map(regions.map((region) => [region.id, region])),
      colors,
      scale,
      look,
      hasMissing: values.length < regions.length,
      format,
      summary: extremes
        ? messages.choroplethSummary({
            highest: extremes.highest.name,
            highestValue: format(extremes.highest.value),
            lowest: extremes.lowest.name,
            lowestValue: format(extremes.lowest.value),
          })
        : null,
    };
  }, [
    shapes,
    valuesById,
    getId,
    getName,
    unit,
    type,
    min,
    max,
    midpoint,
    palette,
    steps,
    look,
    locale,
    messages,
  ]);
}

/** The colour scale (low to high, in its steps), the "No data" swatch, and the summary. */
export function ChoroplethLegend({
  model,
  summaryId,
}: {
  model: ChoroplethModel;
  summaryId: string;
}) {
  const messages = useMapMessages();
  const { scale, look } = model;
  const stops = heatLegendStops(scale, look);
  const isFlat = isFlatScale(scale);
  return (
    <div className="flex flex-col gap-1.5 text-xs text-fg-muted">
      <div
        role="group"
        aria-label={messages.choroplethScale}
        className="flex flex-wrap items-center gap-x-4 gap-y-2"
      >
        {model.colors.size === 0 ? null : isFlat ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-3 rounded-[3px] border border-border"
              // eslint-disable-next-line no-restricted-syntax -- dynamic data: the scale's colour.
              style={{ backgroundColor: stops[0] }}
            />
            <span className="tabular-nums">{model.format(scale.min)}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <span className="tabular-nums">{model.format(scale.min)}</span>
            <span
              aria-hidden="true"
              className="flex h-3 w-32 overflow-hidden rounded-[3px] border border-border"
            >
              {stops.map((stop, index) => (
                <span
                  key={index}
                  className="h-full flex-1"
                  // eslint-disable-next-line no-restricted-syntax -- dynamic data: the scale's colours.
                  style={{ backgroundColor: stop }}
                />
              ))}
            </span>
            <span className="tabular-nums">{model.format(scale.max)}</span>
          </span>
        )}
        {model.hasMissing && (
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-3 rounded-[3px] border border-border-strong bg-surface-1"
            />
            {messages.noData}
          </span>
        )}
      </div>
      {model.summary !== null && (
        <p id={summaryId} className="text-fg">
          {model.summary}
        </p>
      )}
    </div>
  );
}

/** The active region's name and value, pointing at it on the map. */
export function ChoroplethTooltip({
  map,
  model,
  active,
}: {
  map: MapLibreMap;
  model: ChoroplethModel;
  active: ActiveRegion;
}) {
  // Re-render on every camera change, so the tooltip follows its region.
  useCamera(map);
  const region = model.byId.get(active.id);
  if (!region) {
    return null;
  }
  const { x, y } = map.project([active.at[0], active.at[1]]);
  const width = map.getCanvas().clientWidth;
  const isBelow = y < 72;
  return (
    // The list below the map has the same name and value for screen readers.
    <div
      aria-hidden="true"
      data-choropleth-tooltip=""
      className={cn(
        'pointer-events-none absolute z-20 max-w-48 -translate-x-1/2 rounded-control border border-border bg-surface-2 px-2 py-1 text-xs text-fg shadow-overlay',
        isBelow ? 'translate-y-3' : '-translate-y-[calc(100%+0.75rem)]',
      )}
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the tooltip's screen position.
      style={{ left: clamp(x, 80, Math.max(80, width - 80)), top: y }}
    >
      <p className="font-medium [overflow-wrap:anywhere]">{region.name}</p>
      <p className="text-fg-muted tabular-nums">{model.format(region.value)}</p>
    </div>
  );
}

const regionClasses = [
  'relative flex min-h-hit cursor-default items-center gap-2 rounded-control px-2 py-1.5 text-fg outline-none select-none',
  'data-focused:bg-surface-3 data-pressed:bg-surface-4 data-focus-visible:ring-2 data-focus-visible:ring-focus data-focus-visible:ring-inset',
].join(' ');

/**
 * The regions by value, highest first: each its colour, name and value. Focusing one highlights it on the map; choosing
 * one (Enter, click or tap) calls `onShapePress`.
 */
export function RegionList({
  label,
  model,
  onFocusRegion,
  onAction,
}: {
  label: string;
  model: ChoroplethModel;
  onFocusRegion: (id: string | null) => void;
  onAction?: (id: string) => void;
}) {
  const messages = useMapMessages();
  // React Aria marks each option with `data-key`; focus moving between them tells the map which to highlight.
  const regionOf = (event: FocusEvent): string | null =>
    event.target instanceof Element
      ? (event.target.closest('[data-key]')?.getAttribute('data-key') ?? null)
      : null;
  return (
    <div
      onFocus={(event) => {
        onFocusRegion(regionOf(event));
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onFocusRegion(null);
        }
      }}
    >
      <ListBox
        aria-label={messages.choroplethRegionList({ label })}
        items={model.sorted}
        onAction={
          onAction
            ? (key) => {
                onAction(String(key));
              }
            : undefined
        }
        dependencies={[model]}
        className={cn(listBoxClasses, 'max-h-64')}
      >
        {(region) => (
          <ListBoxItem id={region.id} textValue={region.name} className={regionClasses}>
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-[3px] border border-border-strong bg-surface-1"
              // eslint-disable-next-line no-restricted-syntax -- dynamic data: the region's colour.
              style={{ backgroundColor: model.colors.get(region.id) }}
            />
            {/* The name and value together label the option: its visible text. */}
            <Text slot="label" className="flex min-w-0 flex-1 items-center gap-2">
              <span className="min-w-0 flex-1 truncate">{region.name}</span>
              <span className="shrink-0 text-fg-muted tabular-nums">
                {model.format(region.value)}
              </span>
            </Text>
          </ListBoxItem>
        )}
      </ListBox>
    </div>
  );
}
