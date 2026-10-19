import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { describedText } from '../../test/clipboard';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import { canonicalTex, MathInput, type MathInputProps } from './MathInput';
import type { MathMessages } from './messages';

const isTouch = navigator.maxTouchPoints > 0;

type MathFieldElement = HTMLElement & { value: string };

/** The <math-field> element, once MathLive has loaded and wired it. */
async function mathField(container: HTMLElement): Promise<MathFieldElement> {
  await expect
    .poll(() => container.querySelector('math-field')?.getAttribute('data-math-status'), {
      timeout: 10_000,
    })
    .toBe('ready');
  const field = container.querySelector<MathFieldElement>('math-field');
  if (!field) {
    throw new Error('No math-field');
  }
  return field;
}

/** Waits for focus to land back in the field (MathLive takes focus a moment after it's asked). */
async function fieldFocused() {
  await expect.poll(() => document.activeElement?.tagName).toBe('MATH-FIELD');
}

/** Presses a palette or toolbar button by name, with a tap on touch screens. */
async function pressButton(name: string) {
  const button = screen.getByRole('button', { name });
  if (isTouch) {
    button.setAttribute('data-test-target', '');
    await commands.tap('[data-test-target]');
    button.removeAttribute('data-test-target');
  } else {
    await userEvent.click(button);
  }
}

/** Presses a palette button, then waits for the field to have focus again. */
async function pressTemplate(name: string) {
  await pressButton(name);
  await fieldFocused();
}

/** TeX without spaces and with single-character groups unwrapped (`x^{2}` → `x^2`), for comparison. */
function normalise(tex: string): string {
  return tex.replace(/\s+/g, '').replace(/([_^])\{(\w)\}/g, '$1$2');
}

function Controlled(props: Partial<MathInputProps>) {
  const [value, setValue] = useState(props.defaultValue ?? '');
  return (
    <>
      <MathInput
        label="Answer"
        hasPalette
        virtualKeyboardPolicy="manual"
        {...props}
        defaultValue={undefined}
        value={value}
        onChange={(tex) => {
          setValue(tex);
          props.onChange?.(tex);
        }}
      />
      <output>{value}</output>
    </>
  );
}

describe('MathInput', () => {
  it('loads MathLive, labels the field and shows the value', async () => {
    const { container } = render(
      <MathInput label="Slope" description="As a fraction" defaultValue={'\\frac{1}{2}'} />,
    );
    const field = await mathField(container);
    expect(field.getAttribute('aria-labelledby')).toBe(screen.getByText('Slope').id);
    expect(describedText(field)).toBe('As a fraction');
    // MathLive may write \frac12; the component reports the usual spelling.
    await expect.poll(() => canonicalTex(field.value)).toBe('\\frac{1}{2}');
  });

  it('enters \\frac{3}{4}x^2 - 2x + 1 with the palette and digits', async () => {
    const onChange = vi.fn();
    const { container } = render(<Controlled onChange={onChange} />);
    const field = await mathField(container);
    await pressTemplate('Fraction');
    await userEvent.keyboard('3');
    await pressTemplate('Move right');
    await userEvent.keyboard('4');
    await pressTemplate('Move right');
    await userEvent.keyboard('x');
    await pressTemplate('Power');
    await userEvent.keyboard('2');
    await pressTemplate('Move right');
    await userEvent.keyboard('-2x+1');
    await expect.poll(() => normalise(canonicalTex(field.value))).toBe('\\frac{3}{4}x^2-2x+1');
    expect(normalise(screen.getByRole('status').textContent)).toBe('\\frac{3}{4}x^2-2x+1');
    expect(normalise(String(onChange.mock.lastCall?.[0]))).toBe('\\frac{3}{4}x^2-2x+1');
  });

  it('names the palette and its buttons, and limits it by mode', async () => {
    const { container, rerender } = render(<Controlled mode="arithmetic" />);
    await mathField(container);
    const palette = screen.getByRole('toolbar', { name: 'Math templates' });
    const names = within(palette)
      .getAllByRole('button')
      .map(
        (button) =>
          button.querySelector('.sr-only')?.textContent ?? button.getAttribute('aria-label'),
      );
    expect(names).toEqual([
      'Fraction',
      'Parentheses',
      'Times',
      'Divide',
      'Move left',
      'Move right',
    ]);
    rerender(<Controlled mode="calculus" />);
    expect(within(palette).getByRole('button', { name: 'Integral' })).toBeInTheDocument();
    expect(within(palette).getByRole('button', { name: 'Theta' })).toBeInTheDocument();
    expect(within(palette).queryByRole('button', { name: 'Matrix' })).toBeNull();
  });

  it('edits the TeX in a plain text field', async () => {
    const { container } = render(<Controlled defaultValue="x+1" />);
    const field = await mathField(container);
    await pressButton('Edit as TeX');
    const input = screen.getByRole('textbox', { name: 'Answer' });
    expect(input).toHaveValue('x+1');
    expect(field.hidden).toBe(true);
    expect(screen.queryByRole('toolbar')).toBeNull();
    await userEvent.fill(input, '\\sqrt{2}');
    expect(screen.getByRole('status').textContent).toBe('\\sqrt{2}');
    await pressButton('Edit as TeX');
    await expect.poll(() => field.value).toMatch(/^\\sqrt\{?2\}?$/);
    expect(field.hidden).toBe(false);
  });

  it('marks required, invalid, disabled and read-only fields', async () => {
    const { container, rerender } = render(
      <MathInput
        label="Answer"
        isRequired
        isInvalid
        errorMessage="Enter an expression"
        hasPalette
      />,
    );
    const field = await mathField(container);
    await expect
      .poll(() =>
        field.shadowRoot?.querySelector('[part="keyboard-sink"]')?.getAttribute('aria-required'),
      )
      .toBe('true');
    const sink = field.shadowRoot?.querySelector('[part="keyboard-sink"]');
    expect(sink).toHaveAttribute('aria-invalid', 'true');
    expect(sink).toHaveAttribute('aria-description', 'Enter an expression');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(describedText(field)).toBe('Enter an expression');
    rerender(<MathInput label="Answer" isDisabled hasPalette />);
    expect(screen.queryByRole('toolbar')).toBeNull();
    await expect.poll(() => (field as unknown as { disabled: boolean }).disabled).toBe(true);
    rerender(<MathInput label="Answer" isReadOnly hasPalette />);
    await expect.poll(() => (field as unknown as { readOnly: boolean }).readOnly).toBe(true);
  });

  it('fetches no fonts or sounds by default', async () => {
    const { container } = render(<Controlled defaultValue={'\\frac{1}{2}'} />);
    await mathField(container);
    await pressTemplate('Fraction');
    const fetched = performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => /\.(woff2?|ttf|otf|wav|mp3)(\?|$)|\/fonts\/|\/sounds\//.test(name));
    expect(fetched).toEqual([]);
  });

  it('takes its strings from UIProvider', async () => {
    const messages: Partial<MathMessages> = {
      mathPalette: 'Modèles',
      paletteFraction: 'Fraction (fr)',
      mathEditAsTex: 'Modifier en TeX',
    };
    const { container } = render(
      <UIProvider messages={messages as Partial<Messages>}>
        <Controlled />
      </UIProvider>,
    );
    await mathField(container);
    const palette = screen.getByRole('toolbar', { name: 'Modèles' });
    expect(within(palette).getByRole('button', { name: 'Fraction (fr)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modifier en TeX' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Controlled defaultValue="x^2" description="Use the palette or type" mode="algebra" />,
    );
    await mathField(container);
    await expectNoAxeViolations(container);
  });
});
