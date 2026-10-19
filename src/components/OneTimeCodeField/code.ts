// One-time code text handling, kept apart from the component so it's tested on its own.

import { normalizeDigits } from '../../utils/text';

/** Which characters a code takes: `digits`, `alphanumeric` (Latin letters, uppercased, and digits), or a pattern. */
export type OneTimeCodeCharacters = 'digits' | 'alphanumeric' | RegExp;

/** The code length when neither `codeLength` nor `groupSizes` gives one. */
export const DEFAULT_CODE_LENGTH = 6;

const ASCII_DIGIT = /^[0-9]$/;
const ALPHANUMERIC = /^[A-Z0-9]$/;

/** The code's length: `codeLength`, else the sum of `groupSizes`, else 6. */
export function resolveCodeLength(codeLength?: number, groupSizes?: readonly number[]): number {
  if (codeLength !== undefined) {
    return Math.max(1, Math.floor(codeLength));
  }
  const total = (groupSizes ?? []).reduce((sum, size) => sum + Math.max(0, Math.floor(size)), 0);
  return total > 0 ? total : DEFAULT_CODE_LENGTH;
}

/**
 * The cells in each visual group, adding up to `length`: `groupSizes` in order, the last one repeating if they run
 * out (`[3]` for 9 cells is 3 + 3 + 3), the last group cut short if they run over. One group without sizes.
 */
export function codeGroups(length: number, groupSizes?: readonly number[]): number[] {
  const sizes = (groupSizes ?? []).map((size) => Math.floor(size)).filter((size) => size > 0);
  if (sizes.length === 0) {
    return [length];
  }
  const groups: number[] = [];
  let left = length;
  for (let index = 0; left > 0; index += 1) {
    const size = Math.min(left, sizes[Math.min(index, sizes.length - 1)] ?? left);
    groups.push(size);
    left -= size;
  }
  return groups;
}

function isAllowed(char: string, characters: OneTimeCodeCharacters): boolean {
  if (characters === 'digits') {
    return ASCII_DIGIT.test(char);
  }
  if (characters === 'alphanumeric') {
    return ALPHANUMERIC.test(char);
  }
  // A global or sticky pattern keeps its position between calls; start every test from the beginning.
  characters.lastIndex = 0;
  return characters.test(char);
}

/**
 * The characters of `text` a code takes, normalised: full-width forms and digits from other scripts become ASCII,
 * letters are uppercased for `alphanumeric`, and everything else (spaces, hyphens, words around a pasted code) is
 * dropped.
 */
export function cleanCode(text: string, characters: OneTimeCodeCharacters): string {
  let code = '';
  for (const raw of normalizeDigits(text)) {
    const char = characters === 'alphanumeric' ? raw.toUpperCase() : raw;
    if (isAllowed(char, characters)) {
      code += char;
    }
  }
  return code;
}
