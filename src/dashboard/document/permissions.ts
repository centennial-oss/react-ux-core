// Effective permissions (§15, PERM-01): the collection's, then the dashboard's lock, then the page's lock, then the
// host's callback, which can only take permissions away. Without any permission data, everything is read-only.

import type { DashboardPermissions, PermissionTarget } from '../types';

/** Nothing allowed: the default without permission data. */
export const READ_ONLY: DashboardPermissions = {
  canEdit: false,
  canAddDashboard: false,
  canDeleteDashboard: false,
  canAddPage: false,
  canDeletePage: false,
  canReorder: false,
  canChangeGridSettings: false,
  canLockWidgets: false,
};

const keys = Object.keys(READ_ONLY) as (keyof DashboardPermissions)[];

/** What the user may do with `target` (PERM-01). */
export function effectivePermissions(
  target: PermissionTarget,
  getPermissions?: (target: PermissionTarget) => Partial<DashboardPermissions>,
): DashboardPermissions {
  const granted = target.collection.permissions ?? {};
  const isLocked =
    (target.kind !== 'collection' && target.dashboard.isLocked === true) ||
    (target.kind === 'page' && target.page.isLocked === true);
  const host = getPermissions?.(target);
  const result = { ...READ_ONLY };
  for (const key of keys) {
    // A lock turns off editing; locked items can still be reordered where the collection allows it (MGMT-07).
    const isLockedOut = isLocked && key !== 'canReorder';
    result[key] = granted[key] === true && !isLockedOut && host?.[key] !== false;
  }
  return result;
}
