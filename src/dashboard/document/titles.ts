// Unique titles within a parent (MGMT-08): generated defaults get a counter ("New page 2"), copies get "copy"
// ("Overview copy", "Overview copy 2"), all through localized message functions.

/** `base`, or `base` with the first counter from 2 that no title in `existing` has yet. */
export function uniqueTitle(
  base: string,
  existing: Iterable<string>,
  numbered: (values: { title: string; count: number }) => string,
): string {
  const taken = new Set(Array.from(existing, (title) => title.trim().toLocaleLowerCase()));
  if (!taken.has(base.trim().toLocaleLowerCase())) {
    return base;
  }
  for (let count = 2; ; count++) {
    const candidate = numbered({ title: base, count });
    if (!taken.has(candidate.trim().toLocaleLowerCase())) {
      return candidate;
    }
  }
}
