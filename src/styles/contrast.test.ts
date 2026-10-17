// Contrast gate for the colour tokens: every text and control pair meets WCAG 2.2 AA in the light and
// dark themes, and the high-contrast theme exceeds it (7:1 for text, 4.5:1 for controls).

import { describe, expect, it } from 'vitest';
import themesCss from './themes.css?raw';
import tokensCss from './tokens.css?raw';

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
  if (start === -1) {
    throw new Error(`themes.css has no ${selector} block`);
  }
  return themesCss.slice(start, themesCss.indexOf('\n}', start));
}

const light = colorTokens(tokensCss.slice(tokensCss.indexOf('@theme'), tokensCss.indexOf(':root')));
const themes: Record<string, Palette> = {
  light,
  dark: { ...light, ...colorTokens(themeBlock("[data-theme='dark']")) },
  'high-contrast': { ...light, ...colorTokens(themeBlock("[data-theme='high-contrast']")) },
};

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

const TONES = ['neutral', 'accent', 'success', 'warning', 'danger', 'info'];

function pairs(
  text: number,
  ui: number,
): [foreground: string, background: string, minimum: number][] {
  const list: [string, string, number][] = [];
  for (const surface of [1, 2, 3, 4]) {
    list.push(['fg', `surface-${surface}`, text], ['fg-muted', `surface-${surface}`, text]);
  }
  list.push(['fg-inverse', 'fg', text]);
  for (const surface of [1, 2, 3]) {
    list.push(['border-strong', `surface-${surface}`, ui], ['focus', `surface-${surface}`, ui]);
  }
  for (const tone of TONES) {
    list.push(
      [`${tone}-fg`, 'surface-1', text],
      [`${tone}-fg`, 'surface-2', text],
      [`${tone}-fg`, `${tone}-bg`, text],
      [`${tone}-on-solid`, `${tone}-solid`, text],
    );
  }
  for (let series = 1; series <= 10; series++) {
    list.push([`chart-${series}`, 'surface-1', ui], [`chart-${series}`, 'surface-2', ui]);
  }
  for (const token of ['fg', 'keyword', 'string', 'number', 'comment', 'punct', 'property']) {
    list.push([`code-${token}`, 'code-bg', text], [`code-${token}`, 'code-highlight', text]);
  }
  list.push(['code-highlight-border', 'code-bg', ui]);
  return list;
}

describe.each(Object.entries(themes))('%s theme heat scales', (_, palette) => {
  it.each(['accent', 'success', 'danger', 'neutral'])(
    'has seven %s steps in order of lightness, each distinct from the next',
    (scale) => {
      const steps = [1, 2, 3, 4, 5, 6, 7].map((step) =>
        luminance(palette[`heat-${scale}-${String(step)}`] ?? ''),
      );
      const isRising = (steps[1] ?? 0) > (steps[0] ?? 0);
      for (let index = 1; index < steps.length; index++) {
        const [previous, current] = [steps[index - 1] ?? 0, steps[index] ?? 0];
        expect(isRising ? current > previous : current < previous).toBe(true);
        const ratio = (Math.max(previous, current) + 0.05) / (Math.min(previous, current) + 0.05);
        expect(ratio).toBeGreaterThanOrEqual(1.25);
      }
    },
  );
});

describe.each(Object.entries(themes))('%s theme', (name, palette) => {
  const [text, ui] = name === 'high-contrast' ? [7, 4.5] : [4.5, 3];

  it('defines every colour token the light theme defines', () => {
    expect(Object.keys(palette).sort()).toEqual(Object.keys(light).sort());
  });

  it.each(pairs(text, ui))('%s on %s is at least %d:1', (foreground, background, minimum) => {
    const fg = palette[foreground];
    const bg = palette[background];
    expect(fg, `--color-${foreground}`).toBeDefined();
    expect(bg, `--color-${background}`).toBeDefined();
    expect(contrast(fg ?? '', bg ?? '')).toBeGreaterThanOrEqual(minimum);
  });
});
