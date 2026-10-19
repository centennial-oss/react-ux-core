import { describe, expect, it } from 'vitest';
import {
  currencyMinorUnits,
  currencySymbolPosition,
  formatMoney,
  formatMoneyForEditing,
  parseMoneyInput,
} from './money';

const usd = { locale: 'en-US', minorUnits: 2 };

describe('money', () => {
  it('knows each currency’s minor units', () => {
    expect(currencyMinorUnits('USD')).toBe(2);
    expect(currencyMinorUnits('JPY')).toBe(0);
    expect(currencyMinorUnits('BHD')).toBe(3);
  });

  it('formats decimal strings exactly for the locale', () => {
    expect(formatMoney('1234.5', 'USD', { locale: 'en-US' })).toBe('$1,234.50');
    expect(formatMoney('-5', 'USD', { locale: 'en-US', negativeStyle: 'parentheses' })).toBe(
      '($5.00)',
    );
    expect(formatMoney('1234.5', 'USD', { locale: 'en-US', currencyDisplay: 'name' })).toBe(
      '1,234.50 US dollars',
    );
    expect(formatMoney('1234.5', 'USD', { locale: 'en-US', isCurrencyHidden: true })).toBe(
      '1,234.50',
    );
    expect(formatMoney('12345678901234567.25', 'USD', { locale: 'en-US' })).toBe(
      '$12,345,678,901,234,567.25',
    );
    expect(formatMoney('1234.5', 'EUR', { locale: 'de-DE', isCurrencyHidden: true })).toBe(
      '1.234,50',
    );
    expect(formatMoney('2.345', 'USD', { locale: 'en-US' })).toBe('$2.34');
  });

  it('places the symbol by locale', () => {
    expect(currencySymbolPosition('USD', 'en-US')).toEqual({ symbol: '$', position: 'start' });
    expect(currencySymbolPosition('EUR', 'de-DE')).toEqual({ symbol: '€', position: 'end' });
  });

  it('reads pasted amounts tolerantly', () => {
    expect(parseMoneyInput('$1,234.5', usd)).toEqual({ value: '1234.50' });
    expect(parseMoneyInput('1234.5', usd)).toEqual({ value: '1234.50' });
    expect(parseMoneyInput(' USD 12 ', usd)).toEqual({ value: '12.00' });
    expect(parseMoneyInput('(12.00)', usd)).toEqual({ value: '-12.00' });
    expect(parseMoneyInput('−12', usd)).toEqual({ value: '-12.00' });
    expect(parseMoneyInput('12-', usd)).toEqual({ value: '-12.00' });
    expect(parseMoneyInput('', usd)).toEqual({ value: null });
    expect(parseMoneyInput('1.234,50 €', { locale: 'de-DE', minorUnits: 2 })).toEqual({
      value: '1234.50',
    });
    expect(parseMoneyInput('1,5', { locale: 'de-DE', minorUnits: 2 })).toEqual({ value: '1.50' });
  });

  it('rejects amounts that don’t fit the currency', () => {
    expect(parseMoneyInput('12.5', { locale: 'en-US', minorUnits: 0 })).toEqual({
      error: 'tooManyDecimals',
    });
    expect(parseMoneyInput('12.00', { locale: 'en-US', minorUnits: 0 })).toEqual({ value: '12' });
    expect(parseMoneyInput('1.005', usd)).toEqual({ error: 'tooManyDecimals' });
    expect(parseMoneyInput('-3', { ...usd, allowsNegative: false })).toEqual({ error: 'negative' });
    expect(parseMoneyInput('abc', usd)).toEqual({ error: 'invalid' });
    expect(parseMoneyInput('1.2.3', usd)).toEqual({ error: 'invalid' });
  });

  it('writes plain digits for editing', () => {
    expect(formatMoneyForEditing('1234.5', 'en-US', 2)).toBe('1234.50');
    expect(formatMoneyForEditing('1234.5', 'de-DE', 2)).toBe('1234,50');
    expect(formatMoneyForEditing('-7', 'en-US', 2)).toBe('-7.00');
  });
});
