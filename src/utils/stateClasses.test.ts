import { describe, expect, it } from 'vitest';
import { cn } from './cn';
import {
  controlHeightClasses,
  disabledClasses,
  focusedSurfaceClasses,
  hoverSurfaceClasses,
  pressTintClasses,
  selectedSolidClasses,
} from './stateClasses';

const classesOf = (value: string) => value.split(' ');

describe('state classes', () => {
  it.each([
    ['press tint', pressTintClasses],
    ['disabled', disabledClasses],
    ['hover surface', hoverSurfaceClasses],
    ['focused surface', focusedSurfaceClasses],
    ['selected solid', selectedSolidClasses],
    ['small height', controlHeightClasses.sm],
    ['medium height', controlHeightClasses.md],
  ])('%s is a list of distinct static classes', (_, value) => {
    const classes = classesOf(value);
    expect(classes.every((name) => /^[\w:.[\]()/-]+$/.test(name))).toBe(true);
    expect(new Set(classes).size).toBe(classes.length);
  });

  it('press tint starts hidden and tints on hover and press', () => {
    expect(classesOf(pressTintClasses)).toEqual(
      expect.arrayContaining([
        'after:absolute',
        'after:bg-current',
        'after:opacity-0',
        'data-hovered:after:opacity-[0.08]',
        'data-pressed:after:opacity-[0.14]',
      ]),
    );
  });

  it('surfaces differ only in the state that raises them', () => {
    expect(hoverSurfaceClasses.replace('data-hovered:', 'data-focused:')).toBe(
      focusedSurfaceClasses,
    );
  });

  it('keeps a later override over the shared constant', () => {
    expect(cn(disabledClasses, 'data-disabled:opacity-30')).toBe(
      'data-disabled:cursor-not-allowed data-disabled:opacity-30',
    );
    expect(cn(selectedSolidClasses, 'data-selected:bg-accent-bg')).toBe(
      'data-selected:text-accent-on-solid data-selected:bg-accent-bg',
    );
  });

  it('gives small and medium controls their heights', () => {
    expect(controlHeightClasses).toEqual({ sm: 'h-8', md: 'h-10' });
  });
});
