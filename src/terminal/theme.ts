// The terminal's colours from the CCUX tokens: the code surface, and the 16 ANSI colours mapped to tone and syntax
// tokens chosen so every one reads (4.5:1) on the terminal background in the light, dark and high-contrast themes.
import type { ITheme } from '@xterm/xterm';

type AnsiName =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'brightBlack'
  | 'brightRed'
  | 'brightGreen'
  | 'brightYellow'
  | 'brightBlue'
  | 'brightMagenta'
  | 'brightCyan'
  | 'brightWhite';

/** The token behind each ANSI colour. "White" is the softer text colour, so it reads on light backgrounds too. */
export const ansiTokens: Record<AnsiName, string> = {
  black: '--color-fg-muted',
  red: '--color-danger-fg',
  green: '--color-success-fg',
  yellow: '--color-warning-fg',
  blue: '--color-accent-fg',
  magenta: '--color-code-keyword',
  cyan: '--color-info-fg',
  white: '--color-code-punct',
  brightBlack: '--color-code-comment',
  brightRed: '--color-heat-danger-6',
  brightGreen: '--color-heat-success-6',
  brightYellow: '--color-code-number',
  brightBlue: '--color-heat-accent-6',
  brightMagenta: '--color-chart-4',
  brightCyan: '--color-chart-6',
  brightWhite: '--color-code-fg',
};

function read(style: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = style.getPropertyValue(name).trim();
  return value === '' ? fallback : value;
}

/** Search highlight colours (xterm needs `#rrggbb`, which the tokens are). */
export interface TerminalSearchColors {
  matchBackground: string;
  matchBorder: string;
  activeMatchBackground: string;
  activeMatchBorder: string;
}

export interface TerminalLook {
  theme: ITheme;
  search: TerminalSearchColors;
  fontFamily: string;
}

/** Reads the terminal's colours and font from the tokens on `element` (read again when the theme changes). */
export function readTerminalLook(element: Element): TerminalLook {
  const style = getComputedStyle(element);
  const background = read(style, '--color-code-bg', '#f4f5f7');
  const foreground = read(style, '--color-code-fg', '#1a1d23');
  const ansi = Object.fromEntries(
    Object.entries(ansiTokens).map(([name, token]) => [name, read(style, token, foreground)]),
  ) as Record<AnsiName, string>;
  const selection = read(style, '--color-heat-accent-2', '#b9cbf5');
  return {
    theme: {
      ...ansi,
      background,
      foreground,
      cursor: foreground,
      cursorAccent: background,
      selectionBackground: selection,
      selectionForeground: foreground,
      selectionInactiveBackground: selection,
    },
    search: {
      matchBackground: read(style, '--color-code-highlight', '#fdf1d0'),
      matchBorder: read(style, '--color-code-highlight-border', '#9a6a0c'),
      activeMatchBackground: selection,
      activeMatchBorder: read(style, '--color-focus', '#2557d6'),
    },
    fontFamily: read(style, '--font-mono', 'monospace'),
  };
}
