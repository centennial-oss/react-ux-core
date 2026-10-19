import { describe, expect, it } from 'vitest';
import { editKeyAction } from './editKeys';

function keyOn(
  target: EventTarget,
  key: string,
  { ctrlKey = false, metaKey = false, isComposing = false } = {},
) {
  return editKeyAction({ key, ctrlKey, metaKey, isComposing, target });
}

describe('editKeyAction', () => {
  const input = document.createElement('input');
  const textarea = document.createElement('textarea');
  const button = document.createElement('button');

  it('cancels on Escape, unless it closes an open list', () => {
    expect(keyOn(input, 'Escape')).toBe('cancel');
    expect(keyOn(button, 'Escape')).toBe('cancel');
    const comboBox = document.createElement('input');
    comboBox.setAttribute('aria-expanded', 'true');
    expect(keyOn(comboBox, 'Escape')).toBeUndefined();
    comboBox.setAttribute('aria-expanded', 'false');
    expect(keyOn(comboBox, 'Escape')).toBe('cancel');
  });

  it('commits on Enter in an input, but not while composing or with a list open', () => {
    expect(keyOn(input, 'Enter')).toBe('commit');
    expect(keyOn(input, 'Enter', { isComposing: true })).toBeUndefined();
    const comboBox = document.createElement('input');
    comboBox.setAttribute('aria-expanded', 'true');
    expect(keyOn(comboBox, 'Enter')).toBeUndefined();
    // A button's Enter is its own press.
    expect(keyOn(button, 'Enter')).toBeUndefined();
  });

  it('adds a line on Enter in a text area, and commits with Ctrl or ⌘', () => {
    expect(keyOn(textarea, 'Enter')).toBeUndefined();
    expect(keyOn(textarea, 'Enter', { ctrlKey: true })).toBe('commit');
    expect(keyOn(textarea, 'Enter', { metaKey: true })).toBe('commit');
  });

  it('commits on F2 from anywhere, and ignores other keys', () => {
    expect(keyOn(textarea, 'F2')).toBe('commit');
    expect(keyOn(button, 'F2')).toBe('commit');
    expect(keyOn(input, 'a')).toBeUndefined();
    expect(keyOn(input, 'Tab')).toBeUndefined();
  });
});
