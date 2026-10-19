import { describe, expect, it } from 'vitest';
import { fileExtension, fileKind, fileKindIcon } from './fileKind';

describe('fileKind', () => {
  it('reads the MIME type first', () => {
    expect(fileKind({ name: 'a', type: 'image/png' })).toBe('image');
    expect(fileKind({ name: 'a', type: 'application/pdf' })).toBe('pdf');
    expect(fileKind({ name: 'a', type: 'audio/mpeg' })).toBe('audio');
    expect(fileKind({ name: 'a', type: 'video/webm' })).toBe('video');
    expect(fileKind({ name: 'a', type: 'application/json; charset=utf-8' })).toBe('data');
    expect(fileKind({ name: 'a', type: 'text/csv' })).toBe('data');
    expect(fileKind({ name: 'a', type: 'application/zip' })).toBe('archive');
    expect(fileKind({ name: 'a', type: 'text/plain' })).toBe('text');
  });

  it('falls back to the extension for empty or generic types', () => {
    expect(fileKind({ name: 'Mars.JPG', type: '' })).toBe('image');
    expect(fileKind({ name: 'frames.tar.gz', type: 'application/octet-stream' })).toBe('archive');
    expect(fileKind({ name: 'budget.xlsx' })).toBe('spreadsheet');
    expect(fileKind({ name: 'report.docx' })).toBe('document');
    expect(fileKind({ name: 'config.yaml', type: 'text/plain' })).toBe('data');
    expect(fileKind({ name: 'mystery.bin' })).toBe('other');
    expect(fileKind({ name: 'README' })).toBe('other');
  });

  it('finds extensions and icons', () => {
    expect(fileExtension('a.b.CSV')).toBe('csv');
    expect(fileExtension('.env')).toBe('');
    expect(fileExtension('Makefile')).toBe('');
    expect(fileKindIcon('archive')).not.toBe(fileKindIcon('image'));
  });
});
