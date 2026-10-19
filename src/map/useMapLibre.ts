import { Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useLatest } from '../utils/useLatest';
import type { MapView } from './types';

export type MapStatus = 'loading' | 'ready' | 'failed';

/** How the map takes gestures: cooperatively (RESP-16), with MapLibre's hints in the app's language. */
export interface MapGestures {
  isCooperative: boolean;
  hints: { zoom: string; zoomMac: string; touch: string };
}

/**
 * Owns a MapLibre map on a container: created when the container mounts (and again on `retry`), removed on
 * unmount. Reports whether the style loaded (`failed` when it couldn't, or WebGL isn't available) and whether tiles
 * failed afterwards (offline).
 */
export function useMapLibre(
  style: string | StyleSpecification,
  initialView: MapView | undefined,
  gestures?: MapGestures,
) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [status, setStatus] = useState<MapStatus>('loading');
  const [hasTileErrors, setTileErrors] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const settings = useLatest({ style, initialView, gestures });

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
        // Cooperatively, one finger scrolls the page and the wheel zooms only with Ctrl or ⌘ (RESP-16).
        cooperativeGestures: settings.current.gestures?.isCooperative ?? false,
        locale: hintLocale(settings.current.gestures),
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

  // Gestures can change on a live map.
  const isCooperative = gestures?.isCooperative ?? false;
  useEffect(() => {
    if (!map) {
      return;
    }
    if (isCooperative) {
      map.cooperativeGestures.enable();
    } else {
      map.cooperativeGestures.disable();
    }
  }, [map, isCooperative]);

  const retry = useCallback(() => {
    setAttempt((count) => count + 1);
  }, []);

  return { containerRef: setContainer, map, status, hasTileErrors, retry };
}

/** MapLibre's strings for the cooperative gestures' hints. */
function hintLocale(gestures: MapGestures | undefined): Record<string, string> | undefined {
  return gestures
    ? {
        'CooperativeGesturesHandler.WindowsHelpText': gestures.hints.zoom,
        'CooperativeGesturesHandler.MacHelpText': gestures.hints.zoomMac,
        'CooperativeGesturesHandler.MobileHelpText': gestures.hints.touch,
      }
    : undefined;
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
