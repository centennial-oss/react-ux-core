// Field paths. TanStack Form parses `a.0.b` and `a[0].b` alike, but keys its field state by the string, so ConfigForm
// always uses the bracket form for array indexes.

import { deleteBy, getBy, makePathArray, setBy } from '@tanstack/react-form';

/** The bracket form of a path: `contacts.0.email` → `contacts[0].email`. */
export function normalizePath(path: string): string {
  return makePathArray(path).reduce<string>((result, segment) => {
    if (typeof segment === 'number') {
      return `${result}[${String(segment)}]`;
    }
    return result === '' ? segment : `${result}.${segment}`;
  }, '');
}

/** The path of a field inside an array item: `itemPath('contacts', 0, 'email')` → `contacts[0].email`. */
export function itemPath(arrayName: string, index: number, fieldName: string): string {
  return normalizePath(`${arrayName}[${String(index)}].${fieldName}`);
}

/** The value at `path`, or `undefined`. */
export function getAt(values: unknown, path: string): unknown {
  return getBy(values, path) as unknown;
}

/** A copy of `values` with `value` at `path`. */
export function setAt<T>(values: T, path: string, value: unknown): T {
  return setBy(values, path, () => value) as T;
}

/** A copy of `values` without the key at `path`. */
export function deleteAt<T>(values: T, path: string): T {
  return deleteBy(values, path) as T;
}

/**
 * The field path of an RFC 6901 JSON pointer: `/contacts/0/email` → `contacts[0].email`. Numeric segments become
 * array indexes.
 */
export function pointerToPath(pointer: string): string {
  const segments = pointer
    .replace(/^#/, '')
    .split('/')
    .slice(1)
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));
  return segments.reduce<string>((result, segment) => {
    if (/^(0|[1-9]\d*)$/.test(segment)) {
      return `${result}[${segment}]`;
    }
    return result === '' ? segment : `${result}.${segment}`;
  }, '');
}
