// Barcode: UPC-A, UPC-E, EAN-13, EAN-8 and Code 128, drawn as SVG or canvas with GS1 quiet zones, taller guard bars
// and the human-readable digits in the theme's monospace face. Sizes may be physical (mm, in) for printing at 100%.
// Black on white in every theme, since that scans best.

import { useEffect, useLayoutEffect, useMemo, useRef, type HTMLAttributes, type Ref } from 'react';
import { cn } from '../utils/cn';
import {
  BarcodeValueError,
  encodeBarcode,
  type BarcodeEncoding,
  type BarcodeFormat,
} from './barcodeEncode';
import {
  barcodeGeometry,
  convertCodeLength,
  drawBarcode,
  type BarcodeGeometry,
} from './barcodeRender';
import { checkCodeColors, warnInDevelopment } from './dev';
import { useCodesMessages } from './messages';

export interface BarcodeProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className' | 'style' | 'children' | 'aria-label'
> {
  format: BarcodeFormat;
  /** Digits (UPC and EAN) or ASCII text (Code 128). For UPC and EAN the check digit may be left off; it's computed. */
  value: string;
  /** Width of the narrowest bar (the X-dimension): CSS pixels, or a physical size such as `"0.33mm"`. Defaults to 2. */
  moduleWidth?: number | string;
  /** Bar height, such as 64 or `"22.85mm"` (the nominal UPC-A height). Defaults to 64 px, or the GS1 nominal
   * proportion when `moduleWidth` is physical. */
  height?: number | string;
  /** Shows the digits under the bars in the standard layout (UPC-A with the first and last digits outside). Defaults
   * to true. When off, show the value as text near the barcode. */
  hasText?: boolean;
  /** Bars. Defaults to black (#000000) in every theme. */
  foreground?: string;
  /** Spaces and quiet zones. Defaults to white (#ffffff) in every theme. */
  background?: string;
  /** Light margins in modules, both sides. Defaults to the format's GS1 minimum. */
  quietZone?: number;
  /** `svg` (default) or `canvas`. */
  renderAs?: 'svg' | 'canvas';
  /** Names the image. Defaults to the format and value, such as "UPC-A barcode 036000291452". */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

type EncodeResult =
  | { encoding: BarcodeEncoding; error?: undefined }
  | { encoding?: undefined; error: BarcodeValueError };

/** A linear barcode with an accessible name, drawn as SVG or canvas. */
export function Barcode({
  format,
  value,
  moduleWidth = 2,
  height,
  hasText = true,
  foreground = '#000000',
  background = '#ffffff',
  quietZone,
  renderAs = 'svg',
  'aria-label': ariaLabel,
  className,
  ref,
  ...rest
}: BarcodeProps) {
  const messages = useCodesMessages();
  const formatName = messages.barcodeFormatNames[format];
  const encoded = useMemo<EncodeResult>(() => {
    try {
      return { encoding: encodeBarcode(format, value) };
    } catch (error) {
      if (error instanceof BarcodeValueError) {
        return { error };
      }
      throw error;
    }
  }, [format, value]);
  const { encoding } = encoded;
  const colors = useMemo(() => ({ foreground, background }), [foreground, background]);
  const geometry = useMemo(
    () =>
      encoding ? barcodeGeometry(encoding, { moduleWidth, height, hasText, quietZone }) : undefined,
    [encoding, moduleWidth, height, hasText, quietZone],
  );

  useEffect(() => {
    checkCodeColors('Barcode', foreground, background);
  }, [foreground, background]);
  useEffect(() => {
    if (encoded.error) {
      warnInDevelopment('Barcode', encoded.error.message);
    }
  }, [encoded.error]);
  const minimumLeft = encoding?.quietZone.left;
  const minimumRight = encoding?.quietZone.right;
  useEffect(() => {
    if (quietZone !== undefined && minimumLeft !== undefined && minimumRight !== undefined) {
      const minimum = Math.min(minimumLeft, minimumRight);
      if (quietZone < minimum) {
        warnInDevelopment(
          'Barcode',
          `A quiet zone of ${quietZone} modules is under the format's minimum of ${minimum}.`,
        );
      }
    }
  }, [quietZone, minimumLeft, minimumRight]);

  let graphic;
  if (!encoding || !geometry) {
    const error = encoded.error;
    graphic = (
      <p className="m-0 max-w-full rounded-control border border-danger-border bg-danger-bg p-3 text-sm text-danger-fg">
        {error?.reason === 'check-digit' && error.expectedCheckDigit !== undefined
          ? messages.barcodeWrongCheckDigit({
              format: formatName,
              expected: error.expectedCheckDigit,
            })
          : messages.barcodeInvalid({ format: formatName })}
      </p>
    );
  } else {
    const label =
      ariaLabel ?? messages.barcodeLabel({ format: formatName, value: encoding.text.value });
    graphic =
      renderAs === 'canvas' ? (
        <BarcodeCanvas geometry={geometry} colors={colors} label={label} />
      ) : (
        <BarcodeSvg geometry={geometry} colors={colors} label={label} />
      );
  }

  return (
    <div {...rest} ref={ref} className={cn('inline-block max-w-full align-top', className)}>
      {graphic}
    </div>
  );
}

interface RendererProps {
  geometry: BarcodeGeometry;
  colors: { foreground: string; background: string };
  label: string;
}

/** A length in the drawing's unit, as an SVG attribute (`"31.35mm"`, or plain pixels). */
function svgLength(modules: number, geometry: BarcodeGeometry): string | number {
  const length = Math.round(modules * geometry.module.value * 1000) / 1000;
  return geometry.module.unit === 'mm' ? `${length}mm` : length;
}

function BarcodeSvg({ geometry, colors, label }: RendererProps) {
  const path = geometry.bars
    .map(([x, width, height]) => `M${x} 0h${width}v${height}h${-width}z`)
    .join('');
  return (
    <svg
      role="img"
      aria-label={label}
      width={svgLength(geometry.width, geometry)}
      height={svgLength(geometry.height, geometry)}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      className="block h-auto max-w-full"
    >
      <rect width={geometry.width} height={geometry.height} fill={colors.background} />
      <path d={path} fill={colors.foreground} shapeRendering="crispEdges" />
      {geometry.text.map((run, index) => (
        <text
          key={`${run.x}-${index}`}
          x={run.x}
          y={run.y}
          fontSize={geometry.fontSize}
          textAnchor="middle"
          fill={colors.foreground}
          className="font-mono"
        >
          {run.text}
        </text>
      ))}
    </svg>
  );
}

function BarcodeCanvas({ geometry, colors, label }: RendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modulePixels = convertCodeLength(geometry.module, 'px');
  const cssWidth = geometry.width * modulePixels;
  const cssHeight = geometry.height * modulePixels;
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return;
    }
    const scale = modulePixels * (window.devicePixelRatio || 1);
    canvas.width = Math.round(geometry.width * scale);
    canvas.height = Math.round(geometry.height * scale);
    drawBarcode(
      context,
      geometry,
      scale,
      colors,
      getComputedStyle(canvas).fontFamily || 'monospace',
    );
  }, [geometry, colors, modulePixels]);
  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      width={Math.round(cssWidth)}
      height={Math.round(cssHeight)}
      className="block h-auto max-w-full font-mono"
      // eslint-disable-next-line no-restricted-syntax -- the backing store is scaled for devicePixelRatio; CSS keeps the size
      style={{ width: cssWidth }}
    />
  );
}
