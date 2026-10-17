import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../test/axe';
import { canvasPixels, decodeBarcode, decodeUpcE, rasterizeSvg } from '../../test/codes';
import { UIProvider } from '../provider/UIProvider';
import { Barcode } from './Barcode';
import type { BarcodeFormat } from './barcodeEncode';
import type { CodesMessages } from './messages';

const isPhone = window.innerWidth < 640;

const samples: { format: BarcodeFormat; value: string; decoded: string; name: string }[] = [
  {
    format: 'upc-a',
    value: '03600029145',
    decoded: '036000291452',
    name: 'UPC-A barcode 036000291452',
  },
  {
    format: 'ean-13',
    value: '400638133393',
    decoded: '4006381333931',
    name: 'EAN-13 barcode 4006381333931',
  },
  { format: 'ean-8', value: '9638507', decoded: '96385074', name: 'EAN-8 barcode 96385074' },
  { format: 'upc-e', value: '0123456', decoded: '01234565', name: 'UPC-E barcode 01234565' },
  {
    format: 'code128',
    value: 'SHIP-2026-000417',
    decoded: 'SHIP-2026-000417',
    name: 'Code 128 barcode SHIP-2026-000417',
  },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Barcode', () => {
  it.each(samples)('is an image named "$name"', ({ format, value, name }) => {
    render(<Barcode format={format} value={value} />);
    expect(screen.getByRole('img', { name })).toBeInTheDocument();
  });

  it.each(samples)(
    'decodes as rendered in SVG and on canvas ($format, ZXing)',
    async ({ format, value, decoded }) => {
      const { container } = render(
        <>
          <Barcode format={format} value={value} moduleWidth={3} />
          <Barcode format={format} value={value} moduleWidth={3} renderAs="canvas" />
        </>,
      );
      const svg = container.querySelector('svg');
      const canvas = container.querySelector('canvas');
      if (!svg || !canvas) {
        throw new Error('Missing renderings');
      }
      const width = Number(svg.getAttribute('width'));
      const height = Number(svg.getAttribute('height'));
      // ZXing-js can't read UPC-E (see decodeUpcE), so UPC-E uses the test's own reader.
      const decode = (image: ImageData) =>
        format === 'upc-e' ? decodeUpcE(image) : decodeBarcode(image, format);
      expect(decode(await rasterizeSvg(svg, width, height))).toBe(decoded);
      expect(decode(canvasPixels(canvas))).toBe(decoded);
    },
  );

  it('decodes Code 128 values that switch code sets', () => {
    for (const value of ['Ada Lovelace 1815', '00012345678905', 'lot:A7-31415926']) {
      const { container, unmount } = render(
        <Barcode format="code128" value={value} renderAs="canvas" />,
      );
      const canvas = container.querySelector('canvas');
      if (!canvas) {
        throw new Error('Missing canvas');
      }
      expect(decodeBarcode(canvasPixels(canvas), 'code128')).toBe(value);
      unmount();
    }
  });

  it('draws the digits in the standard layout, UPC-A with the first and last outside the bars', () => {
    const { container } = render(<Barcode format="upc-a" value="036000291452" />);
    const texts = [...container.querySelectorAll('text')];
    expect(texts.map((text) => text.textContent)).toEqual(['0', '36000', '29145', '2']);
    // Quiet zone 9 modules: the first digit's centre is inside it, the last one past the end guard.
    expect(Number(texts[0]?.getAttribute('x'))).toBeLessThan(9);
    expect(Number(texts[3]?.getAttribute('x'))).toBeGreaterThan(9 + 95);
    expect(texts[0]?.getAttribute('class')).toContain('font-mono');
    // Guard bars run longer than data bars.
    const heights = new Set(
      [...(container.querySelector('path')?.getAttribute('d') ?? '').matchAll(/v([0-9.]+)/g)].map(
        (match) => match[1],
      ),
    );
    expect(heights.size).toBe(2);
  });

  it('sizes in millimetres for printing', () => {
    const { container } = render(
      <Barcode format="upc-a" value="036000291452" moduleWidth="0.33mm" height="22.85mm" />,
    );
    const svg = container.querySelector('svg');
    // 9 + 95 + 9 modules at 0.33 mm.
    expect(svg?.getAttribute('width')).toBe('37.29mm');
    expect(svg?.getAttribute('viewBox')?.split(' ')[2]).toBe('113');
  });

  it('is black on white by default in every theme, with a GS1 quiet zone', () => {
    const { container } = render(
      <div data-theme="dark">
        <Barcode format="ean-13" value="4006381333931" moduleWidth={1} />
      </div>,
    );
    const svg = container.querySelector('svg');
    expect(svg?.querySelector('rect')?.getAttribute('fill')).toBe('#ffffff');
    expect(svg?.querySelector('path')?.getAttribute('fill')).toBe('#000000');
    // 11 + 95 + 7 modules.
    expect(svg?.getAttribute('width')).toBe('113');
    expect(svg?.querySelector('path')?.getAttribute('d')?.startsWith('M11 0')).toBe(true);
  });

  it('shows the expected check digit for a wrong one', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Barcode format="upc-a" value="036000291453" />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('The UPC-A check digit is wrong; it should be 2.')).toBeInTheDocument();
  });

  it('warns in development about low contrast', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Barcode format="ean-8" value="96385074" foreground="#bbbbbb" />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('contrast'));
  });

  it('takes its strings from UIProvider messages', () => {
    const overrides: Partial<CodesMessages> = {
      barcodeLabel: ({ format, value }) => `Code-barres ${format} ${value}`,
    };
    render(
      <UIProvider messages={{ cancel: 'Annuler', ...overrides }}>
        <Barcode format="ean-8" value="96385074" />
      </UIProvider>,
    );
    expect(screen.getByRole('img', { name: 'Code-barres EAN-8 96385074' })).toBeInTheDocument();
  });

  it('passes axe in SVG and on canvas', async () => {
    const { container } = render(
      <div className="flex flex-col gap-4">
        <Barcode format="upc-a" value="036000291452" />
        <Barcode format="code128" value="SHIP-2026-000417" renderAs="canvas" />
      </div>,
    );
    await expectNoAxeViolations(container);
  });

  it.runIf(isPhone)('shrinks a wide barcode to fit a phone instead of scrolling the page', () => {
    render(<Barcode format="code128" value="SHIPMENT-0000-1111-2222-3333" moduleWidth={3} />);
    expect(screen.getByRole('img').getBoundingClientRect().width).toBeLessThanOrEqual(
      window.innerWidth,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });
});
