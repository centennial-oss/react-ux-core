// MarkdownEditor's editing commands as pure functions of the text and its selection (so they're unit-testable), the
// keyboard shortcuts that run them, and `applyToTextarea`, which writes a result into the textarea through the
// browser's own editing so ⌘Z / Ctrl+Z undoes it.

import { matchesCommandShortcut, type CommandShortcut } from '../utils/keyboard';

/** The text and its selection (`selectionStart === selectionEnd` is a caret). */
export interface EditState {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export type MarkdownCommand =
  | 'bold'
  | 'italic'
  | 'code'
  | 'link'
  | 'heading'
  | 'quote'
  | 'bulletList'
  | 'numberedList'
  | 'taskList'
  | 'codeBlock'
  | 'image';

export interface CommandOptions {
  /** Inserted (and selected) where a link's or an image's address goes. */
  urlPlaceholder: string;
}

// --- Lines -------------------------------------------------------------------------------------------------------

function lineStartAt(value: string, position: number): number {
  return value.lastIndexOf('\n', position - 1) + 1;
}

function lineEndAt(value: string, position: number): number {
  const end = value.indexOf('\n', position);
  return end === -1 ? value.length : end;
}

/** The whole lines the selection touches. A selection ending at the start of a line doesn't include that line. */
function selectedLines({ value, selectionStart, selectionEnd }: EditState) {
  const end =
    selectionEnd > selectionStart && value[selectionEnd - 1] === '\n'
      ? selectionEnd - 1
      : selectionEnd;
  const start = lineStartAt(value, selectionStart);
  const stop = lineEndAt(value, Math.max(start, end));
  return { start, end: stop, lines: value.slice(start, stop).split('\n') };
}

/**
 * Replaces the selected lines with `transform(lines)`. The caret (or the selection's start) moves with its line's
 * new prefix, and the selection's end with the block's change in length.
 */
function transformLines(state: EditState, transform: (lines: string[]) => string[]): EditState {
  const { start, end, lines } = selectedLines(state);
  const next = transform(lines);
  const block = next.join('\n');
  const value = state.value.slice(0, start) + block + state.value.slice(end);
  const firstDelta = (next[0] ?? '').length - (lines[0] ?? '').length;
  const totalDelta = block.length - (end - start);
  const isRange = state.selectionStart !== state.selectionEnd;
  // A selection of whole lines keeps covering them; a caret at a line's start moves past a new prefix ("- |").
  const selectionStart =
    isRange && state.selectionStart === start
      ? start
      : Math.max(start, state.selectionStart + firstDelta);
  const selectionEnd = isRange
    ? Math.max(selectionStart, state.selectionEnd + totalDelta)
    : selectionStart;
  return { value, selectionStart, selectionEnd };
}

/** Whether the line at `lineStart` sits inside a fenced code block (an odd number of fences above it). */
function isInsideFence(value: string, lineStart: number): boolean {
  let fences = 0;
  for (const line of value.slice(0, lineStart).split('\n')) {
    if (/^\s{0,3}(```|~~~)/.test(line)) {
      fences += 1;
    }
  }
  return fences % 2 === 1;
}

// --- Lists -------------------------------------------------------------------------------------------------------

/** A list item's prefix: indent, marker (`-`, `*`, `+`, `1.` or `1)`), the space after it, and a task box. */
const listItemPattern = /^([ \t]*)([-*+]|(\d{1,9})([.)]))([ \t]+)(\[[ xX]\](?:[ \t]+|$))?/;

type ListType = 'bullet' | 'number' | 'task';

interface ListItem {
  indent: string;
  marker: string;
  /** The number of a numbered item. */
  number?: number;
  delimiter?: string;
  spacing: string;
  isTask: boolean;
  /** Where the item's text starts in its line. */
  contentOffset: number;
}

function parseListItem(line: string): ListItem | null {
  const match = listItemPattern.exec(line);
  if (!match) {
    return null;
  }
  const [prefix, indent = '', marker = '', number, delimiter, spacing = '', task] = match;
  return {
    indent,
    marker,
    number: number === undefined ? undefined : Number(number),
    delimiter,
    spacing,
    isTask: task !== undefined,
    contentOffset: prefix.length,
  };
}

function listTypeOf(item: ListItem): ListType {
  if (item.isTask) {
    return 'task';
  }
  return item.number === undefined ? 'bullet' : 'number';
}

/** Whether the caret's line is a list item (outside fenced code). */
export function isInListItem(state: EditState): boolean {
  const start = lineStartAt(state.value, state.selectionStart);
  const line = state.value.slice(start, lineEndAt(state.value, state.selectionStart));
  return parseListItem(line) !== null && !isInsideFence(state.value, start);
}

/** Whether Tab indents (the caret is in a list item, or the selection spans lines) instead of moving focus. */
export function capturesTab(state: EditState): boolean {
  const selected = state.value.slice(state.selectionStart, state.selectionEnd);
  return selected.includes('\n') || isInListItem(state);
}

/**
 * Enter in a list item: continues the list on a new line (the same bullet, the next number, an empty task box), or,
 * on an empty item, ends the list by clearing its marker. Null when Enter should just insert a line break.
 */
export function continueList(state: EditState): EditState | null {
  const { value, selectionStart, selectionEnd } = state;
  if (selectionStart !== selectionEnd) {
    return null;
  }
  const start = lineStartAt(value, selectionStart);
  const end = lineEndAt(value, selectionStart);
  const line = value.slice(start, end);
  const item = parseListItem(line);
  if (!item || selectionStart - start < item.contentOffset || isInsideFence(value, start)) {
    return null;
  }
  if (line.slice(item.contentOffset).trim() === '') {
    // An empty item ends the list: its marker goes, and the caret moves on past a blank line, so what's typed next
    // starts a new paragraph instead of continuing the last item.
    return {
      value: `${value.slice(0, start)}\n${value.slice(end)}`,
      selectionStart: start + 1,
      selectionEnd: start + 1,
    };
  }
  const marker =
    item.number === undefined ? item.marker : `${String(item.number + 1)}${item.delimiter ?? '.'}`;
  const insert = `\n${item.indent}${marker}${item.spacing}${item.isTask ? '[ ] ' : ''}`;
  const caret = selectionStart + insert.length;
  return {
    value: value.slice(0, selectionStart) + insert + value.slice(selectionStart),
    selectionStart: caret,
    selectionEnd: caret,
  };
}

/** How far Tab indents the line at `lineStart`: under the previous sibling item's text, or two spaces. */
function indentWidth(value: string, lineStart: number, item: ListItem | null): number {
  if (!item) {
    return 2;
  }
  const above = value
    .slice(0, Math.max(0, lineStart - 1))
    .split('\n')
    .reverse();
  for (const line of above) {
    const sibling = parseListItem(line);
    if (!sibling) {
      if (line.trim() === '' || /^\s/.test(line)) {
        continue;
      }
      break;
    }
    if (sibling.indent.length === item.indent.length) {
      return sibling.contentOffset - sibling.indent.length;
    }
    if (sibling.indent.length < item.indent.length) {
      break;
    }
  }
  return 2;
}

/** How far Shift+Tab outdents: back to the parent item's indent, or two spaces. */
function outdentWidth(value: string, lineStart: number, item: ListItem | null): number {
  if (!item) {
    return 2;
  }
  const above = value
    .slice(0, Math.max(0, lineStart - 1))
    .split('\n')
    .reverse();
  for (const line of above) {
    const parent = parseListItem(line);
    if (parent && parent.indent.length < item.indent.length) {
      return item.indent.length - parent.indent.length;
    }
  }
  return item.indent.length;
}

/** Removes up to `width` columns of leading spaces (a leading tab counts as all of them). */
function removeIndent(line: string, width: number): string {
  if (line.startsWith('\t')) {
    return line.slice(1);
  }
  const spaces = /^ */.exec(line)?.[0].length ?? 0;
  return line.slice(Math.min(spaces, width));
}

/** Tab (`direction` 1) or Shift+Tab (-1) on the selected lines: indents or outdents them, list items by one level. */
export function indentLines(state: EditState, direction: 1 | -1): EditState {
  const { start, lines } = selectedLines(state);
  const item = parseListItem(lines[0] ?? '');
  if (direction === 1) {
    const pad = ' '.repeat(indentWidth(state.value, start, item));
    return transformLines(state, (all) => all.map((line) => (line === '' ? line : pad + line)));
  }
  const width = outdentWidth(state.value, start, item);
  return transformLines(state, (all) => all.map((line) => removeIndent(line, width)));
}

/** Turns the selected lines into a list of `type`, or back into plain lines when they already are one. */
function toggleList(state: EditState, type: ListType): EditState {
  return transformLines(state, (lines) => {
    const items = lines.map(parseListItem);
    const isAlready =
      lines.some((line) => line.trim() !== '') &&
      lines.every(
        (line, index) =>
          line.trim() === '' || (items[index] != null && listTypeOf(items[index]) === type),
      );
    let number = 0;
    return lines.map((line, index) => {
      const item = items[index] ?? null;
      const indent = item?.indent ?? /^[ \t]*/.exec(line)?.[0] ?? '';
      const text = item ? line.slice(item.contentOffset) : line.slice(indent.length);
      if (isAlready) {
        return indent + text;
      }
      if (line.trim() === '' && lines.length > 1) {
        return line;
      }
      number += 1;
      const marker = { bullet: '- ', number: `${String(number)}. `, task: '- [ ] ' }[type];
      return indent + marker + text;
    });
  });
}

// --- Blocks and inline syntax --------------------------------------------------------------------------------------

/** Cycles the selected lines through `#`, `##`, `###` and plain text, following the first line. */
function cycleHeading(state: EditState): EditState {
  return transformLines(state, (lines) => {
    const level = /^(#{1,6})[ \t]/.exec(lines[0] ?? '')?.[1]?.length ?? 0;
    const nextLevel = level >= 3 ? 0 : level + 1;
    return lines.map((line) => {
      const text = line.replace(/^#{1,6}[ \t]+/, '');
      return nextLevel === 0 ? text : `${'#'.repeat(nextLevel)} ${text}`;
    });
  });
}

/** Quotes the selected lines (`> `), or unquotes them when they all already are. */
function toggleQuote(state: EditState): EditState {
  return transformLines(state, (lines) => {
    const isQuoted = lines.every((line) => line.trim() === '' || /^\s{0,3}>/.test(line));
    return lines.map((line) => {
      if (isQuoted) {
        return line.replace(/^(\s{0,3})> ?/, '$1');
      }
      return line === '' ? '>' : `> ${line}`;
    });
  });
}

/** Fences the selected lines as a code block, or removes the fences around them. */
function toggleCodeBlock(state: EditState): EditState {
  const { value } = state;
  const { start, end, lines } = selectedLines(state);
  const before = value.slice(lineStartAt(value, Math.max(0, start - 1)), Math.max(0, start - 1));
  const after = value.slice(end + 1, lineEndAt(value, end + 1));
  if (start > 0 && end < value.length && /^\s*```/.test(before) && /^\s*```\s*$/.test(after)) {
    const fenceStart = lineStartAt(value, start - 1);
    const fenceEnd = lineEndAt(value, end + 1);
    const block = lines.join('\n');
    return {
      value: value.slice(0, fenceStart) + block + value.slice(fenceEnd),
      selectionStart: fenceStart,
      selectionEnd: fenceStart + block.length,
    };
  }
  const block = lines.join('\n');
  const inserted = `\`\`\`\n${block}\n\`\`\``;
  const contentStart = start + 4;
  return {
    value: value.slice(0, start) + inserted + value.slice(end),
    selectionStart: contentStart,
    selectionEnd: contentStart + block.length,
  };
}

/**
 * Wraps the selection in `marker` (`**`, `_` or a backtick), or unwraps it when the markers are already just inside
 * or just outside it. Spaces at the selection's edges stay outside the markers, so `**word** ` isn't `**word **`.
 */
function toggleWrap(state: EditState, marker: string): EditState {
  const { value, selectionStart: start, selectionEnd: end } = state;
  const size = marker.length;
  if (value.slice(start - size, start) === marker && value.slice(end, end + size) === marker) {
    return {
      value: value.slice(0, start - size) + value.slice(start, end) + value.slice(end + size),
      selectionStart: start - size,
      selectionEnd: end - size,
    };
  }
  const selected = value.slice(start, end);
  if (selected.length >= 2 * size && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(size, -size);
    return {
      value: value.slice(0, start) + inner + value.slice(end),
      selectionStart: start,
      selectionEnd: start + inner.length,
    };
  }
  const lead = /^\s*/.exec(selected)?.[0].length ?? 0;
  const trail = selected.length === lead ? 0 : (/\s*$/.exec(selected)?.[0].length ?? 0);
  const innerStart = start + lead;
  const innerEnd = end - trail;
  return {
    value:
      value.slice(0, innerStart) +
      marker +
      value.slice(innerStart, innerEnd) +
      marker +
      value.slice(innerEnd),
    selectionStart: innerStart + size,
    selectionEnd: innerEnd + size,
  };
}

const urlPattern = /^(https?:\/\/|mailto:|\/)\S*$/i;

/**
 * A link (`[text](url)`) or image (`![alt](url)`) around the selection. The address placeholder is selected so typing
 * replaces it; a selected URL becomes the address, with the caret in the brackets.
 */
function insertLink(state: EditState, isImage: boolean, urlPlaceholder: string): EditState {
  const { value, selectionStart: start, selectionEnd: end } = state;
  const selected = value.slice(start, end);
  const bang = isImage ? '!' : '';
  if (selected !== '' && urlPattern.test(selected)) {
    const caret = start + bang.length + 1;
    return {
      value: `${value.slice(0, start)}${bang}[](${selected})${value.slice(end)}`,
      selectionStart: caret,
      selectionEnd: caret,
    };
  }
  const text = `${bang}[${selected}](${urlPlaceholder})`;
  const urlStart = start + bang.length + selected.length + 3;
  return {
    value: value.slice(0, start) + text + value.slice(end),
    selectionStart: selected === '' ? start + bang.length + 1 : urlStart,
    selectionEnd: selected === '' ? start + bang.length + 1 : urlStart + urlPlaceholder.length,
  };
}

/** Runs a toolbar command on the text and its selection. */
export function applyCommand(
  command: MarkdownCommand,
  state: EditState,
  options: CommandOptions,
): EditState {
  const selected = state.value.slice(state.selectionStart, state.selectionEnd);
  switch (command) {
    case 'bold':
      return toggleWrap(state, '**');
    case 'italic':
      return toggleWrap(state, '_');
    case 'code':
      // Code across lines is a code block; inline code can't hold a line break.
      return selected.includes('\n') ? toggleCodeBlock(state) : toggleWrap(state, '`');
    case 'link':
      return insertLink(state, false, options.urlPlaceholder);
    case 'image':
      return insertLink(state, true, options.urlPlaceholder);
    case 'heading':
      return cycleHeading(state);
    case 'quote':
      return toggleQuote(state);
    case 'bulletList':
      return toggleList(state, 'bullet');
    case 'numberedList':
      return toggleList(state, 'number');
    case 'taskList':
      return toggleList(state, 'task');
    case 'codeBlock':
      return toggleCodeBlock(state);
  }
}

/** Replaces the selection with `text`, leaving the caret after it. */
export function replaceSelection(state: EditState, text: string): EditState {
  const caret = state.selectionStart + text.length;
  return {
    value:
      state.value.slice(0, state.selectionStart) + text + state.value.slice(state.selectionEnd),
    selectionStart: caret,
    selectionEnd: caret,
  };
}

/** An image's Markdown, with brackets in the alt text escaped and an address with spaces or parentheses in `<>`. */
export function imageMarkdown(src: string, alt: string): string {
  const safeAlt = alt.replace(/[[\]\\]/g, (character) => `\\${character}`);
  const safeSrc = /[\s()<>]/.test(src) ? `<${src.replace(/[<>]/g, encodeURIComponent)}>` : src;
  return `![${safeAlt}](${safeSrc})`;
}

/** A file's name without its extension, as an image's default alt text. */
export function fileStem(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

// --- Shortcuts ---------------------------------------------------------------------------------------------------

/** The platform's command key (⌘ on Apple devices, Ctrl elsewhere) plus `code`, optionally with Alt or Shift. */
export type Shortcut = CommandShortcut;

/**
 * Each command's shortcut, matching RichTextEditor's: the standard keys for bold, italic, code and link, and Google
 * Docs' for lists. The heading button cycles levels, so it takes the Heading 1 key.
 */
export const commandShortcuts: Record<MarkdownCommand, Shortcut> = {
  bold: { code: 'KeyB', key: 'B' },
  italic: { code: 'KeyI', key: 'I' },
  code: { code: 'KeyE', key: 'E' },
  link: { code: 'KeyK', key: 'K' },
  heading: { code: 'Digit1', key: '1', isAlt: true },
  quote: { code: 'KeyQ', key: 'Q', isAlt: true },
  numberedList: { code: 'Digit7', key: '7', isShift: true },
  bulletList: { code: 'Digit8', key: '8', isShift: true },
  taskList: { code: 'Digit9', key: '9', isShift: true },
  codeBlock: { code: 'KeyC', key: 'C', isAlt: true },
  image: { code: 'KeyP', key: 'P', isAlt: true },
};

/** The command a key event's shortcut runs, if any. */
export function commandForKey(
  event: Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'> & {
    getModifierState?: (key: string) => boolean;
  },
  isApple: boolean,
): MarkdownCommand | null {
  for (const [name, shortcut] of Object.entries(commandShortcuts)) {
    if (matchesCommandShortcut(event, shortcut, isApple)) {
      return name as MarkdownCommand;
    }
  }
  return null;
}

// --- Writing to the textarea ---------------------------------------------------------------------------------------

/** The textarea's text and selection. */
export function readState(textarea: HTMLTextAreaElement): EditState {
  return {
    value: textarea.value,
    selectionStart: textarea.selectionStart,
    selectionEnd: textarea.selectionEnd,
  };
}

/**
 * Writes `next` into the textarea. Only the part that changed is replaced, through `document.execCommand('insertText')`
 * on the focused textarea, so the browser's undo (⌘Z / Ctrl+Z) restores it in one step. Where that isn't available,
 * or with `shouldKeepFocus` (an upload finishing while focus is elsewhere), the text is set directly; either way an
 * `input` event reaches React's `onChange`. The selection is set to `next`'s, except with `shouldKeepFocus`.
 */
export function applyToTextarea(
  textarea: HTMLTextAreaElement,
  next: EditState,
  { shouldKeepFocus = false }: { shouldKeepFocus?: boolean } = {},
): void {
  const current = textarea.value;
  if (current !== next.value) {
    let start = 0;
    const shortest = Math.min(current.length, next.value.length);
    while (start < shortest && current[start] === next.value[start]) {
      start += 1;
    }
    let oldEnd = current.length;
    let newEnd = next.value.length;
    while (oldEnd > start && newEnd > start && current[oldEnd - 1] === next.value[newEnd - 1]) {
      oldEnd -= 1;
      newEnd -= 1;
    }
    const text = next.value.slice(start, newEnd);
    let isInserted = false;
    if (!shouldKeepFocus) {
      textarea.focus();
      textarea.setSelectionRange(start, oldEnd);
      try {
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- the only way to edit a textarea with native undo
        isInserted = document.execCommand(text === '' ? 'delete' : 'insertText', false, text);
      } catch {
        isInserted = false;
      }
    }
    if (!isInserted || textarea.value !== next.value) {
      // setRangeText bypasses React's value tracking, so the input event below reaches onChange.
      textarea.setRangeText(next.value, 0, textarea.value.length);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  if (!shouldKeepFocus) {
    textarea.setSelectionRange(next.selectionStart, next.selectionEnd);
  }
}
