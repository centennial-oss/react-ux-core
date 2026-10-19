// Keyboard helpers: the platform's command key, command-key shortcuts matched by physical key, and whether a key
// press belongs to a text field rather than to a shortcut.

/** Whether this is an Apple device, where the command key is ⌘ rather than Ctrl. */
export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
}

/** A shortcut of the platform's command key (⌘ on Apple devices, Ctrl elsewhere) plus `code`. */
export interface CommandShortcut {
  /** `KeyboardEvent.code`, so the shortcut works whatever character the layout types with Alt or Option. */
  code: string;
  /** The key's name in hints. */
  key: string;
  isAlt?: boolean;
  isShift?: boolean;
}

/** The names of the modifier keys off Apple devices, from the component's messages. */
export interface ModifierKeyNames {
  ctrl: string;
  alt: string;
  shift: string;
}

type ShortcutEvent = Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'> & {
  getModifierState?: (key: string) => boolean;
};

/** Whether a key event is the command shortcut, with exactly its modifiers. */
export function matchesCommandShortcut(
  event: ShortcutEvent,
  shortcut: CommandShortcut,
  isApple: boolean,
): boolean {
  const command = isApple ? event.metaKey : event.ctrlKey;
  const other = isApple ? event.ctrlKey : event.metaKey;
  return (
    command &&
    !other &&
    // AltGr reports as Ctrl+Alt on Windows; it types characters ("@" is AltGr+Q on German keyboards), not shortcuts.
    event.getModifierState?.('AltGraph') !== true &&
    event.altKey === (shortcut.isAlt === true) &&
    event.shiftKey === (shortcut.isShift === true) &&
    event.code === shortcut.code
  );
}

/** The shortcut in `aria-keyshortcuts` form, such as "Meta+Shift+X" or "Control+Alt+1". */
export function commandShortcutAria(shortcut: CommandShortcut, isApple: boolean): string {
  return [
    isApple ? 'Meta' : 'Control',
    ...(shortcut.isAlt === true ? ['Alt'] : []),
    ...(shortcut.isShift === true ? ['Shift'] : []),
    shortcut.key,
  ].join('+');
}

/** A shortcut's keys for display, one per `Kbd`: `['⌘', '⇧', 'X']` on Apple devices, `['Ctrl', 'Shift', 'X']` else. */
export function commandShortcutKeys(
  shortcut: CommandShortcut,
  isApple: boolean,
  names: ModifierKeyNames,
): string[] {
  return [
    isApple ? '⌘' : names.ctrl,
    ...(shortcut.isAlt === true ? [isApple ? '⌥' : names.alt] : []),
    ...(shortcut.isShift === true ? [isApple ? '⇧' : names.shift] : []),
    shortcut.key,
  ];
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
 * Whether the element is a form control of any kind or editable text, so a surface's own keys (arrows, Delete,
 * Space) should leave it alone. Broader than `isEditableTarget`: checkbox, range and button inputs count too.
 */
export function isFormControlTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}
