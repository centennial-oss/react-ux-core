// Development-only checks shared by QRCode and Barcode: scannability warnings for colours and obscured modules.

// Bundlers replace `process.env.NODE_ENV` in apps; the library doesn't depend on Node's types.
declare const process: { env: { NODE_ENV?: string } };

/** True outside production builds. False when the environment can't tell. */
export function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return false;
  }
}

/** Logs a development warning, prefixed with the component's name. */
export function warnInDevelopment(component: string, message: string): void {
  if (isDevelopment()) {
    console.warn(`[${component}] ${message}`);
  }
}

type Rgba = readonly [number, number, number, number];

let probe: CanvasRenderingContext2D | null | undefined;

/** Parses any CSS colour the browser understands to RGBA (0–255, alpha 0–1), or undefined. */
export function parseCssColor(color: string): Rgba | undefined {
  const hex = /^#([0-9a-f]{3,8})$/i.exec(color.trim());
  if (hex) {
    let digits = hex[1] ?? '';
    if (digits.length === 3 || digits.length === 4) {
      digits = digits.replace(/./g, (digit) => digit + digit);
    }
    if (digits.length === 6 || digits.length === 8) {
      const channel = (offset: number) => parseInt(digits.slice(offset, offset + 2), 16);
      return [channel(0), channel(2), channel(4), digits.length === 8 ? channel(6) / 255 : 1];
    }
    return undefined;
  }
  if (typeof document === 'undefined') {
    return undefined;
  }
  // Let a canvas resolve names, rgb(), hsl() and so on: it reads back '#rrggbb' or 'rgba(…)'.
  probe ??= document.createElement('canvas').getContext('2d');
  if (!probe) {
    return undefined;
  }
  probe.fillStyle = '#010203';
  probe.fillStyle = color;
  const resolved = probe.fillStyle;
  if (resolved === '#010203' && color.trim().toLowerCase() !== '#010203') {
    return undefined;
  }
  if (resolved.startsWith('#')) {
    return parseCssColor(resolved);
  }
  const parts = /rgba?\(([^)]+)\)/
    .exec(resolved)?.[1]
    ?.split(',')
    .map((part) => Number(part.trim()));
  if (!parts || parts.length < 3) {
    return undefined;
  }
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
}

/** WCAG relative luminance (0–1). */
export function relativeLuminance([red, green, blue]: Rgba): number {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

/** WCAG contrast ratio between two luminances (1–21). */
export function contrastRatio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** The contrast below which codes may not scan reliably. */
export const MIN_SCAN_CONTRAST = 4;

/**
 * Warns (in development) when the code's colours are hard to scan: low contrast, or light bars and modules on a dark
 * background, which some scanners can't read. A transparent background is assumed to sit on a light page.
 */
export function checkCodeColors(component: string, foreground: string, background: string): void {
  if (!isDevelopment() || background.trim().toLowerCase() === 'transparent') {
    return;
  }
  const dark = parseCssColor(foreground);
  const light = parseCssColor(background);
  if (!dark || !light || dark[3] < 1 || light[3] < 1) {
    return;
  }
  const darkLuminance = relativeLuminance(dark);
  const lightLuminance = relativeLuminance(light);
  const ratio = contrastRatio(darkLuminance, lightLuminance);
  if (ratio < MIN_SCAN_CONTRAST) {
    warnInDevelopment(
      component,
      `The colours ${foreground} on ${background} have a contrast of ${ratio.toFixed(1)}:1; under ${MIN_SCAN_CONTRAST}:1 many scanners can't read the code. Black on white is the most reliable.`,
    );
  }
  if (darkLuminance > lightLuminance) {
    warnInDevelopment(
      component,
      `The code is inverted (light ${foreground} on dark ${background}); some scanners can't read inverted codes. Use a dark foreground on a light background.`,
    );
  }
}
