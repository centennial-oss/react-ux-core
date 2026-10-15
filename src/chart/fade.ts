import type { ScriptableContext } from 'chart.js';
import { fadedOpacity } from '../utils/fade';
import { withAlpha } from './colors';
import { extent } from './format';

/**
 * An area's fill: the colour at `opacity`, or with a `fade`, a gradient from the series' highest point (at
 * `opacity`) down to the zero line (more transparent, to nothing at `fade` 100).
 */
export function areaFill(
  color: string,
  opacity: number,
  fade: number,
  values: readonly (number | null)[],
  axisId: string,
): string | ((context: ScriptableContext<'line'>) => CanvasGradient | string) {
  const solid = withAlpha(color, opacity);
  const end = fadedOpacity(opacity, fade);
  if (end === opacity) {
    return solid;
  }
  const span = extent(
    values.filter((value): value is number => value !== null && Number.isFinite(value)),
  );
  return ({ chart }) => {
    const area = chart.chartArea as typeof chart.chartArea | undefined;
    const scale = chart.scales[axisId];
    if (!area || !scale || !span) {
      return solid;
    }
    const clamp = (pixel: number) => Math.min(area.bottom, Math.max(area.top, pixel));
    const top = clamp(scale.getPixelForValue(span[1]));
    const zero = clamp(scale.getPixelForValue(0));
    const bottom = zero > top ? zero : area.bottom;
    const gradient = chart.ctx.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, solid);
    gradient.addColorStop(1, withAlpha(color, end));
    return gradient;
  };
}
