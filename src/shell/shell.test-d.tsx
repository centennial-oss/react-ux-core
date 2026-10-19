import { describe, expectTypeOf, it } from 'vitest';
import type { HierarchyPickerProps } from './hierarchy/HierarchyPicker';
import type { BottomTabItem, NavItem } from './types';

const base = { value: [], onSelect: () => undefined };
const levels = [{ id: 'org', label: 'Organisation' }];

describe('shell types', () => {
  it('takes a tree or levels with a loader, not both', () => {
    expectTypeOf({ ...base, tree: [] }).toExtend<HierarchyPickerProps>();
    expectTypeOf({
      ...base,
      levels,
      loadChildren: () => Promise.resolve([]),
    }).toExtend<HierarchyPickerProps>();
    expectTypeOf({
      ...base,
      tree: [],
      levels,
      loadChildren: () => Promise.resolve([]),
    }).not.toExtend<HierarchyPickerProps>();
    // A loader needs its levels.
    expectTypeOf({
      ...base,
      loadChildren: () => Promise.resolve([]),
    }).not.toExtend<HierarchyPickerProps>();
  });

  it('needs an icon on every bottom tab, but not on navigation items', () => {
    expectTypeOf({ id: 'a', label: 'A', href: '/a' }).toExtend<NavItem>();
    expectTypeOf({ id: 'a', label: 'A', href: '/a' }).not.toExtend<BottomTabItem>();
  });
});
