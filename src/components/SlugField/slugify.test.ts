import { describe, expect, it } from 'vitest';
import { slugify, slugifyPartial } from './slugify';

describe('slugify', () => {
  it('lower-cases, transliterates accents, hyphenates and collapses repeats', () => {
    expect(slugify('Café Déjà Vu!')).toBe('cafe-deja-vu');
    expect(slugify('  Hello,   World -- again  ')).toBe('hello-world-again');
    expect(slugify('Ærøskøbing Straße')).toBe('aeroskobing-strasse');
    expect(slugify('Łódź & Kraków')).toBe('lodz-krakow');
    expect(slugify('Ada’s notes')).toBe('adas-notes');
    expect(slugify('Moons of Jupiter: Io, Europa (2026)')).toBe('moons-of-jupiter-io-europa-2026');
    expect(slugify('ﬁne ①')).toBe('fine-1');
  });

  it('drops scripts without a Latin spelling, and returns empty for nothing usable', () => {
    expect(slugify('Луна moon')).toBe('moon');
    expect(slugify('!!!')).toBe('');
    expect(slugify('')).toBe('');
  });

  it('cuts at the last hyphen that fits maxLength', () => {
    expect(slugify('The rings of Saturn at opposition', { maxLength: 16 })).toBe('the-rings-of');
    expect(slugify('Supercalifragilistic', { maxLength: 5 })).toBe('super');
    expect(slugify('short', { maxLength: 10 })).toBe('short');
  });
});

describe('slugifyPartial', () => {
  it('keeps a trailing hyphen while typing', () => {
    expect(slugifyPartial('My Post ')).toBe('my-post-');
    expect(slugifyPartial('-lead')).toBe('lead');
    expect(slugifyPartial('A  B')).toBe('a-b');
  });
});
