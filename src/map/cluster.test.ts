import { describe, expect, it } from 'vitest';
import { clusterPlaced } from './cluster';

const marker = (id: string) => ({ id, label: id, position: [0, 0] as const });

describe('clusterPlaced', () => {
  const placed = [
    { marker: marker('a'), x: 0, y: 0 },
    { marker: marker('b'), x: 10, y: 0 },
    { marker: marker('c'), x: 200, y: 0 },
  ];

  it('groups markers within the radius', () => {
    const items = clusterPlaced(placed, 40, new Set());
    expect(items.map((item) => item.kind)).toEqual(['cluster', 'marker']);
    const [cluster] = items;
    expect(cluster?.kind === 'cluster' && cluster.x).toBe(5);
  });

  it('never clusters a kept (selected) marker, and can be turned off', () => {
    expect(clusterPlaced(placed, 40, new Set(['a'])).map((item) => item.kind)).toEqual([
      'marker',
      'marker',
      'marker',
    ]);
    expect(clusterPlaced(placed, 0, new Set())).toHaveLength(3);
  });
});
