import { Maximize, Minus, Plus, RotateCcw, MapPinOff } from 'lucide-react';
import { LngLatBounds, type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react';
import { ListBox } from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { Disclosure } from '../components/Disclosure/Disclosure';
import { IconButton } from '../components/IconButton/IconButton';
import { listBoxClasses, Option } from '../components/ListBox/ListBoxParts';
import { Skeleton } from '../components/Skeleton/Skeleton';
import { StatusDot } from '../components/StatusDot/StatusDot';
import { Tooltip } from '../components/Tooltip/Tooltip';

import { cn } from '../utils/cn';
import { useControllableState } from '../utils/useControllableState';
import { useMediaQuery } from '../utils/useMediaQuery';
import type { Bounds, ChoroplethLayer } from './choropleth';
import { ChoroplethLegend, ChoroplethTooltip, RegionList, useChoropleth } from './ChoroplethParts';
import { ChoroplethShapes, type ActiveRegion } from './ChoroplethShapes';
import { MarkerLayer } from './MarkerLayer';
import type { MapMarker, MapView as Camera } from './types';
import { useMapLibre } from './useMapLibre';
import { useMapMessages } from './messages';

export interface MapProps {
  /** Names the map and its markers list. */
  'aria-label': string;
  /** A MapLibre style: its URL, or the style object. */
  styleUrl: string | StyleSpecification;
  /** Places shown as markers. Defaults to none. */
  markers?: readonly MapMarker[];
  /** Regions filled by value, under the markers, with a legend, a summary and a list sorted by value. */
  choropleth?: ChoroplethLayer;
  /** The selected marker's id. Controlled; see `defaultSelectedId`. */
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelectionChange?: (id: string | null) => void;
  /** The card shown above the selected marker. */
  renderPopup?: (marker: MapMarker) => ReactNode;
  /** Where the map starts, and where Reset view returns. Without it, the map fits the markers (and regions). */
  initialView?: Camera;
  /** Groups nearby markers into clusters. Defaults to true. */
  hasClustering?: boolean;
  /** The map's height on tablet and desktop (CSS). Phones use a 4:3 box. Defaults to `24rem`. */
  height?: string;
  className?: string;
  ref?: Ref<HTMLElement>;
}

const noMarkers: readonly MapMarker[] = [];

/** Fits the markers and the regions' extent (`shapes`), when there are any. */
function fitMarkers(
  map: MapLibreMap,
  markers: readonly MapMarker[],
  duration: number,
  shapes: Bounds | null = null,
) {
  if (markers.length === 0 && !shapes) {
    return;
  }
  const bounds = new LngLatBounds();
  for (const marker of markers) {
    bounds.extend([marker.position[0], marker.position[1]]);
  }
  if (shapes) {
    // Web Mercator can't show the poles, so a world of regions (with Antarctica) fits to about ±85°.
    bounds.extend([shapes[0], Math.max(shapes[1], -85)]);
    bounds.extend([shapes[2], Math.min(shapes[3], 85)]);
  }
  map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration });
}

function MapControl({
  icon,
  label,
  onPress,
}: {
  icon: typeof Plus;
  label: string;
  onPress: () => void;
}) {
  return (
    <Tooltip content={label} placement="start">
      <IconButton
        icon={icon}
        aria-label={label}
        size="sm"
        variant="outline"
        onPress={onPress}
        className="bg-surface-2 shadow-overlay"
      />
    </Tooltip>
  );
}

/**
 * A MapLibre map with markers from data: clustering, a selected marker with a popup card, zoom, "show all" and
 * reset controls. Every marker is a button, and a list of them below the map reaches each one without a pointer.
 * A choropleth layer fills regions by value under the markers, with a legend, a tooltip, a summary naming the
 * highest and lowest, and a list of the regions sorted by value (focusing one highlights it on the map).
 * When the style or tiles can't load (offline), it says so and the lists still work.
 */
export function MapView({
  'aria-label': label,
  styleUrl,
  markers = noMarkers,
  choropleth,
  selectedId: selectedIdProp,
  defaultSelectedId = null,
  onSelectionChange,
  renderPopup,
  initialView,
  hasClustering = true,
  height = '24rem',
  className,
  ref,
}: MapProps) {
  const messages = useMapMessages();
  const isReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const duration = isReducedMotion ? 0 : 400;
  const { containerRef, map, status, hasTileErrors, retry } = useMapLibre(styleUrl, initialView);
  const [selectedId, setSelectedId] = useControllableState<string | null>(
    selectedIdProp,
    defaultSelectedId,
    onSelectionChange,
  );

  // The list opens by itself when the map can't load (the user can still close it).
  const [isListToggled, setListToggled] = useState<boolean | null>(null);
  const isListOpen = isListToggled ?? status === 'failed';
  const [isRegionListToggled, setRegionListToggled] = useState<boolean | null>(null);
  const isRegionListOpen = isRegionListToggled ?? status === 'failed';

  const model = useChoropleth(choropleth);
  const shapeBounds = model?.bounds ?? null;
  const summaryId = useId();
  const [activeRegion, setActiveRegion] = useState<ActiveRegion | null>(null);
  const activeId = activeRegion && model?.byId.has(activeRegion.id) ? activeRegion.id : null;
  const focusRegion = (id: string | null) => {
    const bounds = id === null ? null : model?.byId.get(id)?.bounds;
    if (id === null || !bounds) {
      setActiveRegion((current) => (current?.via === 'list' ? null : current));
      return;
    }
    // The tooltip points at the middle of the region's extent.
    setActiveRegion({
      id,
      at: [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2],
      via: 'list',
    });
  };

  // Fit the markers (and regions) once the map first loads, unless it has a starting view.
  const latest = useRef({ markers, initialView, shapeBounds });
  useEffect(() => {
    latest.current = { markers, initialView, shapeBounds };
  });
  useEffect(() => {
    if (map && !latest.current.initialView) {
      fitMarkers(map, latest.current.markers, 0, latest.current.shapeBounds);
    }
  }, [map]);

  const selectFromList = (id: string | null) => {
    setSelectedId(id);
    const marker = markers.find((entry) => entry.id === id);
    if (map && marker) {
      map.easeTo({
        center: [marker.position[0], marker.position[1]],
        zoom: Math.max(map.getZoom(), 12),
        duration,
      });
    }
  };

  return (
    <section
      ref={ref}
      aria-label={label}
      aria-busy={status === 'loading' || undefined}
      aria-describedby={model?.summary ? summaryId : undefined}
      data-map-status={status}
      className={cn('flex min-w-0 flex-col gap-2', className)}
    >
      <div
        className="relative w-full overflow-hidden rounded-card border border-border bg-surface-2 max-sm:aspect-[4/3] sm:h-(--map-height)"
        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the map's height.
        style={{ '--map-height': height } as React.CSSProperties}
      >
        {/* MapLibre makes its container `position: relative`, so the container fills a positioned wrapper. */}
        <div className={cn('absolute inset-0', status === 'failed' && 'invisible')}>
          <div ref={containerRef} className="size-full" />
        </div>
        {status === 'loading' && <Skeleton shape="rect" className="absolute inset-0 size-full" />}
        {status === 'failed' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <MapPinOff aria-hidden="true" className="size-8 text-fg-muted" />
            <p className="font-medium text-fg">{messages.mapUnavailable}</p>
            <p className="text-sm text-fg-muted">{messages.mapLoadFailed}</p>
            <Button size="sm" variant="outline" onPress={retry}>
              {messages.retry}
            </Button>
          </div>
        )}
        {map && status === 'ready' && (
          <>
            {model && choropleth && (
              <ChoroplethShapes
                map={map}
                shapes={choropleth.shapes}
                ids={model.ids}
                colors={model.colors}
                noDataColor={model.look.surface}
                outlineColor={model.look.border}
                highlightColor={model.look.text}
                highlightedId={activeId}
                onActivate={setActiveRegion}
                onPress={choropleth.onShapePress}
              />
            )}
            {model && activeRegion && activeId !== null && (
              <ChoroplethTooltip map={map} model={model} active={activeRegion} />
            )}
            <MarkerLayer
              map={map}
              markers={markers}
              selectedId={selectedId}
              onSelect={setSelectedId}
              renderPopup={renderPopup}
              clusterRadius={hasClustering ? 40 : 0}
              duration={duration}
            />
            <div className="absolute end-2 top-2 flex flex-col gap-1">
              <MapControl
                icon={Plus}
                label={messages.zoomIn}
                onPress={() => map.zoomIn({ duration })}
              />
              <MapControl
                icon={Minus}
                label={messages.zoomOut}
                onPress={() => map.zoomOut({ duration })}
              />
              <MapControl
                icon={Maximize}
                label={messages.fitToMarkers}
                onPress={() => {
                  fitMarkers(map, markers, duration, shapeBounds);
                }}
              />
              <MapControl
                icon={RotateCcw}
                label={messages.resetView}
                onPress={() => {
                  if (initialView) {
                    map.easeTo({
                      center: [...initialView.center],
                      zoom: initialView.zoom,
                      bearing: 0,
                      pitch: 0,
                      duration,
                    });
                  } else {
                    fitMarkers(map, markers, duration, shapeBounds);
                  }
                }}
              />
            </div>
            {hasTileErrors && (
              <p
                role="status"
                className="absolute start-2 bottom-2 rounded-control bg-surface-2 px-2 py-1 text-xs text-fg shadow-overlay"
              >
                {messages.mapTilesFailed}
              </p>
            )}
          </>
        )}
      </div>
      {model && <ChoroplethLegend model={model} summaryId={summaryId} />}
      {model && (
        <Disclosure
          title={messages.choroplethRegionCount({ count: model.regions.length })}
          isExpanded={isRegionListOpen}
          onExpandedChange={setRegionListToggled}
        >
          <RegionList
            label={label}
            model={model}
            onFocusRegion={focusRegion}
            onAction={choropleth?.onShapePress}
          />
        </Disclosure>
      )}
      {(markers.length > 0 || !model) && (
        <Disclosure
          title={messages.markerCount({ count: markers.length })}
          isExpanded={isListOpen}
          onExpandedChange={setListToggled}
        >
          <ListBox
            aria-label={label}
            items={markers}
            selectionMode="single"
            selectedKeys={selectedId === null ? [] : [selectedId]}
            onSelectionChange={(keys) => {
              const [key] = keys === 'all' ? [] : [...keys];
              selectFromList(key === undefined ? null : String(key));
            }}
            className={cn(listBoxClasses, 'max-h-64')}
          >
            {(marker) => (
              <Option id={marker.id} textValue={marker.label}>
                <span className="flex items-center gap-2">
                  {/* The option's name is the place; the dot only repeats its marker's look. */}
                  <span aria-hidden="true" className="inline-flex">
                    <StatusDot tone={marker.tone ?? 'accent'} label={marker.label} isLabelHidden />
                  </span>
                  {marker.label}
                </span>
              </Option>
            )}
          </ListBox>
        </Disclosure>
      )}
    </section>
  );
}
