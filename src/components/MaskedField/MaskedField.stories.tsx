import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { Mask, MaskTokens } from '../../utils/mask';
import { MaskedField } from './MaskedField';

// Example presets. Masks are plain strings or functions, so an app keeps its own beside its forms.

/** A US phone number. */
const phoneMask = '(999) 999-9999';

/** A card number by brand: American Express 4-6-5, Diners Club 4-6-4, others 4-4-4-4 with up to 19 digits. */
const cardMask: Mask = (raw) =>
  /^3[47]/.test(raw)
    ? '9999 999999 99999'
    : /^3(0[0-5]|[68])/.test(raw)
      ? '9999 999999 9999'
      : '9999 9999 9999 9999[ 999]';

/** IBAN characters after the check digits: letters (uppercased) and digits. */
const ibanTokens: MaskTokens = {
  X: { pattern: /[A-Z0-9]/, transform: (char) => char.toUpperCase() },
};

const ibanLengths: Readonly<Record<string, number>> = {
  BE: 16,
  CH: 21,
  DE: 22,
  ES: 24,
  FR: 27,
  GB: 22,
  IT: 27,
  NL: 18,
};

/** A country code, check digits, then the account in groups of four: `length` characters, each past `required` optional. */
function ibanGroups(length: number, required: number): string {
  let mask = '';
  for (let index = 0; index < length; index++) {
    const slot = index < 2 ? 'A' : index < 4 ? '9' : 'X';
    const part = index > 0 && index % 4 === 0 ? ` ${slot}` : slot;
    mask += index < required ? part : `[${part}]`;
  }
  return mask;
}

/** An IBAN: the length its country uses, or 15 to 34 characters for other countries. */
const ibanMask: Mask = (raw) => {
  const length = ibanLengths[raw.slice(0, 2)];
  return length === undefined ? ibanGroups(34, 15) : ibanGroups(length, length);
};

function ValuesDemo() {
  const [raw, setRaw] = useState('5551234567');
  const [formatted, setFormatted] = useState('(555) 123-4567');
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <MaskedField label="Raw value" mask={phoneMask} value={raw} onChange={setRaw} />
        <output className="text-sm text-fg-muted">{raw}</output>
      </div>
      <div className="flex flex-col gap-1">
        <MaskedField
          label="Formatted value"
          mask={phoneMask}
          valueFormat="formatted"
          value={formatted}
          onChange={setFormatted}
        />
        <output className="text-sm text-fg-muted">{formatted}</output>
      </div>
    </div>
  );
}

const meta = {
  title: 'Inputs/MaskedField',
  component: MaskedField,
  args: { label: 'Phone', description: 'Like (555) 123-4567', mask: phoneMask },
} satisfies Meta<typeof MaskedField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** A phone number. The value is the digits alone ("5551234567"); the field shows the brackets, space and hyphen. */
export const Phone: Story = {
  args: { autoComplete: 'tel-national', defaultValue: '5551234' },
};

/**
 * Postal codes: a Canadian one (`A9A 9A9`, letters uppercased as they're typed, with a text keyboard) and a US ZIP
 * code whose four-digit extension is optional (`99999[-9999]`).
 */
export const PostalCode: Story = {
  render: () => (
    <div className="flex flex-col gap-5">
      <MaskedField
        label="Postal code"
        description="Like K1A 0B1"
        mask="A9A 9A9"
        autoComplete="postal-code"
        defaultValue="k1a0b1"
      />
      <MaskedField
        label="ZIP code"
        description="5 digits, or ZIP+4"
        mask="99999[-9999]"
        autoComplete="postal-code"
        defaultValue="902101234"
      />
    </div>
  ),
};

/** A card number whose grouping follows its brand, picked by a function mask as the first digits arrive. */
export const CreditCard: Story = {
  render: () => (
    <div className="flex flex-col gap-5">
      <MaskedField
        label="Card number"
        mask={cardMask}
        autoComplete="cc-number"
        defaultValue="4111111111111111"
      />
      <MaskedField
        label="Amex card number"
        mask={cardMask}
        autoComplete="cc-number"
        defaultValue="378282246310005"
      />
    </div>
  ),
};

/** A date as typed text. `valueFormat="formatted"` makes the value "03/14/2026" rather than "03142026". */
export const DateOfBirth: Story = {
  name: 'Date',
  args: {
    label: 'Date of birth',
    description: 'MM/DD/YYYY',
    mask: '99/99/9999',
    valueFormat: 'formatted',
    autoComplete: 'bday',
    defaultValue: '03/14/1990',
  },
};

/**
 * An IBAN, with custom tokens (`X`, a letter or digit, uppercased) and a function mask that takes the length the
 * country uses once its code is typed. Pasting "gb82 west 1234 5698 7654 32" fills it.
 */
export const Iban: Story = {
  args: {
    label: 'IBAN',
    description: 'Starts with the country code, such as GB',
    mask: ibanMask,
    tokens: ibanTokens,
    defaultValue: 'GB82WEST12345698765432',
  },
};

/** `placeholderChar` draws the rest of the mask while the field has focus; it isn't part of the value. */
export const Template: Story = {
  args: { placeholderChar: '_', defaultValue: '555' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('textbox', { name: 'Phone' }));
  },
};

/** The value as the app gets it, raw and formatted. */
export const Values: Story = {
  tags: ['!visual'],
  render: () => <ValuesDemo />,
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <MaskedField label="Small" size="sm" mask={phoneMask} defaultValue="5551234567" />
      <MaskedField label="Medium" size="md" mask={phoneMask} defaultValue="5551234567" />
    </div>
  ),
};

/** An incomplete value fails when its form is submitted; here the error shows from the start. */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-5">
      <MaskedField label="Required" isRequired mask={phoneMask} />
      <MaskedField
        label="Invalid"
        mask={phoneMask}
        defaultValue="555"
        isInvalid
        errorMessage="Enter the complete value"
      />
      <MaskedField label="Disabled" isDisabled mask={phoneMask} defaultValue="5551234567" />
      <MaskedField label="Read-only" isReadOnly mask={phoneMask} defaultValue="5551234567" />
      <MaskedField
        label="Side label"
        labelPosition="side"
        mask={phoneMask}
        defaultValue="5551234567"
      />
    </div>
  ),
};
