/**
 * Sizes `canvas`'s backing store to `cssWidth × cssHeight` CSS pixels at the device pixel ratio, so drawing stays
 * sharp on high-density screens. Resizing clears the canvas, so it only happens when the size changed. Returns the
 * ratio, for the caller's `setTransform(ratio, 0, 0, ratio, 0, 0)`.
 */
export function fitCanvas(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number): number {
  const ratio = globalThis.devicePixelRatio || 1;
  const width = Math.round(cssWidth * ratio);
  const height = Math.round(cssHeight * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return ratio;
}
