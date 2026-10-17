// The choropleth layer's data: regions from GeoJSON features with their ids, names, values and bounds; sorting by
// value; the highest and lowest; and value formatting. No MapLibre here, so it's plain to test.

import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';
import type { HeatScale } from '../chart/heat';

/** Regions filled by value: countries, states or custom areas. */
export interface ChoroplethLayer {
  /** GeoJSON features keyed by id (country ISO codes, states, custom regions). */
  shapes: FeatureCollection;
  /** A feature's id, the key into `values`. Defaults to the feature's `id`, or its `id` property. */
  getId?: (feature: Feature) => string;
  /** A feature's name, for the tooltip, list and summary. Defaults to its `name` property, or its id. */
  getName?: (feature: Feature) => string;
  /** Each region's value by id. A missing or null value shows as "No data". */
  values: Readonly<Record<string, number | null>>;
  /** How values map to colours: HeatmapChart's scales. Defaults to a sequential accent scale over the data. */
  scale?: HeatScale;
  /** Written after each value, for example "req/s". */
  unit?: string;
  /** Called with a region's id when it's pressed on the map or chosen in the list. */
  onShapePress?: (id: string) => void;
}

/** West, south, east, north. */
export type Bounds = [west: number, south: number, east: number, north: number];

export interface ChoroplethRegion {
  id: string;
  name: string;
  /** Null when the region has no data. */
  value: number | null;
  /** The region's extent, or null when it has no coordinates. */
  bounds: Bounds | null;
}

function stringProperty(feature: Feature, key: string): string | undefined {
  const value: unknown = feature.properties?.[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}

/** A feature's id: its `id`, or its `id` property. */
export function defaultShapeId(feature: Feature): string {
  return feature.id !== undefined ? String(feature.id) : (stringProperty(feature, 'id') ?? '');
}

/** A feature's name: its `name` property (or `NAME`, `ADMIN` as in Natural Earth data), or `id`. */
export function defaultShapeName(feature: Feature, id: string): string {
  return (
    stringProperty(feature, 'name') ??
    stringProperty(feature, 'NAME') ??
    stringProperty(feature, 'ADMIN') ??
    id
  );
}

function extend(bounds: Bounds | null, position: Position): Bounds {
  const [lng = 0, lat = 0] = position;
  return bounds
    ? [
        Math.min(bounds[0], lng),
        Math.min(bounds[1], lat),
        Math.max(bounds[2], lng),
        Math.max(bounds[3], lat),
      ]
    : [lng, lat, lng, lat];
}

/** The extent of a geometry's coordinates, or null when it has none. */
export function geometryBounds(geometry: Geometry | null): Bounds | null {
  if (!geometry) {
    return null;
  }
  let bounds: Bounds | null = null;
  const visit = (coordinates: unknown) => {
    if (Array.isArray(coordinates) && typeof coordinates[0] === 'number') {
      bounds = extend(bounds, coordinates as Position);
    } else if (Array.isArray(coordinates)) {
      for (const child of coordinates) {
        visit(child);
      }
    }
  };
  if (geometry.type === 'GeometryCollection') {
    for (const child of geometry.geometries) {
      const childBounds = geometryBounds(child);
      if (childBounds) {
        bounds = extend(extend(bounds, [childBounds[0], childBounds[1]]), [
          childBounds[2],
          childBounds[3],
        ]);
      }
    }
    return bounds;
  }
  visit(geometry.coordinates);
  return bounds;
}

/** The extent of several bounds together, or null when there are none. */
export function unionBounds(all: readonly (Bounds | null)[]): Bounds | null {
  let bounds: Bounds | null = null;
  for (const entry of all) {
    if (entry) {
      bounds = extend(extend(bounds, [entry[0], entry[1]]), [entry[2], entry[3]]);
    }
  }
  return bounds;
}

/** The layer's regions, in the order of its features, with their values (null when missing). */
export function choroplethRegions(layer: ChoroplethLayer): ChoroplethRegion[] {
  const getId = layer.getId ?? defaultShapeId;
  return layer.shapes.features.map((feature) => {
    const id = getId(feature);
    const value = layer.values[id];
    return {
      id,
      name: layer.getName ? layer.getName(feature) : defaultShapeName(feature, id),
      value: typeof value === 'number' && Number.isFinite(value) ? value : null,
      bounds: geometryBounds(feature.geometry),
    };
  });
}

/** Regions from highest to lowest value (ties by name), then those without data, by name. */
export function sortRegionsByValue(
  regions: readonly ChoroplethRegion[],
  locale?: string,
): ChoroplethRegion[] {
  return [...regions].sort((a, b) => {
    if (a.value !== b.value) {
      if (a.value === null) {
        return 1;
      }
      if (b.value === null) {
        return -1;
      }
      return b.value - a.value;
    }
    return a.name.localeCompare(b.name, locale);
  });
}

/** The regions with the highest and lowest values, or null when no region has a value. */
export function regionExtremes(
  regions: readonly ChoroplethRegion[],
): { highest: ChoroplethRegion; lowest: ChoroplethRegion } | null {
  const withValues = sortRegionsByValue(regions).filter((region) => region.value !== null);
  const highest = withValues[0];
  const lowest = withValues.at(-1);
  return highest && lowest ? { highest, lowest } : null;
}

/** A value with the locale's digits and the unit after it. */
export function formatRegionValue(value: number, locale: string, unit?: string): string {
  const text = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  return unit === undefined ? text : `${text} ${unit}`;
}
