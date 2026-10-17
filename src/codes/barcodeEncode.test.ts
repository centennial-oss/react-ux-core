import { describe, expect, it } from 'vitest';
import {
  BarcodeValueError,
  code128Symbols,
  eanCheckDigit,
  encodeBarcode,
  expandUpcE,
  isValidGtin,
  upcCheckDigit,
} from './barcodeEncode';

const bits = (bars: readonly boolean[]) => bars.map((isBar) => (isBar ? '1' : '0')).join('');

/** Catches the error a call throws. */
function errorOf(call: () => unknown): BarcodeValueError {
  try {
    call();
  } catch (error) {
    if (error instanceof BarcodeValueError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected a BarcodeValueError');
}

describe('check digits', () => {
  it('computes known GTIN check digits', () => {
    expect(upcCheckDigit('03600029145')).toBe('2');
    expect(upcCheckDigit('01234567890')).toBe('5');
    expect(eanCheckDigit('400638133393')).toBe('1');
    expect(eanCheckDigit('978030640615')).toBe('7');
    expect(eanCheckDigit('9638507')).toBe('4');
  });

  it('rejects wrong lengths', () => {
    expect(() => upcCheckDigit('0360002914')).toThrow(BarcodeValueError);
    expect(() => eanCheckDigit('12345678')).toThrow(BarcodeValueError);
  });

  it('validates GTINs of every length', () => {
    expect(isValidGtin('036000291452')).toBe(true);
    expect(isValidGtin('036000291453')).toBe(false);
    expect(isValidGtin('4006381333931')).toBe(true);
    expect(isValidGtin('96385074')).toBe(true);
    expect(isValidGtin('01234565')).toBe(true); // UPC-E
    expect(isValidGtin('10036000291459')).toBe(true); // GTIN-14
    expect(isValidGtin('12345')).toBe(false);
    expect(isValidGtin('03600029145a')).toBe(false);
  });
});

describe('expandUpcE', () => {
  it('expands each zero-suppression form', () => {
    expect(expandUpcE('01234505')).toBe('012000003455');
    expect(expandUpcE('01234531')).toBe('012300000451');
    expect(expandUpcE('01234543')).toBe('012340000053');
    expect(expandUpcE('01234565')).toBe('012345000065');
    expect(expandUpcE('11234562')).toBe('112345000062');
    expect(expandUpcE('0123456')).toBe('012345000065');
  });

  it('rejects a bad number system and names the expected check digit', () => {
    expect(errorOf(() => expandUpcE('21234565')).reason).toBe('number-system');
    const error = errorOf(() => expandUpcE('01234567'));
    expect(error.reason).toBe('check-digit');
    expect(error.expectedCheckDigit).toBe('5');
  });
});

describe('UPC and EAN encoding', () => {
  it('encodes UPC-A 036000291452 to the reference pattern', () => {
    const encoding = encodeBarcode('upc-a', '03600029145');
    expect(encoding.checkDigit).toBe('2');
    expect(encoding.text.value).toBe('036000291452');
    // Start guard, 0 3 6 0 0 0 (L codes), centre guard, 2 9 1 4 5 2 (R codes), end guard.
    expect(bits(encoding.bars)).toBe(
      '101' +
        '0001101' +
        '0111101' +
        '0101111' +
        '0001101' +
        '0001101' +
        '0001101' +
        '01010' +
        '1101100' +
        '1110100' +
        '1100110' +
        '1011100' +
        '1001110' +
        '1101100' +
        '101',
    );
    expect(encoding.quietZone).toEqual({ left: 9, right: 9 });
    // Guards, and the first and last digits, are long.
    expect(encoding.longBars.slice(0, 10).every(Boolean)).toBe(true);
    expect(encoding.longBars[10]).toBe(false);
    expect(encoding.longBars.slice(45, 50).every(Boolean)).toBe(true);
    expect(encoding.longBars.slice(85, 95).every(Boolean)).toBe(true);
    // First and last digits sit outside the bars.
    const layout = encoding.text.layout;
    expect(layout.map((segment) => segment.text)).toEqual(['0', '36000', '29145', '2']);
    expect(layout[0]?.end).toBeLessThanOrEqual(0);
    expect(layout[3]?.start).toBeGreaterThanOrEqual(95);
  });

  it('encodes EAN-13 with the first digit as left-half parity', () => {
    const encoding = encodeBarcode('ean-13', '4006381333931');
    // 4 → L G L L G G: 0 (L) 0 (G) 6 (L) 3 (L) 8 (G) 1 (G).
    expect(bits(encoding.bars).slice(0, 45)).toBe(
      '101' + '0001101' + '0100111' + '0101111' + '0111101' + '0001001' + '0110011',
    );
    expect(encoding.bars).toHaveLength(95);
    expect(encoding.quietZone).toEqual({ left: 11, right: 7 });
    expect(encoding.text.layout.map((segment) => segment.text)).toEqual(['4', '006381', '333931']);
  });

  it('encodes EAN-8', () => {
    const encoding = encodeBarcode('ean-8', '9638507');
    expect(encoding.checkDigit).toBe('4');
    expect(bits(encoding.bars)).toBe(
      '101' +
        '0001011' +
        '0101111' +
        '0111101' +
        '0110111' +
        '01010' +
        '1001110' +
        '1110010' +
        '1000100' +
        '1011100' +
        '101',
    );
  });

  it('encodes UPC-E with number-system and check-digit parity', () => {
    const encoding = encodeBarcode('upc-e', '0123456');
    expect(encoding.checkDigit).toBe('5');
    // Check digit 5, number system 0 → E O O E E O: 1 (G) 2 (L) 3 (L) 4 (G) 5 (G) 6 (L).
    expect(bits(encoding.bars)).toBe(
      '101' + '0110011' + '0010011' + '0111101' + '0011101' + '0111001' + '0101111' + '010101',
    );
    const systemOne = encodeBarcode('upc-e', '1123456');
    // Number system 1 inverts the parity: O E E O O E.
    expect(bits(systemOne.bars).slice(3, 10)).toBe('0011001');
  });

  it('throws a typed error naming the expected check digit', () => {
    const error = errorOf(() => encodeBarcode('upc-a', '036000291453'));
    expect(error.reason).toBe('check-digit');
    expect(error.expectedCheckDigit).toBe('2');
    expect(error.message).toContain('2');
    expect(errorOf(() => encodeBarcode('ean-13', '40063813339')).reason).toBe('length');
    expect(errorOf(() => encodeBarcode('ean-8', '96385A7')).reason).toBe('characters');
  });
});

describe('Code 128', () => {
  it('uses code set B for text, with the mod-103 check symbol', () => {
    // P J J 1 2 3 C in B: 104 + 48·1 + 42·2 + 42·3 + 17·4 + 18·5 + 19·6 + 35·7 = 879 ≡ 55 (mod 103).
    expect(code128Symbols('PJJ123C')).toEqual([104, 48, 42, 42, 17, 18, 19, 35, 55, 106]);
  });

  it('uses code set C for runs of digits', () => {
    // 105 + 12 + 34·2 + 56·3 = 353 ≡ 44.
    expect(code128Symbols('123456')).toEqual([105, 12, 34, 56, 44, 106]);
  });

  it('switches sets for the shortest symbol', () => {
    const symbols = code128Symbols('AB12345678cd');
    // Start B, A, B, Code C, 12 34 56 78, Code B, c, d, check, stop.
    expect(symbols.slice(0, -2)).toEqual([104, 33, 34, 99, 12, 34, 56, 78, 100, 67, 68]);
    // An odd run of digits keeps one digit in B.
    expect(code128Symbols('12345')).toHaveLength(7);
    // A short run isn't worth switching for.
    expect(code128Symbols('X12Y').slice(1, -2)).toEqual([56, 17, 18, 57]);
  });

  it('shifts to code set A for a single control character', () => {
    expect(code128Symbols('a\tb').slice(0, -2)).toEqual([104, 65, 98, 73, 66]);
    // Mostly control characters start in A.
    expect(code128Symbols('\t\t\tA')[0]).toBe(103);
  });

  it('draws 11 modules per symbol and 13 for the stop pattern', () => {
    const encoding = encodeBarcode('code128', 'PJJ123C');
    expect(encoding.bars).toHaveLength(9 * 11 + 13);
    // Start B is 211214: bar 2, space 1, bar 1, space 2, bar 1, space 4.
    expect(bits(encoding.bars).slice(0, 11)).toBe('11010010000');
    // Stop: 2331112, ending with a bar.
    expect(bits(encoding.bars).slice(-13)).toBe('1100011101011');
    expect(encoding.quietZone).toEqual({ left: 10, right: 10 });
  });

  it('rejects empty values and characters outside ASCII', () => {
    expect(errorOf(() => encodeBarcode('code128', '')).reason).toBe('length');
    expect(errorOf(() => encodeBarcode('code128', 'Café')).reason).toBe('characters');
  });
});
