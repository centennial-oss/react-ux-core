import type { Meta, StoryObj } from '@storybook/react-vite';
import { planetLogo } from '../../test/codes';
import { QRCode } from './QRCode';

const meta = {
  title: 'Codes/QRCode',
  component: QRCode,
  args: { value: 'https://example.com/observatory/tonight' },
} satisfies Meta<typeof QRCode>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A link, named "QR code for" the address. Black on white in every theme, since that scans best. */
export const Link: Story = {};

/**
 * Two-factor setup: the code with its text alternative (the encoded URI with a copy button), since a QR code alone
 * isn't accessible.
 */
export const WithTextAlternative: Story = {
  args: {
    value: 'otpauth://totp/Example:ada@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example',
    hasTextAlternative: true,
    'aria-label': 'Two-factor setup code',
  },
};

/** The four error-correction levels: more redundancy means a denser code. */
export const ErrorCorrection: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-6">
      {(['L', 'M', 'Q', 'H'] as const).map((level) => (
        <figure key={level} className="m-0 flex flex-col items-center gap-2">
          <QRCode {...args} errorCorrection={level} size={144} />
          <figcaption className="text-sm text-fg-muted">Level {level}</figcaption>
        </figure>
      ))}
    </div>
  ),
};

/** Square (the most reliable), rounded and dot modules; finder and alignment patterns stay solid. */
export const ModuleShapes: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-6">
      <QRCode {...args} moduleShape="square" size={160} />
      <QRCode {...args} moduleShape="rounded" finderShape="rounded" size={160} />
      <QRCode {...args} moduleShape="dots" finderShape="rounded" size={160} />
    </div>
  ),
};

/**
 * "Scan to pay" with centre art: level H, a brand colour, dot modules and a logo. The art clears the modules under
 * it and never covers the finder, timing or format areas.
 */
export const CenterImage: Story = {
  // The logo decodes asynchronously, so it's left out of the visual snapshots.
  tags: ['!visual'],
  args: {
    value: 'https://example.com/invoice/123',
    errorCorrection: 'H',
    foreground: '#1b4d3e',
    background: '#ffffff',
    centerImage: { src: planetLogo, background: '#ffffff' },
    moduleShape: 'dots',
    size: 224,
  },
};

/** Drawn on a canvas at the device's pixel ratio, with the same module layout as SVG. */
export const Canvas: Story = {
  args: { renderAs: 'canvas', moduleShape: 'rounded', finderShape: 'rounded' },
};

/** A Wi-Fi configuration; the name falls back to "QR code" for non-URLs. */
export const WiFi: Story = {
  name: 'Wi-Fi',
  args: { value: 'WIFI:T:WPA;S:Observatory Guest;P:stargazing;;', hasTextAlternative: true },
};

/** Text too long for any QR code shows a message instead. */
export const TooLong: Story = {
  args: { value: 'Mercury Venus Earth Mars Jupiter Saturn Uranus Neptune '.repeat(60) },
};
