import type { Feature } from 'geojson';
import { describe, expect, it } from 'vitest';
import { gridRegions, gridValues } from '../../test/regions';
import {
  choroplethRegions,
  defaultShapeId,
  defaultShapeName,
  formatRegionValue,
  geometryBounds,
  regionExtremes,
  sortRegionsByValue,
  unionBounds,
} from './choropleth';

describe('choropleth data', () => {
  it('reads ids and names from features', () => {
    const point = { type: 'Point' as const, coordinates: [0, 0] };
    const withId: Feature = { type: 'Feature', id: 7, properties: {}, geometry: point };
    const withProperty: Feature = {
      type: 'Feature',
      properties: { id: 'FRA', ADMIN: 'France' },
      geometry: point,
    };
    expect(defaultShapeId(withId)).toBe('7');
    expect(defaultShapeId(withProperty)).toBe('FRA');
    expect(defaultShapeName(withProperty, 'FRA')).toBe('France');
    expect(defaultShapeName(withId, '7')).toBe('7');
  });

  it('finds the bounds of polygons, multipolygons and collections', () => {
    expect(
      geometryBounds({
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [0, 0],
              [10, 5],
              [0, 5],
              [0, 0],
            ],
          ],
          [
            [
              [-20, -3],
              [-18, -3],
              [-18, 1],
              [-20, -3],
            ],
          ],
        ],
      }),
    ).toEqual([-20, -3, 10, 5]);
    expect(
      geometryBounds({
        type: 'GeometryCollection',
        geometries: [
          { type: 'Point', coordinates: [4, 4] },
          { type: 'Point', coordinates: [-1, 9] },
        ],
      }),
    ).toEqual([-1, 4, 4, 9]);
    expect(geometryBounds(null)).toBeNull();
    expect(unionBounds([null, [0, 0, 1, 1], [-1, 2, 0, 3]])).toEqual([-1, 0, 1, 3]);
  });

  it('pairs regions with values, sorts them by value, and finds the highest and lowest', () => {
    const regions = choroplethRegions({ shapes: gridRegions, values: gridValues });
    expect(regions).toHaveLength(15);
    expect(regions.find((region) => region.id === 'kappa')?.value).toBeNull();
    const sorted = sortRegionsByValue(regions, 'en-US');
    expect(sorted.slice(0, 3).map((region) => region.name)).toEqual(['Lambda', 'Gamma', 'Theta']);
    expect(sorted.at(-1)?.name).toBe('Kappa');
    expect(sorted.at(-2)?.name).toBe('Zeta');
    const extremes = regionExtremes(regions);
    expect(extremes?.highest.name).toBe('Lambda');
    expect(extremes?.lowest.name).toBe('Zeta');
    expect(regionExtremes(regions.map((region) => ({ ...region, value: null })))).toBeNull();
  });

  it('uses getId and getName when given', () => {
    const [region] = choroplethRegions({
      shapes: gridRegions,
      values: { ALPHA: 3 },
      getId: (feature) => String(feature.id).toUpperCase(),
      getName: (feature) => `Region ${String(feature.id)}`,
    });
    expect(region).toMatchObject({ id: 'ALPHA', name: 'Region alpha', value: 3 });
  });

  it('formats values with the unit', () => {
    expect(formatRegionValue(1120, 'en-US', 'req/s')).toBe('1,120 req/s');
    expect(formatRegionValue(0.125, 'en-US')).toBe('0.13');
  });
});
