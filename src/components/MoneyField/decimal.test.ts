import { describe, expect, it } from 'vitest';
import {
  decimalAdd,
  decimalCompare,
  decimalMultiply,
  decimalNegate,
  decimalPercentOf,
  decimalPrecision,
  decimalSubtract,
  decimalSum,
  isDecimal,
  roundHalfEven,
} from './decimal';

describe('decimal helpers', () => {
  it('adds without float drift', () => {
    expect(decimalAdd('0.1', '0.2')).toBe('0.3');
    expect(decimalAdd('1.50', '2')).toBe('3.50');
    expect(decimalAdd('-0.10', '0.1')).toBe('0.00');
    expect(decimalAdd('99999999999999999.99', '0.01')).toBe('100000000000000000.00');
    expect(decimalAdd('.5', '5.')).toBe('5.5');
  });

  it('subtracts, sums and negates', () => {
    expect(decimalSubtract('10.00', '0.01')).toBe('9.99');
    expect(decimalSubtract('0.3', '0.1')).toBe('0.2');
    expect(decimalSubtract('1', '2.5')).toBe('-1.5');
    expect(decimalSum(['0.1', '0.2', '0.3'])).toBe('0.6');
    expect(decimalSum([])).toBe('0');
    expect(decimalNegate('12.30')).toBe('-12.30');
    expect(decimalNegate('-0.00')).toBe('0.00');
  });

  it('multiplies by a quantity exactly, keeping the combined scale', () => {
    expect(decimalMultiply('19.99', '3')).toBe('59.97');
    expect(decimalMultiply('2.50', '1.5')).toBe('3.750');
    expect(decimalMultiply('0.1', '0.2')).toBe('0.02');
    expect(decimalMultiply('-1.25', '4')).toBe('-5.00');
  });

  it('takes a percentage exactly', () => {
    expect(decimalPercentOf('80.00', '12.5')).toBe('10.00000');
    expect(decimalPercentOf('59.97', '8.25')).toBe('4.947525');
  });

  it('compares by value, ignoring scale', () => {
    expect(decimalCompare('1.50', '1.5')).toBe(0);
    expect(decimalCompare('0.3', decimalAdd('0.1', '0.2'))).toBe(0);
    expect(decimalCompare('-2', '1')).toBe(-1);
    expect(decimalCompare('10', '9.999')).toBe(1);
    expect(['3', '-1', '2.5'].sort(decimalCompare)).toEqual(['-1', '2.5', '3']);
  });

  it('rounds half to even and pads', () => {
    expect(roundHalfEven('2.345', 2)).toBe('2.34');
    expect(roundHalfEven('2.355', 2)).toBe('2.36');
    expect(roundHalfEven('2.3451', 2)).toBe('2.35');
    expect(roundHalfEven('-0.125', 2)).toBe('-0.12');
    expect(roundHalfEven('-0.135', 2)).toBe('-0.14');
    expect(roundHalfEven('0.5', 0)).toBe('0');
    expect(roundHalfEven('1.5', 0)).toBe('2');
    expect(roundHalfEven('7', 2)).toBe('7.00');
    expect(roundHalfEven('-0.001', 2)).toBe('0.00');
    expect(() => roundHalfEven('1', -1)).toThrow(RangeError);
  });

  it('validates input', () => {
    expect(isDecimal('12')).toBe(true);
    expect(isDecimal('-0.50')).toBe(true);
    expect(isDecimal('1,000')).toBe(false);
    expect(isDecimal('1e3')).toBe(false);
    expect(isDecimal('.')).toBe(false);
    expect(isDecimal('')).toBe(false);
    expect(() => decimalAdd('abc', '1')).toThrow(RangeError);
  });

  it('measures significant fraction digits', () => {
    expect(decimalPrecision('1.25')).toBe(2);
    expect(decimalPrecision('1.50')).toBe(1);
    expect(decimalPrecision('3.000')).toBe(0);
    expect(decimalPrecision('12')).toBe(0);
  });
});
