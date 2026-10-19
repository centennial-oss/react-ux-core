import { describe, expect, it } from 'vitest';
import { resolvePath, visibleLabels } from './hierarchy/model';
import { containsId, findActiveId } from './navigation';
import type { HierarchyNode, NavItem } from './types';

const home: NavItem = { id: 'home', label: 'Home', href: '/' };
const sites: NavItem = {
  id: 'sites',
  label: 'Sites',
  href: '/sites',
  children: [{ id: 'map', label: 'Map', href: '/sites/map' }],
};
const items: NavItem[] = [
  home,
  sites,
  { id: 'site-reports', label: 'Site reports', href: '/sites-reports' },
];

describe('findActiveId', () => {
  it('picks the most specific matching item', () => {
    expect(findActiveId(items, '/sites/map', undefined)).toBe('map');
    expect(findActiveId(items, '/sites/12/meters', undefined)).toBe('sites');
    expect(findActiveId(items, '/sites/', undefined)).toBe('sites');
    expect(findActiveId(items, '/sites?tab=2', undefined)).toBe('sites');
  });

  it('matches whole path segments only, and the root only itself', () => {
    expect(findActiveId(items, '/sites-reports', undefined)).toBe('site-reports');
    expect(findActiveId(items, '/', undefined)).toBe('home');
    expect(findActiveId(items, '/elsewhere', undefined)).toBeUndefined();
  });

  it('lets the app decide', () => {
    expect(findActiveId(items, '/', (item) => item.id === 'map')).toBe('map');
  });

  it('finds whether an item holds the current one', () => {
    expect(containsId(sites, 'map')).toBe(true);
    expect(containsId(home, 'map')).toBe(false);
  });
});

const plant: HierarchyNode = { id: 'plant', label: 'Plant 12' };
const depot: HierarchyNode = { id: 'depot', label: 'Depot 3' };
const north: HierarchyNode = { id: 'north', label: 'North', children: [plant] };
const south: HierarchyNode = { id: 'south', label: 'South', children: [depot] };
const acme: HierarchyNode = { id: 'acme', label: 'Acme', children: [north, south] };

describe('resolvePath', () => {
  it('chooses single options for the user and stops at the first open level', () => {
    const resolved = resolvePath({ tree: [acme] }, [], {});
    expect(resolved.path.map((node) => node.id)).toEqual(['acme']);
    expect(resolved.levels.map((level) => level.isSkipped)).toEqual([true, false]);
    expect(resolved.isComplete).toBe(false);
  });

  it('completes through single-option levels below a choice', () => {
    const resolved = resolvePath({ tree: [acme] }, [acme, south], {});
    expect(resolved.path.map((node) => node.id)).toEqual(['acme', 'south', 'depot']);
    expect(resolved.isComplete).toBe(true);
    expect(visibleLabels(resolved.path, resolved)).toEqual(['South']);
  });

  it('asks for levels it hasn’t loaded and keeps the chosen node meanwhile', () => {
    const levels = [
      { id: 'org', label: 'Organisation' },
      { id: 'region', label: 'Region' },
    ];
    const source = { levels, loadChildren: () => Promise.resolve([]) };
    const resolved = resolvePath(source, [acme, north], {});
    expect(resolved.missing).toEqual([{ key: 'org\u0000', levelId: 'org', parentId: null }]);
    expect(resolved.path.map((node) => node.id)).toEqual(['acme']);
    expect(resolved.isComplete).toBe(false);

    const loaded = resolvePath(source, [acme, north], {
      'org\u0000': { status: 'ready', options: [acme] },
      'region\u0000acme': { status: 'ready', options: [north, south] },
    });
    expect(loaded.path.map((node) => node.id)).toEqual(['acme', 'north']);
    expect(loaded.isComplete).toBe(true);
    expect(loaded.missing).toEqual([]);
  });
});
