import { useEffect, type RefObject } from 'react';

// Input types that take typed text. In these "/" is a character, so the shortcut leaves them alone; other inputs
// (checkboxes, sliders, buttons) don't take text, so "/" there still jumps to search.
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

function isEditable(target: EventTarget | null): boolean {
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
 * Focuses `inputRef`'s element when "/" is pressed anywhere on the page, unless focus is already in something
 * editable, Ctrl, Alt or Meta is held (Shift isn't checked: some layouts need it to type "/"), the key is part of an
 * IME composition, or another handler already used the key. Hidden or inert fields (for example behind a modal
 * dialog) are skipped.
 */
export function useSlashShortcut(
  inputRef: RefObject<HTMLInputElement | null>,
  isEnabled: boolean,
): void {
  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== '/' ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.isComposing ||
        isEditable(event.target)
      ) {
        return;
      }
      const input = inputRef.current;
      if (!input || input.disabled || input.closest('[inert], [aria-hidden="true"]')) {
        return;
      }
      event.preventDefault();
      input.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [inputRef, isEnabled]);
}
