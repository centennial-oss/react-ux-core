// Synthetic regions for the Map's choropleth stories and tests: a 5 × 3 grid of rectangles named after Greek
// letters, with deterministic values (one region has no data). No downloads.
import type { Feature, FeatureCollection, Polygon } from 'geojson';

const names = [
  'Alpha',
  'Beta',
  'Gamma',
  'Delta',
  'Epsilon',
  'Zeta',
  'Eta',
  'Theta',
  'Iota',
  'Kappa',
  'Lambda',
  'Mu',
  'Nu',
  'Xi',
  'Omicron',
] as const;

const COLUMNS = 5;
/** Each region's width and height in degrees. */
const SIZE = 20;
const WEST = -50;
const NORTH = 30;

/** The regions, row by row from the north-west; Theta (the 8th) is in the middle. */
export const gridRegions: FeatureCollection<Polygon, { name: string }> = {
  type: 'FeatureCollection',
  features: names.map((name, index): Feature<Polygon, { name: string }> => {
    const west = WEST + (index % COLUMNS) * SIZE;
    const north = NORTH - Math.floor(index / COLUMNS) * SIZE;
    const east = west + SIZE;
    const south = north - SIZE;
    return {
      type: 'Feature',
      id: name.toLowerCase(),
      properties: { name },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
          ],
        ],
      },
    };
  }),
};

/** Requests per second by region id. Kappa has no data. */
export const gridValues: Record<string, number | null> = Object.fromEntries(
  names.map((name, index) => [
    name.toLowerCase(),
    name === 'Kappa' ? null : ((index * 37 + 11) % 97) * 12 + 40,
  ]),
);
