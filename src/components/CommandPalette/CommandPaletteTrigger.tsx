import { Search } from 'lucide-react';
import { useMemo, type Ref } from 'react';
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { disabledClasses } from '../../utils/stateClasses';
import { Kbd } from '../Kbd/Kbd';
import { defaultCommandPaletteMessages } from './messages';
import { ariaKeyShortcut, isApplePlatform, parseShortcut, shortcutKeys } from './shortcut';

export interface CommandPaletteTriggerProps extends Omit<
  AriaButtonProps,
  'className' | 'style' | 'children' | 'render'
> {
  /** The palette's shortcut, shown in `Kbd` keys. Defaults to `mod+k`; `null` shows none. */
  shortcut?: string | null;
  /** The visible label. Defaults to "Search". */
  label?: string;
  /** Shows only the icon (the label stays as the button's name), for tight headers. Phones always do. */
  isIconOnly?: boolean;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * The button that opens a CommandPalette, for a shell `Header`'s actions: a search icon, a label and the shortcut in
 * `Kbd` keys (on devices with a fine pointer). On phones it's icon-only, so touch users have a way in. Wire it to
 * the palette's `isOpen`: `onPress={() => setPaletteOpen(true)}`.
 */
export function CommandPaletteTrigger({
  shortcut = 'mod+k',
  label,
  isIconOnly = false,
  className,
  ...rest
}: CommandPaletteTriggerProps) {
  const messages = useEntryMessages(defaultCommandPaletteMessages);
  const parsed = useMemo(() => (shortcut === null ? null : parseShortcut(shortcut)), [shortcut]);
  const isApple = isApplePlatform();
  const text = label ?? messages.commandPaletteTrigger;
  return (
    <AriaButton
      {...rest}
      // React Aria drops aria-keyshortcuts, so add it to the button element directly.
      render={(domProps) => (
        <button
          {...domProps}
          aria-keyshortcuts={parsed ? ariaKeyShortcut(parsed, isApple) : undefined}
        />
      )}
      className={cn(
        'hit-area inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-control border border-border bg-surface-1 text-sm text-fg-muted select-none',
        'transition-colors duration-fast data-hovered:border-border-strong data-hovered:text-fg data-pressed:bg-surface-3',
        'data-focus-visible:focus-ring',
        disabledClasses,
        isIconOnly
          ? 'w-9 justify-center'
          : 'w-9 justify-center sm:w-auto sm:min-w-48 sm:justify-start sm:ps-2.5 sm:pe-1.5',
        className,
      )}
    >
      <Search aria-hidden="true" className="size-4 shrink-0" />
      <span
        className={cn(isIconOnly ? 'sr-only' : 'sr-only sm:not-sr-only sm:flex-1 sm:text-start')}
      >
        {text}
      </span>
      {parsed && !isIconOnly && (
        <span aria-hidden="true" className="hidden shrink-0 gap-0.5 sm:flex pointer-coarse:hidden">
          {shortcutKeys(parsed, isApple).map((key) => (
            <Kbd key={key}>{key}</Kbd>
          ))}
        </span>
      )}
    </AriaButton>
  );
}
