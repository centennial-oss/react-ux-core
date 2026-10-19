// The map widget's view: /map's Map fed `geo` data. It loads (with MapLibre) only when a map widget renders.

import { use, useMemo } from 'react';
import type { StyleSpecification } from 'maplibre-gl';
import { MapView } from '../../map/MapView';
import { DashboardRuntimeContext } from '../context/DashboardContexts';
import type { GeoData, GeoMarker } from '../data/shapes';
import type { JsonValue, WidgetRenderProps } from '../types';
import type { MapWidgetOptions } from './mapWidget';

/** What a marker sets the selection filter to: its `filterValue`, or its id (BI-07). */
const filterValueOf = (marker: GeoMarker): JsonValue => marker.filterValue ?? marker.id;

/** A world view for a map with no places yet and no fixed view. */
const WORLD = { center: [0, 20] as const, zoom: 1 };

export default function MapWidgetView({
  dataState,
  displayOptions,
  dashboard,
  instance,
  messages,
  isLoading,
  error,
  onRetry,
  emptyState,
}: WidgetRenderProps<MapWidgetOptions, GeoData>) {
  const runtime = use(DashboardRuntimeContext);
  const data =
    dataState.status === 'success'
      ? dataState.data
      : dataState.status === 'error'
        ? dataState.staleData
        : undefined;
  const styles = runtime?.mapStyles ?? [];
  const style = styles.find((option) => option.id === displayOptions.style) ?? styles[0];
  const isFixed = displayOptions.initialView === 'fixed';
  const { centerLng, centerLat, zoom, hasCenterMarker } = displayOptions;
  const markerLabel = instance.title ?? messages.mapWidget;
  const markers = useMemo((): readonly GeoMarker[] => {
    const own = data?.markers ?? [];
    return isFixed && hasCenterMarker
      ? [
          ...own,
          {
            id: `${instance.id}:centre`,
            label: markerLabel,
            position: [centerLng, centerLat],
            tone: 'neutral',
          },
        ]
      : own;
  }, [data?.markers, isFixed, hasCenterMarker, instance.id, markerLabel, centerLng, centerLat]);

  // The selection follows the filter it sets, from wherever the filter changes (BI-07).
  const filterId = displayOptions.selectionFilter;
  const filterValue = filterId === '' ? undefined : dashboard.filterValues[filterId];
  const selectedId =
    filterId === ''
      ? undefined
      : (markers.find(
          (marker) => JSON.stringify(filterValueOf(marker)) === JSON.stringify(filterValue ?? null),
        )?.id ?? null);

  if (!style) {
    return null;
  }
  return (
    <MapView
      aria-label={messages.mapWidgetLabel({ title: instance.title ?? messages.mapWidget })}
      styleUrl={style.styleUrl as string | StyleSpecification}
      markers={markers}
      choropleth={data?.choropleth}
      initialView={
        isFixed
          ? { center: [centerLng, centerLat], zoom }
          : markers.length === 0
            ? WORLD
            : undefined
      }
      hasClustering={displayOptions.hasClustering}
      // The map fills the frame, and draws its own loading, error and empty states, so it stays mounted (§20).
      height="100%"
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      emptyState={emptyState}
      // The page's scrolling is never captured: one finger scrolls, two move the map (RESP-16, BI-08).
      hasCooperativeGestures
      {...(filterId === ''
        ? {}
        : {
            selectedId,
            onSelectionChange: (id: string | null) => {
              const marker =
                id === null ? undefined : markers.find((candidate) => candidate.id === id);
              dashboard.setFilterValue(filterId, marker ? filterValueOf(marker) : null);
            },
          })}
      className="min-h-0 flex-1 px-2 pb-2"
    />
  );
}
