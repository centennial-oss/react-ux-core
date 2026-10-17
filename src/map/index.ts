// Public API for @centennial-oss/react-ux-core/map: a MapLibre map with markers and a choropleth layer.
export { MapView as Map, type MapProps } from './MapView';
export type { LngLat, MapMarker, MapView } from './types';
export type { ChoroplethLayer } from './choropleth';
export type { HeatPalette, HeatScale } from '../chart/heat';
export { defaultChoroplethMessages, type ChoroplethMessages } from './choroplethMessages';
