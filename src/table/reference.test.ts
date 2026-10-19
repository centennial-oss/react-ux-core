import { describe, expect, it } from 'vitest';
import { defaultMessages } from '../provider/messages';
import { defaultEditableTableMessages } from './editableMessages';
import { defaultFlowsheetMessages } from './flowsheetMessages';
import { defaultTableMessages, type TableEntryStrings } from './messages';
import { criticalText, flagSeverity, numericValue, rangeText, resolveFlag } from './reference';

const messages: TableEntryStrings = {
  ...defaultMessages,
  ...defaultTableMessages,
  ...defaultEditableTableMessages,
  ...defaultFlowsheetMessages,
};

const potassium = {
  referenceRange: { low: 3.5, high: 5.1 },
  criticalRange: { low: 2.8, high: 6.2 },
};

describe('resolveFlag', () => {
  it('flags values from the reference and critical ranges, the limits themselves being normal', () => {
    expect(resolveFlag({ value: 4.2, ...potassium })).toBe('N');
    expect(resolveFlag({ value: 3.5, ...potassium })).toBe('N');
    expect(resolveFlag({ value: 5.1, ...potassium })).toBe('N');
    expect(resolveFlag({ value: 5.2, ...potassium })).toBe('H');
    expect(resolveFlag({ value: 3.4, ...potassium })).toBe('L');
    expect(resolveFlag({ value: 6.2, ...potassium })).toBe('H');
    expect(resolveFlag({ value: 6.3, ...potassium })).toBe('HH');
    expect(resolveFlag({ value: 2.7, ...potassium })).toBe('LL');
    expect(resolveFlag({ value: '5.4', ...potassium })).toBe('H');
  });

  it('gives the source flag priority, and no flag to text or values without ranges', () => {
    expect(resolveFlag({ value: 5.3, ...potassium, flag: 'N' })).toBe('N');
    expect(resolveFlag({ value: 4.0, ...potassium, flag: 'A' })).toBe('A');
    expect(resolveFlag({ value: 'Positive', ...potassium })).toBeUndefined();
    expect(resolveFlag({ value: '<0.3', flag: 'L' })).toBe('L');
    expect(resolveFlag({ value: 72 })).toBeUndefined();
    expect(resolveFlag({ value: 94, referenceRange: { low: 95 } })).toBe('L');
  });

  it('ranks severity and reads numbers', () => {
    expect(flagSeverity('HH')).toBe('critical');
    expect(flagSeverity('LL')).toBe('critical');
    expect(flagSeverity('A')).toBe('abnormal');
    expect(flagSeverity('N')).toBe('normal');
    expect(flagSeverity(undefined)).toBe('normal');
    expect(numericValue('12.5')).toBe(12.5);
    expect(numericValue('<0.3')).toBeNull();
    expect(numericValue(Number.NaN)).toBeNull();
  });
});

describe('range text', () => {
  const withUnit = (value: number) => `${String(value)} bpm`;
  it('writes reference ranges and critical limits', () => {
    expect(rangeText({ low: 60, high: 100 }, withUnit, messages)).toBe('60 bpm–100 bpm');
    expect(rangeText({ low: 95 }, withUnit, messages)).toBe('≥ 95 bpm');
    expect(rangeText({ high: 5 }, withUnit, messages)).toBe('≤ 5 bpm');
    expect(rangeText({ text: 'Negative' }, withUnit, messages)).toBe('Negative');
    expect(rangeText(undefined, withUnit, messages)).toBeUndefined();
    expect(criticalText({ low: 40, high: 140 }, withUnit, messages)).toBe(
      'below 40 bpm, above 140 bpm',
    );
    expect(criticalText({ high: 4 }, withUnit, messages)).toBe('above 4 bpm');
  });
});
