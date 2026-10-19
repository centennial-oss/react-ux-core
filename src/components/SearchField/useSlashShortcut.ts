import { useEffect, type RefObject } from 'react';
import { isEditableTarget } from '../../utils/keyboard';

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
        isEditableTarget(event.target)
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
