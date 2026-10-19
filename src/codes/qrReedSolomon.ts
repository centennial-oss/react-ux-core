// Reed–Solomon error correction over GF(256) with the QR primitive polynomial x⁸ + x⁴ + x³ + x² + 1 (0x11D), as ISO/IEC
// 18004 specifies. Field elements are bytes; α = 2 generates the multiplicative group.

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let value = 1;
  for (let power = 0; power < 255; power++) {
    EXP[power] = value;
    LOG[value] = power;
    value <<= 1;
    if (value & 0x100) {
      value ^= 0x11d;
    }
  }
  // A doubled table, so a product's exponent sum never needs reducing modulo 255.
  for (let power = 255; power < 512; power++) {
    EXP[power] = EXP[power - 255] ?? 0;
  }
}

/** Multiplies two field elements. */
export function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) {
    return 0;
  }
  return EXP[(LOG[a] ?? 0) + (LOG[b] ?? 0)] ?? 0;
}

/** α raised to `power` (0–254). */
export function gfExp(power: number): number {
  return EXP[power % 255] ?? 0;
}

const generators = new Map<number, Uint8Array>();

/**
 * The generator polynomial (x − α⁰)(x − α¹)…(x − α^(degree−1)), as its `degree` coefficients from the highest power
 * down, leaving out the leading 1. Cached per degree.
 */
export function rsGenerator(degree: number): Uint8Array {
  let generator = generators.get(degree);
  if (generator) {
    return generator;
  }
  generator = new Uint8Array(degree);
  // Start with the polynomial 1 (stored as its constant term in the last slot), then multiply by (x − αⁱ) each round.
  generator[degree - 1] = 1;
  let root = 1;
  for (let round = 0; round < degree; round++) {
    for (let index = 0; index < degree; index++) {
      generator[index] = gfMultiply(generator[index] ?? 0, root) ^ (generator[index + 1] ?? 0);
    }
    root = gfMultiply(root, 2);
  }
  generators.set(degree, generator);
  return generator;
}

/** The `degree` error-correction codewords for `data`: the remainder of data·x^degree divided by the generator. */
export function rsEncode(data: Uint8Array | readonly number[], degree: number): Uint8Array {
  const generator = rsGenerator(degree);
  const remainder = new Uint8Array(degree);
  for (const byte of data) {
    const factor = byte ^ (remainder[0] ?? 0);
    remainder.copyWithin(0, 1);
    remainder[degree - 1] = 0;
    for (let term = 0; term < degree; term++) {
      remainder[term] = (remainder[term] ?? 0) ^ gfMultiply(generator[term] ?? 0, factor);
    }
  }
  return remainder;
}
