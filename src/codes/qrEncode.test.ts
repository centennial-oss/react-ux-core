import { describe, expect, it } from 'vitest';
import {
  alignmentPositions,
  encodeQr,
  QrCapacityError,
  qrBlockLayout,
  qrDataCodewords,
  qrFormatBits,
  qrFunctionModules,
  qrModeFor,
  qrPenalty,
  qrVersionBits,
  type QrErrorCorrection,
  type QrMatrix,
} from './qrEncode';
import { gfExp, gfMultiply, rsEncode } from './qrReedSolomon';

const levels: QrErrorCorrection[] = ['L', 'M', 'Q', 'H'];
const hex = (bytes: ArrayLike<number>) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(' ');

/** Evaluates a codeword polynomial (highest power first) at x. */
function evaluate(codewords: readonly number[], x: number): number {
  return codewords.reduce((sum, coefficient) => gfMultiply(sum, x) ^ coefficient, 0);
}

/** Reads the codewords back out of a symbol: unmask, then follow the placement zigzag (written independently here). */
function readCodewords(matrix: QrMatrix): number[] {
  const { size, version, mask, modules } = matrix;
  const isFunction = qrFunctionModules(version);
  const maskFormulas = [
    (x: number, y: number) => (x + y) % 2 === 0,
    (_x: number, y: number) => y % 2 === 0,
    (x: number) => x % 3 === 0,
    (x: number, y: number) => (x + y) % 3 === 0,
    (x: number, y: number) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
    (x: number, y: number) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x: number, y: number) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x: number, y: number) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const formula = maskFormulas[mask] ?? (() => false);
  const bits: number[] = [];
  let isUpward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    const column = right <= 6 ? right - 1 : right;
    for (let step = 0; step < size; step++) {
      const y = isUpward ? size - 1 - step : step;
      for (const x of [column, column - 1]) {
        if (!isFunction[y * size + x]) {
          bits.push((modules[y]?.[x] ? 1 : 0) ^ (formula(x, y) ? 1 : 0));
        }
      }
    }
    isUpward = !isUpward;
  }
  const codewords: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    codewords.push(bits.slice(index, index + 8).reduce((byte, bit) => (byte << 1) | bit, 0));
  }
  return codewords;
}

/** Reads the 15 format bits from the copy around the top-left finder. */
function readFormatBits(matrix: QrMatrix): number {
  const at = (x: number, y: number) => (matrix.modules[y]?.[x] ? 1 : 0);
  const cells: [number, number][] = [
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
    [8, 7],
    [8, 8],
    [7, 8],
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8],
  ];
  return cells.reduce((bits, [x, y], index) => bits | (at(x, y) << index), 0);
}

describe('Reed–Solomon over GF(256)', () => {
  it('builds the field from the primitive polynomial 0x11D', () => {
    expect(gfExp(8)).toBe(0x1d);
    expect(gfExp(255)).toBe(1);
    expect(gfMultiply(0x53, 0xca)).toBe(gfMultiply(0xca, 0x53));
  });

  it('matches the ISO/IEC 18004 worked example: "01234567" at 1-M', () => {
    const data = qrDataCodewords('01234567', 1, 'M');
    expect(hex(data)).toBe('10 20 0c 56 61 80 ec 11 ec 11 ec 11 ec 11 ec 11');
    expect(hex(rsEncode(data, 10))).toBe('a5 24 d4 c1 ed 36 c7 87 2c 55');
  });

  it('matches the well-known "HELLO WORLD" codewords at 1-M and 1-Q', () => {
    const q = qrDataCodewords('HELLO WORLD', 1, 'Q');
    expect(Array.from(q)).toEqual([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236]);
    expect(Array.from(rsEncode(q, 13))).toEqual([
      168, 72, 22, 82, 217, 54, 156, 0, 46, 15, 180, 122, 16,
    ]);
    const m = qrDataCodewords('HELLO WORLD', 1, 'M');
    expect(Array.from(rsEncode(m, 10))).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });

  it('produces codewords whose polynomial vanishes at α⁰…α^(n−1)', () => {
    for (const degree of [7, 10, 13, 17, 22, 26, 30]) {
      const data = Array.from({ length: 40 }, (_, index) => (index * 37 + degree * 11) % 256);
      const codeword = [...data, ...rsEncode(data, degree)];
      for (let power = 0; power < degree; power++) {
        expect(evaluate(codeword, gfExp(power))).toBe(0);
      }
    }
  });
});

describe('format and version information', () => {
  it('matches the specification’s format-information table (BCH(15,5), mask 0x5412)', () => {
    const table: Record<QrErrorCorrection, string[]> = {
      L: [
        '111011111000100',
        '111001011110011',
        '111110110101010',
        '111100010011101',
        '110011000101111',
        '110001100011000',
        '110110001000001',
        '110100101110110',
      ],
      M: [
        '101010000010010',
        '101000100100101',
        '101111001111100',
        '101101101001011',
        '100010111111001',
        '100000011001110',
        '100111110010111',
        '100101010100000',
      ],
      Q: [
        '011010101011111',
        '011000001101000',
        '011111100110001',
        '011101000000110',
        '010010010110100',
        '010000110000011',
        '010111011011010',
        '010101111101101',
      ],
      H: [
        '001011010001001',
        '001001110111110',
        '001110011100111',
        '001100111010000',
        '000011101100010',
        '000001001010101',
        '000110100001100',
        '000100000111011',
      ],
    };
    for (const level of levels) {
      table[level].forEach((bits, mask) => {
        expect(qrFormatBits(level, mask).toString(2).padStart(15, '0')).toBe(bits);
      });
    }
  });

  it('matches the specification’s version-information table (BCH(18,6))', () => {
    const table = [
      0x07c94, 0x085bc, 0x09a99, 0x0a4d3, 0x0bbf6, 0x0c762, 0x0d847, 0x0e60d, 0x0f928, 0x10b78,
      0x1145d, 0x12a17, 0x13532, 0x149a6, 0x15683, 0x168c9, 0x177ec, 0x18ec4, 0x191e1, 0x1afab,
      0x1b08e, 0x1cc1a, 0x1d33f, 0x1ed75, 0x1f250, 0x209d5, 0x216f0, 0x228ba, 0x2379f, 0x24b0b,
      0x2542e, 0x26a64, 0x27541, 0x28c69,
    ];
    table.forEach((bits, index) => {
      expect(qrVersionBits(index + 7)).toBe(bits);
    });
  });

  it('places the format bits next to the finders and the version bits from version 7', () => {
    const matrix = encodeQr('01234567', { errorCorrection: 'M' });
    expect(readFormatBits(matrix)).toBe(qrFormatBits('M', matrix.mask));
    const v7 = encodeQr('x', { minVersion: 7 });
    const size = v7.size;
    // The bottom-left version block, read least significant bit first.
    let bits = 0;
    for (let index = 0; index < 18; index++) {
      const isDark = v7.modules[size - 11 + (index % 3)]?.[Math.floor(index / 3)] === true;
      bits |= (isDark ? 1 : 0) << index;
    }
    expect(bits).toBe(0x07c94);
  });
});

describe('symbol structure', () => {
  it('has the finder, timing and dark modules where the specification puts them', () => {
    const matrix = encodeQr('01234567', { errorCorrection: 'M' });
    expect(matrix.version).toBe(1);
    expect(matrix.size).toBe(21);
    const row = (y: number, from: number, to: number) =>
      matrix.modules[y]
        ?.slice(from, to)
        .map((isDark) => (isDark ? 1 : 0))
        .join('');
    expect(row(0, 0, 8)).toBe('11111110');
    expect(row(2, 0, 8)).toBe('10111010');
    expect(row(6, 0, 8)).toBe('11111110');
    expect(row(6, 8, 13)).toBe('10101');
    expect(row(0, 13, 21)).toBe('01111111');
    expect(matrix.modules[13]?.[8]).toBe(true);
  });

  it('reads back the worked example’s data and error-correction codewords', () => {
    const matrix = encodeQr('01234567', { errorCorrection: 'M' });
    expect(hex(readCodewords(matrix))).toBe(
      '10 20 0c 56 61 80 ec 11 ec 11 ec 11 ec 11 ec 11 a5 24 d4 c1 ed 36 c7 87 2c 55',
    );
  });

  it('puts alignment patterns at the specification’s positions', () => {
    expect(alignmentPositions(1)).toEqual([]);
    expect(alignmentPositions(2)).toEqual([6, 18]);
    expect(alignmentPositions(7)).toEqual([6, 22, 38]);
    expect(alignmentPositions(22)).toEqual([6, 26, 50, 74, 98]);
    expect(alignmentPositions(32)).toEqual([6, 34, 60, 86, 112, 138]);
    expect(alignmentPositions(40)).toEqual([6, 30, 58, 86, 114, 142, 170]);
  });

  it('has the specification’s data capacities', () => {
    const capacities: Record<number, number[]> = {
      1: [19, 16, 13, 9],
      2: [34, 28, 22, 16],
      10: [274, 216, 154, 122],
      25: [1276, 1000, 718, 538],
      40: [2956, 2334, 1666, 1276],
    };
    for (const [version, expected] of Object.entries(capacities)) {
      expect(levels.map((level) => qrBlockLayout(Number(version), level).dataCodewords)).toEqual(
        expected,
      );
    }
  });
});

describe('encodeQr', () => {
  it('chooses the most compact mode', () => {
    expect(qrModeFor('0123456789')).toBe('numeric');
    expect(qrModeFor('HTTPS://EXAMPLE.COM/A-1')).toBe('alphanumeric');
    expect(qrModeFor('https://example.com')).toBe('byte');
    expect(qrModeFor('Café')).toBe('byte');
  });

  it('picks the smallest version that fits, at each mode’s capacity limits', () => {
    expect(encodeQr('1'.repeat(41), { errorCorrection: 'L' }).version).toBe(1);
    expect(encodeQr('1'.repeat(42), { errorCorrection: 'L' }).version).toBe(2);
    expect(encodeQr('A'.repeat(20), { errorCorrection: 'M' }).version).toBe(1);
    expect(encodeQr('a'.repeat(17), { errorCorrection: 'L' }).version).toBe(1);
    expect(encodeQr('a'.repeat(2953), { errorCorrection: 'L' }).version).toBe(40);
    expect(encodeQr('1'.repeat(7089), { errorCorrection: 'L' }).version).toBe(40);
    expect(encodeQr('A'.repeat(4296), { errorCorrection: 'L' }).version).toBe(40);
    expect(encodeQr('a'.repeat(1273), { errorCorrection: 'H' }).version).toBe(40);
  });

  it('throws a typed QrCapacityError when the value doesn’t fit', () => {
    expect(() => encodeQr('a'.repeat(2954), { errorCorrection: 'L' })).toThrow(QrCapacityError);
    expect(() => encodeQr('1'.repeat(7090), { errorCorrection: 'L' })).toThrow(QrCapacityError);
    try {
      encodeQr('a'.repeat(100), { maxVersion: 3, errorCorrection: 'H' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(QrCapacityError);
      expect((error as QrCapacityError).maxVersion).toBe(3);
      expect((error as QrCapacityError).requiredBits).toBeGreaterThan(
        (error as QrCapacityError).capacityBits,
      );
    }
  });

  it('honours minVersion and a forced mask', () => {
    expect(encodeQr('hi', { minVersion: 10 }).version).toBe(10);
    for (let mask = 0; mask < 8; mask++) {
      const matrix = encodeQr('mask test', { mask });
      expect(matrix.mask).toBe(mask);
      expect(readFormatBits(matrix)).toBe(qrFormatBits('M', mask));
    }
  });

  it('chooses the mask with the lowest penalty', () => {
    const value = 'https://example.com/observatory/schedule?night=2026-10-16';
    const chosen = encodeQr(value);
    const flat = (matrix: QrMatrix) =>
      Uint8Array.from(matrix.modules.flat(), (isDark) => (isDark ? 1 : 0));
    const penalties = Array.from({ length: 8 }, (_, mask) =>
      qrPenalty(flat(encodeQr(value, { mask })), chosen.size),
    );
    expect(qrPenalty(flat(chosen), chosen.size)).toBe(Math.min(...penalties));
  });

  it('encodes a version-40 code in under 50 ms', () => {
    const value = 'a'.repeat(2900);
    encodeQr(value, { errorCorrection: 'L' });
    const times = Array.from({ length: 5 }, () => {
      const start = performance.now();
      const matrix = encodeQr(value, { errorCorrection: 'L' });
      const elapsed = performance.now() - start;
      expect(matrix.version).toBe(40);
      return elapsed;
    }).sort((a, b) => a - b);
    expect(times[2]).toBeLessThan(50);
  });
});
