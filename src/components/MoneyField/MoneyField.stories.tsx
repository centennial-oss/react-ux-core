import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { UIProvider } from '../../provider/UIProvider';
import { decimalAdd, decimalMultiply, roundHalfEven } from './decimal';
import { formatMoney } from './money';
import { MoneyField } from './MoneyField';

const meta = {
  title: 'Inputs/MoneyField',
  component: MoneyField,
  args: { label: 'Price', currency: 'USD', defaultValue: '1234.50' },
} satisfies Meta<typeof MoneyField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** Each currency's own minor units: two for USD, none for JPY, three for BHD. */
export const Currencies: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-6">
      <MoneyField label="Price (USD)" currency="USD" defaultValue="1234.50" />
      <MoneyField label="Price (JPY)" currency="JPY" defaultValue="150000" />
      <MoneyField label="Price (BHD)" currency="BHD" defaultValue="12.345" />
      <MoneyField label="Price (EUR)" currency="EUR" defaultValue="99.90" />
    </div>
  ),
};

/** The symbol's side and the separators follow the locale. */
export const Locales: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="flex max-w-sm flex-col gap-6">
      <UIProvider locale="de-DE">
        <MoneyField label="Preis" currency="EUR" defaultValue="1234.50" />
      </UIProvider>
      <UIProvider locale="fr-FR">
        <MoneyField label="Prix" currency="EUR" defaultValue="1234.50" />
      </UIProvider>
      <UIProvider locale="ja-JP">
        <MoneyField label="価格" currency="JPY" defaultValue="98000" />
      </UIProvider>
    </div>
  ),
};

/** Negative amounts with `allowsNegative`, written with a minus or in accounting parentheses. */
export const Negatives: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-6">
      <MoneyField label="Adjustment" currency="USD" allowsNegative defaultValue="-1234.50" />
      <MoneyField
        label="Adjustment (accounting)"
        currency="USD"
        allowsNegative
        negativeStyle="parentheses"
        defaultValue="-1234.50"
      />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-6">
      <MoneyField
        label="Budget"
        currency="USD"
        maxValue="5000"
        defaultValue="7500"
        description="Up to $5,000"
      />
      <MoneyField label="Empty" currency="USD" placeholder="0.00" />
      <MoneyField label="Disabled" currency="USD" defaultValue="20.00" isDisabled />
      <MoneyField label="Read-only" currency="USD" defaultValue="20.00" isReadOnly />
      <MoneyField label="Side label" labelPosition="side" currency="USD" defaultValue="10.00" />
    </div>
  ),
};

/** A currency Select beside the amount when `currencies` is given. */
export const WithCurrencySelect: Story = {
  render: function CurrencyStory() {
    const [currency, setCurrency] = useState('EUR');
    return (
      <div className="max-w-sm">
        <MoneyField
          label="Deal value"
          currency={currency}
          currencies={['USD', 'EUR', 'GBP', 'JPY']}
          onCurrencyChange={setCurrency}
          defaultValue="2500"
        />
      </div>
    );
  },
};

/** The decimal helpers: exact sums and products on strings, rounded half-even. */
export const DecimalHelpers: Story = {
  render: () => {
    const sum = decimalAdd('0.1', '0.2');
    const line = roundHalfEven(decimalMultiply('19.99', '3'), 2);
    const tax = roundHalfEven(decimalMultiply('59.97', '0.0825'), 2);
    return (
      <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-fg">
        <dt className="text-fg-muted">0.1 + 0.2</dt>
        <dd>{sum}</dd>
        <dt className="text-fg-muted">3 × 19.99</dt>
        <dd>{formatMoney(line, 'USD', { locale: 'en-US' })}</dd>
        <dt className="text-fg-muted">8.25% tax</dt>
        <dd>{formatMoney(tax, 'USD', { locale: 'en-US' })}</dd>
      </dl>
    );
  },
};

/** Controlled: the value is a decimal string. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function ControlledStory() {
    const [value, setValue] = useState<string | null>('1234.50');
    return (
      <div className="flex max-w-sm flex-col gap-2">
        <MoneyField label="Amount" currency="USD" value={value} onChange={setValue} />
        <p className="text-sm text-fg-muted">Value: {value ?? 'empty'}</p>
      </div>
    );
  },
};
