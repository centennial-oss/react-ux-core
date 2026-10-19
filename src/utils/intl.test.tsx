import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider } from 'react-aria-components';
import { describe, expect, it } from 'vitest';
import {
  dateTimeFormat,
  listFormat,
  localeSeparators,
  numberFormat,
  unitName,
  useListFormat,
  useNumberFormat,
} from './intl';

function inLocale(locale: string) {
  return ({ children }: { children: ReactNode }) => (
    <I18nProvider locale={locale}>{children}</I18nProvider>
  );
}

describe('cached formatters', () => {
  it('shares one formatter per locale and options', () => {
    expect(numberFormat('en-US')).toBe(numberFormat('en-US'));
    expect(numberFormat('en-US', { style: 'percent' })).toBe(
      numberFormat('en-US', { style: 'percent' }),
    );
    expect(numberFormat('en-US', { style: 'percent' })).not.toBe(numberFormat('en-US'));
    expect(numberFormat('de-DE')).not.toBe(numberFormat('en-US'));
    expect(dateTimeFormat('en-US', { year: 'numeric' })).toBe(
      dateTimeFormat('en-US', { year: 'numeric' }),
    );
    expect(listFormat('en-US')).toBe(listFormat('en-US'));
  });

  it('formats as Intl does', () => {
    expect(numberFormat('de-DE', { maximumFractionDigits: 1 }).format(1234.56)).toBe('1.234,6');
    expect(dateTimeFormat('en-US', { year: 'numeric', timeZone: 'UTC' }).format(0)).toBe('1970');
  });
});

describe('formatter hooks', () => {
  it("use the provider's locale", () => {
    const { result } = renderHook(() => useNumberFormat({ style: 'percent' }), {
      wrapper: inLocale('fr-FR'),
    });
    expect(result.current.format(0.5).replace(/\s/g, ' ')).toBe('50 %');
  });

  it('keep the same formatter across renders', () => {
    const { result, rerender } = renderHook(() => useNumberFormat({ style: 'percent' }), {
      wrapper: inLocale('en-US'),
    });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('join lists with "and" by default', () => {
    const { result } = renderHook(() => useListFormat(), { wrapper: inLocale('en-US') });
    expect(result.current.format(['A', 'B', 'C'])).toBe('A, B, and C');
  });
});

describe('localeSeparators', () => {
  it('reads the decimal and grouping characters', () => {
    expect(localeSeparators('en-US')).toEqual({ decimal: '.', group: ',' });
    expect(localeSeparators('de-DE')).toEqual({ decimal: ',', group: '.' });
  });
});

describe('unitName', () => {
  it('names a unit at each width, pluralised for the amount', () => {
    expect(unitName('en-US', 'hour')).toBe('hours');
    expect(unitName('en-US', 'hour', 'long', 1)).toBe('hour');
    expect(unitName('en-US', 'hour', 'narrow')).toBe('h');
  });
});
