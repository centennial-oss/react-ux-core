// Contrast gate for the avatar colours: the initials (fg) on each chart slot's tint meet WCAG 2.2 AA text contrast in
// the light and dark themes and 7:1 in high contrast. Tones use their bg/fg pairs, which styles/contrast.test.ts checks.

import { describe, expect, it } from 'vitest';
import themesCss from '../../styles/themes.css?raw';
import tokensCss from '../../styles/tokens.css?raw';
import { AVATAR_TINT, avatarColorClasses, avatarColorFor, initialsOf } from './avatarColors';

type Palette = Record<string, string>;

function colorTokens(css: string): Palette {
  return Object.fromEntries(
    [...css.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map((match) => [
      match[1] ?? '',
      match[2] ?? '',
    ]),
  );
}

function themeBlock(selector: string): string {
  const start = themesCss.indexOf(`${selector} {`);
  return themesCss.slice(start, themesCss.indexOf('\n}', start));
}

const light = colorTokens(tokensCss.slice(tokensCss.indexOf('@theme'), tokensCss.indexOf(':root')));
const themes: [string, Palette, number][] = [
  ['light', light, 4.5],
  ['dark', { ...light, ...colorTokens(themeBlock("[data-theme='dark']")) }, 4.5],
  ['high-contrast', { ...light, ...colorTokens(themeBlock("[data-theme='high-contrast']")) }, 7],
];

const channels = (hex: string) =>
  [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));

/** `color-mix(in srgb, a share, b)`: a straight mix of the gamma-encoded channels. */
function mix(a: string, b: string, share: number): number[] {
  const [ca, cb] = [channels(a), channels(b)];
  return ca.map((value, index) => value * share + (cb[index] ?? 0) * (1 - share));
}

function luminance(rgb: number[]): number {
  const [r = 0, g = 0, b = 0] = rgb
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: number[], b: number[]): number {
  const [lighter = 0, darker = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

describe.each(themes)('%s theme avatar tints', (_, palette, minimum) => {
  it.each(Array.from({ length: 10 }, (__, index) => `chart-${String(index + 1)}`))(
    'keeps fg readable on the %s tint',
    (slot) => {
      const tint = mix(palette[slot] ?? '', palette['surface-1'] ?? '', AVATAR_TINT);
      expect(contrast(channels(palette.fg ?? ''), tint)).toBeGreaterThanOrEqual(minimum);
    },
  );
});

describe('avatar colours', () => {
  it('mixes the documented share of each slot', () => {
    expect(avatarColorClasses['chart-3']).toContain(`_${String(AVATAR_TINT * 100)}%`);
  });

  it('spreads names over the palette, stably', () => {
    const names = [
      'Ada Lovelace',
      'Grace Hopper',
      'Alan Turing',
      'Vera Rubin',
      'Carl Sagan',
      'Mae Jemison',
    ];
    const colors = names.map(avatarColorFor);
    expect(new Set(colors).size).toBeGreaterThan(2);
    expect(names.map(avatarColorFor)).toEqual(colors);
    expect(colors).not.toContain('chart-10');
  });

  it('takes initials from the first and last words', () => {
    expect(initialsOf('Ada Lovelace')).toBe('AL');
    expect(initialsOf('  grace  ')).toBe('G');
    expect(initialsOf('Jean-Luc de la Croix')).toBe('JC');
    expect(initialsOf('')).toBe('');
  });
});
