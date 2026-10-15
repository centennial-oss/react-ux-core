// MapLibre setup for stories and tests, as an app would do it: its stylesheet, and its worker built by Vite (the
// worker is normally found beside MapLibre's module file, which bundlers move).
import 'maplibre-gl/dist/maplibre-gl.css';
import { setWorkerUrl, type StyleSpecification } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);

/** A style with no tiles: a plain background, so maps render offline and the same every time. */
export const offlineStyle: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#dfe7ea' } }],
};
