/** Anything navigable: an id, a link, and optional children of the same kind. */
interface Linked<T> {
  id: string;
  href: string;
  children?: readonly T[];
}

/** Every item, parents before their children. */
export function flattenItems<T extends Linked<T>>(items: readonly T[]): T[] {
  return items.flatMap((item) => [item, ...flattenItems(item.children ?? [])]);
}

function pathOf(href: string): string {
  // Ignore any query or fragment, and a trailing slash (except the root).
  const path = href.split(/[?#]/, 1)[0] ?? '';
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

function isUnder(currentPath: string, href: string): boolean {
  const current = pathOf(currentPath);
  const target = pathOf(href);
  if (target === '') {
    return false;
  }
  return current === target || current.startsWith(target === '/' ? '/' : `${target}/`);
}

/**
 * The id of the current item: the one `isActive` picks, or else the item whose `href` matches `currentPath` most
 * specifically. Undefined when nothing matches.
 */
export function findActiveId<T extends Linked<T>>(
  items: readonly T[],
  currentPath: string | undefined,
  isActive: ((item: T) => boolean) | undefined,
): string | undefined {
  const all = flattenItems(items);
  if (isActive) {
    return all.find((item) => isActive(item))?.id;
  }
  if (currentPath === undefined) {
    return undefined;
  }
  let best: T | undefined;
  for (const item of all) {
    if (
      isUnder(currentPath, item.href) &&
      pathOf(item.href).length > pathOf(best?.href ?? '').length
    ) {
      best = item;
    }
  }
  // The root ("/") only matches itself, or it would contain every page.
  if (best && pathOf(best.href) === '/' && pathOf(currentPath) !== '/') {
    return undefined;
  }
  return best?.id;
}

/** Whether the item or one of its descendants is the current item. */
export function containsId<T extends Linked<T>>(item: T, id: string | undefined): boolean {
  if (id === undefined) {
    return false;
  }
  return item.id === id || (item.children ?? []).some((child) => containsId(child, id));
}
