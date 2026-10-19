import { describe, expect, it } from 'vitest';
import { commandShortcutAria, commandShortcutKeys } from '../utils/keyboard';
import {
  applyCommand,
  capturesTab,
  commandForKey,
  commandShortcuts,
  continueList,
  fileStem,
  imageMarkdown,
  indentLines,
  replaceSelection,
  type EditState,
  type MarkdownCommand,
} from './markdownCommands';

// Text with its selection written inline: "|" is a caret, "‹…›" a selection.
function parse(text: string): EditState {
  const caret = text.indexOf('|');
  if (caret !== -1) {
    return { value: text.replace('|', ''), selectionStart: caret, selectionEnd: caret };
  }
  const start = text.indexOf('‹');
  const end = text.indexOf('›') - 1;
  return {
    value: text.replace('‹', '').replace('›', ''),
    selectionStart: start,
    selectionEnd: end,
  };
}

function show({ value, selectionStart, selectionEnd }: EditState): string {
  if (selectionStart === selectionEnd) {
    return `${value.slice(0, selectionStart)}|${value.slice(selectionStart)}`;
  }
  return `${value.slice(0, selectionStart)}‹${value.slice(selectionStart, selectionEnd)}›${value.slice(selectionEnd)}`;
}

const options = { urlPlaceholder: 'url' };

function run(command: MarkdownCommand, text: string): string {
  return show(applyCommand(command, parse(text), options));
}

describe('inline commands', () => {
  it('wraps the selection, keeping edge spaces outside, and unwraps it again', () => {
    expect(run('bold', 'a ‹mass ›b')).toBe('a **‹mass›** b');
    expect(run('bold', 'a **‹mass›** b')).toBe('a ‹mass› b');
    expect(run('bold', 'a ‹**mass**› b')).toBe('a ‹mass› b');
    expect(run('italic', '‹force›')).toBe('_‹force›_');
    expect(run('code', 'run ‹npm test›')).toBe('run `‹npm test›`');
  });

  it('puts the caret between empty markers, and removes them on a second press', () => {
    expect(run('bold', 'a |b')).toBe('a **|**b');
    expect(run('bold', 'a **|**b')).toBe('a |b');
  });

  it('turns multi-line code into a fenced block', () => {
    expect(run('code', '‹a\nb›')).toBe('```\n‹a\nb›\n```');
  });

  it('inserts links and images with the address selected, or a selected URL as the address', () => {
    expect(run('link', 'see ‹Newton›')).toBe('see [Newton](‹url›)');
    expect(run('link', 'see |')).toBe('see [|](url)');
    expect(run('link', '‹https://example.com›')).toBe('[|](https://example.com)');
    expect(run('image', '‹cart›')).toBe('![cart](‹url›)');
  });
});

describe('line commands', () => {
  it('cycles headings through #, ##, ### and plain text', () => {
    expect(run('heading', 'Forces|')).toBe('# Forces|');
    expect(run('heading', '# Forces|')).toBe('## Forces|');
    expect(run('heading', '## Forces|')).toBe('### Forces|');
    expect(run('heading', '### Forces|')).toBe('Forces|');
  });

  it('toggles quotes on every selected line', () => {
    expect(run('quote', '‹one\ntwo›')).toBe('‹> one\n> two›');
    expect(run('quote', '‹> one\n> two›')).toBe('‹one\ntwo›');
  });

  it('makes lists of each kind, numbering items, and converts between kinds', () => {
    expect(run('bulletList', '‹mass\nforce›')).toBe('‹- mass\n- force›');
    expect(run('numberedList', '‹mass\nforce›')).toBe('‹1. mass\n2. force›');
    expect(run('taskList', '‹- mass\n- force›')).toBe('‹- [ ] mass\n- [ ] force›');
    expect(run('bulletList', '‹- mass\n- force›')).toBe('‹mass\nforce›');
    expect(run('bulletList', '|')).toBe('- |');
  });

  it('fences a code block, with the caret inside an empty one, and unfences it', () => {
    expect(run('codeBlock', 'a\n|')).toBe('a\n```\n|\n```');
    expect(run('codeBlock', '```\n{"a": 1}|\n```')).toBe('‹{"a": 1}›');
  });
});

describe('continueList', () => {
  function enter(text: string): string | null {
    const next = continueList(parse(text));
    return next === null ? null : show(next);
  }

  it('continues bullets, numbers and task items', () => {
    expect(enter('- mass|')).toBe('- mass\n- |');
    expect(enter('* mass|')).toBe('* mass\n* |');
    expect(enter('9. mass|')).toBe('9. mass\n10. |');
    expect(enter('1) mass|')).toBe('1) mass\n2) |');
    expect(enter('- [x] done|')).toBe('- [x] done\n- [ ] |');
    expect(enter('  - nested|')).toBe('  - nested\n  - |');
  });

  it('splits an item at the caret', () => {
    expect(enter('- mass| and force')).toBe('- mass\n- | and force');
  });

  it('ends the list on an empty item', () => {
    expect(enter('- mass\n- |')).toBe('- mass\n\n|');
    expect(enter('- mass\n- [ ] |')).toBe('- mass\n\n|');
  });

  it('leaves plain lines, the marker itself and fenced code alone', () => {
    expect(enter('mass|')).toBeNull();
    expect(enter('-| mass')).toBeNull();
    expect(enter('```\n- not a list|\n```')).toBeNull();
    expect(enter('‹- mass›')).toBeNull();
  });
});

describe('indentLines and capturesTab', () => {
  it('captures Tab in a list item or across lines, and nowhere else', () => {
    expect(capturesTab(parse('- mass|'))).toBe(true);
    expect(capturesTab(parse('‹one\ntwo›'))).toBe(true);
    expect(capturesTab(parse('plain|'))).toBe(false);
    expect(capturesTab(parse('‹plain›'))).toBe(false);
  });

  it('indents an item under its sibling’s text, and outdents back to its parent', () => {
    expect(show(indentLines(parse('- mass\n- force|'), 1))).toBe('- mass\n  - force|');
    expect(show(indentLines(parse('1. mass\n2. force|'), 1))).toBe('1. mass\n   2. force|');
    expect(show(indentLines(parse('1. mass\n   - force|'), -1))).toBe('1. mass\n- force|');
    expect(show(indentLines(parse('- mass|'), -1))).toBe('- mass|');
  });

  it('indents and outdents every selected line', () => {
    expect(show(indentLines(parse('‹one\ntwo›'), 1))).toBe('‹  one\n  two›');
    expect(show(indentLines(parse('‹  one\n  two›'), -1))).toBe('‹one\ntwo›');
  });
});

describe('helpers', () => {
  it('replaces the selection', () => {
    expect(show(replaceSelection(parse('a ‹b› c'), 'xyz'))).toBe('a xyz| c');
  });

  it('writes image Markdown safely', () => {
    expect(imageMarkdown('/cart.png', 'Cart [side]')).toBe('![Cart \\[side\\]](/cart.png)');
    expect(imageMarkdown('/my cart.png', 'Cart')).toBe('![Cart](</my cart.png>)');
    expect(fileStem('cart.photo.png')).toBe('cart.photo');
    expect(fileStem('.hidden')).toBe('.hidden');
  });

  it('matches shortcuts by physical key with exactly their modifiers, never AltGr', () => {
    const event = (
      code: string,
      modifiers: Partial<Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>> = {},
    ) => ({
      code,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      ...modifiers,
    });
    expect(commandForKey(event('KeyB', { metaKey: true }), true)).toBe('bold');
    expect(commandForKey(event('KeyB', { ctrlKey: true }), false)).toBe('bold');
    expect(commandForKey(event('KeyB', { ctrlKey: true }), true)).toBeNull();
    expect(commandForKey(event('Digit8', { ctrlKey: true, shiftKey: true }), false)).toBe(
      'bulletList',
    );
    expect(commandForKey(event('KeyQ', { ctrlKey: true, altKey: true }), false)).toBe('quote');
    expect(
      commandForKey(
        {
          ...event('KeyQ', { ctrlKey: true, altKey: true }),
          getModifierState: (key: string) => key === 'AltGraph',
        },
        false,
      ),
    ).toBeNull();
    expect(commandForKey(event('KeyB'), false)).toBeNull();
  });

  it('shows shortcuts for each platform', () => {
    const names = { ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift' };
    expect(commandShortcutKeys(commandShortcuts.bulletList, true, names)).toEqual(['⌘', '⇧', '8']);
    expect(commandShortcutKeys(commandShortcuts.quote, false, names)).toEqual(['Ctrl', 'Alt', 'Q']);
    expect(commandShortcutAria(commandShortcuts.bold, false)).toBe('Control+B');
  });
});
