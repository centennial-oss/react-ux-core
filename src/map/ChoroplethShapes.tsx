import type { FeatureCollection } from 'geojson';
import {
  GeoJSONSource,
  type FilterSpecification,
  type Map as MapLibreMap,
  type MapMouseEvent,
} from 'maplibre-gl';
import { useEffect, useId, useMemo, useRef } from 'react';
import type { LngLat } from './types';

/** Properties the layer adds to each feature: its key and fill colour. */
const ID = '__ccuxId';
const FILL = '__ccuxFill';

export interface ActiveRegion {
  id: string;
  /** Where its tooltip points. */
  at: LngLat;
  /** Hovered or tapped on the map, or focused in the list. */
  via: 'pointer' | 'list';
}

interface ChoroplethShapesProps {
  map: MapLibreMap;
  shapes: FeatureCollection;
  /** Each feature's id (the key into `colors`), in feature order. */
  ids: readonly string[];
  /** Fill colours by id; regions without one get `noDataColor`. */
  colors: ReadonlyMap<string, string>;
  noDataColor: string;
  outlineColor: string;
  highlightColor: string;
  highlightedId: string | null;
  /** A region is hovered or tapped (null when the pointer leaves the shapes or taps outside them). */
  onActivate: (region: ActiveRegion | null) => void;
  /** A region is clicked or tapped. */
  onPress?: (id: string) => void;
}

function remove(map: MapLibreMap, layers: readonly string[], source: string) {
  try {
    for (const layer of layers) {
      if (map.getLayer(layer)) {
        map.removeLayer(layer);
      }
    }
    if (map.getSource(source)) {
      map.removeSource(source);
    }
  } catch {
    // The map itself was removed first (unmount or retry); its layers went with it.
  }
}

/**
 * The regions drawn by MapLibre under the markers: filled by colour, outlined, with a thicker outline on the
 * highlighted one. Hovering, clicking and tapping report the region under the pointer.
 */
export function ChoroplethShapes({
  map,
  shapes,
  ids,
  colors,
  noDataColor,
  outlineColor,
  highlightColor,
  highlightedId,
  onActivate,
  onPress,
}: ChoroplethShapesProps) {
  const baseId = `ccux-choropleth-${useId()}`;
  const sourceId = `${baseId}-source`;
  const fillId = `${baseId}-fill`;
  const lineId = `${baseId}-line`;
  const highlightId = `${baseId}-highlight`;

  // The features with their keys and colours as properties, which the layers' expressions read.
  const data = useMemo<FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: shapes.features.map((feature, index) => {
        const id = ids[index] ?? '';
        return {
          ...feature,
          properties: { ...feature.properties, [ID]: id, [FILL]: colors.get(id) ?? noDataColor },
        };
      }),
    }),
    [shapes, ids, colors, noDataColor],
  );

  // Add the source and layers once per map; the effects below keep them current.
  useEffect(() => {
    map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
      id: fillId,
      type: 'fill',
      source: sourceId,
      paint: { 'fill-color': ['get', FILL], 'fill-opacity': 0.9 },
    });
    map.addLayer({ id: lineId, type: 'line', source: sourceId, paint: { 'line-width': 0.75 } });
    map.addLayer({
      id: highlightId,
      type: 'line',
      source: sourceId,
      filter: ['==', ['get', ID], ''],
      paint: { 'line-width': 3 },
    });
    return () => {
      remove(map, [highlightId, lineId, fillId], sourceId);
    };
  }, [map, sourceId, fillId, lineId, highlightId]);

  useEffect(() => {
    const source = map.getSource(sourceId);
    if (source instanceof GeoJSONSource) {
      void source.setData(data);
    }
  }, [map, sourceId, data]);

  useEffect(() => {
    map.setPaintProperty(lineId, 'line-color', outlineColor);
    map.setPaintProperty(highlightId, 'line-color', highlightColor);
  }, [map, lineId, highlightId, outlineColor, highlightColor]);

  useEffect(() => {
    const filter: FilterSpecification = ['==', ['get', ID], highlightedId ?? ''];
    map.setFilter(highlightId, filter);
  }, [map, highlightId, highlightedId]);

  // The latest callbacks, for the map's listeners (added once).
  const latest = useRef({ onActivate, onPress });
  useEffect(() => {
    latest.current = { onActivate, onPress };
  });

  useEffect(() => {
    const regionAt = (event: MapMouseEvent): string | null => {
      const [feature] = map.queryRenderedFeatures(event.point, { layers: [fillId] });
      const id: unknown = feature?.properties[ID];
      return typeof id === 'string' ? id : null;
    };
    let hovered: string | null = null;
    const onMove = (event: MapMouseEvent) => {
      const id = regionAt(event);
      // Only when the region changes: the tooltip stays where the pointer entered it.
      if (id !== hovered) {
        hovered = id;
        latest.current.onActivate(
          id === null ? null : { id, at: [event.lngLat.lng, event.lngLat.lat], via: 'pointer' },
        );
      }
      map.getCanvas().style.cursor = id !== null && latest.current.onPress ? 'pointer' : '';
    };
    const onLeave = () => {
      if (hovered !== null) {
        hovered = null;
        latest.current.onActivate(null);
      }
    };
    const onClick = (event: MapMouseEvent) => {
      const id = regionAt(event);
      latest.current.onActivate(
        id === null ? null : { id, at: [event.lngLat.lng, event.lngLat.lat], via: 'pointer' },
      );
      if (id !== null) {
        latest.current.onPress?.(id);
      }
    };
    map.on('mousemove', onMove);
    map.on('mouseout', onLeave);
    map.on('click', onClick);
    return () => {
      map.off('mousemove', onMove);
      map.off('mouseout', onLeave);
      map.off('click', onClick);
    };
  }, [map, fillId]);

  return null;
}
