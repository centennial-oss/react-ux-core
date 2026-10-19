// ARIA attribute helpers.

/**
 * Joins element ids for `aria-describedby` or `aria-labelledby`, skipping missing ones. Returns `undefined` rather
 * than an empty string when there are none, so the attribute is left off.
 */
export function joinIds(...ids: (string | false | null | undefined)[]): string | undefined {
  const joined = ids.filter((id): id is string => typeof id === 'string' && id !== '').join(' ');
  return joined === '' ? undefined : joined;
}
