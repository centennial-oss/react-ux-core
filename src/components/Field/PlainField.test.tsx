import { describe, expect, it } from 'vitest';
import { ariaLabelProps, shownError } from './PlainField';

describe('ariaLabelProps', () => {
  it('names by the visible label when there is one, otherwise by aria-label', () => {
    expect(ariaLabelProps('Colour', 'label-1', 'Ignored')).toEqual({
      'aria-labelledby': 'label-1',
    });
    expect(ariaLabelProps(undefined, 'label-1', 'Colour')).toEqual({ 'aria-label': 'Colour' });
  });
});

describe('shownError', () => {
  it('shows a message only while invalid, and never a validation function', () => {
    expect(shownError(true, 'Pick a colour')).toBe('Pick a colour');
    expect(shownError(false, 'Pick a colour')).toBeUndefined();
    expect(shownError(true, undefined)).toBeUndefined();
    expect(shownError(true, () => 'From validation')).toBeUndefined();
  });
});
