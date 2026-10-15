import { Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { MapView } from './types';

export type MapStatus = 'loading' | 'ready' | 'failed';

/**
 * Owns a MapLibre map on a container: created when the container mounts (and again on `retry`), removed on
 * unmount. Reports whether the style loaded (`failed` when it couldn't, or WebGL isn't available) and whether tiles
 * failed afterwards (offline).
 */
export function useMapLibre(style: string | StyleSpecification, initialView: MapView | undefined) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [status, setStatus] = useState<MapStatus>('loading');
  const [hasTileErrors, setTileErrors] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const settings = useRef({ style, initialView });
  useEffect(() => {
    settings.current = { style, initialView };
  });

  useEffect(() => {
    if (!container) {
      return;
    }
    let instance: MapLibreMap;
    try {
      instance = new MapLibreMap({
        container,
        style: settings.current.style,
        center: settings.current.initialView ? [...settings.current.initialView.center] : [0, 20],
        zoom: settings.current.initialView?.zoom ?? 1,
        attributionControl: { compact: true },
        // Keyboard panning and zooming stay; the page scrolls normally with one finger on touch screens.
        cooperativeGestures: false,
      });
    } catch {
      // No WebGL, for example.
      queueMicrotask(() => {
        setStatus('failed');
      });
      return;
    }
    let isLoaded = false;
    instance.on('load', () => {
      isLoaded = true;
      setStatus('ready');
      setMap(instance);
    });
    instance.on('error', (event) => {
      if (!isLoaded) {
        setStatus('failed');
      } else if ('sourceId' in event || 'tile' in event) {
        // A source or tile failed after the style loaded (offline, for example).
        setTileErrors(true);
      }
    });
    return () => {
      setMap(null);
      setStatus('loading');
      setTileErrors(false);
      instance.remove();
    };
  }, [container, attempt]);

  const retry = useCallback(() => {
    setAttempt((count) => count + 1);
  }, []);

  return { containerRef: setContainer, map, status, hasTileErrors, retry };
}

/**
 * The camera (centre, zoom, bearing, pitch and size) as a string that changes whenever the map moves or resizes, so
 * the marker layer re-renders and re-projects its markers.
 */
export function useCamera(map: MapLibreMap | null): string {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!map) {
        return () => undefined;
      }
      map.on('move', onChange);
      map.on('resize', onChange);
      return () => {
        map.off('move', onChange);
        map.off('resize', onChange);
      };
    },
    [map],
  );
  const snapshot = useCallback(() => {
    if (!map) {
      return '';
    }
    const { lng, lat } = map.getCenter();
    const canvas = map.getCanvas();
    return [
      lng,
      lat,
      map.getZoom(),
      map.getBearing(),
      map.getPitch(),
      canvas.clientWidth,
      canvas.clientHeight,
    ].join(',');
  }, [map]);
  return useSyncExternalStore(subscribe, snapshot, () => '');
}
