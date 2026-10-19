import { X } from 'lucide-react';
import { LngLatBounds, type Map as MapLibreMap } from 'maplibre-gl';
import { useId, type ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { IconButton } from '../components/IconButton/IconButton';
import { StatusDot } from '../components/StatusDot/StatusDot';

import { cn } from '../utils/cn';
import { clamp } from '../utils/math';
import { clusterPlaced, type Placed } from './cluster';
import type { MapMarker } from './types';
import { useCamera } from './useMapLibre';
import { useMapMessages } from './messages';

/** How far outside the visible map markers are still placed (so they slide in rather than pop in). */
const MARGIN = 64;

interface MarkerLayerProps {
  map: MapLibreMap;
  markers: readonly MapMarker[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  renderPopup?: (marker: MapMarker) => ReactNode;
  /** Pixels within which markers merge into a cluster; 0 turns clustering off. */
  clusterRadius: number;
  /** Animation length for camera moves (0 with reduced motion). */
  duration: number;
}

/**
 * The markers, drawn by React over the map: each a button named by its label, clusters as buttons that zoom in,
 * and the selected marker's popup card. They're positioned from the map's camera on every move.
 */
export function MarkerLayer({
  map,
  markers,
  selectedId,
  onSelect,
  renderPopup,
  clusterRadius,
  duration,
}: MarkerLayerProps) {
  const messages = useMapMessages();
  const popupId = useId();
  // Re-render on every camera change; positions below are read from the map each render.
  useCamera(map);
  const canvas = map.getCanvas();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const placed: Placed[] = markers.flatMap((marker) => {
    const { x, y } = map.project([marker.position[0], marker.position[1]]);
    return x < -MARGIN || y < -MARGIN || x > width + MARGIN || y > height + MARGIN
      ? []
      : [{ marker, x, y }];
  });
  const items = clusterPlaced(
    placed,
    clusterRadius,
    new Set(selectedId === null ? [] : [selectedId]),
  );
  const selected = placed.find((point) => point.marker.id === selectedId);
  const isPopupAbove = selected !== undefined && selected.y > height / 2;

  const zoomTo = (members: readonly Placed[]) => {
    const bounds = new LngLatBounds();
    for (const member of members) {
      bounds.extend([member.marker.position[0], member.marker.position[1]]);
    }
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();
    if (southWest.lng === northEast.lng && southWest.lat === northEast.lat) {
      // All in one place: zoom in on it.
      map.easeTo({ center: southWest, zoom: map.getZoom() + 2, duration });
    } else {
      map.fitBounds(bounds, { padding: 64, duration });
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((item) => {
        if (item.kind === 'cluster') {
          return (
            <AriaButton
              key={item.id}
              aria-label={messages.markerCluster({ count: item.members.length })}
              onPress={() => {
                zoomTo(item.members);
              }}
              className="pointer-events-auto absolute flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-surface-1 bg-accent-solid text-sm font-semibold text-accent-on-solid shadow-overlay outline-none data-focus-visible:focus-ring data-hovered:brightness-110"
              // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the cluster's screen position.
              style={{ left: item.x, top: item.y }}
            >
              <span aria-hidden="true">{item.members.length}</span>
            </AriaButton>
          );
        }
        const { marker, x, y } = item.placed;
        const isSelected = marker.id === selectedId;
        return (
          <AriaButton
            key={marker.id}
            aria-label={marker.label}
            aria-pressed={isSelected}
            aria-controls={isSelected && renderPopup ? popupId : undefined}
            onPress={() => {
              onSelect(isSelected ? null : marker.id);
            }}
            className={cn(
              'hit-area pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-surface-1 bg-surface-2 shadow-overlay outline-none',
              'data-focus-visible:focus-ring data-hovered:scale-110 motion-reduce:data-hovered:scale-100',
              isSelected ? 'z-10 size-9 ring-2 ring-fg' : 'size-7',
            )}
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the marker's screen position.
            style={{ left: x, top: y }}
          >
            <StatusDot tone={marker.tone ?? 'accent'} label={marker.label} isLabelHidden />
          </AriaButton>
        );
      })}
      {selected && renderPopup && (
        // A non-modal dialog that closes with Escape (the WAI-ARIA dialog pattern).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- see above.
        <div
          id={popupId}
          role="dialog"
          aria-label={selected.marker.label}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              onSelect(null);
            }
          }}
          className={cn(
            'pointer-events-auto absolute z-20 w-64 max-w-[calc(100%-1rem)] -translate-x-1/2 rounded-card border border-border bg-surface-2 p-3 pe-10 text-sm text-fg shadow-overlay',
            isPopupAbove && '-translate-y-full',
          )}
          // Above the marker, or below it in the top half of the map; kept inside the map's sides.
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the popup's screen position.
          style={{
            left: clamp(selected.x, 136, Math.max(136, width - 136)),
            top: isPopupAbove ? selected.y - 24 : selected.y + 24,
          }}
        >
          {renderPopup(selected.marker)}
          <IconButton
            icon={X}
            size="sm"
            aria-label={messages.close}
            onPress={() => {
              onSelect(null);
            }}
            className="absolute end-1 top-1"
          />
        </div>
      )}
    </div>
  );
}
