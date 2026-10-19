// The keys that end an in-place edit: a value shown as text that switches to a field and back. InlineEdit uses this;
// EditableTable's cells follow the same rules.

/** What a key press in an in-place editor asks for: keep the edit (`commit`) or throw it away (`cancel`). */
export type EditKeyAction = 'commit' | 'cancel';

type EditKeyEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'isComposing' | 'target'>;

/**
 * The edit a key press ends, if any:
 * - Escape cancels, unless it's closing an open list first (the target has `aria-expanded="true"`).
 * - Enter in a single-line input commits, but not while an input method is composing or a list is open. In a text
 *   area, where Enter adds a line, Ctrl+Enter or ⌘+Enter commits.
 * - F2 commits from anywhere, as in a spreadsheet.
 */
export function editKeyAction(event: EditKeyEvent): EditKeyAction | undefined {
  const { target } = event;
  const isExpanded = target instanceof Element && target.getAttribute('aria-expanded') === 'true';
  if (event.key === 'Escape') {
    return isExpanded ? undefined : 'cancel';
  }
  if (event.key === 'F2') {
    return 'commit';
  }
  if (event.key !== 'Enter' || event.isComposing || isExpanded) {
    return undefined;
  }
  if (target instanceof HTMLInputElement) {
    return 'commit';
  }
  return target instanceof HTMLTextAreaElement && (event.ctrlKey || event.metaKey)
    ? 'commit'
    : undefined;
}
