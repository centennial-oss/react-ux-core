import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { expectNoAxeViolations } from '../../../test/axe';
import type { MoneyFieldMessages } from './messages';
import { MoneyField } from './MoneyField';

const hasTouch = navigator.maxTouchPoints > 0;
const isPhone = window.innerWidth < 640;

function input(name: string) {
  return screen.getByRole<HTMLInputElement>('textbox', { name });
}

async function typeAndCommit(field: HTMLInputElement, text: string) {
  await userEvent.clear(field);
  await userEvent.type(field, text);
  await userEvent.keyboard('{Enter}');
}

describe('MoneyField', () => {
  it('stores "1234.5" in USD as "1234.50" and shows "$1,234.50"', async () => {
    const onChange = vi.fn();
    render(<MoneyField label="Price" currency="USD" onChange={onChange} />);
    const field = input('Price');
    await userEvent.type(field, '1234.5');
    await userEvent.keyboard('{Tab}');
    expect(onChange).toHaveBeenLastCalledWith('1234.50');
    expect(field).toHaveValue('1,234.50');
    // The symbol is an adornment before the number in English.
    expect(field.previousElementSibling?.textContent).toBe('$');
    expect(field).toHaveAccessibleDescription('1,234.50 US dollars');
  });

  it('shows plain digits while editing', async () => {
    render(<MoneyField label="Price" currency="USD" defaultValue="1234.5" />);
    const field = input('Price');
    expect(field).toHaveValue('1,234.50');
    await userEvent.click(field);
    expect(field).toHaveValue('1234.50');
  });

  it('tolerates pasted amounts', async () => {
    const onChange = vi.fn();
    render(<MoneyField label="Price" currency="USD" onChange={onChange} />);
    const field = input('Price');
    // fill() inserts the text in one go, as a paste does.
    await userEvent.fill(field, '$1,234.5');
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('1234.50');
  });

  it('rejects decimals in JPY', async () => {
    const onChange = vi.fn();
    render(<MoneyField label="Price" currency="JPY" onChange={onChange} />);
    const field = input('Price');
    await typeAndCommit(field, '1500.5');
    expect(onChange).not.toHaveBeenCalled();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(document.body.textContent).toEqual(
      expect.stringContaining('Enter a whole amount, without decimals'),
    );
    await typeAndCommit(field, '1500');
    expect(onChange).toHaveBeenLastCalledWith('1500');
    expect(field).not.toHaveAttribute('aria-invalid');
  });

  it('uses three decimals for BHD, or minorUnits', async () => {
    const onChange = vi.fn();
    render(
      <>
        <MoneyField label="BHD" currency="BHD" onChange={onChange} />
        <MoneyField label="Unit price" currency="USD" minorUnits={4} defaultValue="0.12345" />
      </>,
    );
    await typeAndCommit(input('BHD'), '12.5');
    expect(onChange).toHaveBeenLastCalledWith('12.500');
    expect(input('Unit price')).toHaveValue('0.12345');
    expect(document.body.textContent).toEqual(
      expect.stringContaining('Use at most 4 decimal places'),
    );
  });

  it('refuses negatives unless allowed, and announces them', async () => {
    const onChange = vi.fn();
    render(
      <>
        <MoneyField label="Price" currency="USD" onChange={onChange} />
        <MoneyField
          label="Adjustment"
          currency="USD"
          allowsNegative
          negativeStyle="parentheses"
          defaultValue="-1234.5"
        />
      </>,
    );
    await typeAndCommit(input('Price'), '-5');
    expect(onChange).not.toHaveBeenCalled();
    expect(document.body.textContent).toEqual(
      expect.stringContaining('Enter an amount of zero or more'),
    );
    const adjustment = input('Adjustment');
    expect(adjustment).toHaveValue('(1,234.50)');
    expect(adjustment).toHaveAccessibleDescription('-1,234.50 US dollars');
  });

  it('compares min and max as decimals', async () => {
    const onChange = vi.fn();
    render(<MoneyField label="Budget" currency="USD" maxValue="5000" onChange={onChange} />);
    await typeAndCommit(input('Budget'), '5000.01');
    expect(onChange).toHaveBeenLastCalledWith('5000.01');
    expect(input('Budget')).toHaveAttribute('aria-invalid', 'true');
    expect(document.body.textContent).toEqual(expect.stringContaining('Must be at most $5,000.00'));
  });

  it('formats for the locale, with the symbol where the locale puts it', () => {
    render(
      <UIProvider locale="de-DE">
        <MoneyField label="Preis" currency="EUR" defaultValue="1234.5" />
      </UIProvider>,
    );
    const field = input('Preis');
    expect(field).toHaveValue('1.234,50');
    expect(field.nextElementSibling?.textContent).toBe('€');
  });

  it('offers a currency select when currencies are given', async () => {
    const onCurrencyChange = vi.fn();
    function Deal() {
      const [currency, setCurrency] = useState('USD');
      return (
        <MoneyField
          label="Deal"
          currency={currency}
          currencies={['USD', 'EUR', 'JPY']}
          onCurrencyChange={(next) => {
            setCurrency(next);
            onCurrencyChange(next);
          }}
          defaultValue="2500"
        />
      );
    }
    render(<Deal />);
    await userEvent.click(screen.getByRole('button', { name: /Currency for Deal/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'JPY' }));
    expect(onCurrencyChange).toHaveBeenLastCalledWith('JPY');
    await expect.poll(() => input('Deal').value).toBe('2,500');
  });

  it('submits the decimal string with a form', () => {
    const { container } = render(
      <form>
        <MoneyField label="Price" currency="USD" name="price" defaultValue="9.90" />
      </form>,
    );
    expect(container.querySelector<HTMLInputElement>('input[name="price"]')?.value).toBe('9.90');
  });

  it.runIf(hasTouch)('takes typed amounts after a tap, with a decimal keypad', async () => {
    const onChange = vi.fn();
    render(<MoneyField label="Price" currency="USD" onChange={onChange} />);
    await commands.tap('input[type="text"]');
    expect(input('Price')).toHaveFocus();
    expect(input('Price')).toHaveAttribute('inputmode', 'decimal');
    await userEvent.keyboard('12.3{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('12.30');
  });

  it.runIf(isPhone)('fits a phone screen without page scroll', () => {
    render(
      <MoneyField label="Deal" currency="USD" currencies={['USD', 'EUR']} defaultValue="1234.50" />,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('takes the app’s strings from UIProvider', async () => {
    const messages: Partial<Messages & MoneyFieldMessages> = {
      moneyFieldInvalid: 'Kein Betrag',
      moneyFieldCurrencyFor: ({ label }) => `Währung für ${label}`,
    };
    render(
      <UIProvider messages={messages}>
        <MoneyField label="Preis" currency="EUR" currencies={['EUR', 'USD']} />
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: /Währung für Preis/ })).toBeInTheDocument();
    await typeAndCommit(input('Preis'), 'abc');
    expect(document.body.textContent).toEqual(expect.stringContaining('Kein Betrag'));
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <div className="flex flex-col gap-4">
        <MoneyField label="Price" currency="USD" defaultValue="1234.50" description="Per seat" />
        <MoneyField label="Over" currency="USD" maxValue="10" defaultValue="20" />
        <MoneyField label="Deal" currency="EUR" currencies={['USD', 'EUR']} defaultValue="5" />
        <MoneyField label="Disabled" currency="JPY" defaultValue="500" isDisabled />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});
