import { describe, expect, it } from 'vitest';
import { applyMask, editMask, maskTemplate, parseMask, type Mask, type MaskTokens } from './mask';

const PHONE = '(999) 999-9999';
const POSTAL = 'A9A 9A9';
const ZIP = '99999[-9999]';

/** A card number's mask by brand: American Express is 4-6-5, Diners Club 4-6-4, others 4-4-4-4 with up to 19. */
const card: Mask = (raw) =>
  /^3[47]/.test(raw)
    ? '9999 999999 99999'
    : /^3(0[0-5]|[68])/.test(raw)
      ? '9999 999999 9999'
      : '9999 9999 9999 9999[ 999]';

/** Text and caret after an edit, with `|` marking the caret. */
function edited(
  mask: Mask,
  raw: string,
  edit: Parameters<typeof editMask>[2],
  tokens?: MaskTokens,
) {
  const result = editMask(mask, raw, edit, tokens);
  return result === null
    ? null
    : `${result.text.slice(0, result.caret)}|${result.text.slice(result.caret)}`;
}

/** Types `text` at the end of a value, one character at a time, as a keyboard does. */
function typed(mask: Mask, text: string, tokens?: MaskTokens) {
  let raw = '';
  for (const char of text) {
    const position = applyMask(mask, raw, { tokens }).text.length;
    raw = editMask(mask, raw, { start: position, end: position, text: char }, tokens)?.raw ?? raw;
  }
  return applyMask(mask, raw, { tokens });
}

describe('parseMask', () => {
  it('reads slots, literals, escapes and optional parts', () => {
    const parsed = parseMask('\\9 99[-a]');
    expect(parsed.parts.map((part) => part.char).join('')).toBe('9 99-a');
    expect(parsed.parts.map((part) => (part.pattern ? 's' : 'l')).join('')).toBe('llssls');
    expect(parsed.slots).toEqual([2, 3, 5]);
    expect(parsed.minLength).toBe(2);
    expect(parsed.parts.map((part) => part.group)).toEqual([0, 0, 0, 0, 1, 1]);
  });

  it('knows when a numeric keyboard fits and when letters are uppercased', () => {
    expect(parseMask(PHONE).isNumeric).toBe(true);
    expect(parseMask(POSTAL).isNumeric).toBe(false);
    expect(parseMask(POSTAL).isUppercase).toBe(true);
    expect(parseMask('aa').isUppercase).toBe(false);
    expect(parseMask('&&').isNumeric).toBe(false);
    expect(parseMask('---').isNumeric).toBe(false);
  });

  it('takes custom tokens, which replace the built-in ones', () => {
    const tokens: MaskTokens = { H: /[0-9a-f]/, '9': /[0-5]/ };
    const parsed = parseMask('HH9', tokens);
    expect(parsed.slots).toEqual([0, 1, 2]);
    expect(parsed.isNumeric).toBe(false);
    expect(applyMask('HH9', 'fa79', { tokens }).raw).toBe('fa');
    expect(applyMask('HH9', 'fa3', { tokens }).raw).toBe('fa3');
  });

  it('returns the same parsed mask for the same string and tokens', () => {
    expect(parseMask(PHONE)).toBe(parseMask(PHONE));
    expect(parseMask(PHONE, { X: /x/ })).not.toBe(parseMask(PHONE));
  });
});

describe('applyMask', () => {
  it('formats raw characters up to the last filled slot', () => {
    expect(applyMask(PHONE, '').text).toBe('');
    expect(applyMask(PHONE, '5').text).toBe('(5');
    expect(applyMask(PHONE, '555').text).toBe('(555');
    expect(applyMask(PHONE, '5551').text).toBe('(555) 1');
    expect(applyMask(PHONE, '5551234567').text).toBe('(555) 123-4567');
    expect(applyMask('99%', '12').text).toBe('12%');
  });

  it('drops characters a slot doesn’t take, and anything past the last slot', () => {
    expect(applyMask(PHONE, '555-123x4567 89').raw).toBe('5551234567');
    expect(applyMask(POSTAL, 'k1a0b1').raw).toBe('K1A0B1');
    expect(applyMask(POSTAL, 'k1a0b1').text).toBe('K1A 0B1');
    expect(applyMask(POSTAL, '1k').raw).toBe('K');
  });

  it('reads formatted text with its literals', () => {
    const value = applyMask('+1 (999) 999-9999', '+1 (555) 123-4567', { isFormatted: true });
    expect(value.raw).toBe('5551234567');
    expect(value.text).toBe('+1 (555) 123-4567');
    // A literal digit is matched where it stands, so a leading country code isn't taken as the first digit.
    expect(applyMask('+1 (999) 999-9999', '15551234567', { isFormatted: true }).raw).toBe(
      '5551234567',
    );
  });

  it('reads digits from other scripts and full-width forms as ASCII', () => {
    expect(applyMask(PHONE, '٥٥٥١٢٣٤٥٦٧').raw).toBe('5551234567');
    expect(applyMask(PHONE, '５５５').text).toBe('(555');
  });

  it('is complete with every required slot filled and no optional part half filled', () => {
    expect(applyMask(PHONE, '555123456').isComplete).toBe(false);
    expect(applyMask(PHONE, '5551234567').isComplete).toBe(true);
    expect(applyMask(ZIP, '1234').isComplete).toBe(false);
    expect(applyMask(ZIP, '12345').isComplete).toBe(true);
    expect(applyMask(ZIP, '12345').text).toBe('12345');
    expect(applyMask(ZIP, '123456').isComplete).toBe(false);
    expect(applyMask(ZIP, '123456').text).toBe('12345-6');
    expect(applyMask(ZIP, '123456789').isComplete).toBe(true);
    expect(applyMask(ZIP, '123456789').text).toBe('12345-6789');
  });

  it('picks a function mask from the value', () => {
    expect(applyMask(card, '4111111111111111').text).toBe('4111 1111 1111 1111');
    expect(applyMask(card, '378282246310005').text).toBe('3782 822463 10005');
    expect(applyMask(card, '378282246310005').isComplete).toBe(true);
    expect(applyMask(card, '30569309025904').text).toBe('3056 930902 5904');
    expect(applyMask(card, '4111111111111111234').text).toBe('4111 1111 1111 1111 234');
    expect(applyMask(card, '41111111111111112').isComplete).toBe(false);
    expect(applyMask(card, '3782 8224 6310 005', { isFormatted: true }).raw).toBe(
      '378282246310005',
    );
  });
});

describe('maskTemplate', () => {
  it('shows every slot up to an optional part not yet started', () => {
    expect(maskTemplate(parseMask(PHONE), '', '_')).toBe('(___) ___-____');
    expect(maskTemplate(parseMask(ZIP), '123', '_')).toBe('_____');
    expect(maskTemplate(parseMask(ZIP), '123456', '_')).toBe('_____-____');
    expect(maskTemplate(parseMask('---'), '', '_')).toBe('');
  });
});

describe('editMask', () => {
  it('types into the next slot, skipping literals, and leaves the caret after the character', () => {
    expect(edited(PHONE, '', { start: 0, end: 0, text: '5' })).toBe('(5|');
    expect(edited(PHONE, '555', { start: 4, end: 4, text: '1' })).toBe('(555) 1|');
    expect(typed(PHONE, '5551234567').text).toBe('(555) 123-4567');
    expect(typed(POSTAL, 'k1a0b1').text).toBe('K1A 0B1');
  });

  it('takes typed literals as the literals they match', () => {
    expect(edited(PHONE, '555', { start: 4, end: 4, text: ')' })).toBe('(555|');
    expect(typed(PHONE, '(555) 123-4567').raw).toBe('5551234567');
    expect(edited('99%', '12', { start: 2, end: 2, text: '%' })).toBe('12%|');
  });

  it('refuses a character no slot takes, and typing into a full mask', () => {
    expect(editMask(PHONE, '555', { start: 4, end: 4, text: 'x' })).toBeNull();
    expect(editMask(PHONE, '5551234567', { start: 14, end: 14, text: '8' })).toBeNull();
    expect(editMask(POSTAL, 'K', { start: 1, end: 1, text: 'B' })).toBeNull();
    // Over a selection too, so a mistyped key doesn't delete the selected characters.
    expect(editMask(PHONE, '5551234567', { start: 0, end: 14, text: 'x' })).toBeNull();
  });

  it('inserts in the middle, shifting what follows, and types over once full', () => {
    expect(edited(PHONE, '55512', { start: 2, end: 2, text: '9' })).toBe('(59|5) 512');
    expect(edited(PHONE, '5551234567', { start: 6, end: 6, text: '9' })).toBe('(555) 9|23-4567');
    // The same character typed over itself moves the caret on.
    expect(edited(PHONE, '5551234567', { start: 1, end: 1, text: '5' })).toBe('(5|55) 123-4567');
  });

  it('deletes with Backspace and Delete, skipping literals', () => {
    // Backspace after a digit deletes it.
    expect(edited(PHONE, '5551', { start: 6, end: 7, text: '', direction: 'backward' })).toBe(
      '(555|',
    );
    // Backspace after a separator deletes the digit before it.
    expect(edited(PHONE, '5551', { start: 5, end: 6, text: '', direction: 'backward' })).toBe(
      '(55|1',
    );
    // Delete before a separator deletes the digit after it.
    expect(edited(PHONE, '55512', { start: 4, end: 5, text: '', direction: 'forward' })).toBe(
      '(555|) 2',
    );
    // Nothing to delete at the start.
    expect(
      editMask(PHONE, '5551', { start: 0, end: 1, text: '', direction: 'backward' }),
    ).toBeNull();
    // A selection deletes the characters in it.
    expect(edited(PHONE, '5551234567', { start: 2, end: 8, text: '' })).toBe('(5|34) 567');
    expect(edited(PHONE, '5551234567', { start: 0, end: 14, text: '' })).toBe('|');
  });

  it('pastes formatted or raw text over a selection', () => {
    expect(edited(PHONE, '', { start: 0, end: 0, text: '(555) 123-4567' })).toBe('(555) 123-4567|');
    expect(edited(PHONE, '5551234567', { start: 0, end: 14, text: '212 555 0100' })).toBe(
      '(212) 555-0100|',
    );
    expect(edited(PHONE, '', { start: 0, end: 0, text: 'Call 555.123.4567 today' })).toBe(
      '(555) 123-4567|',
    );
  });

  it('follows a function mask as the value changes its shape', () => {
    expect(typed(card, '378282246310005').text).toBe('3782 822463 10005');
    expect(typed(card, '4111111111111111').text).toBe('4111 1111 1111 1111');
    expect(edited(card, '411111111111111', { start: 0, end: 1, text: '3' })?.startsWith('3|')).toBe(
      true,
    );
    expect(
      applyMask(card, editMask(card, '4111', { start: 0, end: 1, text: '3' })?.raw ?? '').text,
    ).toBe('3111');
  });

  it('applies a custom token’s transform', () => {
    const tokens: MaskTokens = {
      X: { pattern: /[A-Z0-9]/, transform: (char) => char.toUpperCase() },
    };
    expect(typed('AA99 XXXX', 'gb82west', tokens).text).toBe('GB82 WEST');
  });
});
