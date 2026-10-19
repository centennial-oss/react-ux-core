import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { UIProvider } from '../../provider/UIProvider';
import { NumberField } from './NumberField';

const meta = {
  title: 'Inputs/NumberField',
  component: NumberField,
  args: { label: 'Panels', defaultValue: 12 },
} satisfies Meta<typeof NumberField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <NumberField label="Panels" description="On the main roof" isRequired />
      <NumberField
        label="Battery capacity"
        isInvalid
        errorMessage="Enter a capacity between 1 and 100 kWh"
        defaultValue={0}
      />
      <NumberField label="Read-only" isReadOnly defaultValue={42} />
      <NumberField label="Disabled" isDisabled defaultValue={7} hasStepper />
      <NumberField label="Small" size="sm" defaultValue={3} />
    </div>
  ),
};

/** Decrement and increment buttons; they disable at `minValue` and `maxValue`. */
export const Steppers: Story = {
  render: () => (
    <div className="flex max-w-xs flex-col gap-5">
      <NumberField label="Quantity" hasStepper defaultValue={1} minValue={1} maxValue={10} />
      <NumberField
        label="Tilt (degrees)"
        hasStepper
        defaultValue={30}
        step={5}
        minValue={0}
        maxValue={90}
      />
    </div>
  ),
};

/** `formatOptions` takes `Intl.NumberFormat` options: currency, percent and units. */
export const Formatting: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <NumberField
        label="Price (USD)"
        formatOptions={{ style: 'currency', currency: 'USD' }}
        defaultValue={1499.5}
      />
      <NumberField
        label="Price (JPY)"
        description="Yen has no minor unit, so no decimals"
        formatOptions={{ style: 'currency', currency: 'JPY' }}
        defaultValue={120000}
      />
      <NumberField
        label="Efficiency"
        formatOptions={{ style: 'percent', maximumFractionDigits: 1 }}
        defaultValue={0.215}
      />
      <NumberField
        label="Setpoint"
        formatOptions={{ style: 'unit', unit: 'celsius' }}
        defaultValue={21.5}
      />
    </div>
  ),
};

/** Parsing and formatting follow `UIProvider`'s `locale`: German uses "." for thousands and "," for decimals. */
export const Locale: Story = {
  tags: ['!visual'],
  render: () => (
    <UIProvider locale="de-DE">
      <div className="flex max-w-md flex-col gap-5">
        <NumberField label="Leistung" defaultValue={1234.5} />
        <NumberField
          label="Preis"
          formatOptions={{ style: 'currency', currency: 'EUR' }}
          defaultValue={1499.5}
        />
      </div>
    </UIProvider>
  ),
};

/** Side labels sit beside the input in wide containers and move on top in narrow ones. */
export const SideLabel: Story = {
  render: () => (
    <div className="max-w-xl">
      <NumberField label="Panels" labelPosition="side" hasStepper defaultValue={12} />
    </div>
  ),
};

/** Controlled with `value` / `onChange`; an empty field is `null`. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function ControlledStory() {
    const [value, setValue] = useState<number | null>(250);
    return (
      <div className="flex max-w-xs flex-col gap-2">
        <NumberField
          label="Monthly budget"
          formatOptions={{ style: 'currency', currency: 'USD' }}
          value={value}
          onChange={setValue}
          minValue={0}
          hasStepper
          step={10}
        />
        <p className="text-sm text-fg-muted">Value: {value ?? 'empty'}</p>
      </div>
    );
  },
};
