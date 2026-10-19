import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { canvasPixels, decodeQr, logoDataUrl, pixelsOf, rasterizeSvg } from '../../test/codes';
import { UIProvider } from '../provider/UIProvider';
import type { CodesMessages } from './messages';
import { encodeQr, type QrErrorCorrection, type QrMatrix } from './qrEncode';
import { drawQr, qrGeometry, qrToPngBlob, qrToSvgString, type QrStyle } from './qrRender';
import { QRCode } from './QRCode';

const isDesktop = window.innerWidth >= 1024;
const isPhone = window.innerWidth < 640;

/** Draws a matrix at `scale` pixels per module and decodes it. */
async function decodeMatrix(matrix: QrMatrix, style: QrStyle = {}, scale = 4) {
  const geometry = qrGeometry(matrix, style);
  const pixels = geometry.total * scale;
  const canvas = document.createElement('canvas');
  canvas.width = pixels;
  canvas.height = pixels;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No 2D context');
  }
  let image: HTMLImageElement | undefined;
  if (style.centerImage) {
    image = new Image();
    image.src = style.centerImage.src;
    await image.decode();
  }
  drawQr(context, matrix, style, pixels, image);
  return decodeQr(canvasPixels(canvas));
}

/** The dark/light value at each module centre of a rendered code. */
function sampleModules(image: ImageData, total: number, quiet: number, size: number): boolean[][] {
  const scale = image.width / total;
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const px = Math.floor((x + quiet + 0.5) * scale);
      const py = Math.floor((y + quiet + 0.5) * scale);
      return (image.data[(py * image.width + px) * 4] ?? 255) < 128;
    }),
  );
}

const values = {
  numeric: '3141592653589793238462643383279502884197169399375105820974944592',
  alphanumeric: 'HTTPS://EXAMPLE.COM/PLANETS/MARS-2026',
  byte: 'https://example.com/observatory/night?moon=waxing&seeing=4',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('QR round trip (decoded with jsQR)', () => {
  const levels: QrErrorCorrection[] = ['L', 'M', 'Q', 'H'];
  // The decoder is pure logic, so the full matrix runs once, on the desktop instance.
  it.runIf(isDesktop).each(levels)(
    'decodes every mode at versions 1, 7, 10, 25 and 40 at level %s',
    async (level) => {
      for (const version of [1, 7, 10, 25, 40]) {
        for (const [mode, base] of Object.entries(values)) {
          // Version 1 holds less, so it gets a short value of the same mode.
          const value = version === 1 ? base.slice(0, 7) : base;
          const matrix = encodeQr(value, { errorCorrection: level, minVersion: version });
          expect(matrix.version, `${mode} v${version}`).toBe(version);
          expect(matrix.mode).toBe(mode);
          const decoded = await decodeMatrix(matrix, {}, version >= 25 ? 3 : 4);
          expect(decoded?.text, `${mode} v${version}-${level}`).toBe(value);
          expect(decoded?.version).toBe(version);
        }
      }
    },
  );

  it.runIf(isDesktop)('decodes full version-40 symbols (many interleaved blocks)', async () => {
    const byte = Array.from({ length: 2900 }, (_, index) =>
      String.fromCharCode(97 + ((index * 7) % 26)),
    ).join('');
    const matrix = encodeQr(byte, { errorCorrection: 'L' });
    expect(matrix.version).toBe(40);
    expect((await decodeMatrix(matrix, {}, 3))?.text).toBe(byte);
    const digits = Array.from({ length: 3000 }, (_, index) => String((index * 3) % 10)).join('');
    const high = encodeQr(digits, { errorCorrection: 'H' });
    expect(high.version).toBe(40);
    expect((await decodeMatrix(high, {}, 3))?.text).toBe(digits);
  });

  it('decodes UTF-8: accents, CJK and emoji', async () => {
    const value = 'Café crème, naïve Ångström — 東京の天文台 🔭🪐✨';
    const matrix = encodeQr(value, { errorCorrection: 'Q' });
    expect(matrix.mode).toBe('byte');
    const decoded = await decodeMatrix(matrix);
    expect(decoded?.text).toBe(value);
    expect(decoded?.bytes).toEqual(Array.from(new TextEncoder().encode(value)));
  });

  it('decodes every forced mask', async () => {
    for (let mask = 0; mask < 8; mask++) {
      const matrix = encodeQr('otpauth://totp/Ada?secret=JBSWY3DPEHPK3PXP&issuer=Example', {
        mask,
      });
      expect((await decodeMatrix(matrix))?.text).toContain('JBSWY3DPEHPK3PXP');
    }
  });

  it('decodes rounded and dot modules with rounded finders, at low and high resolution', async () => {
    for (const value of [values.byte, values.byte.repeat(4)]) {
      const matrix = encodeQr(value, { errorCorrection: 'M' });
      for (const moduleShape of ['rounded', 'dots'] as const) {
        for (const scale of [5, 16]) {
          const decoded = await decodeMatrix(
            matrix,
            { moduleShape, finderShape: 'rounded' },
            scale,
          );
          expect(decoded?.text, `${moduleShape} v${matrix.version} at ${scale}px`).toBe(value);
        }
      }
    }
  });

  it.runIf(isDesktop)('still decodes with centre art at the cap, at levels Q and H', async () => {
    const logo = logoDataUrl();
    const cases = [
      'https://example.com/invoice/123',
      values.byte,
      'https://example.com/' + 'telescope/'.repeat(12),
      'https://example.com/' + 'nebula-'.repeat(40),
    ];
    for (const level of ['Q', 'H'] as const) {
      for (const value of cases) {
        const matrix = encodeQr(value, { errorCorrection: level });
        for (const shouldExcavate of [true, false]) {
          const style: QrStyle = {
            centerImage: { src: logo, size: 0.25, shouldExcavate, background: '#ffffff' },
          };
          const decoded = await decodeMatrix(matrix, style, 6);
          expect(decoded?.text, `v${matrix.version}-${level} excavate=${shouldExcavate}`).toBe(
            value,
          );
        }
      }
    }
  });
});

describe('QR geometry', () => {
  it('draws all square modules as one path, and the centre box clear of the function areas', () => {
    const matrix = encodeQr(values.byte, { errorCorrection: 'H' });
    const geometry = qrGeometry(matrix, { centerImage: { src: 'x', size: 0.5 } });
    // Capped at a quarter of the width, an odd number of whole modules, centred.
    const box = geometry.imageBox;
    expect(box).toBeDefined();
    expect(box?.size).toBeLessThanOrEqual(matrix.size * 0.25);
    expect((box?.size ?? 0) % 2).toBe(1);
    // Clear of the top-left finder, separator, format strip and timing pattern (all within 9 modules of the edge).
    expect((box?.x ?? 0) - 4).toBeGreaterThanOrEqual(9);
    // Version 1 leaves only a 3-module box between the format areas.
    const tiny = qrGeometry(encodeQr('1', { errorCorrection: 'Q' }), { centerImage: { src: 'x' } });
    expect(tiny.imageBox?.size).toBe(3);
    expect(tiny.imageBox?.x).toBe(4 + 9);
  });

  it('exports a standalone SVG document and a PNG that both decode', async () => {
    const matrix = encodeQr(values.byte);
    const svg = qrToSvgString(matrix, { foreground: '#1b4d3e' });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.match(/<path/g)).toHaveLength(2);
    const total = qrGeometry(matrix).total;
    expect(decodeQr(await rasterizeSvg(svg, total * 4, total * 4))?.text).toBe(values.byte);
    const blob = await qrToPngBlob(matrix, {}, 400);
    expect(blob.type).toBe('image/png');
    const bitmap = await createImageBitmap(blob);
    expect(bitmap.width).toBe(400);
    expect(decodeQr(pixelsOf(bitmap, 400, 400))?.text).toBe(values.byte);
  });
});

describe('QRCode', () => {
  it('is an image named "QR code", with the address for URLs', () => {
    const { rerender } = render(<QRCode value="WIFI:T:WPA;S:Observatory;P:stargazing;;" />);
    expect(screen.getByRole('img', { name: 'QR code' })).toBeInTheDocument();
    rerender(<QRCode value="https://example.com/invoice/123" />);
    expect(
      screen.getByRole('img', { name: 'QR code for https://example.com/invoice/123' }),
    ).toBeInTheDocument();
    rerender(<QRCode value="https://example.com" aria-label="Pay invoice 123" />);
    expect(screen.getByRole('img', { name: 'Pay invoice 123' })).toBeInTheDocument();
  });

  it('draws one path for the square modules and one for the finders, black on white by default', () => {
    const { container } = render(
      <div data-theme="dark">
        <QRCode value={values.byte} />
      </div>,
    );
    const svg = container.querySelector('svg');
    expect(svg?.querySelectorAll('path')).toHaveLength(2);
    expect(svg?.querySelector('rect')?.getAttribute('fill')).toBe('#ffffff');
    expect(svg?.querySelector('path')?.getAttribute('fill')).toBe('#000000');
    expect(svg?.getAttribute('width')).toBe('192');
  });

  it('decodes as rendered, in SVG and on canvas, with an identical module layout', async () => {
    const value = 'https://example.com/invoice/123';
    const logo = logoDataUrl();
    const props = {
      value,
      errorCorrection: 'H' as const,
      foreground: '#1b4d3e',
      background: '#ffffff',
      centerImage: { src: logo },
      moduleShape: 'dots' as const,
      size: 320,
    };
    const { container } = render(
      <>
        <QRCode {...props} />
        <QRCode {...props} renderAs="canvas" />
      </>,
    );
    const svg = container.querySelector('svg');
    const canvas = container.querySelector('canvas');
    if (!svg || !canvas) {
      throw new Error('Missing renderings');
    }
    const matrix = encodeQr(value, { errorCorrection: 'H' });
    const geometry = qrGeometry(matrix, { centerImage: { src: logo } });
    const svgPixels = await rasterizeSvg(svg, 640, 640);
    // The canvas draws the logo once it loads.
    await expect.poll(() => decodeQr(canvasPixels(canvas))?.text).toBe(value);
    const canvasImage = pixelsOf(canvas, 640, 640);
    expect(decodeQr(svgPixels)?.text).toBe(value);
    const quiet = 4;
    const box = geometry.imageBox;
    const outsideImage = (rows: boolean[][]) =>
      rows.map((row, y) =>
        row.map((isDark, x) =>
          box &&
          x + quiet >= box.x &&
          x + quiet < box.x + box.size &&
          y + quiet >= box.y &&
          y + quiet < box.y + box.size
            ? null
            : isDark,
        ),
      );
    const fromSvg = outsideImage(sampleModules(svgPixels, geometry.total, quiet, matrix.size));
    const fromCanvas = outsideImage(sampleModules(canvasImage, geometry.total, quiet, matrix.size));
    expect(fromCanvas).toEqual(fromSvg);
    expect(fromSvg).toEqual(outsideImage(matrix.modules.map((row) => [...row])));
  });

  it('raises the level to at least Q with centre art, and warns in development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<QRCode value="https://example.com/invoice/123" centerImage={{ src: logoDataUrl() }} />);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('raised the error correction from M to Q'),
    );
  });

  it('warns in development when centre art hides too much of a small code', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // 25 bytes need version 3 at level Q, where a quarter-width image hides two-thirds of a block's margin.
    render(
      <QRCode
        value={'a'.repeat(25)}
        errorCorrection="Q"
        centerImage={{ src: logoDataUrl(), size: 0.25 }}
      />,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('The centre image hides'));
    warn.mockClear();
    render(<QRCode value={values.byte} errorCorrection="H" centerImage={{ src: logoDataUrl() }} />);
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('The centre image hides'));
  });

  it('warns in development about low contrast and inverted colours', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { rerender } = render(
      <QRCode value="contrast" foreground="#9a9a9a" background="#ffffff" />,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('contrast of'));
    warn.mockClear();
    rerender(<QRCode value="contrast" foreground="white" background="#101820" />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('inverted'));
    warn.mockClear();
    rerender(<QRCode value="contrast" foreground="#1b4d3e" background="#ffffff" />);
    expect(warn).not.toHaveBeenCalled();
  });

  it('shows a message instead of a code when the value is too long', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<QRCode value={'a'.repeat(3000)} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('This text is too long for a QR code.')).toBeInTheDocument();
  });

  it('renders a text alternative with a copy button', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    const value = 'otpauth://totp/Example:ada@example.com?secret=JBSWY3DPEHPK3PXP';
    render(<QRCode value={value} hasTextAlternative />);
    // The main entry's CopyField: the full value as a read-only textbox, and a named copy button.
    const field = screen.getByRole('textbox', { name: 'Encoded text' });
    expect(field.textContent).toBe(value);
    const button = screen.getByRole('button', { name: 'Copy Encoded text' });
    if (isPhone || !isDesktop) {
      await userEvent.click(button);
    } else {
      await userEvent.tab();
      expect(field).toHaveFocus();
      await userEvent.tab();
      expect(button).toHaveFocus();
      await userEvent.keyboard('{Enter}');
    }
    expect(writeText).toHaveBeenCalledWith(value);
    await expect
      .poll(() => document.querySelector('[aria-live="polite"]')?.textContent)
      .toBe('Copied');
  });

  it('takes its strings from UIProvider messages', () => {
    const overrides: Partial<CodesMessages> = {
      qrCodeLabel: 'Code QR',
      qrCodeUrlLabel: ({ url }) => `Code QR pour ${url}`,
      qrCodeText: 'Texte encodé',
    };
    render(
      <UIProvider messages={{ cancel: 'Annuler', ...overrides }}>
        <QRCode value="bonjour" hasTextAlternative />
        <QRCode value="https://example.com/fr" />
      </UIProvider>,
    );
    expect(screen.getByRole('img', { name: 'Code QR' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Code QR pour https://example.com/fr' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Texte encodé' })).toBeInTheDocument();
  });

  it('passes axe, with and without the text alternative', async () => {
    const { container } = render(
      <div className="flex flex-wrap gap-4 p-2">
        <QRCode value="https://example.com" hasTextAlternative />
        <QRCode value="https://example.com" renderAs="canvas" />
      </div>,
    );
    await expectNoAxeViolations(container);
  });

  it.runIf(isPhone)('shrinks to fit a phone instead of scrolling the page', () => {
    // Padding leaves room for the copy button's touch area.
    render(
      <div className="p-2">
        <QRCode value={values.byte} size={480} hasTextAlternative />
      </div>,
    );
    expect(screen.getByRole('img').getBoundingClientRect().width).toBeLessThanOrEqual(
      window.innerWidth,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });
});
