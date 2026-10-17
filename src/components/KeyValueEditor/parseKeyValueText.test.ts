import { describe, expect, it } from 'vitest';
import { isKeyValuePaste, parseKeyValueText } from './parseKeyValueText';

describe('parseKeyValueText', () => {
  it('reads a .env block with comments, export, quotes and inline comments', () => {
    const text = [
      '# Observatory settings',
      'SITE=north-ridge',
      'export TELESCOPE_ID=NR-1',
      '',
      'GREETING="Hello, \\"world\\"\\nSecond line"',
      "RAW='no $expansion here'",
      'LATITUDE=19.82 # degrees',
      'EMPTY=',
      'URL=https://example.com/a=b#frag',
      '  PADDED  =  value  ',
    ].join('\r\n');
    expect(parseKeyValueText(text)).toEqual([
      { key: 'SITE', value: 'north-ridge' },
      { key: 'TELESCOPE_ID', value: 'NR-1' },
      { key: 'GREETING', value: 'Hello, "world"\nSecond line' },
      { key: 'RAW', value: 'no $expansion here' },
      { key: 'LATITUDE', value: '19.82' },
      { key: 'EMPTY', value: '' },
      { key: 'URL', value: 'https://example.com/a=b#frag' },
      { key: 'PADDED', value: 'value' },
    ]);
  });

  it('reads double-quoted values that span lines', () => {
    expect(parseKeyValueText('KEY="line one\nline two"\nNEXT=1')).toEqual([
      { key: 'KEY', value: 'line one\nline two' },
      { key: 'NEXT', value: '1' },
    ]);
  });

  it('reads HTTP-style header lines and bare keys', () => {
    expect(parseKeyValueText('Content-Type: text/html\nCache-Control:no-cache\nX-Flag')).toEqual([
      { key: 'Content-Type', value: 'text/html' },
      { key: 'Cache-Control', value: 'no-cache' },
      { key: 'X-Flag', value: '' },
    ]);
  });

  it('decides when a paste splits into rows', () => {
    expect(isKeyValuePaste('A=1')).toBe(true);
    expect(isKeyValuePaste('A=1\nB=2\n')).toBe(true);
    expect(isKeyValuePaste('X-Header\nY-Header')).toBe(true);
    expect(isKeyValuePaste('Authorization')).toBe(false);
    expect(isKeyValuePaste('Authorization\n')).toBe(false);
  });
});
