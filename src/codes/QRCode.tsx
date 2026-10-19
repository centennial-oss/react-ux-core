// QRCode: a QR code drawn from CCUX's own encoder, as SVG (crisp at any size and in print) or canvas. Black on white
// in every theme, since that scans best; stylized modules, solid finder patterns and optional centre art that raises
// the error-correction level and never covers the finder, timing or format areas.

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type Ref,
} from 'react';
import { CopyField } from '../components/CopyField/CopyField';
import { cn } from '../utils/cn';
import { checkCodeColors, warnInDevelopment } from './dev';
import { useCodesMessages } from './messages';
import { encodeQr, QrCapacityError, type QrErrorCorrection, type QrMatrix } from './qrEncode';
import {
  drawQr,
  loadQrImage,
  QR_CENTER_IMAGE_MAX,
  QR_CENTER_IMAGE_MIN_LEVEL,
  QR_DEFAULT_BACKGROUND,
  QR_DEFAULT_FOREGROUND,
  qrCenterBox,
  qrGeometry,
  qrObscuredShare,
  type QrCenterImage,
  type QrFinderShape,
  type QrModuleShape,
  type QrStyle,
} from './qrRender';

/** Above this share of a block's correctable codewords hidden by centre art, a development warning suggests a change. */
const SAFE_OBSCURED_SHARE = 0.6;

const levelOrder: readonly QrErrorCorrection[] = ['L', 'M', 'Q', 'H'];

export interface QRCodeProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className' | 'style' | 'children' | 'aria-label'
> {
  /** The text to encode (UTF-8): a URL, an otpauth:// URI, a Wi-Fi configuration and so on. */
  value: string;
  /** Redundancy: about 7% (L), 15% (M), 25% (Q) or 30% (H) of codewords recoverable. Defaults to `M`. */
  errorCorrection?: QrErrorCorrection;
  /** Colour of the dark modules. Defaults to black (#000000) in every theme. */
  foreground?: string;
  /** Colour of the light modules and quiet zone. Defaults to white (#ffffff) in every theme. Use `transparent` only
   * over a known light background. */
  background?: string;
  /** Rendered width and height in CSS pixels. Defaults to 192. It shrinks to fit a narrower container. */
  size?: number;
  /** Light border in modules. The specification requires at least 4; defaults to 4. */
  quietZone?: number;
  /** Art in the centre, such as a logo. Raises the error correction to at least `Q` (`H` is recommended). */
  centerImage?: QrCenterImage;
  /** Defaults to `square`, the most reliable. */
  moduleShape?: QrModuleShape;
  /** Finder (corner) pattern style. Defaults to `square`. */
  finderShape?: QrFinderShape;
  /** `svg` (default) or `canvas`; both draw the same modules. */
  renderAs?: 'svg' | 'canvas';
  /** Names the image. Defaults to "QR code" and, for a URL, the address. */
  'aria-label'?: string;
  /** Shows the encoded text with a copy button under the code, since a QR code alone isn't accessible. */
  hasTextAlternative?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** Whether the value is a web address, which the default name then includes. */
function isUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value);
}

type EncodeResult =
  { matrix: QrMatrix; error?: undefined } | { matrix?: undefined; error: QrCapacityError };

/** A QR code with an accessible name, drawn as SVG or canvas. */
export function QRCode({
  value,
  errorCorrection = 'M',
  foreground = QR_DEFAULT_FOREGROUND,
  background = QR_DEFAULT_BACKGROUND,
  size = 192,
  quietZone = 4,
  centerImage,
  moduleShape = 'square',
  finderShape = 'square',
  renderAs = 'svg',
  'aria-label': ariaLabel,
  hasTextAlternative = false,
  className,
  ref,
  ...rest
}: QRCodeProps) {
  const messages = useCodesMessages();
  // Centre art hides modules, so the level goes up to at least Q.
  const level =
    centerImage &&
    levelOrder.indexOf(errorCorrection) < levelOrder.indexOf(QR_CENTER_IMAGE_MIN_LEVEL)
      ? QR_CENTER_IMAGE_MIN_LEVEL
      : errorCorrection;
  const encoded = useMemo<EncodeResult>(() => {
    try {
      return { matrix: encodeQr(value, { errorCorrection: level }) };
    } catch (error) {
      if (error instanceof QrCapacityError) {
        return { error };
      }
      throw error;
    }
  }, [value, level]);
  const style = useMemo<QrStyle>(
    () => ({ foreground, background, quietZone, moduleShape, finderShape, centerImage }),
    [foreground, background, quietZone, moduleShape, finderShape, centerImage],
  );
  const geometry = useMemo(
    () => (encoded.matrix ? qrGeometry(encoded.matrix, style) : undefined),
    [encoded, style],
  );
  const label =
    ariaLabel ?? (isUrl(value) ? messages.qrCodeUrlLabel({ url: value }) : messages.qrCodeLabel);

  useDevelopmentWarnings({ encoded, style, requestedLevel: errorCorrection });

  const pixelSize = Math.max(1, Math.round(size));
  const { matrix } = encoded;
  let graphic;
  if (!matrix || !geometry) {
    graphic = (
      <p
        className="m-0 flex items-center justify-center rounded-control border border-danger-border bg-danger-bg p-3 text-center text-sm text-danger-fg"
        // eslint-disable-next-line no-restricted-syntax -- the placeholder takes the code's dynamic size
        style={{ width: pixelSize, minHeight: pixelSize, maxWidth: '100%' }}
      >
        {messages.qrCodeTooLong}
      </p>
    );
  } else if (renderAs === 'canvas') {
    graphic = <QrCanvas matrix={matrix} qrStyle={style} size={pixelSize} label={label} />;
  } else {
    const box = geometry.imageBox;
    graphic = (
      <svg
        role="img"
        aria-label={label}
        width={pixelSize}
        height={pixelSize}
        viewBox={`0 0 ${geometry.total} ${geometry.total}`}
        className="block h-auto max-w-full"
      >
        <rect width={geometry.total} height={geometry.total} fill={background} />
        <path
          d={geometry.modulesPath}
          fill={foreground}
          shapeRendering={moduleShape === 'square' ? 'crispEdges' : undefined}
        />
        <path d={geometry.findersPath} fill={foreground} fillRule="evenodd" />
        {centerImage && box && (
          <>
            {centerImage.background && (
              <rect
                x={box.x}
                y={box.y}
                width={box.size}
                height={box.size}
                fill={centerImage.background}
              />
            )}
            <image
              href={centerImage.src}
              x={box.x}
              y={box.y}
              width={box.size}
              height={box.size}
              preserveAspectRatio="xMidYMid meet"
            />
          </>
        )}
      </svg>
    );
  }

  return (
    <div
      {...rest}
      ref={ref}
      className={cn('inline-flex max-w-full flex-col items-center gap-2 align-top', className)}
    >
      {graphic}
      {hasTextAlternative && (
        <CopyField
          label={messages.qrCodeText}
          value={value}
          truncate="middle"
          className="w-full max-w-sm"
        />
      )}
    </div>
  );
}

/** The canvas renderer: the same geometry, drawn at the device's pixel ratio. */
function QrCanvas({
  matrix,
  qrStyle: style,
  size,
  label,
}: {
  matrix: QrMatrix;
  qrStyle: QrStyle;
  size: number;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const src = style.centerImage?.src;
  const [image, setImage] = useState<{ src: string; element: HTMLImageElement }>();
  useEffect(() => {
    if (!src) {
      return;
    }
    let isCurrent = true;
    loadQrImage(src).then(
      (element) => {
        if (isCurrent) {
          setImage({ src, element });
        }
      },
      () => {
        warnInDevelopment('QRCode', `Couldn’t load the centre image ${src}.`);
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [src]);
  const loaded = image && image.src === src ? image.element : undefined;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return;
    }
    const pixels = Math.round(size * (window.devicePixelRatio || 1));
    canvas.width = pixels;
    canvas.height = pixels;
    drawQr(context, matrix, style, pixels, loaded);
  }, [matrix, style, size, loaded]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      width={size}
      height={size}
      className="block h-auto max-w-full"
      // eslint-disable-next-line no-restricted-syntax -- the backing store is scaled for devicePixelRatio; CSS keeps the size
      style={{ width: size }}
    />
  );
}

/** Development warnings: hard-to-scan colours, a thin quiet zone, and centre art that hides too much. */
function useDevelopmentWarnings({
  encoded,
  style,
  requestedLevel,
}: {
  encoded: EncodeResult;
  style: QrStyle;
  requestedLevel: QrErrorCorrection;
}) {
  const {
    foreground = QR_DEFAULT_FOREGROUND,
    background = QR_DEFAULT_BACKGROUND,
    quietZone = 4,
    centerImage,
  } = style;
  useEffect(() => {
    checkCodeColors('QRCode', foreground, background);
  }, [foreground, background]);
  useEffect(() => {
    if (quietZone < 4) {
      warnInDevelopment(
        'QRCode',
        `A quiet zone of ${quietZone} modules is under the 4 the specification requires.`,
      );
    }
  }, [quietZone]);
  useEffect(() => {
    if (encoded.error) {
      warnInDevelopment('QRCode', encoded.error.message);
    }
  }, [encoded.error]);
  const matrix = encoded.matrix;
  const imageSize = centerImage?.size;
  const hasImage = centerImage !== undefined;
  useEffect(() => {
    if (!matrix || !hasImage) {
      return;
    }
    if (requestedLevel === 'L' || requestedLevel === 'M') {
      warnInDevelopment(
        'QRCode',
        `Centre art raised the error correction from ${requestedLevel} to Q. Pass errorCorrection="H" for the most reliable scanning.`,
      );
    }
    if (imageSize !== undefined && imageSize > QR_CENTER_IMAGE_MAX) {
      warnInDevelopment(
        'QRCode',
        `The centre image is capped at ${QR_CENTER_IMAGE_MAX} of the code's width.`,
      );
    }
    const share = qrObscuredShare(matrix, qrCenterBox(matrix, { src: '', size: imageSize }));
    if (share > SAFE_OBSCURED_SHARE) {
      warnInDevelopment(
        'QRCode',
        `The centre image hides ${Math.round(share * 100)}% of what one error-correction block can recover, leaving little margin for glare or damage. Use errorCorrection="H" or a smaller image.`,
      );
    }
  }, [matrix, hasImage, imageSize, requestedLevel]);
}
