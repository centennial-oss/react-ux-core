// Saves an SVG drawing (a heatmap's, treemap's or Sankey chart's export image) as a PNG at twice its size.

import { saveUrl, withExtension } from '../utils/download';

/** An SVG drawing and its size in pixels. */
export interface SvgImage {
  svg: string;
  width: number;
  height: number;
}

/** Draws the SVG on a canvas and downloads it as a PNG named `fileName`. */
export function downloadSvgAsPng(svg: SvgImage, fileName: string) {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = svg.width * 2;
    canvas.height = svg.height * 2;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    context.scale(2, 2);
    context.drawImage(image, 0, 0);
    saveUrl(canvas.toDataURL('image/png'), withExtension(fileName, '.png'));
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.svg)}`;
}
