// The diff engine behind DiffViewer and PlanReview, with no dependency: Myers' O(ND) algorithm in its linear-space
// form (divide and conquer on the "middle snake"), line and word diffs, hunks with context, and a structural
// normaliser that sorts object keys so reordered keys aren't changes.

import { sortKeysDeep } from '../utils/collections';

/** One side of an edit: kept, added (only in `after`) or removed (only in `before`). */
export type DiffChange = 'equal' | 'added' | 'removed';

/** A line of a line diff, numbered on the side or sides it appears on (1-based). */
export interface DiffLine {
  type: DiffChange;
  text: string;
  /** The line's number in `before`; absent for added lines. */
  beforeNumber?: number;
  /** The line's number in `after`; absent for removed lines. */
  afterNumber?: number;
}

/** A run of text in a word diff. */
export interface DiffSpan {
  type: DiffChange;
  text: string;
}

/** A run of shown lines around one or more changes, as indices into the `DiffLine` list (`end` exclusive). */
export interface DiffHunk {
  start: number;
  end: number;
  /** First line number and line count on each side, as in a unified diff's `@@ -a,b +c,d @@` header. */
  beforeStart: number;
  beforeCount: number;
  afterStart: number;
  afterCount: number;
  added: number;
  removed: number;
}

/** Unchanged lines hidden between (or around) hunks, as indices into the `DiffLine` list (`end` exclusive). */
export interface DiffGap {
  start: number;
  end: number;
}

/** A diff's lines, hunks and collapsed gaps, in display order. */
export interface DiffLayout {
  lines: DiffLine[];
  hunks: DiffHunk[];
  gaps: DiffGap[];
  added: number;
  removed: number;
}

type Equals<T> = (a: T, b: T) => boolean;

const sameValue = <T>(a: T, b: T) => a === b;

/**
 * Finds the middle snake of `a[aLo, aHi)` against `b[bLo, bHi)`: the stretch of matches where the forward and
 * reverse searches meet, and the edit distance `d`. Positions are relative to `aLo` and `bLo`.
 */
function middleSnake<T>(
  a: readonly T[],
  aLo: number,
  aHi: number,
  b: readonly T[],
  bLo: number,
  bHi: number,
  equals: Equals<T>,
): { x: number; y: number; u: number; v: number; d: number } {
  const n = aHi - aLo;
  const m = bHi - bLo;
  const delta = n - m;
  const isOdd = (delta & 1) !== 0;
  const max = Math.ceil((n + m) / 2);
  const offset = max + 1;
  // Furthest x reached on each diagonal k (x - y), forward and backward (backward counts from the ends).
  const forward = new Int32Array(2 * max + 3);
  const backward = new Int32Array(2 * max + 3);

  for (let d = 0; d <= max; d++) {
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && (forward[offset + k - 1] ?? 0) < (forward[offset + k + 1] ?? 0))
          ? (forward[offset + k + 1] ?? 0)
          : (forward[offset + k - 1] ?? 0) + 1;
      let y = x - k;
      const startX = x;
      const startY = y;
      while (x < n && y < m && equals(a[aLo + x] as T, b[bLo + y] as T)) {
        x++;
        y++;
      }
      forward[offset + k] = x;
      // The reverse search has done d - 1 steps; it covers forward diagonals delta - (d - 1) … delta + (d - 1).
      if (isOdd && k >= delta - (d - 1) && k <= delta + (d - 1)) {
        if (x + (backward[offset + delta - k] ?? 0) >= n) {
          return { x: startX, y: startY, u: x, v: y, d: 2 * d - 1 };
        }
      }
    }
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && (backward[offset + k - 1] ?? 0) < (backward[offset + k + 1] ?? 0))
          ? (backward[offset + k + 1] ?? 0)
          : (backward[offset + k - 1] ?? 0) + 1;
      let y = x - k;
      const startX = x;
      const startY = y;
      while (x < n && y < m && equals(a[aHi - 1 - x] as T, b[bHi - 1 - y] as T)) {
        x++;
        y++;
      }
      backward[offset + k] = x;
      // Backward diagonal k is forward diagonal delta - k.
      if (!isOdd && delta - k >= -d && delta - k <= d) {
        if (x + (forward[offset + delta - k] ?? 0) >= n) {
          return { x: n - x, y: m - y, u: n - startX, v: m - startY, d: 2 * d };
        }
      }
    }
  }
  // Unreachable: the searches always meet by d = max.
  return { x: 0, y: 0, u: n, v: m, d: n + m };
}

/** Pairs of matching indices `[i, j]` (a longest common subsequence), in order. */
function matchSequences<T>(
  a: readonly T[],
  b: readonly T[],
  equals: Equals<T>,
): [number, number][] {
  const matches: [number, number][] = [];
  const compare = (aLo: number, aHi: number, bLo: number, bHi: number) => {
    while (aLo < aHi && bLo < bHi && equals(a[aLo] as T, b[bLo] as T)) {
      matches.push([aLo, bLo]);
      aLo++;
      bLo++;
    }
    let suffix = 0;
    while (
      aLo < aHi - suffix &&
      bLo < bHi - suffix &&
      equals(a[aHi - 1 - suffix] as T, b[bHi - 1 - suffix] as T)
    ) {
      suffix++;
    }
    const aEnd = aHi - suffix;
    const bEnd = bHi - suffix;
    if (aLo < aEnd && bLo < bEnd) {
      const snake = middleSnake(a, aLo, aEnd, b, bLo, bEnd, equals);
      const isWhole =
        snake.x === 0 && snake.y === 0 && snake.u === aEnd - aLo && snake.v === bEnd - bLo;
      // With the common ends trimmed, d is at least 2 and each half is strictly smaller; the guard is defensive.
      if (snake.d > 1 && !isWhole) {
        compare(aLo, aLo + snake.x, bLo, bLo + snake.y);
        for (let step = 0; step < snake.u - snake.x; step++) {
          matches.push([aLo + snake.x + step, bLo + snake.y + step]);
        }
        compare(aLo + snake.u, aEnd, bLo + snake.v, bEnd);
      }
    }
    for (let step = 0; step < suffix; step++) {
      matches.push([aEnd + step, bEnd + step]);
    }
  };
  compare(0, a.length, 0, b.length);
  return matches;
}

/**
 * The shortest edit script from `a` to `b` (Myers' algorithm, linear space), as a list of kept, removed and added
 * items. Removals come before additions within each change.
 */
export function diffSequences<T>(
  a: readonly T[],
  b: readonly T[],
  equals: Equals<T> = sameValue,
): { type: DiffChange; item: T; aIndex?: number; bIndex?: number }[] {
  const result: { type: DiffChange; item: T; aIndex?: number; bIndex?: number }[] = [];
  let i = 0;
  let j = 0;
  const flush = (aStop: number, bStop: number) => {
    for (; i < aStop; i++) {
      result.push({ type: 'removed', item: a[i] as T, aIndex: i });
    }
    for (; j < bStop; j++) {
      result.push({ type: 'added', item: b[j] as T, bIndex: j });
    }
  };
  for (const [mi, mj] of matchSequences(a, b, equals)) {
    flush(mi, mj);
    result.push({ type: 'equal', item: a[mi] as T, aIndex: mi, bIndex: mj });
    i = mi + 1;
    j = mj + 1;
  }
  flush(a.length, b.length);
  return result;
}

/** Splits text into lines. A final newline doesn't start an extra empty line; `\r\n` counts as one break. */
export function splitLines(text: string): string[] {
  if (text === '') {
    return [];
  }
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length > 1 && lines.at(-1) === '') {
    lines.pop();
  }
  return lines;
}

/** A line-by-line diff of two texts, each line numbered on its side(s). */
export function diffLines(before: string, after: string): DiffLine[] {
  return diffSequences(splitLines(before), splitLines(after)).map(
    ({ type, item, aIndex, bIndex }) => ({
      type,
      text: item,
      ...(aIndex === undefined ? {} : { beforeNumber: aIndex + 1 }),
      ...(bIndex === undefined ? {} : { afterNumber: bIndex + 1 }),
    }),
  );
}

/** Words, runs of whitespace, and single punctuation marks: the units of a word diff. */
function tokenizeWords(text: string): string[] {
  return text.match(/[\p{L}\p{N}_]+|\s+|[^\p{L}\p{N}_\s]/gu) ?? [];
}

/**
 * A word-level diff of two strings (usually one changed line before and after), merged into runs. Whitespace between
 * two changes joins them, so "a b c" → "x y z" is one change rather than three.
 */
export function diffWords(before: string, after: string): DiffSpan[] {
  const edits = diffSequences(tokenizeWords(before), tokenizeWords(after));
  // A whitespace-only run of kept tokens between two changes becomes part of the change on both sides.
  const marked: { type: DiffChange; text: string }[] = [];
  for (let index = 0; index < edits.length; index++) {
    const edit = edits[index];
    if (!edit) {
      continue;
    }
    if (edit.type === 'equal' && /^\s+$/.test(edit.item)) {
      const previous = edits[index - 1];
      const next = edits[index + 1];
      if (previous && next && previous.type !== 'equal' && next.type !== 'equal') {
        marked.push({ type: 'removed', text: edit.item }, { type: 'added', text: edit.item });
        continue;
      }
    }
    marked.push({ type: edit.type, text: edit.item });
  }
  // Within each change, removals first, then additions; adjacent runs of the same kind merge.
  const spans: DiffSpan[] = [];
  let removed = '';
  let added = '';
  const flushChange = () => {
    if (removed !== '') {
      spans.push({ type: 'removed', text: removed });
    }
    if (added !== '') {
      spans.push({ type: 'added', text: added });
    }
    removed = '';
    added = '';
  };
  for (const span of marked) {
    if (span.type === 'removed') {
      removed += span.text;
    } else if (span.type === 'added') {
      added += span.text;
    } else {
      flushChange();
      const last = spans.at(-1);
      if (last?.type === 'equal') {
        last.text += span.text;
      } else {
        spans.push({ type: 'equal', text: span.text });
      }
    }
  }
  flushChange();
  return spans;
}

/** Character ranges `[start, end)` changed on one side of a word diff. */
export type DiffRange = readonly [start: number, end: number];

/**
 * The changed character ranges on each side of a word diff of two lines, or null when the lines share too little
 * (under `minSimilarity` of their characters) for word highlights to help.
 */
export function wordDiffRanges(
  before: string,
  after: string,
  minSimilarity = 0.4,
): { before: DiffRange[]; after: DiffRange[] } | null {
  const spans = diffWords(before, after);
  const ranges = { before: [] as [number, number][], after: [] as [number, number][] };
  let beforeAt = 0;
  let afterAt = 0;
  let kept = 0;
  for (const span of spans) {
    const length = span.text.length;
    if (span.type === 'equal') {
      kept += span.text.trim() === '' ? 0 : length;
      beforeAt += length;
      afterAt += length;
    } else if (span.type === 'removed') {
      ranges.before.push([beforeAt, beforeAt + length]);
      beforeAt += length;
    } else {
      ranges.after.push([afterAt, afterAt + length]);
      afterAt += length;
    }
  }
  const total = Math.max(before.trim().length, after.trim().length);
  if (total > 0 && kept / total < minSimilarity) {
    return null;
  }
  return ranges;
}

export { sortKeysDeep };

/** A value as pretty-printed JSON with its object keys sorted: the text a structural diff compares. */
export function stringifyStructural(value: unknown): string {
  if (value === undefined) {
    return '';
  }
  return JSON.stringify(sortKeysDeep(value), null, 2);
}

/**
 * Normalises structured text for a structural diff: parses it (JSON by default, or with `parse`, such as a YAML
 * parser), sorts object keys and pretty-prints it. Returns null when the text can't be parsed. Empty text stays empty.
 */
export function structuralNormalize(
  text: string,
  parse: (text: string) => unknown = JSON.parse,
): string | null {
  if (text.trim() === '') {
    return '';
  }
  try {
    return stringifyStructural(parse(text));
  } catch {
    return null;
  }
}

/**
 * Groups a line diff into hunks: each change with `context` unchanged lines either side. Longer runs of unchanged
 * lines become gaps a viewer can collapse; a gap of a single line is shown instead (a button to show one line is no
 * shorter than the line).
 */
export function buildHunks(lines: readonly DiffLine[], context = 3): DiffLayout {
  const span = Math.max(0, Math.floor(context));
  const isShown = new Array<boolean>(lines.length).fill(false);
  let added = 0;
  let removed = 0;
  lines.forEach((line, index) => {
    if (line.type === 'equal') {
      return;
    }
    if (line.type === 'added') {
      added++;
    } else {
      removed++;
    }
    for (
      let near = Math.max(0, index - span);
      near <= Math.min(lines.length - 1, index + span);
      near++
    ) {
      isShown[near] = true;
    }
  });

  // A hidden run of one line is shown, joining the hunks either side.
  if (added + removed > 0) {
    for (let index = 0; index < lines.length; index++) {
      const isAlone =
        (index === 0 || isShown[index - 1] === true) &&
        (index === lines.length - 1 || isShown[index + 1] === true);
      if (!isShown[index] && isAlone) {
        isShown[index] = true;
      }
    }
  }

  const hunks: DiffHunk[] = [];
  const gaps: DiffGap[] = [];
  let index = 0;
  while (index < lines.length) {
    const start = index;
    const shown = isShown[index];
    while (index < lines.length && isShown[index] === shown) {
      index++;
    }
    if (!shown) {
      gaps.push({ start, end: index });
      continue;
    }
    const run = lines.slice(start, index);
    const firstBefore = run.find((line) => line.beforeNumber !== undefined)?.beforeNumber;
    const firstAfter = run.find((line) => line.afterNumber !== undefined)?.afterNumber;
    const beforeCount = run.filter((line) => line.type !== 'added').length;
    const afterCount = run.filter((line) => line.type !== 'removed').length;
    // An empty side starts at the line before the hunk, as unified diffs do ("-0,0" for a new file).
    const lineBefore = (side: 'beforeNumber' | 'afterNumber') => {
      for (let back = start - 1; back >= 0; back--) {
        const number = lines[back]?.[side];
        if (number !== undefined) {
          return number;
        }
      }
      return 0;
    };
    hunks.push({
      start,
      end: index,
      beforeStart: firstBefore ?? lineBefore('beforeNumber'),
      beforeCount,
      afterStart: firstAfter ?? lineBefore('afterNumber'),
      afterCount,
      added: run.filter((line) => line.type === 'added').length,
      removed: run.filter((line) => line.type === 'removed').length,
    });
  }

  // With no changes at all there are no hunks, and everything is one gap.
  return { lines: [...lines], hunks: added + removed === 0 ? [] : hunks, gaps, added, removed };
}
