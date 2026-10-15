// Chart colours come from the design tokens (CSS variables), read again when the theme changes.

/** A chart palette slot (`chart-1` … `chart-10`), or a semantic tone. */
export type ChartColor =
  | 'chart-1'
  | 'chart-2'
  | 'chart-3'
  | 'chart-4'
  | 'chart-5'
  | 'chart-6'
  | 'chart-7'
  | 'chart-8'
  | 'chart-9'
  | 'chart-10'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

/** The colours a chart draws with, resolved from the current theme. */
export interface ChartPalette {
  series: (color: ChartColor | undefined, index: number) => string;
  text: string;
  mutedText: string;
  grid: string;
  surface: string;
  border: string;
  tone: (tone: 'neutral' | 'warning' | 'danger' | 'success') => string;
  font: string;
}

function read(style: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = style.getPropertyValue(name).trim();
  return value === '' ? fallback : value;
}

/** Adds transparency to a hex or rgb colour (`alpha` from 0 to 1). */
export function withAlpha(color: string, alpha: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex?.[1]) {
    const value = parseInt(hex[1], 16);
    return `rgba(${String(value >> 16)}, ${String((value >> 8) & 255)}, ${String(value & 255)}, ${String(alpha)})`;
  }
  return color;
}

/** Reads the palette from the tokens on `element` (the theme can differ per subtree). */
export function readPalette(element: Element): ChartPalette {
  const style = getComputedStyle(element);
  const chart = Array.from({ length: 10 }, (_, index) =>
    read(style, `--color-chart-${String(index + 1)}`, '#2557d6'),
  );
  const tones = {
    accent: read(style, '--color-accent-solid', '#2557d6'),
    success: read(style, '--color-success-solid', '#2b8a3e'),
    warning: read(style, '--color-warning-solid', '#a85d00'),
    danger: read(style, '--color-danger-solid', '#c92a2a'),
    neutral: read(style, '--color-neutral-solid', '#5c6370'),
  };
  return {
    series: (color, index) => {
      if (color === undefined) {
        return chart[index % chart.length] ?? '#2557d6';
      }
      if (color.startsWith('chart-')) {
        return chart[Number(color.slice(6)) - 1] ?? '#2557d6';
      }
      return tones[color as keyof typeof tones];
    },
    text: read(style, '--color-fg', '#1b1f24'),
    mutedText: read(style, '--color-fg-muted', '#5c6370'),
    grid: read(style, '--color-border', '#d8dce1'),
    surface: read(style, '--color-surface-1', '#ffffff'),
    border: read(style, '--color-border-strong', '#9aa1ab'),
    tone: (tone) => tones[tone],
    font: `12px ${read(style, '--font-sans', 'system-ui, sans-serif')}`,
  };
}
