import type { Tone } from '../utils/types';

/** A longitude and latitude, in that order (GeoJSON's order). */
export type LngLat = readonly [lng: number, lat: number];

/** A place shown on the map. */
export interface MapMarker {
  id: string;
  position: LngLat;
  /** Defaults to `accent`. Each tone also has its own shape. */
  tone?: Tone;
  /** Names the marker (its button, and its line in the list). */
  label: string;
}

/** A camera position. */
export interface MapView {
  center: LngLat;
  zoom: number;
}
