import { describe, expect, it } from 'vitest';
import {
  ariaKeyShortcut,
  hasCommandModifier,
  isEditableTarget,
  matchesShortcut,
  parseShortcut,
  shortcutKeys,
  type Shortcut,
} from './shortcut';

function key(
  value: string,
  modifiers: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey', boolean>> = {},
  code = '',
) {
  return {
    key: value,
    code,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...modifiers,
  };
}

function parsed(text: string): Shortcut {
  const shortcut = parseShortcut(text);
  if (!shortcut) {
    throw new Error(`Couldn't parse ${text}`);
  }
  return shortcut;
}

describe('shortcuts', () => {
  it('parses shortcut strings', () => {
    expect(parsed('mod+k')).toMatchObject({ key: 'k', hasMod: true, hasShift: false });
    expect(parsed('Ctrl+Shift+P')).toMatchObject({ key: 'p', hasCtrl: true, hasShift: true });
    expect(parsed('/')).toMatchObject({ key: '/', hasMod: false });
    expect(parsed('mod++').key).toBe('+');
    expect(parseShortcut('')).toBeNull();
  });

  it('matches mod as ⌘ on Apple devices and Ctrl elsewhere, with exactly its modifiers', () => {
    const modK = parsed('mod+k');
    expect(matchesShortcut(key('k', { metaKey: true }), modK, true)).toBe(true);
    expect(matchesShortcut(key('k', { ctrlKey: true }), modK, true)).toBe(false);
    expect(matchesShortcut(key('k', { ctrlKey: true }), modK, false)).toBe(true);
    expect(matchesShortcut(key('K', { ctrlKey: true, shiftKey: true }), modK, false)).toBe(false);
    expect(matchesShortcut(key('k'), modK, false)).toBe(false);
    // Option changes the character on Apple layouts; the physical key still counts.
    expect(
      matchesShortcut(key('˚', { metaKey: true, altKey: true }, 'KeyK'), parsed('mod+alt+k'), true),
    ).toBe(true);
    // Shift isn't checked for symbols that need it on some layouts.
    expect(matchesShortcut(key('/', { shiftKey: true }), parsed('/'), false)).toBe(true);
  });

  it('shows the keys and the aria-keyshortcuts value for the platform', () => {
    expect(shortcutKeys(parsed('mod+k'), true)).toEqual(['⌘', 'K']);
    expect(shortcutKeys(parsed('mod+k'), false)).toEqual(['Ctrl', 'K']);
    expect(shortcutKeys(parsed('mod+shift+p'), true)).toEqual(['⇧', '⌘', 'P']);
    expect(ariaKeyShortcut(parsed('mod+k'), true)).toBe('Meta+K');
    expect(ariaKeyShortcut(parsed('mod+k'), false)).toBe('Control+K');
    expect(hasCommandModifier(parsed('mod+k'))).toBe(true);
    expect(hasCommandModifier(parsed('/'))).toBe(false);
  });

  it('tells text fields from other elements', () => {
    const input = document.createElement('input');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    document.body.append(editable);
    expect(isEditableTarget(input)).toBe(true);
    expect(isEditableTarget(checkbox)).toBe(false);
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
    expect(isEditableTarget(editable)).toBe(true);
    expect(isEditableTarget(document.body)).toBe(false);
    editable.remove();
  });
});
