import type { ReactNode } from 'react';

/** `text` with every regular expression metacharacter escaped, to match it literally. */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * `text` split at any of `separators` (each matched literally; empty ones are ignored) or at matches of a pattern,
 * with every part trimmed and blank parts dropped: pasted lists such as `"a, b,,c\n"` become `['a', 'b', 'c']`.
 */
export function splitText(text: string, separators: readonly string[] | RegExp): string[] {
  let parts = [text];
  if (separators instanceof RegExp) {
    parts = text.split(separators);
  } else {
    const used = separators.filter((separator) => separator !== '');
    if (used.length > 0) {
      parts = text.split(new RegExp(used.map(escapeRegExp).join('|')));
    }
  }
  return parts.map((part) => part.trim()).filter((part) => part !== '');
}

/** An edit to a text: the range of the old text it replaced, and what it put there. */
export interface TextChange {
  /** Where the replaced range starts and ends in the old text; equal for a pure insertion. */
  start: number;
  end: number;
  /** What the edit put in; `''` for a deletion. */
  text: string;
}

/**
 * The edit that turns `before` into `after`, found from the start and end they share. Where repeated characters make
 * the position ambiguous ("aa" to "aaa"), the edit is placed as late as possible.
 */
export function textChange(before: string, after: string): TextChange {
  const shortest = Math.min(before.length, after.length);
  let start = 0;
  while (start < shortest && before[start] === after[start]) {
    start++;
  }
  let end = 0;
  while (
    end < shortest - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) {
    end++;
  }
  return { start, end: before.length - end, text: after.slice(start, after.length - end) };
}

/**
 * The edit that turns `before` into `after`, read with the selection (`start` to `end` in `before`) it was made in:
 * text replacing the selection (typing, pasting, deleting it), or a deletion just before or after a caret (Backspace,
 * Delete). Anything else falls back to `textChange`. The selection places an edit among repeated characters, where
 * `textChange` can only guess.
 */
export function textChangeIn(
  before: string,
  after: string,
  start: number,
  end: number,
): TextChange {
  const tail = before.length - end;
  if (
    after.length - tail >= start &&
    after.startsWith(before.slice(0, start)) &&
    after.endsWith(before.slice(end))
  ) {
    return { start, end, text: after.slice(start, after.length - tail) };
  }
  const removed = before.length - after.length;
  if (start === end && removed > 0) {
    if (start >= removed && before.slice(0, start - removed) + before.slice(start) === after) {
      return { start: start - removed, end: start, text: '' };
    }
    if (before.slice(0, start) + before.slice(start + removed) === after) {
      return { start, end: start + removed, text: '' };
    }
  }
  return textChange(before, after);
}

/**
 * The text an edit put in: what `after` has between the start and end it shares with `before`. Typing "x" in the
 * middle of "ab" gives "x"; deleting gives "".
 */
export function insertedText(before: string, after: string): string {
  return textChange(before, after).text;
}

const DECIMAL_DIGIT = /\p{Nd}/gu;
const IS_DECIMAL_DIGIT = /^\p{Nd}$/u;

/** A decimal digit from any script (Arabic-Indic, Devanagari…) as an ASCII digit. */
function asciiDigit(char: string): string {
  if (char >= '0' && char <= '9') {
    return char;
  }
  const codePoint = char.codePointAt(0) ?? 0;
  // Unicode keeps each script's digits as one run of ten from zero, so the distance from the run's start is the digit
  // (runs that sit back to back, as the mathematical digits do, still give the right digit modulo 10).
  let start = codePoint;
  while (IS_DECIMAL_DIGIT.test(String.fromCodePoint(start - 1))) {
    start -= 1;
  }
  return String((codePoint - start) % 10);
}

/**
 * `text` with full-width and compatibility forms folded (NFKC) and every decimal digit as ASCII, so codes and numbers
 * typed on other keyboards or pasted from other scripts ("١٢٣", "１２３") read as "123".
 */
export function normalizeDigits(text: string): string {
  return text.normalize('NFKC').replace(DECIMAL_DIGIT, asciiDigit);
}

/** `text` with the characters that are special in XML and SVG (`&`, `<`, `>` and `"`) escaped, for text and
 * attribute values in a generated document. */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The plain text of an item with a rich label, for typeahead, filtering and accessible names: its `textValue`, its
 * label when that's a string, or its id.
 */
export function itemText(item: { id: string; label: ReactNode; textValue?: string }): string {
  return item.textValue ?? (typeof item.label === 'string' ? item.label : item.id);
}
