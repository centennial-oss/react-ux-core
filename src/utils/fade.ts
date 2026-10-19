/**
 * The opacity a shade fades to at the x-axis: `fade` 0 keeps the base opacity all the way down, 100 reaches 0, and
 * values between scale linearly. A fade only ever makes the shade more transparent.
 */
export function fadedOpacity(baseOpacity: number, fade: number): number {
  const amount = Math.min(100, Math.max(0, Number.isFinite(fade) ? fade : 0));
  return baseOpacity * (1 - amount / 100);
}
