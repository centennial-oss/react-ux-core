// Checks JSON and says where a problem is. Browsers word JSON.parse errors differently and some give no position at
// all, so a small scanner finds the first problem's line and column.
import type { JsonProblemCode } from '../../provider/messages';

export type { JsonProblemCode };

/** Where and why a text isn't valid JSON. */
export interface JsonProblem {
  code: JsonProblemCode;
  /** Offset in the text, from 0. */
  offset: number;
  /** Line, from 1. */
  line: number;
  /** Column, from 1. */
  column: number;
  /** The character found at the problem, or undefined at the end of the text. */
  found: string | undefined;
}

export type JsonCheck =
  { isValid: true; value: unknown } | { isValid: false; problem: JsonProblem };

class ScanError extends Error {
  constructor(
    readonly code: JsonProblemCode,
    readonly offset: number,
  ) {
    super(code);
  }
}

const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const HEX4 = /^[0-9a-fA-F]{4}$/;

/** Throws a ScanError at the first problem in `text`. */
function scan(text: string): void {
  let i = 0;
  const fail = (code: JsonProblemCode, at = i): never => {
    throw new ScanError(code, at);
  };
  const space = () => {
    while (i < text.length && ' \t\n\r'.includes(text.charAt(i))) i++;
  };
  const string = () => {
    i++;
    while (i < text.length) {
      const c = text.charAt(i);
      if (c === '"') {
        i++;
        return;
      }
      if (c === '\\') {
        const next = text[i + 1];
        if (next !== undefined && '"\\/bfnrt'.includes(next)) i += 2;
        else if (next === 'u' && HEX4.test(text.slice(i + 2, i + 6))) i += 6;
        else fail('escape');
        continue;
      }
      if (c === '\n' || c === '\r') fail('unterminatedString');
      if (c < ' ') fail('controlCharacter');
      i++;
    }
    fail('unterminatedString');
  };
  const value = (): void => {
    space();
    const c = text[i];
    if (c === undefined) return fail('end');
    if (c === '{') {
      object();
      return;
    }
    if (c === '[') {
      array();
      return;
    }
    if (c === '"') {
      string();
      return;
    }
    if (c === '-' || (c >= '0' && c <= '9')) {
      NUMBER.lastIndex = i;
      const match = NUMBER.exec(text);
      if (!match) return fail('number');
      i += match[0].length;
      return;
    }
    for (const literal of ['true', 'false', 'null']) {
      if (text.startsWith(literal, i)) {
        i += literal.length;
        return;
      }
    }
    fail('value');
  };
  const object = () => {
    i++;
    space();
    if (text[i] === '}') {
      i++;
      return;
    }
    for (;;) {
      space();
      if (text[i] === undefined) fail('end');
      if (text[i] !== '"') fail('propertyName');
      string();
      space();
      if (text[i] !== ':') fail(text[i] === undefined ? 'end' : 'colon');
      i++;
      value();
      space();
      if (text[i] === ',') {
        const comma = i;
        i++;
        space();
        if (text[i] === '}') fail('trailingComma', comma);
        continue;
      }
      if (text[i] === '}') {
        i++;
        return;
      }
      fail(text[i] === undefined ? 'end' : 'objectSeparator');
    }
  };
  const array = () => {
    i++;
    space();
    if (text[i] === ']') {
      i++;
      return;
    }
    for (;;) {
      value();
      space();
      if (text[i] === ',') {
        const comma = i;
        i++;
        space();
        if (text[i] === ']') fail('trailingComma', comma);
        continue;
      }
      if (text[i] === ']') {
        i++;
        return;
      }
      fail(text[i] === undefined ? 'end' : 'arraySeparator');
    }
  };
  value();
  space();
  if (i < text.length) fail('extraText');
}

function position(text: string, offset: number): { line: number; column: number } {
  const before = text.slice(0, offset);
  const line = before.split('\n').length;
  return { line, column: offset - before.lastIndexOf('\n') };
}

/** Parses `text` as JSON, or says where and why it isn't valid. */
export function checkJson(text: string): JsonCheck {
  try {
    return { isValid: true, value: JSON.parse(text) as unknown };
  } catch {
    let code: JsonProblemCode = 'value';
    let offset = 0;
    try {
      scan(text);
    } catch (error) {
      if (error instanceof ScanError) {
        code = error.code;
        offset = Math.min(error.offset, text.length);
      }
    }
    return {
      isValid: false,
      problem: { code, offset, ...position(text, offset), found: text[offset] },
    };
  }
}
