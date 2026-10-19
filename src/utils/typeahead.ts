// Typeahead for widgets whose items React Aria doesn't manage: typing the start of an item's name moves to it, as in
// menus and list boxes. Characters typed within a second of each other make one search; typing the same character
// again cycles through the items it starts.

/** How long, in milliseconds, typed characters keep adding to one search. */
const TYPEAHEAD_MS = 1000;

type TypeaheadKeyEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'metaKey'>;

/** Whether a key press types a character to search by: one printable character other than Space, with no Ctrl, Alt or ⌘. */
export function isTypeaheadKey(event: TypeaheadKeyEvent): boolean {
  return (
    event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.altKey && !event.metaKey
  );
}

/** The index of the first item, from `start` and wrapping round, whose text starts with `query` (any case); -1 if none. */
export function findByPrefix<T>(
  items: readonly T[],
  textOf: (item: T) => string,
  query: string,
  start: number,
): number {
  const prefix = query.toLocaleLowerCase();
  for (let offset = 0; offset < items.length; offset++) {
    const index = (start + offset) % items.length;
    const item = items[index];
    if (item !== undefined && textOf(item).toLocaleLowerCase().startsWith(prefix)) {
      return index;
    }
  }
  return -1;
}

/** A typeahead search, kept between key presses. */
export interface Typeahead {
  /**
   * The index of the item to move to after typing `key` (from `isTypeaheadKey`) at `timeStamp` (the event's), with
   * focus on `current` (-1 for none); -1 when nothing matches.
   */
  next: <T>(
    key: string,
    timeStamp: number,
    items: readonly T[],
    textOf: (item: T) => string,
    current: number,
  ) => number;
}

/** A new typeahead search. It needs no timer: the gap between key presses' time stamps ends a search. */
export function createTypeahead(): Typeahead {
  let query = '';
  let lastTime = Number.NEGATIVE_INFINITY;
  return {
    next(key, timeStamp, items, textOf, current) {
      query = timeStamp - lastTime > TYPEAHEAD_MS ? key : query + key;
      lastTime = timeStamp;
      // A new search starts after the current item; a longer one includes it, so "Fi" stays on "File".
      const found = findByPrefix(items, textOf, query, query.length === 1 ? current + 1 : current);
      if (found >= 0 || query !== key.repeat(query.length)) {
        return found;
      }
      return findByPrefix(items, textOf, key, current + 1);
    },
  };
}
