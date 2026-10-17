// ANSI escape codes in log text: SGR colour and style codes become styled segments (rendered with theme tokens, never
// as HTML); every other escape sequence (cursor movement, OSC titles and links) is dropped.

/** The eight ANSI colours. Bright variants map to the same names: the theme decides the exact shade. */
export type AnsiColor =
  'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white';

/** A run of text with one style. */
export interface AnsiSegment {
  text: string;
  /** Foreground colour. */
  color?: AnsiColor;
  /** Background colour. */
  background?: AnsiColor;
  isBold?: boolean;
  isDim?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  /** Swapped foreground and background (SGR 7). */
  isInverse?: boolean;
}

type AnsiStyle = Omit<AnsiSegment, 'text'>;

const COLORS: readonly AnsiColor[] = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
];

// Approximate RGB values of the eight colours, for mapping 256-colour and true-colour codes to the nearest one.
const COLOR_RGB: readonly (readonly [number, number, number])[] = [
  [0, 0, 0],
  [205, 49, 49],
  [13, 188, 121],
  [229, 229, 16],
  [36, 114, 200],
  [188, 63, 188],
  [17, 168, 205],
  [229, 229, 229],
];

function nearestColor(red: number, green: number, blue: number): AnsiColor {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  COLOR_RGB.forEach(([r, g, b], index) => {
    const distance = (r - red) ** 2 + (g - green) ** 2 + (b - blue) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return COLORS[best] ?? 'white';
}

/** One of the 256 xterm colours, as the nearest of the eight. */
function color256(code: number): AnsiColor | undefined {
  if (!Number.isInteger(code) || code < 0 || code > 255) {
    return undefined;
  }
  if (code < 16) {
    return COLORS[code % 8];
  }
  if (code >= 232) {
    const level = 8 + (code - 232) * 10;
    return level < 128 ? 'black' : 'white';
  }
  const cube = code - 16;
  const level = (value: number) => (value === 0 ? 0 : 55 + value * 40);
  return nearestColor(
    level(Math.floor(cube / 36)),
    level(Math.floor(cube / 6) % 6),
    level(cube % 6),
  );
}

/** Applies one SGR parameter list (the numbers between `ESC[` and `m`) to `style`. */
function applySgr(style: AnsiStyle, params: number[]): AnsiStyle {
  let next: AnsiStyle = { ...style };
  for (let index = 0; index < params.length; index += 1) {
    const code = params[index] ?? 0;
    if (code === 0) {
      next = {};
    } else if (code === 1) {
      next.isBold = true;
    } else if (code === 2) {
      next.isDim = true;
    } else if (code === 3) {
      next.isItalic = true;
    } else if (code === 4) {
      next.isUnderline = true;
    } else if (code === 7) {
      next.isInverse = true;
    } else if (code === 22) {
      delete next.isBold;
      delete next.isDim;
    } else if (code === 23) {
      delete next.isItalic;
    } else if (code === 24) {
      delete next.isUnderline;
    } else if (code === 27) {
      delete next.isInverse;
    } else if ((code >= 30 && code <= 37) || (code >= 90 && code <= 97)) {
      next.color = COLORS[code % 10];
    } else if (code === 39) {
      delete next.color;
    } else if ((code >= 40 && code <= 47) || (code >= 100 && code <= 107)) {
      next.background = COLORS[code % 10];
    } else if (code === 49) {
      delete next.background;
    } else if (code === 38 || code === 48) {
      // Extended colours: 38;5;n (256 colours) or 38;2;r;g;b (true colour).
      const mode = params[index + 1];
      let color: AnsiColor | undefined;
      if (mode === 5) {
        color = color256(params[index + 2] ?? -1);
        index += 2;
      } else if (mode === 2) {
        color = nearestColor(
          params[index + 2] ?? 0,
          params[index + 3] ?? 0,
          params[index + 4] ?? 0,
        );
        index += 4;
      }
      if (color !== undefined) {
        if (code === 38) {
          next.color = color;
        } else {
          next.background = color;
        }
      }
    }
  }
  return next;
}

// CSI sequences (ESC [ … final byte), OSC sequences (ESC ] … BEL or ESC \), and other two-byte escapes.
const ESCAPE =
  // eslint-disable-next-line no-control-regex -- matching terminal escape codes is the point.
  /\u001b\[([0-?]*)[ -/]*([@-~])|\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)?|\u001b[@-Z\\-_]?/g;

function sameStyle(a: AnsiStyle, b: AnsiStyle): boolean {
  return (
    a.color === b.color &&
    a.background === b.background &&
    a.isBold === b.isBold &&
    a.isDim === b.isDim &&
    a.isItalic === b.isItalic &&
    a.isUnderline === b.isUnderline &&
    a.isInverse === b.isInverse
  );
}

/**
 * Splits text with ANSI escape codes into styled segments. SGR codes (colours, bold, dim, italic, underline, inverse,
 * 256-colour and true-colour, mapped to the nearest of the eight theme colours) set the style; other escape sequences
 * are removed. Joining the segments' text gives the plain text.
 */
export function parseAnsi(text: string): AnsiSegment[] {
  if (!text.includes('\u001b')) {
    return text === '' ? [] : [{ text }];
  }
  const segments: AnsiSegment[] = [];
  let style: AnsiStyle = {};
  let last = 0;
  const push = (chunk: string) => {
    if (chunk === '') {
      return;
    }
    const previous = segments.at(-1);
    if (previous && sameStyle(previous, style)) {
      previous.text += chunk;
    } else {
      segments.push({ text: chunk, ...style });
    }
  };
  for (const match of text.matchAll(ESCAPE)) {
    push(text.slice(last, match.index));
    last = match.index + match[0].length;
    if (match[2] === 'm') {
      const params = (match[1] ?? '')
        .split(';')
        .map((part) => (part === '' ? 0 : Number.parseInt(part, 10)));
      style = applySgr(style, params);
    }
  }
  push(text.slice(last));
  return segments;
}

/** The text without ANSI escape codes. */
export function stripAnsi(text: string): string {
  return text.includes('\u001b') ? text.replace(ESCAPE, '') : text;
}
