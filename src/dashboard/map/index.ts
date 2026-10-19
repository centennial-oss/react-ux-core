// Public API for @centennial-oss/react-ux-core/dashboard/map: the map widget type, on /map's Map. MapLibre loads only
// when a map widget renders; the dashboard core never loads it (ARCH-04).

export { mapWidget, type MapWidgetOptions } from './mapWidget';
