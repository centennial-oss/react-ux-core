// Pattern masks for text inputs, as pure functions. A mask such as `(999) 999-9999` is a row of slots, each taking one
// character of a kind, with literal characters between them. These functions fit typed, pasted or stored text into
// the slots, format a raw value, tell when it's complete, and work out the value and caret after an edit. MaskedField
// and the form's `masked` field are built on them.
//
// Mask syntax:
// - Slots: `9` a digit, `a` a Latin letter, `A` a Latin letter (uppercased), `*` a Latin letter or digit, `&` any
//   character. `tokens` adds slot characters or replaces these.
// - `[…]` an optional part, such as the ZIP+4 extension in `99999[-9999]`: a value is complete without it, but not
//   with it half filled. Optional parts go at the end of a mask, with their separator inside the brackets.
// - `\` makes the next character a literal: `\9`, `\[`.
// - Every other character is a literal, shown between the slots as they fill.
// - A function picks the mask from the raw value so far, for formats that change with the input (card numbers by
//   brand, IBANs by country).
//
// A raw value is the slot characters alone ("5551234567"); formatted text has the literals too ("(555) 123-4567").
// Digits from other scripts and full-width forms read as ASCII. Each slot holds one UTF-16 code unit, so a position in
// formatted text is also a position in the mask.

import { normalizeDigits } from './text';

/** A slot character's rule: the characters it takes, and how a character changes before it's tested. */
export interface MaskToken {
  /** Tested against one character (after `transform`), such as `/[0-9A-F]/`. */
  pattern: RegExp;
  /** Changes a character before it's tested and kept, such as uppercasing it. */
  transform?: (char: string) => string;
}

/** Slot characters and their rules; a RegExp is a rule without a transform. */
export type MaskTokens = Readonly<Record<string, RegExp | MaskToken>>;

/** A mask string, or a function that picks one from the raw value so far (card numbers by brand). */
export type Mask = string | ((raw: string) => string);

/** One position of a parsed mask: a slot, or a literal character. */
export interface MaskPart {
  /** The literal character, or the slot's token character. */
  char: string;
  /** What the slot takes; undefined for a literal. */
  pattern?: RegExp;
  transform?: (char: string) => string;
  /** 0 in the mask's required part, else the number of the optional part it's in (from 1). */
  group: number;
}

/** A mask string, parsed. */
export interface ParsedMask {
  parts: readonly MaskPart[];
  /** The index in `parts` of each slot, in order. */
  slots: readonly number[];
  /** The fewest characters of a complete value: the slots up to the last required one. */
  minLength: number;
  /** Every slot takes only digits, so a numeric keyboard fits. */
  isNumeric: boolean;
  /** Some slot uppercases letters, so a keyboard can start in capitals. */
  isUppercase: boolean;
}

/** A value fitted to a mask. */
export interface MaskedValue {
  /** The slot characters alone. */
  raw: string;
  /** The raw characters with the mask's literals between them, up to the last filled slot. */
  text: string;
  /** Every required slot is filled, and no optional part is half filled. */
  isComplete: boolean;
  /** The mask the value resolved to (for a function mask, the one it picked for this value). */
  parsed: ParsedMask;
}

/** An edit to formatted text, in its positions. */
export interface MaskEdit {
  /** Where the replaced range starts and ends; equal for an insertion at the caret. */
  start: number;
  end: number;
  /** Typed, pasted or dropped text, or `''` for a deletion. */
  text: string;
  /**
   * For a deletion that only covers literals (Backspace or Delete beside a separator), the side to delete a character
   * from instead. Without it such a deletion changes nothing.
   */
  direction?: 'backward' | 'forward';
}

const toUpperCase = (char: string) => char.toUpperCase();

/** The built-in slot characters. */
export const DEFAULT_MASK_TOKENS: MaskTokens = {
  '9': /[0-9]/,
  a: /[A-Za-z]/,
  A: { pattern: /[A-Z]/, transform: toUpperCase },
  '*': /[A-Za-z0-9]/,
  '&': /./s,
};

const NO_TOKENS: MaskTokens = {};
const DIGIT_PROBES = ['0', '5', '9'];
const OTHER_PROBES = ['a', 'Z', ' ', '-', '.'];

/** The character a slot keeps for `char`, transformed, or undefined when it doesn't take it (or is a literal). */
function fitChar(part: MaskPart | undefined, char: string | undefined): string | undefined {
  if (part?.pattern === undefined || char === undefined) {
    return undefined;
  }
  const kept = part.transform ? part.transform(char) : char;
  // A global or sticky pattern keeps its position between calls; start every test from the beginning.
  part.pattern.lastIndex = 0;
  return kept.length === 1 && part.pattern.test(kept) ? kept : undefined;
}

function takesOnlyDigits(part: MaskPart | undefined): boolean {
  return (
    DIGIT_PROBES.some((char) => fitChar(part, char) !== undefined) &&
    OTHER_PROBES.every((char) => fitChar(part, char) === undefined)
  );
}

function parse(mask: string, tokens: MaskTokens): ParsedMask {
  const parts: MaskPart[] = [];
  const slots: number[] = [];
  let group = 0;
  let groupCount = 0;
  let minLength = 0;
  for (let index = 0; index < mask.length; index++) {
    const char = mask.charAt(index);
    if (char === '\\' && index + 1 < mask.length) {
      index++;
      parts.push({ char: mask.charAt(index), group });
    } else if (char === '[' && group === 0) {
      groupCount++;
      group = groupCount;
    } else if (char === ']' && group !== 0) {
      group = 0;
    } else {
      const token: RegExp | MaskToken | undefined = tokens[char] ?? DEFAULT_MASK_TOKENS[char];
      if (token === undefined) {
        parts.push({ char, group });
        continue;
      }
      slots.push(parts.length);
      parts.push(
        token instanceof RegExp
          ? { char, pattern: token, group }
          : { char, pattern: token.pattern, transform: token.transform, group },
      );
      if (group === 0) {
        minLength = slots.length;
      }
    }
  }
  const slotParts = slots.map((index) => parts[index]);
  return {
    parts,
    slots,
    minLength,
    isNumeric: slotParts.length > 0 && slotParts.every(takesOnlyDigits),
    isUppercase: slotParts.some((part) => fitChar(part, 'a') === 'A'),
  };
}

// Parsed masks by tokens object, then by mask string. A function mask returns one of a few strings per keystroke, so
// each is parsed once; the per-tokens map is cleared if it ever grows past the limit.
const parsedMasks = new WeakMap<MaskTokens, Map<string, ParsedMask>>();
const CACHE_LIMIT = 64;

/** Parses a mask string (cached, so the same string and tokens give the same object). */
export function parseMask(mask: string, tokens: MaskTokens = NO_TOKENS): ParsedMask {
  let byMask = parsedMasks.get(tokens);
  if (byMask === undefined) {
    byMask = new Map();
    parsedMasks.set(tokens, byMask);
  }
  let parsed = byMask.get(mask);
  if (parsed === undefined) {
    if (byMask.size >= CACHE_LIMIT) {
      byMask.clear();
    }
    parsed = parse(mask, tokens);
    byMask.set(mask, parsed);
  }
  return parsed;
}

function resolve(mask: Mask, raw: string, tokens: MaskTokens | undefined): ParsedMask {
  return parseMask(typeof mask === 'function' ? mask(raw) : mask, tokens);
}

/** Whether part `index` is the first of an optional part. */
function startsGroup(parts: readonly MaskPart[], index: number): boolean {
  const group = parts[index]?.group ?? 0;
  return group !== 0 && parts[index - 1]?.group !== group;
}

/** The raw characters `text` gives, slot by slot: characters a slot doesn't take are skipped. */
function fillSlots({ parts, slots }: ParsedMask, text: string): string {
  let raw = '';
  for (let index = 0; index < text.length && raw.length < slots.length; index++) {
    const kept = fitChar(parts[slots[raw.length] ?? -1], text[index]);
    if (kept !== undefined) {
      raw += kept;
    }
  }
  return raw;
}

interface Walk {
  /** The characters that went into slots. */
  raw: string;
  /** The part after the last slot filled or literal matched. */
  cursor: number;
  /** Any character was taken, into a slot or as a literal. */
  isTaken: boolean;
}

/**
 * Fits `text` into the slots from part `from` on, as typed or pasted: a character that matches one of the literals
 * just ahead is taken as that literal (so "(555) 123" and "555123" give the same digits), and any other character
 * fills the next slot, or is dropped when the slot doesn't take it.
 */
function walk({ parts }: ParsedMask, text: string, from: number): Walk {
  let raw = '';
  let cursor = from;
  let isTaken = false;
  for (const char of text) {
    let index = cursor;
    while (parts[index]?.pattern === undefined && index < parts.length) {
      if (parts[index]?.char === char) {
        break;
      }
      index++;
    }
    if (index >= parts.length) {
      break;
    }
    if (parts[index]?.pattern === undefined) {
      cursor = index + 1;
      isTaken = true;
      continue;
    }
    const kept = fitChar(parts[index], char);
    if (kept !== undefined) {
      raw += kept;
      cursor = index + 1;
      isTaken = true;
    }
  }
  return { raw, cursor, isTaken };
}

/**
 * Fits text into a mask. A function mask is asked again with the fitted value until it settles, since what it picks
 * can depend on the characters the first fit kept.
 */
function fit(
  mask: Mask,
  text: string,
  tokens: MaskTokens | undefined,
  hasLiterals: boolean,
): { parsed: ParsedMask; raw: string } {
  const take = (parsed: ParsedMask) =>
    hasLiterals ? walk(parsed, text, 0).raw : fillSlots(parsed, text);
  let parsed = resolve(mask, text, tokens);
  let raw = take(parsed);
  for (let round = 0; round < 3 && typeof mask === 'function'; round++) {
    const next = resolve(mask, raw, tokens);
    if (next === parsed) {
      break;
    }
    parsed = next;
    raw = take(parsed);
  }
  return { parsed, raw };
}

/** `raw` with the mask's literals: up to the last filled slot, or on to the end or the next optional part once full. */
function format({ parts }: ParsedMask, raw: string): string {
  if (raw === '') {
    return '';
  }
  let text = '';
  let filled = 0;
  let end = 0;
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (part === undefined || (filled >= raw.length && startsGroup(parts, index))) {
      break;
    }
    if (part.pattern === undefined) {
      text += part.char;
    } else if (filled < raw.length) {
      text += raw.charAt(filled);
      filled++;
      end = text.length;
    } else {
      // A slot still to fill: the literals before it wait for it.
      return text.slice(0, end);
    }
  }
  return text;
}

function isFilled({ parts, slots, minLength }: ParsedMask, length: number): boolean {
  if (length >= slots.length) {
    return true;
  }
  if (length < minLength) {
    return false;
  }
  // Every slot from here on is optional; the next one must start its part, so no optional part is half filled.
  return (
    length === 0 || parts[slots[length - 1] ?? -1]?.group !== parts[slots[length] ?? -1]?.group
  );
}

/**
 * Fits `value` to `mask`: its raw characters, formatted text and whether it's complete. `value` is raw (characters a
 * slot doesn't take are dropped), or with `isFormatted` text that may include the mask's literals, such as a pasted or
 * stored "(555) 123-4567".
 */
export function applyMask(
  mask: Mask,
  value: string,
  options: { tokens?: MaskTokens; isFormatted?: boolean } = {},
): MaskedValue {
  const { parsed, raw } = fit(
    mask,
    normalizeDigits(value),
    options.tokens,
    options.isFormatted === true,
  );
  return { raw, text: format(parsed, raw), isComplete: isFilled(parsed, raw.length), parsed };
}

/**
 * The mask as a template: every part up to the first optional part not yet started, with `placeholderChar` in each
 * slot, such as "(___) ___-____". Formatted text is always a prefix of it in length, so the rest of the template can be
 * drawn after the text.
 */
export function maskTemplate({ parts, slots }: ParsedMask, raw: string, placeholderChar: string) {
  let template = '';
  let slot = 0;
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (part === undefined || (startsGroup(parts, index) && raw.length <= slot)) {
      break;
    }
    if (part.pattern === undefined) {
      template += part.char;
    } else {
      template += placeholderChar;
      slot++;
    }
  }
  return slots.length === 0 ? '' : template;
}

/** The number of raw characters before `position` in formatted text. */
function rawIndexAt(slots: readonly number[], length: number, position: number): number {
  let index = 0;
  while (index < length && (slots[index] ?? Infinity) < position) {
    index++;
  }
  return index;
}

/** The caret position in formatted text after raw character `index - 1`, or before the first slot for 0. */
function caretAfter({ slots }: ParsedMask, length: number, index: number): number {
  if (length === 0) {
    return 0;
  }
  return index === 0 ? (slots[0] ?? 0) : (slots[index - 1] ?? 0) + 1;
}

/**
 * Applies an edit to a masked value: typing, pasting, dropping, deleting or replacing a selection, in the positions
 * of `applyMask(mask, raw).text`. Inserted text fills the slots from the edit on, skipping or matching literals, and
 * the characters after it shift along; once the mask is full, typing replaces the characters after the caret instead.
 * A deletion that only covers literals deletes the raw character on its `direction` side. Returns the new value and
 * where the caret goes, or `null` when the edit changes nothing (a character no slot takes, or a full mask).
 */
export function editMask(
  mask: Mask,
  raw: string,
  edit: MaskEdit,
  tokens?: MaskTokens,
): (MaskedValue & { caret: number }) | null {
  const parsed = resolve(mask, raw, tokens);
  let before = rawIndexAt(parsed.slots, raw.length, edit.start);
  let after = Math.max(before, rawIndexAt(parsed.slots, raw.length, edit.end));
  const text = normalizeDigits(edit.text);
  if (text === '' && before === after) {
    if (edit.direction === 'backward' && before > 0) {
      before--;
    } else if (edit.direction === 'forward' && after < raw.length) {
      after++;
    } else {
      return null;
    }
  }
  const inserted = walk(parsed, text, caretAfter(parsed, before, before));
  if (text !== '' && !inserted.isTaken) {
    return null;
  }
  // Past the last slot, typed characters replace the ones after them rather than pushing the last ones out.
  const overflow = before + inserted.raw.length + raw.length - after - parsed.slots.length;
  const next = fit(
    mask,
    raw.slice(0, before) + inserted.raw + raw.slice(after + Math.max(0, overflow)),
    tokens,
    false,
  );
  const formatted = format(next.parsed, next.raw);
  const index = Math.min(before + inserted.raw.length, next.raw.length);
  const caret =
    inserted.raw === '' && inserted.isTaken
      ? Math.min(inserted.cursor, formatted.length)
      : caretAfter(next.parsed, next.raw.length, index);
  return {
    raw: next.raw,
    text: formatted,
    isComplete: isFilled(next.parsed, next.raw.length),
    parsed: next.parsed,
    caret,
  };
}
