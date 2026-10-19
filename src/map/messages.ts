// English defaults of the map entry point's strings (see `Messages` in provider/messages.ts).
import type { CommonMessages } from '../provider/coreStrings';
import { useEntryMessages } from '../provider/context';
import type { MapMessages } from '../provider/messages';
import { defaultChoroplethMessages, type ChoroplethMessages } from './choroplethMessages';

export const defaultMapMessages: MapMessages & ChoroplethMessages = {
  mapUnavailable: 'Map unavailable',
  mapLoadFailed: 'The map couldn’t load. The places are listed below.',
  mapTilesFailed: 'Some of the map couldn’t load.',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  fitToMarkers: 'Show all places',
  resetView: 'Reset view',
  markerCount: ({ count }) => `Places (${count})`,
  markerCluster: ({ count }) => `${count} places, zoom in`,
  mapZoomHint: 'Use Ctrl and scroll to zoom the map',
  mapZoomHintMac: 'Use ⌘ and scroll to zoom the map',
  mapTouchHint: 'Use two fingers to move the map',
  ...defaultChoroplethMessages,
};

/** The strings `/map` components read: the core strings and `/map`'s own. */
export type MapStrings = CommonMessages & MapMessages & ChoroplethMessages;

/** `/map`'s strings, with the app's overrides from `UIProvider`. */
export function useMapMessages(): MapStrings {
  return useEntryMessages(defaultMapMessages);
}
