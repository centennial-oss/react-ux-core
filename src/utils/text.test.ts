import { describe, expect, it } from 'vitest';
import {
  escapeRegExp,
  escapeXml,
  insertedText,
  itemText,
  normalizeDigits,
  splitText,
  textChange,
  textChangeIn,
} from './text';

describe('escapeRegExp', () => {
  it('matches text literally', () => {
    const text = 'a.b*c (1+1) [x] {2} ^$ | \\';
    expect(new RegExp(escapeRegExp(text)).test(`before ${text} after`)).toBe(true);
    expect(new RegExp(escapeRegExp('a.b')).test('axb')).toBe(false);
  });
});

describe('splitText', () => {
  it('splits at any separator, literally, trimming and dropping blank parts', () => {
    expect(splitText(' a, b,,c\n d \r\n', [',', '\n', '\r'])).toEqual(['a', 'b', 'c', 'd']);
    expect(splitText('a.b|c', ['.', '|'])).toEqual(['a', 'b', 'c']);
    expect(splitText('a::b:c', ['::'])).toEqual(['a', 'b:c']);
  });

  it('keeps the whole trimmed text without separators', () => {
    expect(splitText('  a, b ', [])).toEqual(['a, b']);
    expect(splitText('a,b', [''])).toEqual(['a,b']);
    expect(splitText('   ', [','])).toEqual([]);
  });

  it('splits at matches of a pattern', () => {
    expect(splitText(' 10.0.0.0/8,\u00a0192.168.0.0/16;; fd00::/8 ', /[\s,;]+/)).toEqual([
      '10.0.0.0/8',
      '192.168.0.0/16',
      'fd00::/8',
    ]);
  });
});

describe('insertedText', () => {
  it('finds what an edit put in, wherever it was', () => {
    expect(insertedText('ab', 'axb')).toBe('x');
    expect(insertedText('c, d', 'c, dx')).toBe('x');
    expect(insertedText('abc', 'a,c')).toBe(',');
    expect(insertedText('', 'pasted')).toBe('pasted');
    expect(insertedText('aa', 'aaa')).toBe('a');
  });

  it('is empty for a deletion or no change', () => {
    expect(insertedText('abc', 'ac')).toBe('');
    expect(insertedText('abc', 'abc')).toBe('');
    expect(insertedText('abc', '')).toBe('');
  });
});

describe('textChange', () => {
  it('finds the replaced range and the text put in', () => {
    expect(textChange('ab', 'axb')).toEqual({ start: 1, end: 1, text: 'x' });
    expect(textChange('abc', 'ac')).toEqual({ start: 1, end: 2, text: '' });
    expect(textChange('abc', 'aXYc')).toEqual({ start: 1, end: 2, text: 'XY' });
    expect(textChange('abc', '')).toEqual({ start: 0, end: 3, text: '' });
    expect(textChange('abc', 'abc')).toEqual({ start: 3, end: 3, text: '' });
    // Repeated characters put the edit as late as possible.
    expect(textChange('aa', 'aaa')).toEqual({ start: 2, end: 2, text: 'a' });
  });
});

describe('textChangeIn', () => {
  it('places an edit at the selection it was made in', () => {
    // Typing "a" with the caret after the first "a" of "aa".
    expect(textChangeIn('aa', 'aaa', 1, 1)).toEqual({ start: 1, end: 1, text: 'a' });
    expect(textChangeIn('abcd', 'aXd', 1, 3)).toEqual({ start: 1, end: 3, text: 'X' });
    expect(textChangeIn('abc', 'ac', 1, 2)).toEqual({ start: 1, end: 2, text: '' });
  });

  it('reads a deletion beside a caret as Backspace or Delete', () => {
    expect(textChangeIn('aab', 'ab', 1, 1)).toEqual({ start: 0, end: 1, text: '' });
    expect(textChangeIn('abb', 'ab', 1, 1)).toEqual({ start: 1, end: 2, text: '' });
    // A word deleted before the caret.
    expect(textChangeIn('one two', 'one ', 7, 7)).toEqual({ start: 4, end: 7, text: '' });
  });

  it('falls back to the shared start and end when the selection doesn’t explain the edit', () => {
    expect(textChangeIn('abc', 'xyz', 3, 3)).toEqual({ start: 0, end: 3, text: 'xyz' });
  });
});

describe('normalizeDigits', () => {
  it('reads digits from any script and full-width forms as ASCII', () => {
    expect(normalizeDigits('١٢٣ ۴۵۶')).toBe('123 456');
    expect(normalizeDigits('１２３ＡＢ')).toBe('123AB');
    expect(normalizeDigits('०९ 𝟖')).toBe('09 8');
    expect(normalizeDigits('a1-b2')).toBe('a1-b2');
  });
});

describe('escapeXml', () => {
  it('escapes markup and quotes, ampersands first', () => {
    expect(escapeXml('Q&A <b>"R&D"</b>')).toBe('Q&amp;A &lt;b&gt;&quot;R&amp;D&quot;&lt;/b&gt;');
    expect(escapeXml('&lt;')).toBe('&amp;lt;');
  });
});

describe('itemText', () => {
  it('prefers textValue, then a string label, then the id', () => {
    expect(itemText({ id: 'x', label: 'Label', textValue: 'Text' })).toBe('Text');
    expect(itemText({ id: 'x', label: 'Label' })).toBe('Label');
    expect(itemText({ id: 'x', label: null })).toBe('x');
  });
});
