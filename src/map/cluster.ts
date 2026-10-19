import type { MapMarker } from './types';

export interface Placed {
  marker: MapMarker;
  x: number;
  y: number;
}

export type MapItem =
  | { kind: 'marker'; placed: Placed }
  | { kind: 'cluster'; id: string; members: readonly Placed[]; x: number; y: number };

/**
 * Groups markers that are within `radius` pixels of each other on screen into clusters (greedily, in the order
 * given). Markers in `keep` (the selected one) are never clustered, so they stay where their popup points.
 */
export function clusterPlaced(
  placed: readonly Placed[],
  radius: number,
  keep: ReadonlySet<string>,
): MapItem[] {
  const items: MapItem[] = [];
  const taken = new Set<string>();
  for (const point of placed) {
    if (taken.has(point.marker.id)) {
      continue;
    }
    taken.add(point.marker.id);
    if (radius <= 0 || keep.has(point.marker.id)) {
      items.push({ kind: 'marker', placed: point });
      continue;
    }
    const members = [point];
    for (const other of placed) {
      if (
        !taken.has(other.marker.id) &&
        !keep.has(other.marker.id) &&
        Math.hypot(other.x - point.x, other.y - point.y) <= radius
      ) {
        taken.add(other.marker.id);
        members.push(other);
      }
    }
    if (members.length === 1) {
      items.push({ kind: 'marker', placed: point });
    } else {
      items.push({
        kind: 'cluster',
        id: members.map((member) => member.marker.id).join('|'),
        members,
        x: members.reduce((sum, member) => sum + member.x, 0) / members.length,
        y: members.reduce((sum, member) => sum + member.y, 0) / members.length,
      });
    }
  }
  return items;
}
