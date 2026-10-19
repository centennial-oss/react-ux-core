import { render, screen } from '@testing-library/react';
import { createRef, useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { UIProvider } from '../../provider/UIProvider';
import { expectNoAxeViolations } from '../../../test/axe';
import { NumberField } from './NumberField';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;
const hasTouch = navigator.maxTouchPoints > 0;

function inLocale(locale: string, children: ReactNode) {
  return <UIProvider locale={locale}>{children}</UIProvider>;
}

function input(name: string) {
  return screen.getByRole('textbox', { name });
}

describe('NumberField', () => {
  it('is labelled and described, and calls onChange with the number when committed', async () => {
    const onChange = vi.fn();
    render(
      inLocale(
        'en-US',
        <NumberField label="Panels" description="On the roof" onChange={onChange} />,
      ),
    );
    const field = input('Panels');
    expect(field).toHaveAccessibleDescription('On the roof');
    await userEvent.type(field, '42');
    // Typing alone doesn't commit.
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.keyboard('{Tab}');
    expect(onChange).toHaveBeenCalledExactlyOnceWith(42);
    expect(field).toHaveValue('42');
  });

  it('commits on Enter', async () => {
    const onChange = vi.fn();
    render(inLocale('en-US', <NumberField label="Panels" onChange={onChange} />));
    await userEvent.type(input('Panels'), '7{Enter}');
    expect(onChange).toHaveBeenCalledExactlyOnceWith(7);
  });

  it('parses and formats for the provider locale', async () => {
    const onChange = vi.fn();
    render(
      inLocale('de-DE', <NumberField label="Leistung" defaultValue={1234.5} onChange={onChange} />),
    );
    const field = input('Leistung');
    expect(field).toHaveValue('1.234,5');
    await userEvent.fill(field, '2.500,75');
    await userEvent.keyboard('{Tab}');
    expect(onChange).toHaveBeenLastCalledWith(2500.75);
    expect(field).toHaveValue('2.500,75');
  });

  it('formats currency with the currency’s own fraction digits', async () => {
    const onChange = vi.fn();
    render(
      inLocale(
        'en-US',
        <>
          <NumberField
            label="Price"
            formatOptions={{ style: 'currency', currency: 'USD' }}
            defaultValue={12}
            onChange={onChange}
          />
          <NumberField
            label="Yen"
            formatOptions={{ style: 'currency', currency: 'JPY' }}
            defaultValue={1234}
          />
          <NumberField
            label="Euro"
            formatOptions={{ style: 'currency', currency: 'EUR' }}
            defaultValue={9.5}
          />
        </>,
      ),
    );
    expect(input('Price')).toHaveValue('$12.00');
    expect(input('Yen')).toHaveValue('¥1,234');
    expect(input('Euro')).toHaveValue('€9.50');
    await userEvent.fill(input('Price'), '1,234.567');
    await userEvent.keyboard('{Tab}');
    // Rounded to the currency's two fraction digits.
    expect(onChange).toHaveBeenLastCalledWith(1234.57);
    expect(input('Price')).toHaveValue('$1,234.57');
  });

  it('accepts a pasted, formatted number in one go', async () => {
    const onChange = vi.fn();
    render(inLocale('en-US', <NumberField label="Budget" onChange={onChange} />));
    // fill() replaces the text in one input event, the way a paste does.
    await userEvent.fill(input('Budget'), '1,234,567.5');
    await userEvent.keyboard('{Tab}');
    expect(onChange).toHaveBeenLastCalledWith(1234567.5);
  });

  it('clamps to minValue and maxValue and snaps to step on commit', async () => {
    const onChange = vi.fn();
    render(
      inLocale(
        'en-US',
        <NumberField label="Rating" minValue={0} maxValue={10} step={0.5} onChange={onChange} />,
      ),
    );
    const field = input('Rating');
    await userEvent.type(field, '15');
    await userEvent.keyboard('{Tab}');
    expect(onChange).toHaveBeenLastCalledWith(10);
    expect(field).toHaveValue('10');
    await userEvent.fill(field, '3.3');
    await userEvent.keyboard('{Tab}');
    expect(onChange).toHaveBeenLastCalledWith(3.5);
  });

  it('steps with ArrowUp and ArrowDown, and jumps with Home and End', async () => {
    const onChange = vi.fn();
    render(
      inLocale(
        'en-US',
        <NumberField
          label="Quantity"
          defaultValue={10}
          step={5}
          minValue={0}
          maxValue={50}
          onChange={onChange}
        />,
      ),
    );
    await userEvent.click(input('Quantity'));
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(15);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith(5);
    expect(input('Quantity')).toHaveValue('5');
    await userEvent.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith(50);
    await userEvent.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it('steps with the stepper buttons, which leave the tab order to the input', async () => {
    const onChange = vi.fn();
    render(
      inLocale(
        'en-US',
        <NumberField
          label="Quantity"
          hasStepper
          defaultValue={1}
          minValue={0}
          maxValue={2}
          onChange={onChange}
        />,
      ),
    );
    const increase = screen.getByRole('button', { name: /Increase/ });
    const decrease = screen.getByRole('button', { name: /Decrease/ });
    expect(increase).toHaveAttribute('tabindex', '-1');
    await userEvent.click(increase);
    expect(onChange).toHaveBeenLastCalledWith(2);
    // At the maximum the increment button is disabled.
    expect(increase).toBeDisabled();
    await userEvent.click(decrease);
    await userEvent.click(decrease);
    expect(onChange).toHaveBeenLastCalledWith(0);
    expect(decrease).toBeDisabled();
    expect(input('Quantity')).toHaveValue('0');
  });

  it('reports null when emptied', async () => {
    const onChange = vi.fn();
    render(inLocale('en-US', <NumberField label="Limit" defaultValue={5} onChange={onChange} />));
    await userEvent.clear(input('Limit'));
    await userEvent.keyboard('{Tab}');
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(input('Limit')).toHaveValue('');
  });

  it('works controlled, including null for empty', async () => {
    function Controlled() {
      const [value, setValue] = useState<number | null>(3);
      return (
        <>
          <NumberField label="Count" value={value} onChange={setValue} hasStepper />
          <output>{value === null ? 'empty' : String(value)}</output>
          <button
            type="button"
            onClick={() => {
              setValue(null);
            }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              setValue(1000);
            }}
          >
            Thousand
          </button>
        </>
      );
    }
    render(inLocale('en-US', <Controlled />));
    expect(input('Count')).toHaveValue('3');
    await userEvent.click(screen.getByRole('button', { name: /Increase/ }));
    expect(screen.getByRole('status').textContent).toBe('4');
    expect(input('Count')).toHaveValue('4');
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(input('Count')).toHaveValue('');
    await userEvent.click(screen.getByRole('button', { name: 'Thousand' }));
    expect(input('Count')).toHaveValue('1,000');
  });

  it('stays put when a controlled value is not updated', async () => {
    const onChange = vi.fn();
    render(inLocale('en-US', <NumberField label="Fixed" value={5} onChange={onChange} />));
    await userEvent.fill(input('Fixed'), '9');
    await userEvent.keyboard('{Tab}');
    expect(onChange).toHaveBeenCalledWith(9);
    expect(input('Fixed')).toHaveValue('5');
  });

  it('shows the error message when invalid and marks the input invalid', () => {
    render(
      inLocale(
        'en-US',
        <NumberField label="Age" isInvalid errorMessage="Enter your age" defaultValue={-1} />,
      ),
    );
    const field = input('Age');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription(/Enter your age/);
    expect(screen.getByText('Enter your age')).toBeInTheDocument();
  });

  it('validates with a function that receives null for empty', async () => {
    const validate = vi.fn((value: number | null) => (value === null ? 'Required' : null));
    render(
      inLocale(
        'en-US',
        <NumberField
          label="Seats"
          validate={validate}
          validationBehavior="aria"
          defaultValue={2}
        />,
      ),
    );
    expect(validate).toHaveBeenLastCalledWith(2);
    await userEvent.clear(input('Seats'));
    await userEvent.keyboard('{Tab}');
    expect(validate).toHaveBeenLastCalledWith(null);
    expect(input('Seats')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('marks required fields, and takes a ref, inputRef, className and data attributes', () => {
    const ref = createRef<HTMLDivElement>();
    const inputRef = createRef<HTMLInputElement>();
    render(
      <NumberField
        label="Units"
        isRequired
        ref={ref}
        inputRef={inputRef}
        className="mt-2"
        data-testid="units"
      />,
    );
    expect(input('Units')).toBeRequired();
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    expect(inputRef.current).toBe(input('Units'));
    expect(ref.current).toBe(screen.getByTestId('units'));
    expect(ref.current?.className).toContain('mt-2');
  });

  it.runIf(isPhone)('uses at least 16px text on phones so iOS does not zoom', () => {
    render(<NumberField label="Units" />);
    expect(parseFloat(getComputedStyle(input('Units')).fontSize)).toBeGreaterThanOrEqual(16);
  });

  it.runIf(hasTouch)('steps when the steppers are tapped, with touch-sized targets', async () => {
    const onChange = vi.fn();
    render(
      inLocale(
        'en-US',
        <NumberField label="Units" hasStepper size="sm" defaultValue={1} onChange={onChange} />,
      ),
    );
    await commands.tap('[slot="increment"]');
    expect(onChange).toHaveBeenLastCalledWith(2);
    const box = input('Units').parentElement?.getBoundingClientRect();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    // The steppers fill the field's height (over its border) and stay inside its sides.
    for (const button of screen.getAllByRole('button')) {
      const rect = button.getBoundingClientRect();
      expect(rect.height).toBeGreaterThanOrEqual(44);
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.left).toBeGreaterThanOrEqual(box?.left ?? 0);
      expect(rect.right).toBeLessThanOrEqual(box?.right ?? 0);
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      inLocale(
        'en-US',
        <>
          <NumberField label="Units" description="Help" isRequired />
          <NumberField label="Price" formatOptions={{ style: 'currency', currency: 'USD' }} />
          <NumberField label="Quantity" hasStepper defaultValue={1} />
          <NumberField label="Invalid" isInvalid errorMessage="Required" />
          <NumberField label="Disabled" hasStepper isDisabled />
          <NumberField aria-label="Unlabelled visually" />
        </>,
      ),
    );
    await expectNoAxeViolations(container);
  });
});
