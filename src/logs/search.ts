// LogViewer's search: plain text (case-insensitive) or a `/regular expression/flags`, and the match ranges it finds
// in a line's text.

/** A compiled search. `regex` is null when the search is empty or the pattern is invalid. */
export interface LogSearch {
  regex: RegExp | null;
  /** The search is a `/pattern/` whose pattern doesn't compile. */
  isInvalid: boolean;
}

const REGEX_SEARCH = /^\/(.+)\/([a-z]*)$/;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compiles a search: `/pattern/flags` is a regular expression (case-sensitive unless the `i` flag is given); anything
 * else matches literally, ignoring case.
 */
export function compileLogSearch(search: string): LogSearch {
  if (search === '') {
    return { regex: null, isInvalid: false };
  }
  const regexMatch = REGEX_SEARCH.exec(search);
  if (regexMatch) {
    const [, pattern = '', flags = ''] = regexMatch;
    try {
      // `g` finds every match; `y` would anchor them, so it's dropped along with duplicates.
      const cleanFlags = [...new Set(flags.replace(/[gy]/g, ''))].join('');
      return { regex: new RegExp(pattern, `${cleanFlags}g`), isInvalid: false };
    } catch {
      return { regex: null, isInvalid: true };
    }
  }
  return { regex: new RegExp(escapeRegExp(search), 'gi'), isInvalid: false };
}

/** `[start, end)` offsets of each match of `regex` in `text`. Empty matches are skipped. */
export function findMatches(text: string, regex: RegExp | null): [number, number][] {
  if (!regex) {
    return [];
  }
  const ranges: [number, number][] = [];
  regex.lastIndex = 0;
  for (const match of text.matchAll(regex)) {
    if (match[0] !== '') {
      ranges.push([match.index, match.index + match[0].length]);
    }
  }
  return ranges;
}
