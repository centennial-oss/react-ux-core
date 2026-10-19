import { describe, expect, it } from 'vitest';
import {
  commandShortcutAria,
  commandShortcutKeys,
  isEditableTarget,
  isFormControlTarget,
  matchesCommandShortcut,
  type CommandShortcut,
} from './keyboard';

const bold: CommandShortcut = { code: 'KeyB', key: 'B' };
const heading: CommandShortcut = { code: 'Digit1', key: '1', isAlt: true };
const names = { ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift' };

function keyEvent(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent('keydown', init);
}

describe('matchesCommandShortcut', () => {
  it('uses ⌘ on Apple devices and Ctrl elsewhere', () => {
    expect(matchesCommandShortcut(keyEvent({ code: 'KeyB', metaKey: true }), bold, true)).toBe(
      true,
    );
    expect(matchesCommandShortcut(keyEvent({ code: 'KeyB', ctrlKey: true }), bold, true)).toBe(
      false,
    );
    expect(matchesCommandShortcut(keyEvent({ code: 'KeyB', ctrlKey: true }), bold, false)).toBe(
      true,
    );
    expect(
      matchesCommandShortcut(keyEvent({ code: 'KeyB', ctrlKey: true, metaKey: true }), bold, false),
    ).toBe(false);
  });

  it('needs exactly the modifiers asked for', () => {
    const altOne = keyEvent({ code: 'Digit1', ctrlKey: true, altKey: true });
    expect(matchesCommandShortcut(altOne, heading, false)).toBe(true);
    expect(
      matchesCommandShortcut(keyEvent({ code: 'Digit1', ctrlKey: true }), heading, false),
    ).toBe(false);
    expect(
      matchesCommandShortcut(
        keyEvent({ code: 'KeyB', ctrlKey: true, shiftKey: true }),
        bold,
        false,
      ),
    ).toBe(false);
  });

  it('ignores AltGr, which types characters', () => {
    const altGr = {
      code: 'Digit1',
      ctrlKey: true,
      metaKey: false,
      altKey: true,
      shiftKey: false,
      getModifierState: (key: string) => key === 'AltGraph',
    };
    expect(matchesCommandShortcut(altGr, heading, false)).toBe(false);
  });
});

describe('command shortcut display', () => {
  it('writes aria-keyshortcuts', () => {
    expect(commandShortcutAria(heading, true)).toBe('Meta+Alt+1');
    expect(commandShortcutAria({ ...bold, isShift: true }, false)).toBe('Control+Shift+B');
  });

  it('lists the keys to show', () => {
    expect(commandShortcutKeys({ ...heading, isShift: true }, true, names)).toEqual([
      '⌘',
      '⌥',
      '⇧',
      '1',
    ]);
    expect(commandShortcutKeys(heading, false, names)).toEqual(['Ctrl', 'Alt', '1']);
  });
});

describe('isEditableTarget', () => {
  it('is true for text entry only', () => {
    const text = document.createElement('input');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    document.body.append(editable);
    expect(isEditableTarget(text)).toBe(true);
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
    expect(isEditableTarget(editable)).toBe(true);
    expect(isEditableTarget(checkbox)).toBe(false);
    expect(isEditableTarget(document.createElement('button'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
    editable.remove();
  });
});

describe('isFormControlTarget', () => {
  it('is true for any form control', () => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    expect(isFormControlTarget(checkbox)).toBe(true);
    expect(isFormControlTarget(document.createElement('select'))).toBe(true);
    expect(isFormControlTarget(document.createElement('div'))).toBe(false);
  });
});
