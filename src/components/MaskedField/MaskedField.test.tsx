import { render, screen } from '@testing-library/react';
import { Profiler, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { UIProvider } from '../../provider/UIProvider';
import type { Mask, MaskTokens } from '../../utils/mask';
import { expectNoAxeViolations } from '../../../test/axe';
import { pasteText } from '../../../test/clipboard';
import { MaskedField } from './MaskedField';

const PHONE = '(999) 999-9999';
const hasTouch = navigator.maxTouchPoints > 0;

const card: Mask = (raw) =>
  /^3[47]/.test(raw) ? '9999 999999 99999' : '9999 9999 9999 9999[ 999]';

const ibanTokens: MaskTokens = {
  X: { pattern: /[A-Z0-9]/, transform: (char) => char.toUpperCase() },
};

function field(name: string | RegExp) {
  return screen.getByRole<HTMLInputElement>('textbox', { name });
}

/** The input's text with `|` at the caret. */
function caretText(input: HTMLInputElement) {
  const at = input.selectionStart ?? 0;
  return `${input.value.slice(0, at)}|${input.value.slice(at)}`;
}

/** Sets the input's text the way autofill and the browser's own edits do: all at once, with one input event. */
function browserEdit(input: HTMLInputElement, text: string, init: InputEventInit = {}) {
  // The prototype's setter, so React sees a change it didn't make (as it does with real autofill).
  Reflect.set(HTMLInputElement.prototype, 'value', text, input);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, ...init }));
}

/** An on-screen keyboard's edit: a cancellable `beforeinput` with no key events. */
function softKey(input: HTMLInputElement, inputType: string, data?: string) {
  input.dispatchEvent(
    new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true }),
  );
}

/** The template drawn behind the input while it has focus. */
function template(input: HTMLInputElement) {
  return input.parentElement?.querySelector<HTMLElement>('[aria-hidden="true"]') ?? null;
}

describe('MaskedField', () => {
  it('is one labelled field with a length hint after its description, and a numeric keyboard for digits', () => {
    render(<MaskedField label="Phone" mask={PHONE} description="Like (555) 123-4567" />);
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    const input = field('Phone');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('autocapitalize', 'none');
    expect(input).toHaveAccessibleDescription('Like (555) 123-4567 10 digits');
  });

  it('formats as digits are typed, refuses other keys, and reports the raw value', async () => {
    const onChange = vi.fn();
    render(<MaskedField label="Phone" mask={PHONE} onChange={onChange} />);
    const input = field('Phone');
    await userEvent.click(input);
    await userEvent.keyboard('555x-12');
    expect(input).toHaveValue('(555) 12');
    expect(caretText(input)).toBe('(555) 12|');
    expect(onChange).toHaveBeenCalledTimes(5);
    expect(onChange).toHaveBeenLastCalledWith('55512');
  });

  it('reports the formatted text with valueFormat="formatted"', async () => {
    const onChange = vi.fn();
    render(
      <MaskedField label="Date" mask="99/99/9999" valueFormat="formatted" onChange={onChange} />,
    );
    await userEvent.click(field('Date'));
    await userEvent.keyboard('0314');
    expect(onChange).toHaveBeenLastCalledWith('03/14');
    await userEvent.keyboard('2026');
    expect(onChange).toHaveBeenLastCalledWith('03/14/2026');
  });

  it('deletes across separators with Backspace and Delete', async () => {
    render(<MaskedField label="Phone" mask={PHONE} defaultValue="5551234" />);
    const input = field('Phone');
    await userEvent.click(input);
    await userEvent.keyboard('{End}{Backspace}');
    expect(caretText(input)).toBe('(555) 123|');
    // After a separator, Backspace deletes the digit before it.
    input.setSelectionRange(6, 6);
    await userEvent.keyboard('{Backspace}');
    expect(caretText(input)).toBe('(55|1) 23');
    // Before a separator, Delete deletes the digit after it.
    input.setSelectionRange(4, 4);
    await userEvent.keyboard('{Delete}');
    expect(caretText(input)).toBe('(551|) 3');
  });

  it('handles Backspace and typing from on-screen keyboards, which send no key names', async () => {
    const onChange = vi.fn();
    render(<MaskedField label="Phone" mask={PHONE} defaultValue="5551" onChange={onChange} />);
    const input = field('Phone');
    await userEvent.click(input);
    input.setSelectionRange(6, 6);
    softKey(input, 'deleteContentBackward');
    await expect.poll(() => caretText(input)).toBe('(55|1');
    softKey(input, 'insertText', '9');
    await expect.poll(() => caretText(input)).toBe('(559|) 1');
    expect(onChange).toHaveBeenLastCalledWith('5591');
  });

  it('inserts in the middle, and types over the next digits once full', async () => {
    render(<MaskedField label="Phone" mask={PHONE} defaultValue="55512" />);
    const input = field('Phone');
    await userEvent.click(input);
    input.setSelectionRange(2, 2);
    await userEvent.keyboard('9');
    expect(caretText(input)).toBe('(59|5) 512');
    await userEvent.keyboard('{End}34567');
    expect(input).toHaveValue('(595) 512-3456');
    input.setSelectionRange(6, 6);
    await userEvent.keyboard('0');
    expect(caretText(input)).toBe('(595) 0|12-3456');
  });

  it('pastes text with or without the literals, and completes', async () => {
    const onComplete = vi.fn();
    render(<MaskedField label="Phone" mask={PHONE} onComplete={onComplete} />);
    const input = field('Phone');
    await userEvent.click(input);
    pasteText(input, 'Call (212) 555-0100 today');
    await expect.poll(() => input.value).toBe('(212) 555-0100');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenLastCalledWith('2125550100');
    input.select();
    pasteText(input, '646.555.0199');
    await expect.poll(() => input.value).toBe('(646) 555-0199');
    expect(caretText(input)).toBe('(646) 555-0199|');
  });

  it('completes once per completing change, not when deleting back to a complete value', async () => {
    const onComplete = vi.fn();
    render(<MaskedField label="ZIP" mask="99999[-9999]" onComplete={onComplete} />);
    const input = field('ZIP');
    await userEvent.click(input);
    await userEvent.keyboard('90210');
    expect(onComplete).toHaveBeenLastCalledWith('90210');
    await userEvent.keyboard('12');
    expect(input).toHaveValue('90210-12');
    await userEvent.keyboard('{Backspace}{Backspace}');
    expect(input).toHaveValue('90210');
    expect(onComplete).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('1234');
    expect(input).toHaveValue('90210-1234');
    expect(onComplete).toHaveBeenLastCalledWith('902101234');
  });

  it('reads autofill and other edits the browser makes back through the mask', async () => {
    render(<MaskedField label="Phone" mask={PHONE} />);
    const input = field('Phone');
    await userEvent.click(input);
    browserEdit(input, '212-555-0100', { inputType: 'insertReplacementText' });
    await expect.poll(() => input.value).toBe('(212) 555-0100');
    input.select();
    browserEdit(input, '', { inputType: 'deleteByCut' });
    await expect.poll(() => input.value).toBe('');
  });

  it('leaves an IME’s text alone until the composition ends', async () => {
    render(<MaskedField label="Phone" mask={PHONE} />);
    const input = field('Phone');
    await userEvent.click(input);
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    browserEdit(input, '５５５１', { inputType: 'insertCompositionText', isComposing: true });
    await expect.poll(() => input.value).toBe('５５５１');
    input.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true, data: '５５５１' }),
    );
    await expect.poll(() => input.value).toBe('(555) 1');
    await expect.poll(() => caretText(input)).toBe('(555) 1|');
  });

  it('draws the rest of the mask while focused, outside the value and hidden from screen readers', async () => {
    render(
      <MaskedField
        label="Phone"
        mask={PHONE}
        placeholderChar="_"
        placeholder="Phone number"
        defaultValue="555"
      />,
    );
    const input = field('Phone');
    expect(template(input)).toBeNull();
    expect(input).toHaveAttribute('placeholder', 'Phone number');
    await userEvent.click(input);
    expect(template(input)?.textContent).toBe('(555) ___-____');
    expect(input).toHaveValue('(555');
    expect(input).not.toHaveAttribute('placeholder');
    // Drawn in the input's own text size and padding, so the template lines up with the text.
    const drawn = getComputedStyle(template(input) ?? document.body);
    const own = getComputedStyle(input);
    expect([drawn.fontSize, drawn.fontFamily, drawn.paddingLeft]).toEqual([
      own.fontSize,
      own.fontFamily,
      own.paddingLeft,
    ]);
    await userEvent.keyboard('1');
    expect(template(input)?.textContent).toBe('(555) 1__-____');
    input.blur();
    await expect.poll(() => template(input)).toBeNull();
  });

  it('fails an incomplete value when its form is submitted, and passes once complete', async () => {
    const onSubmit = vi.fn();
    render(
      <form
        aria-label="Contact"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <MaskedField label="Phone" mask={PHONE} name="phone" />
        <button type="submit">Send</button>
      </form>,
    );
    const input = field('Phone');
    await userEvent.click(input);
    await userEvent.keyboard('555');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSubmit).not.toHaveBeenCalled();
    await expect.poll(() => input.getAttribute('aria-invalid')).toBe('true');
    expect(input).toHaveAccessibleDescription('Enter the complete value 10 digits');
    await expect.poll(() => document.activeElement).toBe(input);

    await userEvent.keyboard('{End}1234567');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
    await expect.poll(() => input.hasAttribute('aria-invalid')).toBe(false);
    const form = screen.getByRole<HTMLFormElement>('form', { name: 'Contact' });
    expect(new FormData(form).get('phone')).toBe('5551234567');
  });

  it('runs the app’s validate on the value', async () => {
    render(
      <form aria-label="Contact">
        <MaskedField
          label="Phone"
          mask={PHONE}
          defaultValue="5550000000"
          validate={(value) => (value.endsWith('0000') ? 'Use a real number' : null)}
        />
        <button type="submit">Send</button>
      </form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Use a real number')).toBeVisible();
  });

  it('follows a function mask, keeping a numeric keyboard', async () => {
    render(<MaskedField label="Card number" mask={card} />);
    const input = field('Card number');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAccessibleDescription('16 to 19 digits');
    await userEvent.click(input);
    await userEvent.keyboard('378282246310005');
    expect(input).toHaveValue('3782 822463 10005');
    expect(input).toHaveAccessibleDescription('15 digits');
  });

  it('uppercases letters with a text keyboard, and takes custom tokens', async () => {
    render(
      <>
        <MaskedField label="Postal code" mask="A9A 9A9" />
        <MaskedField label="IBAN" mask="AA99 XXXX XXXX" tokens={ibanTokens} />
      </>,
    );
    const postal = field('Postal code');
    expect(postal).toHaveAttribute('inputmode', 'text');
    expect(postal).toHaveAttribute('autocapitalize', 'characters');
    expect(postal).toHaveAccessibleDescription('6 characters');
    await userEvent.click(postal);
    await userEvent.keyboard('k1a0b1');
    expect(postal).toHaveValue('K1A 0B1');
    await userEvent.click(field('IBAN'));
    await userEvent.keyboard('gb82west1234');
    expect(field('IBAN')).toHaveValue('GB82 WEST 1234');
  });

  it('ignores typing and pasting while read-only or disabled', async () => {
    const onChange = vi.fn();
    render(
      <>
        <MaskedField
          label="Read-only"
          mask={PHONE}
          isReadOnly
          defaultValue="555"
          onChange={onChange}
        />
        <MaskedField
          label="Disabled"
          mask={PHONE}
          isDisabled
          defaultValue="555"
          onChange={onChange}
        />
      </>,
    );
    const readOnly = field('Read-only');
    await userEvent.click(readOnly);
    await userEvent.keyboard('12');
    pasteText(readOnly, '5551234567');
    expect(readOnly).toHaveValue('(555');
    expect(field('Disabled')).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('is controlled by value, raw or formatted', async () => {
    function Controlled() {
      const [phone, setPhone] = useState('555');
      const [date, setDate] = useState('03/14/2026');
      return (
        <>
          <MaskedField label="Phone" mask={PHONE} value={phone} onChange={setPhone} />
          <output aria-label="Raw">{phone}</output>
          <MaskedField
            label="Date"
            mask="99/99/9999"
            valueFormat="formatted"
            value={date}
            onChange={setDate}
          />
          <output aria-label="Formatted">{date}</output>
        </>
      );
    }
    render(
      <>
        <Controlled />
        <MaskedField label="Fixed" mask={PHONE} value="555" />
      </>,
    );
    expect(field('Date')).toHaveValue('03/14/2026');
    await userEvent.click(field('Phone'));
    await userEvent.keyboard('{End}1');
    expect(field('Phone')).toHaveValue('(555) 1');
    expect(screen.getByRole('status', { name: 'Raw' })).toHaveTextContent('5551');
    await userEvent.click(field('Date'));
    await userEvent.keyboard('{End}{Backspace}');
    expect(screen.getByRole('status', { name: 'Formatted' })).toHaveTextContent('03/14/202');
    await userEvent.click(field('Fixed'));
    await userEvent.keyboard('{End}1');
    expect(field('Fixed')).toHaveValue('(555');
  });

  it('submits the value in its format with a form', () => {
    render(
      <form aria-label="Profile">
        <MaskedField label="Phone" name="phone" mask={PHONE} defaultValue="5551234567" />
        <MaskedField
          label="Date"
          name="date"
          mask="99/99/9999"
          valueFormat="formatted"
          defaultValue="03142026"
        />
      </form>,
    );
    const data = new FormData(screen.getByRole<HTMLFormElement>('form', { name: 'Profile' }));
    expect(data.get('phone')).toBe('5551234567');
    expect(data.get('date')).toBe('03/14/2026');
  });

  it('shows the error while invalid', () => {
    render(<MaskedField label="Phone" mask={PHONE} isInvalid errorMessage="Not a US number" />);
    const input = field('Phone');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Not a US number 10 digits');
  });

  it('takes the app’s strings from UIProvider', () => {
    render(
      <UIProvider messages={{ maskedFieldLength: ({ max }) => `${String(max)} Ziffern` }}>
        <MaskedField label="Telefon" mask={PHONE} />
      </UIProvider>,
    );
    expect(field('Telefon')).toHaveAccessibleDescription('10 Ziffern');
  });

  it('keeps the text left to right in right-to-left layouts', () => {
    render(
      <div dir="rtl">
        <MaskedField label="Phone" mask={PHONE} defaultValue="5551234567" />
      </div>,
    );
    expect(getComputedStyle(field('Phone')).direction).toBe('ltr');
  });

  it('attaches a callback inputRef once, not on every keystroke', async () => {
    const inputRef = vi.fn();
    render(<MaskedField label="Phone" mask={PHONE} inputRef={inputRef} />);
    await userEvent.click(field('Phone'));
    await userEvent.keyboard('5551');
    expect(field('Phone')).toHaveValue('(555) 1');
    expect(inputRef).toHaveBeenCalledTimes(1);
  });

  it.runIf(hasTouch)('takes typing after a tap', async () => {
    render(<MaskedField label="Phone" mask={PHONE} data-testid="phone" />);
    await commands.tap('[data-testid="phone"] input');
    await expect.poll(() => document.activeElement).toBe(field('Phone'));
    await userEvent.keyboard('5551');
    expect(field('Phone')).toHaveValue('(555) 1');
  });

  it('stops rendering once settled', async () => {
    let commits = 0;
    render(
      <Profiler
        id="masked"
        onRender={() => {
          commits += 1;
        }}
      >
        <MaskedField label="Phone" mask={PHONE} placeholderChar="_" defaultValue="555" />
      </Profiler>,
    );
    await userEvent.click(field('Phone'));
    await userEvent.keyboard('1');
    const settled = async () => {
      const before = commits;
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      });
      return commits - before;
    };
    await expect.poll(settled).toBe(0);
  });

  it('never scrolls a phone page sideways', () => {
    render(
      <MaskedField
        label="IBAN"
        mask="AA99 XXXX XXXX XXXX XXXX XXXX XXXX XXXX XX"
        tokens={ibanTokens}
        defaultValue="MT84MALT011000012345MTLCAST001S"
      />,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    expect(field('IBAN').getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <div className="flex flex-col gap-4">
        <MaskedField label="Phone" mask={PHONE} description="Like (555) 123-4567" />
        <MaskedField label="Postal code" mask="A9A 9A9" defaultValue="K1A" placeholderChar="_" />
        <MaskedField label="Invalid" mask={PHONE} isInvalid errorMessage="Not a US number" />
        <MaskedField label="Disabled" mask={PHONE} isDisabled />
      </div>,
    );
    await userEvent.click(field('Postal code'));
    await expectNoAxeViolations(container);
  });
});
