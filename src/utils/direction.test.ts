import { afterEach, describe, expect, it } from 'vitest';
import { isRightToLeft } from './direction';

describe('isRightToLeft', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('follows the dir attribute an element inherits', () => {
    const page = document.createElement('div');
    page.dir = 'rtl';
    const child = document.createElement('span');
    page.append(child);
    document.body.append(page);
    expect(isRightToLeft(child)).toBe(true);
    page.dir = 'ltr';
    expect(isRightToLeft(child)).toBe(false);
  });

  it('follows CSS direction too', () => {
    const styled = document.createElement('div');
    styled.style.direction = 'rtl';
    const plain = document.createElement('div');
    document.body.append(styled, plain);
    expect(isRightToLeft(styled)).toBe(true);
    expect(isRightToLeft(plain)).toBe(false);
  });

  it('is false without an element', () => {
    expect(isRightToLeft(null)).toBe(false);
    expect(isRightToLeft(undefined)).toBe(false);
  });
});
