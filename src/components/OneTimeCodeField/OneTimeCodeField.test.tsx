import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { UIProvider } from '../../provider/UIProvider';
import { expectNoAxeViolations } from '../../../test/axe';
import { pasteText } from '../../../test/clipboard';
import { cleanCode, codeGroups, resolveCodeLength } from './code';
import { OneTimeCodeField } from './OneTimeCodeField';

function field(name: string) {
  return screen.getByRole<HTMLInputElement>('textbox', { name });
}

function cellElements(input: HTMLElement) {
  return [...(input.parentElement?.querySelectorAll<HTMLElement>('[data-cell]') ?? [])];
}

/** Each cell's text, with `_` for an empty cell. */
function cells(input: HTMLElement) {
  return cellElements(input)
    .map((cell) => cell.textContent || '_')
    .join('');
}

/** The index of the current cell, or -1. */
function current(input: HTMLElement) {
  return cellElements(input).findIndex((cell) => cell.dataset.current === 'true');
}

/** Sets the input's value the way autofill and SMS suggestions do: all at once, with one input event. */
function autofill(input: HTMLInputElement, text: string) {
  // The prototype's setter, so React sees a change it didn't make (as it does with real autofill).
  Reflect.set(HTMLInputElement.prototype, 'value', text, input);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('one-time code text', () => {
  it('works out the length from codeLength or the groups', () => {
    expect(resolveCodeLength()).toBe(6);
    expect(resolveCodeLength(4)).toBe(4);
    expect(resolveCodeLength(undefined, [4, 4])).toBe(8);
    expect(resolveCodeLength(5, [3, 3])).toBe(5);
  });

  it('splits the cells into groups, repeating the last size', () => {
    expect(codeGroups(6)).toEqual([6]);
    expect(codeGroups(6, [3, 3])).toEqual([3, 3]);
    expect(codeGroups(9, [3])).toEqual([3, 3, 3]);
    expect(codeGroups(5, [3, 3])).toEqual([3, 2]);
    expect(codeGroups(4, [0, -1])).toEqual([4]);
  });

  it('keeps the allowed characters, normalised', () => {
    expect(cleanCode('123-456', 'digits')).toBe('123456');
    expect(cleanCode('Your code is 98 76 54.', 'digits')).toBe('987654');
    // Arabic-Indic, Persian and full-width digits become ASCII.
    expect(cleanCode('١٢٣۴۵۶', 'digits')).toBe('123456');
    expect(cleanCode('１２３', 'digits')).toBe('123');
    expect(cleanCode('ab-12 cd', 'alphanumeric')).toBe('AB12CD');
    expect(cleanCode('ßé9', 'alphanumeric')).toBe('9');
    expect(cleanCode('3F-a9', /[0-9a-f]/g)).toBe('3a9');
    expect(cleanCode('3f-a9', /[0-9a-f]/g)).toBe('3fa9');
  });
});

describe('OneTimeCodeField', () => {
  it('is one labelled field with a length hint, offering SMS codes and a numeric keyboard', () => {
    render(<OneTimeCodeField label="Code" description="Sent to your phone" />);
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    const input = field('Code');
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAccessibleDescription('Sent to your phone 6-digit code');
    expect(cellElements(input)).toHaveLength(6);
    expect(input.parentElement?.querySelector('[aria-hidden="true"]')).toContainElement(
      cellElements(input)[0] ?? null,
    );
  });

  it('fills the cells as digits are typed, ignores other keys, and completes once', async () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    render(<OneTimeCodeField label="Code" onChange={onChange} onComplete={onComplete} />);
    const input = field('Code');
    await userEvent.click(input);
    expect(current(input)).toBe(0);
    await userEvent.keyboard('12a 3');
    expect(cells(input)).toBe('123___');
    expect(current(input)).toBe(3);
    expect(onChange).toHaveBeenLastCalledWith('123');
    await userEvent.keyboard('456');
    expect(input).toHaveValue('123456');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenLastCalledWith('123456');
    // A full code keeps its last cell current; typing replaces it, which completes the code again.
    expect(current(input)).toBe(5);
    await userEvent.keyboard('7');
    expect(input).toHaveValue('123457');
    expect(onComplete).toHaveBeenLastCalledWith('123457');
  });

  it('moves between cells with the arrow keys, Home and End, and types over a filled cell', async () => {
    render(<OneTimeCodeField label="Code" defaultValue="1234" />);
    const input = field('Code');
    await userEvent.keyboard('{Tab}');
    // Focus lands on the first empty cell.
    await expect.poll(() => current(input)).toBe(4);
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(current(input)).toBe(2);
    await userEvent.keyboard('9');
    expect(input).toHaveValue('1294');
    expect(current(input)).toBe(3);
    await userEvent.keyboard('{Home}');
    expect(current(input)).toBe(0);
    await userEvent.keyboard('{ArrowLeft}');
    expect(current(input)).toBe(0);
    await userEvent.keyboard('{End}');
    expect(current(input)).toBe(4);
    // Never past the first empty cell.
    await userEvent.keyboard('{ArrowRight}');
    expect(current(input)).toBe(4);
  });

  it('steps back with Backspace', async () => {
    render(<OneTimeCodeField label="Code" codeLength={4} defaultValue="1234" />);
    const input = field('Code');
    await userEvent.keyboard('{Tab}');
    await expect.poll(() => current(input)).toBe(3);
    await userEvent.keyboard('{Backspace}');
    expect(cells(input)).toBe('123_');
    expect(current(input)).toBe(3);
    await userEvent.keyboard('{Backspace}{Backspace}');
    expect(cells(input)).toBe('1___');
    expect(current(input)).toBe(1);
  });

  it('moves left with each Backspace from a filled middle cell', async () => {
    render(<OneTimeCodeField label="Code" defaultValue="123456" />);
    const input = field('Code');
    await userEvent.keyboard('{Tab}{Home}{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(current(input)).toBe(3);
    await userEvent.keyboard('{Backspace}');
    expect(input).toHaveValue('12356');
    expect(current(input)).toBe(2);
    await userEvent.keyboard('{Backspace}{Backspace}');
    expect(input).toHaveValue('156');
    expect(current(input)).toBe(0);
  });

  it('keeps the emptied last cell current after Backspace, so the next key retypes it', async () => {
    render(<OneTimeCodeField label="Code" defaultValue="123456" />);
    const input = field('Code');
    await userEvent.keyboard('{Tab}');
    await expect.poll(() => current(input)).toBe(5);
    await userEvent.keyboard('{Backspace}');
    expect(cells(input)).toBe('12345_');
    expect(current(input)).toBe(5);
    await userEvent.keyboard('7');
    expect(input).toHaveValue('123457');
  });

  it('keeps its own colours in forced-colours mode, so the input stays invisible and the drawn parts show', async () => {
    render(
      <>
        <OneTimeCodeField label="Code" />
        <OneTimeCodeField label="PIN" isMasked codeLength={4} defaultValue="1" />
      </>,
    );
    const input = field('Code');
    expect(getComputedStyle(input).forcedColorAdjust).toBe('none');
    await userEvent.keyboard('{Tab}');
    const caret = cellElements(input)[0]?.querySelector('span');
    expect(caret).not.toBeNull();
    expect(getComputedStyle(caret ?? document.body).forcedColorAdjust).toBe('none');
    const pin = screen.getByLabelText('PIN');
    const dot = cellElements(pin)[0]?.querySelector('span');
    expect(getComputedStyle(dot ?? document.body).forcedColorAdjust).toBe('none');
  });

  it('refuses a key that isn’t allowed over a filled cell, keeping its character', async () => {
    render(<OneTimeCodeField label="Code" defaultValue="123456" />);
    const input = field('Code');
    await userEvent.click(input);
    await userEvent.keyboard('{Home}x');
    expect(input).toHaveValue('123456');
    expect(current(input)).toBe(0);
  });

  it('selects the pressed cell, up to the first empty one', async () => {
    render(<OneTimeCodeField label="Code" defaultValue="123" />);
    const input = field('Code');
    const second = cellElements(input)[1];
    const last = cellElements(input)[5];
    if (!second || !last) {
      throw new Error('cells not found');
    }
    const box = input.getBoundingClientRect();
    const centre = (cell: HTMLElement) => {
      const rect = cell.getBoundingClientRect();
      return { position: { x: rect.left - box.left + rect.width / 2, y: box.height / 2 } };
    };
    await userEvent.click(input, centre(second));
    await expect.poll(() => current(input)).toBe(1);
    await userEvent.keyboard('8');
    expect(input).toHaveValue('183');
    await userEvent.click(input, centre(last));
    await expect.poll(() => current(input)).toBe(3);
  });

  it('fills every cell from a pasted code, dropping spaces and words', async () => {
    const onComplete = vi.fn();
    render(<OneTimeCodeField label="Code" groupSizes={[3, 3]} onComplete={onComplete} />);
    const input = field('Code');
    await userEvent.click(input);
    pasteText(input, 'Your code is 482 913.');
    await expect.poll(() => cells(input)).toBe('482913');
    expect(onComplete).toHaveBeenLastCalledWith('482913');
    // Part of a code types over the cells from the current one.
    await userEvent.keyboard('{Home}{ArrowRight}');
    pasteText(input, '77');
    await expect.poll(() => cells(input)).toBe('477913');
  });

  it('fills every cell from autofill or an SMS suggestion', async () => {
    const onComplete = vi.fn();
    render(<OneTimeCodeField label="Code" defaultValue="12" onComplete={onComplete} />);
    const input = field('Code');
    await userEvent.click(input);
    // The suggestion lands at the caret, after the digits already typed; it replaces them.
    autofill(input, '12654 321');
    await expect.poll(() => input.value).toBe('654321');
    expect(onComplete).toHaveBeenLastCalledWith('654321');
  });

  it('uppercases alphanumeric codes, with a text keyboard', async () => {
    render(
      <OneTimeCodeField label="Recovery" allowedCharacters="alphanumeric" groupSizes={[4, 4]} />,
    );
    const input = field('Recovery');
    expect(input).toHaveAttribute('inputmode', 'text');
    expect(input).toHaveAttribute('autocapitalize', 'characters');
    expect(input).toHaveAccessibleDescription('8-character code');
    await userEvent.click(input);
    await userEvent.keyboard('ab-12');
    expect(input).toHaveValue('AB12');
    expect(cells(input)).toBe('AB12____');
  });

  it('takes a custom pattern as typed', async () => {
    render(<OneTimeCodeField label="Pairing" allowedCharacters={/[0-9a-f]/} codeLength={4} />);
    const input = field('Pairing');
    await userEvent.click(input);
    await userEvent.keyboard('3fGa');
    expect(input).toHaveValue('3fa');
  });

  it('masks the characters', async () => {
    render(<OneTimeCodeField label="PIN" codeLength={4} isMasked defaultValue="12" />);
    const input = screen.getByLabelText<HTMLInputElement>('PIN');
    expect(input).toHaveAttribute('type', 'password');
    expect(cells(input)).toBe('____');
    expect(cellElements(input)[0]?.querySelector('span')).not.toBeNull();
    await userEvent.keyboard('{Tab}3');
    expect(input).toHaveValue('123');
  });

  it('shows groups with a separator between them', () => {
    render(<OneTimeCodeField label="Code" codeLength={9} groupSizes={[3]} />);
    const input = field('Code');
    const row = input.parentElement?.firstElementChild;
    expect(row?.children).toHaveLength(5);
  });

  it('ignores typing and pasting while read-only or disabled', async () => {
    const onChange = vi.fn();
    render(
      <>
        <OneTimeCodeField label="Read-only" isReadOnly defaultValue="12" onChange={onChange} />
        <OneTimeCodeField label="Disabled" isDisabled defaultValue="12" onChange={onChange} />
      </>,
    );
    const readOnly = field('Read-only');
    await userEvent.click(readOnly);
    await userEvent.keyboard('34');
    pasteText(readOnly, '999999');
    expect(readOnly).toHaveValue('12');
    expect(field('Disabled')).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('attaches a callback inputRef once, not on every keystroke', async () => {
    const inputRef = vi.fn();
    render(<OneTimeCodeField label="Code" inputRef={inputRef} />);
    await userEvent.keyboard('{Tab}123');
    expect(field('Code')).toHaveValue('123');
    expect(inputRef).toHaveBeenCalledTimes(1);
    expect(inputRef).toHaveBeenCalledWith(field('Code'));
  });

  it('is controlled by value', async () => {
    function Controlled() {
      const [code, setCode] = useState('1');
      return <OneTimeCodeField label="Code" value={code} onChange={setCode} codeLength={4} />;
    }
    render(
      <>
        <Controlled />
        <OneTimeCodeField label="Fixed" value="12" codeLength={4} />
      </>,
    );
    await userEvent.click(field('Code'));
    await userEvent.keyboard('2');
    expect(cells(field('Code'))).toBe('12__');
    await userEvent.click(field('Fixed'));
    await userEvent.keyboard('3');
    expect(cells(field('Fixed'))).toBe('12__');
  });

  it('shows the error while invalid', () => {
    render(<OneTimeCodeField label="Code" isInvalid errorMessage="That code didn’t work" />);
    const input = field('Code');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('That code didn’t work 6-digit code');
  });

  it('submits the code with a form', () => {
    render(
      <form aria-label="Verify">
        <OneTimeCodeField label="Code" name="code" defaultValue="123456" />
      </form>,
    );
    const form = screen.getByRole<HTMLFormElement>('form', { name: 'Verify' });
    expect(new FormData(form).get('code')).toBe('123456');
  });

  it('takes the app’s strings from UIProvider', () => {
    render(
      <UIProvider
        messages={{ oneTimeCodeLength: ({ length }) => `Code mit ${String(length)} Ziffern` }}
      >
        <OneTimeCodeField label="Code" codeLength={4} />
      </UIProvider>,
    );
    expect(field('Code')).toHaveAccessibleDescription('Code mit 4 Ziffern');
  });

  it('never scrolls a phone page sideways', () => {
    render(<OneTimeCodeField label="Code" size="lg" codeLength={10} groupSizes={[5]} />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    for (const cell of cellElements(field('Code'))) {
      expect(cell.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
    }
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <div className="flex flex-col gap-4">
        <OneTimeCodeField label="Code" description="Sent by text" groupSizes={[3, 3]} />
        <OneTimeCodeField label="PIN" isMasked codeLength={4} defaultValue="12" />
        <OneTimeCodeField label="Invalid" isInvalid errorMessage="Wrong code" defaultValue="1" />
        <OneTimeCodeField label="Disabled" isDisabled />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});
