import type { Meta, StoryObj } from '@storybook/react-vite';
import { Barcode } from './Barcode';

const meta = {
  title: 'Codes/Barcode',
  component: Barcode,
  args: { format: 'upc-a', value: '03600029145' },
} satisfies Meta<typeof Barcode>;
export default meta;
type Story = StoryObj<typeof meta>;

/** UPC-A with the check digit computed (2), the first and last digits outside the bars, and taller guard bars. */
export const UpcA: Story = { name: 'UPC-A' };

/** EAN-13: the first digit is carried by the parity of the left half. */
export const Ean13: Story = { name: 'EAN-13', args: { format: 'ean-13', value: '4006381333931' } };

/** EAN-8, for small packages. */
export const Ean8: Story = { name: 'EAN-8', args: { format: 'ean-8', value: '9638507' } };

/** UPC-E, the zero-suppressed form of UPC-A 012345000065. */
export const UpcE: Story = { name: 'UPC-E', args: { format: 'upc-e', value: '0123456' } };

/** Code 128 for a shipping label: it switches to code set C for the run of digits. */
export const Code128: Story = {
  args: { format: 'code128', value: 'SHIP-20261016-000417' },
};

/**
 * Physical sizes for printing: the nominal UPC-A (0.33 mm bars, 22.85 mm tall). Print at 100% scale, never "fit to
 * page".
 */
export const PrintSize: Story = {
  args: { value: '036000291452', moduleWidth: '0.33mm', height: '22.85mm' },
};

/** Without the digits under the bars, the value shows as text beside the code instead. */
export const WithoutText: Story = {
  render: (args) => (
    <div className="flex items-center gap-4">
      <Barcode {...args} format="code128" value="ASSET-0042" hasText={false} height={48} />
      <code className="font-mono text-sm text-fg">ASSET-0042</code>
    </div>
  ),
};

/** Drawn on a canvas at the device's pixel ratio. */
export const Canvas: Story = { args: { renderAs: 'canvas' } };

/** A wrong check digit shows the expected one instead of a barcode. */
export const WrongCheckDigit: Story = { args: { value: '036000291453' } };
