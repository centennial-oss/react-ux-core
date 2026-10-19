// Large displays scale a widget's content as a whole (RESP-08): type, strokes and spacing grow together. CSS `zoom`
// keeps text, SVG and (with useChart's zoomed pixel ratio) canvases crisp, unlike a transform.

import type { CSSProperties } from 'react';

/** The `zoom` style for a content scale, or nothing at 1. */
export function scaleStyle(scale: number): CSSProperties | undefined {
  return scale === 1 ? undefined : { zoom: scale };
}

/** A length in the frame's pixels as CSS pixels inside the zoomed content. */
export function unscaled(pixels: number, scale: number): number {
  return scale > 0 ? pixels / scale : pixels;
}
