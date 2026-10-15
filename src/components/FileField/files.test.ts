import { describe, expect, it } from 'vitest';
import { acceptsFile, formatFileSize, uploadErrorMessage } from './files';

const file = (name: string, type: string) => new File([], name, { type });

describe('acceptsFile', () => {
  it('matches MIME types, wildcards and extensions, ignoring case', () => {
    expect(acceptsFile(file('a.pdf', 'application/pdf'), ['application/pdf'])).toBe(true);
    expect(acceptsFile(file('a.PNG', 'image/png'), ['image/*'])).toBe(true);
    expect(acceptsFile(file('Data.CSV', ''), ['.csv'])).toBe(true);
    expect(acceptsFile(file('a.png', 'image/png'), ['application/pdf', '.csv'])).toBe(false);
    expect(acceptsFile(file('a.png', 'image/png'), ['video/*'])).toBe(false);
  });

  it('accepts everything without a list', () => {
    expect(acceptsFile(file('a.bin', ''), undefined)).toBe(true);
    expect(acceptsFile(file('a.bin', ''), [])).toBe(true);
  });
});

describe('formatFileSize', () => {
  it('formats sizes in 1024 steps with Intl units', () => {
    expect(formatFileSize(830, 'en-US')).toBe('830 byte');
    expect(formatFileSize(1536, 'en-US')).toBe('1.5 kB');
    expect(formatFileSize(5 * 1024 * 1024, 'en-US')).toBe('5 MB');
    expect(formatFileSize(12.4 * 1024 * 1024 * 1024, 'en-US')).toBe('12 GB');
    expect(formatFileSize(1536, 'de-DE')).toBe('1,5 kB');
  });
});

describe('uploadErrorMessage', () => {
  it('uses the error’s message, or the fallback', () => {
    expect(uploadErrorMessage(new Error('Quota exceeded'), 'Failed')).toBe('Quota exceeded');
    expect(uploadErrorMessage(new Error(' '), 'Failed')).toBe('Failed');
    expect(uploadErrorMessage('nope', 'Failed')).toBe('Failed');
  });
});
