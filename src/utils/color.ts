// Colour maths for contrast checks: sRGB channels, WCAG relative luminance and contrast ratio.

/** Red, green and blue channels, 0–255 (any alpha after them is ignored). */
export type RgbChannels = readonly [number, number, number, ...number[]];

/** The channels of a `#rrggbb` colour. */
export function hexChannels(hex: string): [number, number, number] {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as [
    number,
    number,
    number,
  ];
}

/** WCAG relative luminance (0–1), with the sRGB standard's linearisation threshold (0.04045). */
export function relativeLuminance([red, green, blue]: RgbChannels): number {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

/** WCAG contrast ratio between two relative luminances (1–21), in either order. */
export function contrastRatio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
