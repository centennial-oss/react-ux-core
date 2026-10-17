/** Strings for MoneyField. */
export interface MoneyFieldMessages {
  /** The currency select's accessible name, from the field's label ("Currency for Price"). */
  moneyFieldCurrencyFor: (params: { label: string }) => string;
  /** The currency select's accessible name when the field has no text label. */
  moneyFieldCurrency: string;
  /** Shown when the text isn't an amount. */
  moneyFieldInvalid: string;
  /** Shown when the amount has more decimal places than the currency allows (`count` may be 0, as for JPY). */
  moneyFieldTooManyDecimals: (params: { count: number }) => string;
  /** Shown when a negative amount is typed and `allowsNegative` is off. */
  moneyFieldNegative: string;
  /** Shown when the amount is below `minValue`; `min` is formatted as money. */
  moneyFieldTooSmall: (params: { min: string }) => string;
  /** Shown when the amount is above `maxValue`; `max` is formatted as money. */
  moneyFieldTooLarge: (params: { max: string }) => string;
}

export const defaultMoneyFieldMessages: MoneyFieldMessages = {
  moneyFieldCurrencyFor: ({ label }) => `Currency for ${label}`,
  moneyFieldCurrency: 'Currency',
  moneyFieldInvalid: 'Enter an amount such as 1234.50',
  moneyFieldTooManyDecimals: ({ count }) =>
    count === 0
      ? 'Enter a whole amount, without decimals'
      : `Use at most ${String(count)} decimal ${count === 1 ? 'place' : 'places'}`,
  moneyFieldNegative: 'Enter an amount of zero or more',
  moneyFieldTooSmall: ({ min }) => `Must be at least ${min}`,
  moneyFieldTooLarge: ({ max }) => `Must be at most ${max}`,
};
