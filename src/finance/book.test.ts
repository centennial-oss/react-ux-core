import { describe, expect, it } from 'vitest';
import { decimalScale, groupPrice, maxScale, resolveSide, spreadAndMid, trimTo } from './book';
import { formatPercentValue, formatPrice } from './format';
import { diffBook } from './OrderBook';

describe('groupPrice', () => {
  it('rounds bids down and asks up to the grouping, at the grouping’s scale', () => {
    expect(groupPrice('101.27', '0.1', 'floor')).toBe('101.2');
    expect(groupPrice('101.27', '0.1', 'ceil')).toBe('101.3');
    expect(groupPrice('101.27', '0.5', 'ceil')).toBe('101.5');
    expect(groupPrice('101.27', '10', 'floor')).toBe('100');
    expect(groupPrice('101.27', '10', 'ceil')).toBe('110');
    expect(groupPrice('0.625', '0.01', 'floor')).toBe('0.62');
  });

  it('leaves prices already on the grid alone', () => {
    expect(groupPrice('101.20', '0.1', 'floor')).toBe('101.2');
    expect(groupPrice('101.20', '0.1', 'ceil')).toBe('101.2');
    expect(groupPrice('100', '0.01', 'ceil')).toBe('100.00');
  });
});

describe('resolveSide', () => {
  const bids = [
    { price: '101.15', size: '2' },
    { price: '101.20', size: '1.5' },
    { price: '101.17', size: '0.25', isOwn: true },
  ];

  it('sorts best first and works out cumulative totals exactly', () => {
    expect(resolveSide(bids, 'bid')).toEqual([
      { price: '101.20', size: '1.5', total: '1.5', isOwn: false },
      { price: '101.17', size: '0.25', total: '1.75', isOwn: true },
      { price: '101.15', size: '2', total: '3.75', isOwn: false },
    ]);
    expect(resolveSide(bids, 'ask').map((level) => level.price)).toEqual([
      '101.15',
      '101.17',
      '101.20',
    ]);
  });

  it('groups levels, summing sizes and keeping the own-order flag', () => {
    expect(resolveSide(bids, 'bid', { grouping: '0.1' })).toEqual([
      { price: '101.2', size: '1.5', total: '1.5', isOwn: false },
      { price: '101.1', size: '2.25', total: '3.75', isOwn: true },
    ]);
  });

  it('cuts to the depth and skips levels that aren’t decimals', () => {
    const levels = [...bids, { price: 'n/a', size: '1' }];
    expect(resolveSide(levels, 'bid', { depth: 2 })).toHaveLength(2);
    expect(resolveSide(levels, 'bid')).toHaveLength(3);
  });

  it('keeps the app’s totals when not grouped', () => {
    expect(resolveSide([{ price: '1', size: '2', total: '9' }], 'ask')[0]?.total).toBe('9');
  });

  it('adds 0.1 and 0.2 without drift', () => {
    const total = resolveSide(
      [
        { price: '1', size: '0.1' },
        { price: '2', size: '0.2' },
      ],
      'ask',
    )[1]?.total;
    expect(total).toBe('0.3');
  });
});

describe('spread and helpers', () => {
  it('works out the spread and the mid price', () => {
    expect(spreadAndMid('101.20', '101.25')).toEqual({ spread: '0.05', mid: '101.225' });
    expect(spreadAndMid('101.20', '101.30')).toEqual({ spread: '0.10', mid: '101.25' });
    expect(spreadAndMid(undefined, '101.25')).toBeNull();
  });

  it('measures and trims scales', () => {
    expect(decimalScale('1.50')).toBe(2);
    expect(decimalScale('12')).toBe(0);
    expect(maxScale(['1', '2.5', '3.125'])).toBe(3);
    expect(trimTo('101.2250', 2)).toBe('101.225');
    expect(trimTo('101.200', 2)).toBe('101.20');
    expect(trimTo('101.0', 0)).toBe('101');
  });

  it('formats prices as numbers or probabilities, and percentages', () => {
    expect(formatPrice('1234.5', 'en-US', { digits: 2 })).toBe('1,234.50');
    expect(formatPrice('0.62', 'en-US', { format: 'probability', digits: 2 })).toBe('62%');
    expect(formatPrice('0.625', 'en-US', { format: 'probability', digits: 3 })).toBe('62.5%');
    expect(formatPercentValue('61.28', 'en-US', { hasSign: true })).toBe('+61.28%');
    expect(formatPercentValue('0.4', 'en-US')).toBe('0.4%');
  });
});

describe('diffBook', () => {
  it('marks grown and new levels up and shrunk levels down', () => {
    const before = {
      bids: resolveSide(
        [
          { price: '10', size: '1' },
          { price: '9', size: '2' },
        ],
        'bid',
      ),
      asks: resolveSide([{ price: '11', size: '3' }], 'ask'),
    };
    const after = {
      bids: resolveSide(
        [
          { price: '10', size: '1.0' },
          { price: '9', size: '1' },
          { price: '8', size: '4' },
        ],
        'bid',
      ),
      asks: resolveSide([{ price: '11', size: '3.5' }], 'ask'),
    };
    expect(Object.fromEntries(diffBook(before, after))).toEqual({
      'bid:9': 'down',
      'bid:8': 'up',
      'ask:11': 'up',
    });
  });
});
