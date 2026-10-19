import type { Meta, StoryObj } from '@storybook/react-vite';
import { offlineStyle } from '../../test/maplibre';
import { MapView } from './MapView';
import type { MapMarker } from './types';

const meta = {
  title: 'Map/Map',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const sites: MapMarker[] = [
  { id: 'denver', label: 'Plant 12, Denver', position: [-104.99, 39.74], tone: 'warning' },
  { id: 'aurora', label: 'Depot 4, Aurora', position: [-104.83, 39.73], tone: 'success' },
  { id: 'lakewood', label: 'Depot 5, Lakewood', position: [-105.08, 39.7], tone: 'success' },
  { id: 'boulder', label: 'Plant 14, Boulder', position: [-105.27, 40.01], tone: 'danger' },
  {
    id: 'fort-collins',
    label: 'Depot 9, Fort Collins',
    position: [-105.08, 40.58],
    tone: 'success',
  },
  {
    id: 'colorado-springs',
    label: 'Plant 3, Colorado Springs',
    position: [-104.82, 38.83],
    tone: 'neutral',
  },
  { id: 'pueblo', label: 'Depot 2, Pueblo', position: [-104.61, 38.25], tone: 'success' },
];

/**
 * Sites as markers, coloured and shaped by status. Nearby markers cluster (press a cluster to zoom in); the
 * selected site shows a card. Every marker is in the list below the map too. This story's style has no tiles, so it
 * works offline; apps pass their own style URL.
 */
export const Sites: Story = {
  render: () => (
    <MapView
      aria-label="Sites"
      styleUrl={offlineStyle}
      markers={sites}
      defaultSelectedId="boulder"
      renderPopup={(marker) => (
        <div className="flex flex-col gap-1">
          <p className="font-medium">{marker.label}</p>
          <p className="text-xs text-fg-muted">2 meters offline since 09:40</p>
        </div>
      )}
    />
  ),
};

/** When the style or tiles can't load (offline), the map says so and the list of places still works. */
export const Unavailable: Story = {
  render: () => (
    <MapView aria-label="Sites" styleUrl="/missing-style.json" markers={sites} height="16rem" />
  ),
};
