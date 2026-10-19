// The list of options the "/" and "@" menus show at the caret. Lexical's typeahead plugin owns the behaviour: focus
// stays in the editor, Up and Down move through the options (announced through aria-activedescendant on the
// editor), Enter or Tab chooses, Escape closes. This renders the options into the listbox element it positions.
import type { MenuOption } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { useId, useLayoutEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn';
import type { IconComponent } from '../utils/icon';

/**
 * Classes for the listbox element Lexical positions at the caret. Lexical adds it to the page before there's anything
 * to show (with an inline `display: block`), so it's hidden while empty.
 */
export const typeaheadAnchorClasses = 'z-dropdown empty:hidden!';

export interface TypeaheadItem {
  label: string;
  icon?: IconComponent;
  /** An image (a person's avatar) instead of an icon. */
  imageSrc?: string;
  /** Text at the end of the row, such as a shortcut. */
  hint?: ReactNode;
}

export interface TypeaheadMenuProps<T extends MenuOption> {
  /** The listbox element Lexical positions at the caret (its `anchorElementRef.current`). */
  anchor: HTMLElement | null;
  options: T[];
  selectedIndex: number | null;
  selectOptionAndCleanUp: (option: T) => void;
  setHighlightedIndex: (index: number) => void;
  /** How each option shows. */
  describe: (option: T) => TypeaheadItem;
  /** The listbox's accessible name. */
  label: string;
  /** Shown (and announced) in place of the options: a loading or empty state. */
  status?: string;
}

export function TypeaheadMenu<T extends MenuOption>({
  anchor,
  options,
  selectedIndex,
  selectOptionAndCleanUp,
  setHighlightedIndex,
  describe,
  label,
  status,
}: TypeaheadMenuProps<T>) {
  const labelId = useId();
  // Lexical names the listbox with an English aria-label (and may set it again); aria-labelledby takes precedence.
  useLayoutEffect(() => {
    anchor?.setAttribute('aria-labelledby', labelId);
  });

  if (anchor === null) {
    return null;
  }
  return createPortal(
    <div className="mt-1 max-h-72 w-64 max-w-[calc(100vw-1.5rem)] overflow-auto rounded-card border border-border bg-surface-2 p-1 text-sm text-fg shadow-overlay">
      {options.map((option, index) => {
        const item = describe(option);
        const Icon = item.icon;
        const isSelected = index === selectedIndex;
        return (
          // Keyboard use goes through the editor (it keeps focus); pointer and touch choose here.
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <div
            key={option.key}
            ref={(element) => {
              option.setRefElement(element);
            }}
            id={`typeahead-item-${index}`}
            role="option"
            tabIndex={-1}
            aria-selected={isSelected}
            onMouseDown={(event) => {
              // Keep the caret (and the on-screen keyboard) in the editor.
              event.preventDefault();
            }}
            onMouseEnter={() => {
              setHighlightedIndex(index);
            }}
            onClick={() => {
              setHighlightedIndex(index);
              selectOptionAndCleanUp(option);
            }}
            className={cn(
              'flex min-h-hit cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 select-none',
              isSelected && 'bg-surface-3',
            )}
          >
            {item.imageSrc !== undefined ? (
              <img
                src={item.imageSrc}
                alt=""
                className="size-6 shrink-0 rounded-full object-cover"
              />
            ) : (
              Icon && <Icon aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
            )}
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.hint !== undefined && (
              <span className="shrink-0 text-xs text-fg-muted">{item.hint}</span>
            )}
          </div>
        );
      })}
      <span id={labelId} hidden>
        {label}
      </span>
      {status !== undefined && (
        <div
          role="option"
          aria-disabled="true"
          aria-selected={false}
          className="px-2 py-1.5 text-fg-muted"
        >
          {status}
        </div>
      )}
    </div>,
    anchor,
  );
}
