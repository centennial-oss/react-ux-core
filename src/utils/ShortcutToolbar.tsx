// The buttons of a formatting toolbar shared by the RichTextEditor and MarkdownEditor: icon buttons whose tooltip shows
// the label and the shortcut's keys and whose `aria-keyshortcuts` names it. They go in a Toolbar, grouped with
// `renderToolbarGroups` (components/Toolbar/toolbarGroups).
import type { ReactNode } from 'react';
import type { PressEvent } from 'react-aria-components';
import { IconButton } from '../components/IconButton/IconButton';
import { Kbd } from '../components/Kbd/Kbd';
import { Tooltip } from '../components/Tooltip/Tooltip';
import type { IconComponent } from './icon';
import {
  commandShortcutAria,
  commandShortcutKeys,
  type CommandShortcut,
  type ModifierKeyNames,
} from './keyboard';

export interface ShortcutTooltipProps {
  label: string;
  /** The keys after the label, one `Kbd` each; null for none. */
  keys: readonly string[] | null;
  /** The trigger. */
  children: ReactNode;
}

/** A tooltip showing a control's label followed by its shortcut's keys. */
export function ShortcutTooltip({ label, keys, children }: ShortcutTooltipProps) {
  return (
    <Tooltip
      content={
        <span className="inline-flex items-center gap-2">
          {label}
          {keys !== null && (
            <span className="inline-flex gap-0.5">
              {keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </span>
          )}
        </span>
      }
    >
      {children}
    </Tooltip>
  );
}

export interface ShortcutButtonProps {
  icon: IconComponent;
  label: string;
  /** The command shortcut, in the tooltip and `aria-keyshortcuts`. Null for none. */
  shortcut: CommandShortcut | null;
  /** The keys the tooltip shows when there's no `shortcut`, such as a trigger character. */
  keys?: readonly string[];
  isApple: boolean;
  /** The modifier keys' names off Apple devices. */
  keyNames: ModifierKeyNames;
  isDisabled: boolean;
  /** Makes it a toggle button showing whether it's applied. */
  isSelected?: boolean;
  onPress?: (event: PressEvent) => void;
  /** Receives the button element. */
  buttonRef?: (element: HTMLButtonElement | null) => void;
  /** Wraps the button inside its tooltip, such as in a `FileTrigger`. */
  wrap?: (button: ReactNode) => ReactNode;
}

/**
 * A small toolbar icon button with its shortcut in a tooltip and `aria-keyshortcuts`. A mouse or touch press leaves
 * focus (and the selection) in the text being edited.
 */
export function ShortcutButton({
  icon,
  label,
  shortcut,
  keys,
  isApple,
  keyNames,
  isDisabled,
  isSelected,
  onPress,
  buttonRef,
  wrap,
}: ShortcutButtonProps) {
  const common = {
    icon,
    'aria-label': label,
    size: 'sm' as const,
    isDisabled,
    preventFocusOnPress: true,
    onPress,
    // React Aria's Button drops aria-keyshortcuts from its props, so it's set on the element directly.
    ref: (element: HTMLButtonElement | null) => {
      buttonRef?.(element);
      if (shortcut !== null) {
        element?.setAttribute('aria-keyshortcuts', commandShortcutAria(shortcut, isApple));
      }
    },
  };
  const button =
    isSelected === undefined ? (
      <IconButton {...common} />
    ) : (
      <IconButton {...common} isSelected={isSelected} />
    );
  return (
    <ShortcutTooltip
      label={label}
      keys={shortcut === null ? (keys ?? null) : commandShortcutKeys(shortcut, isApple, keyNames)}
    >
      {wrap ? wrap(button) : button}
    </ShortcutTooltip>
  );
}
