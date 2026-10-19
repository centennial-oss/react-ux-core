// Heatmap colour scales: values to colours from the theme's heat tokens (seven steps per palette), sequential or
// diverging around a midpoint, continuous or in steps; and the text colour that reads best on each.

import { useMemo } from 'react';
import { useThemeAttribute } from '../utils/useThemeAttribute';
import { contrastRatio, hexChannels, relativeLuminance } from '../utils/color';
import { extent } from '../utils/math';

export type HeatPalette = 'accent' | 'success' | 'danger-success' | 'neutral';

/** How values map to colours. */
export interface HeatScale {
  /** Defaults to `sequential`. */
  type?: 'sequential' | 'diverging';
  /** Defaults to the data's lowest value. */
  min?: number;
  /** Defaults to the data's highest value. */
  max?: number;
  /** A diverging scale's centre, such as 70 for a passing line. Defaults to halfway between min and max. */
  midpoint?: number;
  /** Defaults to `accent` (sequential) or `danger-success` (diverging). */
  colors?: HeatPalette;
  /** Splits the scale into this many steps instead of a continuous gradient. */
  steps?: 3 | 4 | 5 | 6 | 7;
}

export interface ResolvedHeatScale {
  type: 'sequential' | 'diverging';
  min: number;
  max: number;
  midpoint: number;
  colors: HeatPalette;
  steps: number | undefined;
}

type Ramp = readonly string[];

export interface HeatLook {
  ramps: Record<'accent' | 'success' | 'danger' | 'neutral', Ramp>;
  text: string;
  inverseText: string;
  mutedText: string;
  border: string;
  surface: string;
  font: string;
}

function read(style: CSSStyleDeclaration, name: string, fallback: string): string {
  return style.getPropertyValue(name).trim() || fallback;
}

function readRamp(style: CSSStyleDeclaration, palette: string): Ramp {
  return [1, 2, 3, 4, 5, 6, 7].map((step) =>
    read(style, `--color-heat-${palette}-${String(step)}`, '#888888'),
  );
}

/** The heat colours from the current theme's tokens, read again when the theme changes. */
export function useHeatLook(): HeatLook {
  const theme = useThemeAttribute();
  return useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      theme,
      ramps: {
        accent: readRamp(style, 'accent'),
        success: readRamp(style, 'success'),
        danger: readRamp(style, 'danger'),
        neutral: readRamp(style, 'neutral'),
      },
      text: read(style, '--color-fg', '#1a1d23'),
      inverseText: read(style, '--color-fg-inverse', '#ffffff'),
      mutedText: read(style, '--color-fg-muted', '#5c6370'),
      border: read(style, '--color-border-strong', '#737c8c'),
      surface: read(style, '--color-surface-1', '#ffffff'),
      font: read(style, '--font-sans', 'system-ui, sans-serif'),
    };
  }, [theme]);
}

/** The scale with its defaults filled in from the data. */
export function resolveHeatScale(
  values: readonly number[],
  scale: HeatScale = {},
): ResolvedHeatScale {
  const type = scale.type ?? 'sequential';
  const range = extent(values);
  const min = scale.min ?? range?.[0] ?? 0;
  const max = scale.max ?? range?.[1] ?? 1;
  return {
    type,
    min,
    max,
    midpoint: scale.midpoint ?? (min + max) / 2,
    colors: scale.colors ?? (type === 'diverging' ? 'danger-success' : 'accent'),
    steps: scale.steps,
  };
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexChannels(a);
  const [br, bg, bb] = hexChannels(b);
  const part = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${part(ar, br)}${part(ag, bg)}${part(ab, bb)}`;
}

/** A colour at `t` (0–1) along a ramp: blended between its steps, or the nearest of `steps` evenly spaced ones. */
function along(ramp: Ramp, t: number, steps: number | undefined): string {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  const last = ramp.length - 1;
  if (steps !== undefined && steps > 1) {
    const bucket = Math.min(steps - 1, Math.floor(clamped * steps));
    return ramp[Math.round((bucket * last) / (steps - 1))] ?? ramp[0] ?? '#888888';
  }
  const position = clamped * last;
  const index = Math.min(last - 1, Math.floor(position));
  return mix(ramp[index] ?? '#888888', ramp[index + 1] ?? '#888888', position - index);
}

/** Whether the scale has no range (every value equal, or no data): its colours then show no intensity. */
export function isFlatScale(scale: ResolvedHeatScale): boolean {
  return scale.max <= scale.min;
}

/**
 * The colour for `value` on the scale. A side of the scale with no range draws its lowest step (sequential) or the
 * midpoint (diverging), so equal values or an empty dataset never look maximally intense.
 */
export function heatColor(value: number, scale: ResolvedHeatScale, look: HeatLook): string {
  if (scale.type === 'diverging') {
    const [low, high] =
      scale.colors === 'danger-success'
        ? [look.ramps.danger, look.ramps.success]
        : [look.ramps.neutral, look.ramps[scale.colors]];
    const sideSteps = scale.steps === undefined ? undefined : Math.ceil(scale.steps / 2);
    if (value < scale.midpoint) {
      const span = scale.midpoint - scale.min;
      return along(low, span <= 0 ? 0 : (scale.midpoint - value) / span, sideSteps);
    }
    const span = scale.max - scale.midpoint;
    return along(high, span <= 0 ? 0 : (value - scale.midpoint) / span, sideSteps);
  }
  const ramp = look.ramps[scale.colors === 'danger-success' ? 'accent' : scale.colors];
  const span = scale.max - scale.min;
  return along(ramp, span <= 0 ? 0 : (value - scale.min) / span, scale.steps);
}

/** The WCAG contrast ratio between two hex colours. */
export function contrast(a: string, b: string): number {
  return contrastRatio(relativeLuminance(hexChannels(a)), relativeLuminance(hexChannels(b)));
}

/** The text colour (the theme's text or inverse text) that contrasts most with `background`. */
export function textOn(background: string, look: HeatLook): string {
  return contrast(look.text, background) >= contrast(look.inverseText, background)
    ? look.text
    : look.inverseText;
}

/** The colours a legend shows, from low to high: one when the scale has no range. */
export function heatLegendStops(scale: ResolvedHeatScale, look: HeatLook): string[] {
  const count = isFlatScale(scale) ? 1 : (scale.steps ?? 7);
  return Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? 0 : index / (count - 1);
    return heatColor(scale.min + (scale.max - scale.min) * t, scale, look);
  });
}
