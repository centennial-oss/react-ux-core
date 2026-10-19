import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { OneTimeCodeField } from './OneTimeCodeField';

const meta = {
  title: 'Inputs/OneTimeCodeField',
  component: OneTimeCodeField,
  args: { label: 'Verification code', description: 'We sent a code to your phone' },
} satisfies Meta<typeof OneTimeCodeField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** `groupSizes` splits the cells with a separator, here 3 + 3. Pasting "123 456" or "123-456" fills every cell. */
export const Groups: Story = {
  args: { groupSizes: [3, 3], defaultValue: '1234' },
};

/** `alphanumeric` takes Latin letters (uppercased as they're typed) and digits, with a text keyboard. */
export const Alphanumeric: Story = {
  args: {
    label: 'Recovery code',
    description: 'Letters and numbers, from your saved codes',
    allowedCharacters: 'alphanumeric',
    groupSizes: [4, 4],
    defaultValue: 'K7QX2',
  },
};

/** A pattern each character must match, taken as typed: here lowercase hexadecimal. */
export const CustomPattern: Story = {
  args: {
    label: 'Pairing code',
    description: 'Shown on the device: 0–9 and a–f',
    allowedCharacters: /[0-9a-f]/,
    codeLength: 5,
    defaultValue: '3fa',
  },
};

/** `isMasked` shows dots and makes the input a password input. */
export const Masked: Story = {
  args: { label: 'PIN', description: undefined, codeLength: 4, isMasked: true, defaultValue: '12' },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <OneTimeCodeField label="Small" size="sm" codeLength={4} defaultValue="12" />
      <OneTimeCodeField label="Medium" size="md" codeLength={4} defaultValue="12" />
      <OneTimeCodeField label="Large" size="lg" codeLength={4} defaultValue="12" />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-5">
      <OneTimeCodeField label="Required" isRequired groupSizes={[3, 3]} />
      <OneTimeCodeField
        label="Invalid"
        isInvalid
        errorMessage="That code didn’t work. Check it and try again."
        defaultValue="123456"
      />
      <OneTimeCodeField label="Disabled" isDisabled defaultValue="123" />
      <OneTimeCodeField label="Read-only" isReadOnly defaultValue="483920" />
      <OneTimeCodeField
        label="Side label"
        labelPosition="side"
        codeLength={4}
        infoTip="Check your authenticator app"
      />
    </div>
  ),
};

/** `onComplete` fires when every cell is filled, for example to verify the code at once. */
export const OnComplete: Story = {
  tags: ['!visual'],
  render: function OnComplete() {
    const [code, setCode] = useState('');
    const [checked, setChecked] = useState<string | null>(null);
    return (
      <div className="flex flex-col gap-2 text-sm text-fg">
        <OneTimeCodeField
          label="Verification code"
          groupSizes={[3, 3]}
          value={code}
          onChange={(next) => {
            setCode(next);
            setChecked(null);
          }}
          onComplete={setChecked}
        />
        <span role="status" className="text-fg-muted">
          {checked === null ? 'Waiting for 6 digits' : `Checking ${checked}…`}
        </span>
      </div>
    );
  },
};
