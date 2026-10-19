// Linear barcode encoders: UPC-A, UPC-E, EAN-13 and EAN-8 (GS1 General Specifications) and Code 128 (ISO/IEC 15417)
// with automatic code-set switching for the shortest symbol. Each returns the modules (true = bar), which modules are
// guard bars drawn taller, and where the human-readable digits go.

/** A barcode symbology. */
export type BarcodeFormat = 'upc-a' | 'upc-e' | 'ean-13' | 'ean-8' | 'code128';

/** Why a value can't be encoded. */
export type BarcodeErrorReason = 'length' | 'characters' | 'check-digit' | 'number-system';

/** Thrown for a value a format can't encode. A wrong check digit names the expected one. */
export class BarcodeValueError extends Error {
  readonly format: BarcodeFormat;
  readonly reason: BarcodeErrorReason;
  /** For `check-digit`: the digit the value should end with. */
  readonly expectedCheckDigit?: string;

  constructor(
    format: BarcodeFormat,
    reason: BarcodeErrorReason,
    message: string,
    expectedCheckDigit?: string,
  ) {
    super(message);
    this.name = 'BarcodeValueError';
    this.format = format;
    this.reason = reason;
    this.expectedCheckDigit = expectedCheckDigit;
  }
}

/** A run of human-readable text, positioned in modules from the first bar (negative is left of it, in the quiet zone). */
export interface BarcodeTextSegment {
  text: string;
  /** Left edge in modules. */
  start: number;
  /** Right edge in modules. The text is centred between `start` and `end`. */
  end: number;
}

export interface BarcodeEncoding {
  format: BarcodeFormat;
  /** One entry per module, true for a bar. Quiet zones aren't included. */
  bars: readonly boolean[];
  /** Modules drawn taller: the guard bars (and UPC-A's first and last digits). Empty for Code 128. */
  longBars: readonly boolean[];
  /** The human-readable text: the full value, and its standard layout under the bars. */
  text: { value: string; layout: readonly BarcodeTextSegment[] };
  /** The check digit (UPC and EAN), computed or verified. Code 128's mod-103 check symbol isn't printed. */
  checkDigit?: string;
  /** The GS1 minimum quiet zones, in modules. */
  quietZone: { left: number; right: number };
}

const DIGITS_RE = /^[0-9]+$/;

/** The GTIN mod-10 check digit: weights 3 and 1 alternating from the rightmost data digit. */
function gtinCheckDigit(digits: string): string {
  let sum = 0;
  for (let index = 0; index < digits.length; index++) {
    const digit = Number(digits[digits.length - 1 - index]);
    sum += index % 2 === 0 ? digit * 3 : digit;
  }
  return String((10 - (sum % 10)) % 10);
}

/** The check digit of an 11-digit UPC-A number. */
export function upcCheckDigit(digits11: string): string {
  if (!DIGITS_RE.test(digits11) || digits11.length !== 11) {
    throw new BarcodeValueError('upc-a', 'length', 'A UPC-A check digit needs exactly 11 digits.');
  }
  return gtinCheckDigit(digits11);
}

/** The check digit of an EAN-8 (7 digits) or EAN-13 (12 digits) number. */
export function eanCheckDigit(digits: string): string {
  if (!DIGITS_RE.test(digits) || (digits.length !== 7 && digits.length !== 12)) {
    throw new BarcodeValueError(
      digits.length <= 8 ? 'ean-8' : 'ean-13',
      'length',
      'An EAN check digit needs 7 digits (EAN-8) or 12 (EAN-13).',
    );
  }
  return gtinCheckDigit(digits);
}

/**
 * Expands a UPC-E number (8 digits: number system 0 or 1, six digits and the check digit; or 7 without the check
 * digit) to its 12-digit UPC-A form.
 */
export function expandUpcE(upcE: string): string {
  if (!DIGITS_RE.test(upcE) || (upcE.length !== 7 && upcE.length !== 8)) {
    throw new BarcodeValueError(
      'upc-e',
      'length',
      'A UPC-E number has 7 digits, or 8 with the check digit.',
    );
  }
  const system = upcE.charAt(0);
  if (system !== '0' && system !== '1') {
    throw new BarcodeValueError('upc-e', 'number-system', 'A UPC-E number starts with 0 or 1.');
  }
  const [d1, d2, d3, d4, d5, d6] = upcE.slice(1, 7);
  let body: string;
  switch (d6) {
    case '0':
    case '1':
    case '2':
      body = `${d1}${d2}${d6}0000${d3}${d4}${d5}`;
      break;
    case '3':
      body = `${d1}${d2}${d3}00000${d4}${d5}`;
      break;
    case '4':
      body = `${d1}${d2}${d3}${d4}00000${d5}`;
      break;
    default:
      body = `${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  }
  const expected = gtinCheckDigit(system + body);
  if (upcE.length === 8 && upcE.charAt(7) !== expected) {
    throw new BarcodeValueError(
      'upc-e',
      'check-digit',
      `The UPC-E check digit should be ${expected}, not ${upcE.charAt(7)}.`,
      expected,
    );
  }
  return system + body + expected;
}

/** Whether `value` is a GTIN with a correct check digit: UPC-A (12), EAN-13 (13), GTIN-14, EAN-8 or UPC-E (8). */
export function isValidGtin(value: string): boolean {
  if (!DIGITS_RE.test(value)) {
    return false;
  }
  const isCheckValid = (digits: string) => gtinCheckDigit(digits.slice(0, -1)) === digits.slice(-1);
  switch (value.length) {
    case 12:
    case 13:
    case 14:
      return isCheckValid(value);
    case 8: {
      if (isCheckValid(value)) {
        return true;
      }
      // Not an EAN-8: perhaps a UPC-E, whose check digit is the expanded UPC-A's.
      try {
        expandUpcE(value);
        return true;
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

// Digit patterns, 7 modules each: L (odd parity, left half), G (even parity, left half) and R (right half).
const L_CODES =
  '0001101 0011001 0010011 0111101 0100011 0110001 0101111 0111011 0110111 0001011'.split(' ');
const R_CODES = L_CODES.map((code) => code.replace(/./g, (bit) => (bit === '0' ? '1' : '0')));
const G_CODES = R_CODES.map((code) => Array.from(code).reverse().join(''));
/** EAN-13's first digit, encoded as the L/G parity of the left six digits. */
const EAN13_PARITY = 'LLLLLL LLGLGG LLGGLG LLGGGL LGLLGG LGGLLG LGGGLL LGLGLG LGLGGL LGGLGL'.split(
  ' ',
);
/** UPC-E parity by check digit, for number system 0 (E = even/G, O = odd/L). Number system 1 inverts it. */
const UPCE_PARITY = 'EEEOOO EEOEOO EEOOEO EEOOOE EOEEOO EOOEEO EOOOEE EOEOEO EOEOOE EOOEOE'.split(
  ' ',
);

/** Collects modules and which ones are guard bars. */
class ModuleWriter {
  readonly bars: boolean[] = [];
  readonly longBars: boolean[] = [];
  write(pattern: string, isLong = false) {
    for (const bit of pattern) {
      this.bars.push(bit === '1');
      this.longBars.push(isLong);
    }
  }
}

/** Splits a value into its data digits and check digit, computing the check digit or verifying a supplied one. */
function withCheckDigit(format: BarcodeFormat, value: string, dataLength: number): string {
  if (!DIGITS_RE.test(value)) {
    throw new BarcodeValueError(format, 'characters', `${format} values are digits only.`);
  }
  if (value.length !== dataLength && value.length !== dataLength + 1) {
    throw new BarcodeValueError(
      format,
      'length',
      `A ${format} value has ${dataLength} digits, or ${dataLength + 1} with the check digit.`,
    );
  }
  const data = value.slice(0, dataLength);
  const expected = gtinCheckDigit(data);
  if (value.length === dataLength + 1 && value.charAt(dataLength) !== expected) {
    throw new BarcodeValueError(
      format,
      'check-digit',
      `The ${format} check digit should be ${expected}, not ${value.charAt(dataLength)}.`,
      expected,
    );
  }
  return data + expected;
}

function encodeEan13Like(format: 'ean-13' | 'upc-a', digits13: string): ModuleWriter {
  const writer = new ModuleWriter();
  const parity = EAN13_PARITY[Number(digits13[0])] ?? 'LLLLLL';
  writer.write('101', true);
  for (let index = 1; index <= 6; index++) {
    const digit = Number(digits13[index]);
    const code = (parity[index - 1] === 'G' ? G_CODES : L_CODES)[digit] ?? '';
    // UPC-A's first digit (the number system) has long bars too.
    writer.write(code, format === 'upc-a' && index === 1);
  }
  writer.write('01010', true);
  for (let index = 7; index <= 12; index++) {
    writer.write(R_CODES[Number(digits13[index])] ?? '', format === 'upc-a' && index === 12);
  }
  writer.write('101', true);
  return writer;
}

function encodeRetail(format: Exclude<BarcodeFormat, 'code128'>, value: string): BarcodeEncoding {
  switch (format) {
    case 'upc-a': {
      const digits = withCheckDigit(format, value, 11);
      const writer = encodeEan13Like('upc-a', '0' + digits);
      return {
        format,
        bars: writer.bars,
        longBars: writer.longBars,
        text: {
          value: digits,
          layout: [
            { text: digits.charAt(0), start: -9, end: -1 },
            { text: digits.slice(1, 6), start: 10, end: 45 },
            { text: digits.slice(6, 11), start: 50, end: 85 },
            { text: digits.charAt(11), start: 96, end: 104 },
          ],
        },
        checkDigit: digits.charAt(11),
        quietZone: { left: 9, right: 9 },
      };
    }
    case 'ean-13': {
      const digits = withCheckDigit(format, value, 12);
      const writer = encodeEan13Like('ean-13', digits);
      return {
        format,
        bars: writer.bars,
        longBars: writer.longBars,
        text: {
          value: digits,
          layout: [
            { text: digits.charAt(0), start: -11, end: -1 },
            { text: digits.slice(1, 7), start: 3, end: 45 },
            { text: digits.slice(7, 13), start: 50, end: 92 },
          ],
        },
        checkDigit: digits.charAt(12),
        quietZone: { left: 11, right: 7 },
      };
    }
    case 'ean-8': {
      const digits = withCheckDigit(format, value, 7);
      const writer = new ModuleWriter();
      writer.write('101', true);
      for (let index = 0; index < 4; index++) {
        writer.write(L_CODES[Number(digits[index])] ?? '');
      }
      writer.write('01010', true);
      for (let index = 4; index < 8; index++) {
        writer.write(R_CODES[Number(digits[index])] ?? '');
      }
      writer.write('101', true);
      return {
        format,
        bars: writer.bars,
        longBars: writer.longBars,
        text: {
          value: digits,
          layout: [
            { text: digits.slice(0, 4), start: 3, end: 31 },
            { text: digits.slice(4, 8), start: 36, end: 64 },
          ],
        },
        checkDigit: digits.charAt(7),
        quietZone: { left: 7, right: 7 },
      };
    }
    case 'upc-e': {
      if (!DIGITS_RE.test(value)) {
        throw new BarcodeValueError(format, 'characters', 'upc-e values are digits only.');
      }
      // Validates the length, number system and check digit.
      const checkDigit = expandUpcE(value).charAt(11);
      const digits = value.slice(0, 7) + checkDigit;
      const system = Number(digits[0]);
      const parity = UPCE_PARITY[Number(checkDigit)] ?? 'EEEOOO';
      const writer = new ModuleWriter();
      writer.write('101', true);
      for (let index = 1; index <= 6; index++) {
        const isEven = (parity[index - 1] === 'E') !== (system === 1);
        writer.write((isEven ? G_CODES : L_CODES)[Number(digits[index])] ?? '');
      }
      writer.write('010101', true);
      return {
        format,
        bars: writer.bars,
        longBars: writer.longBars,
        text: {
          value: digits,
          layout: [
            { text: digits.charAt(0), start: -9, end: -1 },
            { text: digits.slice(1, 7), start: 3, end: 45 },
            { text: digits.charAt(7), start: 52, end: 58 },
          ],
        },
        checkDigit,
        quietZone: { left: 9, right: 7 },
      };
    }
  }
}

// Code 128 symbol patterns: bar and space widths for values 0–105, then the stop pattern (106).
const CODE128_PATTERNS = (
  '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 ' +
  '221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 ' +
  '221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 ' +
  '212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 ' +
  '231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 ' +
  '231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 ' +
  '314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 ' +
  '112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 ' +
  '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 ' +
  '214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 ' +
  '114131 311141 411131 211412 211214 211232 2331112'
).split(' ');
const START = { A: 103, B: 104, C: 105 } as const;
const STOP = 106;
/** The symbol that switches to each code set (the same value from either of the other two sets). */
const CODE_SWITCH = { A: 101, B: 100, C: 99 } as const;
/** Shift: the next character only, from the other of A and B. */
const SHIFT = 98;

type CodeSet = 'A' | 'B' | 'C';
const CODE_SETS: readonly CodeSet[] = ['A', 'B', 'C'];

/** A character's value in code set A or B, or -1 when that set can't encode it. */
function valueIn(set: 'A' | 'B', code: number): number {
  if (set === 'A') {
    if (code >= 32 && code <= 95) {
      return code - 32;
    }
    return code < 32 ? code + 64 : -1;
  }
  return code >= 32 && code <= 127 ? code - 32 : -1;
}

const isDigitCode = (code: number | undefined) => code !== undefined && code >= 48 && code <= 57;

/** One step of a Code 128 plan: a character in A or B, a digit pair in C, or a shifted character. */
interface Code128Step {
  kind: 'char' | 'pair' | 'shift';
  /** The code set that's active for the step (after any switch). */
  active: CodeSet;
}

/** Symbol values (start, data, check, stop) for the shortest Code 128 encoding of `value`. Exported for tests. */
export function code128Symbols(value: string): number[] {
  const codes = Array.from({ length: value.length }, (_, index) => value.charCodeAt(index));
  if (codes.length === 0) {
    throw new BarcodeValueError(
      'code128',
      'length',
      'A Code 128 value needs at least one character.',
    );
  }
  if (codes.some((code) => code > 127)) {
    throw new BarcodeValueError(
      'code128',
      'characters',
      'Code 128 encodes ASCII characters (0–127) only.',
    );
  }
  const length = codes.length;
  // Dynamic programming from the end. direct[i][set]: fewest symbols for codes[i..] encoding at least one character
  // in `set` before any switch. best[i][set]: the same with `set` active, allowing one switch first.
  const direct: Record<CodeSet, number>[] = [];
  const best: Record<CodeSet, number>[] = [];
  const plan: Record<CodeSet, Code128Step | undefined>[] = [];
  best[length] = { A: 0, B: 0, C: 0 };
  for (let index = length - 1; index >= 0; index--) {
    const code = codes[index] ?? 0;
    const after = best[index + 1] ?? { A: 0, B: 0, C: 0 };
    const directRow: Record<CodeSet, number> = { A: Infinity, B: Infinity, C: Infinity };
    const kinds: Record<CodeSet, Code128Step['kind'] | undefined> = {
      A: undefined,
      B: undefined,
      C: undefined,
    };
    if (isDigitCode(code) && isDigitCode(codes[index + 1])) {
      directRow.C = 1 + (best[index + 2]?.C ?? 0);
      kinds.C = 'pair';
    }
    for (const set of ['A', 'B'] as const) {
      const other = set === 'A' ? 'B' : 'A';
      if (valueIn(set, code) >= 0) {
        directRow[set] = 1 + after[set];
        kinds[set] = 'char';
      } else if (valueIn(other, code) >= 0) {
        directRow[set] = 2 + after[set];
        kinds[set] = 'shift';
      }
    }
    const bestRow: Record<CodeSet, number> = { A: Infinity, B: Infinity, C: Infinity };
    const planRow: Record<CodeSet, Code128Step | undefined> = {
      A: undefined,
      B: undefined,
      C: undefined,
    };
    for (const set of CODE_SETS) {
      let chosen: CodeSet = set;
      let fewest = directRow[set];
      for (const other of CODE_SETS) {
        if (other !== set && 1 + directRow[other] < fewest) {
          fewest = 1 + directRow[other];
          chosen = other;
        }
      }
      bestRow[set] = fewest;
      const kind = kinds[chosen];
      planRow[set] = kind ? { kind, active: chosen } : undefined;
    }
    direct[index] = directRow;
    best[index] = bestRow;
    plan[index] = planRow;
  }
  // Start in the set with the fewest symbols (on a tie B, printable ASCII, then C), then replay the plan.
  let active: CodeSet = 'B';
  let fewest = Infinity;
  for (const set of ['B', 'C', 'A'] as const) {
    const total = direct[0]?.[set] ?? Infinity;
    if (total < fewest) {
      fewest = total;
      active = set;
    }
  }
  const symbols: number[] = [START[active]];
  let index = 0;
  while (index < length) {
    const step = plan[index]?.[active];
    if (!step) {
      throw new BarcodeValueError(
        'code128',
        'characters',
        'This value can’t be encoded in Code 128.',
      );
    }
    if (step.active !== active) {
      active = step.active;
      symbols.push(CODE_SWITCH[active]);
    }
    const code = codes[index] ?? 0;
    if (active === 'C') {
      symbols.push((code - 48) * 10 + ((codes[index + 1] ?? 48) - 48));
      index += 2;
    } else if (step.kind === 'shift') {
      symbols.push(SHIFT, valueIn(active === 'A' ? 'B' : 'A', code));
      index += 1;
    } else {
      symbols.push(valueIn(active, code));
      index += 1;
    }
  }
  let checksum = symbols[0] ?? 0;
  symbols.forEach((symbol, position) => {
    checksum += symbol * position;
  });
  symbols.push(checksum % 103, STOP);
  return symbols;
}

function encodeCode128(value: string): BarcodeEncoding {
  const symbols = code128Symbols(value);
  const writer = new ModuleWriter();
  for (const symbol of symbols) {
    const widths = CODE128_PATTERNS[symbol] ?? '';
    for (let element = 0; element < widths.length; element++) {
      // Elements alternate bar, space, bar…, starting with a bar.
      writer.write((element % 2 === 0 ? '1' : '0').repeat(Number(widths.charAt(element))));
    }
  }
  return {
    format: 'code128',
    bars: writer.bars,
    longBars: writer.longBars.map(() => false),
    text: { value, layout: [{ text: value, start: 0, end: writer.bars.length }] },
    quietZone: { left: 10, right: 10 },
  };
}

/**
 * Encodes `value` in a barcode format. UPC and EAN values may leave off the check digit (it's computed); a wrong one
 * throws `BarcodeValueError` naming the expected digit.
 */
export function encodeBarcode(format: BarcodeFormat, value: string): BarcodeEncoding {
  if (format === 'code128') {
    return encodeCode128(value);
  }
  return encodeRetail(format, value);
}
