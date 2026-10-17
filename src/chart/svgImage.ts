// Saves an SVG drawing (a heatmap's or treemap's export image) as a PNG at twice its size.

/** Draws the SVG on a canvas and downloads it as a PNG named `fileName`. */
export function downloadSvgAsPng(
  svg: { svg: string; width: number; height: number },
  fileName: string,
) {
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
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
    link.click();
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.svg)}`;
}
