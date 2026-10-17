// Keyboard shortcuts written as strings such as "mod+k" (⌘K on Apple devices, Ctrl+K elsewhere), "ctrl+shift+p"
// or "/": parsing, matching key events, and showing them.

import { useEffect, useRef } from 'react';

export interface Shortcut {
  /** The key, lower-cased ("k", "/", "enter"). */
  key: string;
  /** ⌘ on Apple devices, Ctrl elsewhere. */
  hasMod: boolean;
  hasCtrl: boolean;
  hasMeta: boolean;
  hasAlt: boolean;
  hasShift: boolean;
}

/** Parses "mod+k", "ctrl+alt+p", "shift+?" or "/" (case doesn't matter). Returns null for an empty string. */
export function parseShortcut(shortcut: string): Shortcut | null {
  const parts = shortcut
    .toLowerCase()
    .split('+')
    .map((part) => part.trim());
  // "mod++" means the plus key.
  const key = shortcut.endsWith('++') ? '+' : (parts.at(-1) ?? '');
  if (key === '') {
    return null;
  }
  const modifiers = new Set(parts.slice(0, -1));
  return {
    key,
    hasMod: modifiers.has('mod'),
    hasCtrl: modifiers.has('ctrl') || modifiers.has('control'),
    hasMeta: modifiers.has('meta') || modifiers.has('cmd') || modifiers.has('command'),
    hasAlt: modifiers.has('alt') || modifiers.has('option'),
    hasShift: modifiers.has('shift'),
  };
}

/** Whether this is an Apple device, where "mod" means ⌘. */
export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
}

/** Whether the shortcut uses Ctrl or ⌘ (so it can't be typed text and may run from inside a text field). */
export function hasCommandModifier(shortcut: Shortcut): boolean {
  return shortcut.hasMod || shortcut.hasCtrl || shortcut.hasMeta;
}

/** Whether a key event is the shortcut, with exactly its modifiers. */
export function matchesShortcut(
  event: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>,
  shortcut: Shortcut,
  isApple: boolean,
): boolean {
  const wantsCtrl = shortcut.hasCtrl || (shortcut.hasMod && !isApple);
  const wantsMeta = shortcut.hasMeta || (shortcut.hasMod && isApple);
  if (
    event.ctrlKey !== wantsCtrl ||
    event.metaKey !== wantsMeta ||
    event.altKey !== shortcut.hasAlt ||
    // Shift is only checked when asked for or on letters: some layouts need it to type "/" or "?".
    (event.shiftKey !== shortcut.hasShift && (shortcut.hasShift || /^[a-z]$/.test(shortcut.key)))
  ) {
    return false;
  }
  const key = event.key.toLowerCase();
  if (key === shortcut.key) {
    return true;
  }
  // With Alt (Option) held, Apple layouts change the key ("π" for P); the physical key still matches.
  if (/^[a-z]$/.test(shortcut.key)) {
    return event.code === `Key${shortcut.key.toUpperCase()}`;
  }
  return /^\d$/.test(shortcut.key) && event.code === `Digit${shortcut.key}`;
}

const keyLabels: Record<string, { apple: string; other: string }> = {
  enter: { apple: '↵', other: 'Enter' },
  escape: { apple: 'Esc', other: 'Esc' },
  arrowup: { apple: '↑', other: '↑' },
  arrowdown: { apple: '↓', other: '↓' },
  space: { apple: 'Space', other: 'Space' },
};

/** The keys to show for a shortcut, in order: `['⌘', 'K']` on Apple devices, `['Ctrl', 'K']` elsewhere. */
export function shortcutKeys(shortcut: Shortcut, isApple: boolean): string[] {
  const keys: string[] = [];
  if (shortcut.hasCtrl || (shortcut.hasMod && !isApple)) {
    keys.push(isApple ? '⌃' : 'Ctrl');
  }
  if (shortcut.hasAlt) {
    keys.push(isApple ? '⌥' : 'Alt');
  }
  if (shortcut.hasShift) {
    keys.push(isApple ? '⇧' : 'Shift');
  }
  if (shortcut.hasMeta || (shortcut.hasMod && isApple)) {
    keys.push(isApple ? '⌘' : 'Meta');
  }
  const label = keyLabels[shortcut.key];
  keys.push(label ? label[isApple ? 'apple' : 'other'] : shortcut.key.toUpperCase());
  return keys;
}

/** The shortcut in `aria-keyshortcuts` form, such as "Meta+K" or "Control+K". */
export function ariaKeyShortcut(shortcut: Shortcut, isApple: boolean): string {
  const parts: string[] = [];
  if (shortcut.hasCtrl || (shortcut.hasMod && !isApple)) {
    parts.push('Control');
  }
  if (shortcut.hasAlt) {
    parts.push('Alt');
  }
  if (shortcut.hasShift) {
    parts.push('Shift');
  }
  if (shortcut.hasMeta || (shortcut.hasMod && isApple)) {
    parts.push('Meta');
  }
  parts.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key);
  return parts.join('+');
}

// Input types that take typed text; elsewhere a plain key ("/") is free to be a shortcut.
const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'email',
  'url',
  'tel',
  'password',
  'number',
  'date',
  'datetime-local',
  'month',
  'week',
  'time',
]);

/** Whether typing in this element would produce text (so a plain-key shortcut should leave it alone). */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  if (target instanceof HTMLInputElement) {
    return TEXT_INPUT_TYPES.has(target.type);
  }
  return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

/**
 * Calls `onTrigger` when the shortcut is pressed anywhere on the page. A shortcut without Ctrl or ⌘ is ignored
 * while typing in a text field; any shortcut is ignored during IME composition or once another handler used the
 * key. `null` turns it off.
 */
export function useGlobalShortcut(shortcut: string | null, onTrigger: () => void): void {
  const onTriggerRef = useRef(onTrigger);
  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);
  useEffect(() => {
    const parsed = shortcut === null ? null : parseShortcut(shortcut);
    if (!parsed) {
      return;
    }
    const isApple = isApplePlatform();
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        !matchesShortcut(event, parsed, isApple) ||
        (!hasCommandModifier(parsed) && isEditableTarget(event.target))
      ) {
        return;
      }
      event.preventDefault();
      onTriggerRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [shortcut]);
}
