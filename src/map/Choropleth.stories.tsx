import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Feature, FeatureCollection } from 'geojson';
import { useEffect, useState } from 'react';
import { offlineStyle } from '../../test/maplibre';
import { gridRegions, gridValues } from '../../test/regions';
import { defaultShapeId } from './choropleth';
import { MapView } from './MapView';

const meta = {
  title: 'Map/Choropleth',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Requests per second by region on a 5-step scale, with a legend, a summary naming the highest and lowest, and the
 * regions listed by value below (focus one to highlight it on the map). Hover or tap a region for its tooltip.
 * Markers sit on top. The regions are a synthetic grid, so the story works offline.
 */
export const RequestsByRegion: Story = {
  render: () => (
    <MapView
      aria-label="Requests by region"
      styleUrl={offlineStyle}
      choropleth={{ shapes: gridRegions, values: gridValues, scale: { steps: 5 }, unit: 'req/s' }}
      markers={[
        { id: 'north', label: 'North observatory', position: [-30, 15], tone: 'success' },
        { id: 'south', label: 'South observatory', position: [25, -18], tone: 'warning' },
      ]}
    />
  ),
};

/** A diverging scale around a target: change in error rate, red below and green above zero. */
export const Diverging: Story = {
  render: () => (
    <MapView
      aria-label="Change by region"
      styleUrl={offlineStyle}
      choropleth={{
        shapes: gridRegions,
        values: Object.fromEntries(
          Object.entries(gridValues).map(([id, value]) => [
            id,
            value === null ? null : Math.round((value - 600) / 10),
          ]),
        ),
        scale: { type: 'diverging', midpoint: 0, steps: 6 },
        unit: '%',
      }}
    />
  ),
};

/** When the map can't load, the legend, summary and the list of regions by value still work. */
export const Unavailable: Story = {
  render: () => (
    <MapView
      aria-label="Requests by region"
      styleUrl="/missing-style.json"
      height="16rem"
      choropleth={{ shapes: gridRegions, values: gridValues, scale: { steps: 5 }, unit: 'req/s' }}
    />
  ),
};

/** A deterministic value for a country code, so the story looks the same each time. */
function valueFor(id: string): number {
  let total = 7;
  for (let index = 0; index < id.length; index += 1) {
    total = (total * 31 + id.charCodeAt(index)) % 10_007;
  }
  return total * 3;
}

function countryId(feature: Feature): string {
  const properties = feature.properties ?? {};
  const code: unknown = properties.ISO_A3 ?? properties.iso_a3 ?? properties.ADM0_A3;
  return typeof code === 'string' ? code : defaultShapeId(feature);
}

/**
 * Requests by country for every country in `.storybook/public/media/countries.geojson` (for example Natural Earth's
 * admin-0 countries), when that file is present; otherwise the synthetic regions.
 */
export const Countries: Story = {
  tags: ['!visual'],
  render: function Render() {
    const [shapes, setShapes] = useState<FeatureCollection>(gridRegions);
    useEffect(() => {
      let isCurrent = true;
      fetch('media/countries.geojson')
        .then((response) => (response.ok ? (response.json() as Promise<FeatureCollection>) : null))
        .then((data) => {
          if (isCurrent && data?.type === 'FeatureCollection') {
            setShapes(data);
          }
        })
        .catch(() => undefined);
      return () => {
        isCurrent = false;
      };
    }, []);
    const values = Object.fromEntries(
      shapes.features.map((feature) => {
        const id = countryId(feature);
        return [id, valueFor(id)];
      }),
    );
    return (
      <MapView
        aria-label="Requests by country"
        styleUrl={offlineStyle}
        height="28rem"
        choropleth={{ shapes, values, getId: countryId, scale: { steps: 5 }, unit: 'req/s' }}
      />
    );
  },
};
