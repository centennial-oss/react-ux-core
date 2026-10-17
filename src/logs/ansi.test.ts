import { describe, expect, it } from 'vitest';
import { parseAnsi, stripAnsi } from './ansi';
import { logFileText, type LogLine } from './format';
import { compileLogSearch, findMatches } from './search';

const ESC = '\u001b';

describe('parseAnsi', () => {
  it('returns plain text as one segment, and nothing for an empty string', () => {
    expect(parseAnsi('Dome open')).toEqual([{ text: 'Dome open' }]);
    expect(parseAnsi('')).toEqual([]);
  });

  it('splits colours and styles into segments and resets on 0', () => {
    expect(parseAnsi(`${ESC}[1;31mShutter timeout${ESC}[0m on exposure 2`)).toEqual([
      { text: 'Shutter timeout', color: 'red', isBold: true },
      { text: ' on exposure 2' },
    ]);
  });

  it('maps bright, background, 256-colour and true-colour codes to the eight colours', () => {
    expect(parseAnsi(`${ESC}[92mok`)[0]).toMatchObject({ color: 'green' });
    expect(parseAnsi(`${ESC}[41;97mfault`)[0]).toMatchObject({ color: 'white', background: 'red' });
    expect(parseAnsi(`${ESC}[38;5;21mblue`)[0]).toMatchObject({ color: 'blue' });
    expect(parseAnsi(`${ESC}[38;2;250;210;0mamber`)[0]).toMatchObject({ color: 'yellow' });
    expect(parseAnsi(`${ESC}[48;5;1mbg`)[0]).toMatchObject({ background: 'red' });
  });

  it('turns individual attributes off and merges runs with the same style', () => {
    const segments = parseAnsi(`${ESC}[3;4mtilt${ESC}[23m ed${ESC}[24m plain${ESC}[39m!`);
    expect(segments).toEqual([
      { text: 'tilt', isItalic: true, isUnderline: true },
      { text: ' ed', isUnderline: true },
      { text: ' plain!' },
    ]);
  });

  it('drops other escape sequences (cursor movement, OSC titles and links)', () => {
    const text = `${ESC}[2K${ESC}[1Gstep 3${ESC}]0;title${ESC}\\ done${ESC}]8;;https://example.com\u0007link`;
    expect(
      parseAnsi(text)
        .map((segment) => segment.text)
        .join(''),
    ).toBe('step 3 donelink');
    expect(stripAnsi(text)).toBe('step 3 donelink');
  });

  it('keeps markup as text', () => {
    expect(parseAnsi(`${ESC}[31m<img src=x onerror=alert(1)>`)).toEqual([
      { text: '<img src=x onerror=alert(1)>', color: 'red' },
    ]);
  });
});

describe('compileLogSearch', () => {
  it('matches plain text literally, ignoring case', () => {
    const { regex, isInvalid } = compileLogSearch('m31 (r)');
    expect(isInvalid).toBe(false);
    expect(findMatches('Slewing to M31 (R) then m31 (r)', regex)).toEqual([
      [11, 18],
      [24, 31],
    ]);
  });

  it('treats /pattern/flags as a regular expression', () => {
    const { regex } = compileLogSearch('/exposure \\d+/i');
    expect(findMatches('Exposure 12 and exposure 3', regex)).toEqual([
      [0, 11],
      [16, 26],
    ]);
    expect(findMatches('Exposure 12', compileLogSearch('/exposure/').regex)).toEqual([]);
  });

  it('flags an invalid pattern and matches nothing', () => {
    expect(compileLogSearch('/(unclosed/')).toEqual({ regex: null, isInvalid: true });
    expect(compileLogSearch('')).toEqual({ regex: null, isInvalid: false });
  });

  it('skips empty matches', () => {
    expect(findMatches('abc', compileLogSearch('/x*/').regex)).toEqual([]);
  });
});

describe('logFileText', () => {
  it('writes one plain line per entry with ISO timestamps, levels, sources and fields', () => {
    const lines: LogLine[] = [
      {
        id: '1',
        at: Date.UTC(2026, 9, 14, 22, 0, 0),
        level: 'error',
        source: 'camera-1',
        message: `${ESC}[31mShutter timeout${ESC}[0m`,
        fields: { exposure: 2 },
      },
      { id: '2', message: 'no time or level' },
    ];
    expect(logFileText(lines)).toBe(
      '2026-10-14T22:00:00.000Z ERROR camera-1 Shutter timeout {"exposure":2}\nno time or level\n',
    );
  });
});
