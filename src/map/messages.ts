// English defaults of the map entry point's strings (see `Messages` in provider/messages.ts).
import { useEntryMessages } from '../provider/context';
import type { CoreMessages, MapMessages } from '../provider/messages';
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
  ...defaultChoroplethMessages,
};

/** The strings `/map` components read: the core strings and `/map`'s own. */
export type MapStrings = CoreMessages & MapMessages & ChoroplethMessages;

/** `/map`'s strings, with the app's overrides from `UIProvider`. */
export function useMapMessages(): MapStrings {
  return useEntryMessages(defaultMapMessages);
}
