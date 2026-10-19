// Menubar: a desktop-app menu bar (File, Edit, View…) on the WAI-ARIA APG menubar pattern. React Aria has no menubar,
// so the bar's keyboard model is here: one Tab stop, Left and Right between the menus' names (and from an open menu to
// its neighbour), Home, End and typeahead. Each menu is the library's Menu in a MenuTrigger, non-modal so the bar stays
// usable while one is open: hovering another name switches to its menu. On phones the bar is one menu button, with
// each menu as a submenu.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { Pressable, useLocale, type Key } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { modifierKeyStrings } from '../../provider/coreStrings';
import { cn } from '../../utils/cn';
import { runsBy } from '../../utils/collections';
import { isRightToLeft } from '../../utils/direction';
import type { IconComponent } from '../../utils/icon';
import { commandShortcutKeys, isApplePlatform, type CommandShortcut } from '../../utils/keyboard';
import { mergeRefs } from '../../utils/mergeRefs';
import { createTypeahead, isTypeaheadKey } from '../../utils/typeahead';
import type { AccessibleNameProps } from '../../utils/types';
import { useIsPhone } from '../../utils/useMediaQuery';
import { useRovingKey } from '../../utils/useRovingKey';
import { sizeClasses, type ButtonSize } from '../Button/Button.styles';
import {
  Menu,
  MenuItem,
  MenuSection,
  MenuSeparator,
  MenuTrigger,
  SubmenuTrigger,
} from '../Menu/Menu';
import { OverflowMenu } from '../Menu/MenuButtons';

/** An item in a Menubar menu: an action, a checkable item (with `isSelected`) or a submenu (with `items`). */
export interface MenubarItem {
  type?: 'item';
  /** Unique within its menu and that menu's submenus; the menubar's `onAction` receives it. */
  id: string;
  /** The item's text; typeahead matches it. */
  label: string;
  icon?: IconComponent;
  /** Secondary text under the label. */
  description?: ReactNode;
  /**
   * The item's keyboard shortcut, as a hint: a command shortcut, shown in the platform's keys ("⌘⇧S" on Apple
   * devices, "Ctrl+Shift+S" elsewhere), or text shown as written, such as "F11". The app handles the shortcut.
   */
  shortcut?: CommandShortcut | string;
  isDisabled?: boolean;
  /** `danger` for destructive actions. */
  tone?: 'neutral' | 'danger';
  /**
   * Makes the item checkable, showing this state: a checkbox item, or a radio item in a section whose
   * `selectionMode` is `single`. Choosing it calls `onAction`; the app flips the state.
   */
  isSelected?: boolean;
  /** Called when the item is chosen, before the menubar's `onAction`. */
  onAction?: () => void;
  /** Makes the item open a submenu of these entries. */
  items?: readonly MenubarEntry[];
}

/** A group of items in a Menubar menu, optionally with a heading and its own selection (checkbox or radio items). */
export interface MenubarSection {
  type: 'section';
  id: string;
  /** A visible heading. Without one, give the section an `aria-label`. */
  title?: ReactNode;
  'aria-label'?: string;
  /**
   * `single` makes the items radio items and `multiple` checkboxes, each showing its `isSelected`. Defaults to
   * `multiple` when an item has `isSelected`.
   */
  selectionMode?: 'single' | 'multiple';
  items: readonly MenubarItem[];
}

/** A divider between groups of items in a Menubar menu. */
export interface MenubarSeparator {
  type: 'separator';
  /** A key for React, for separators that come and go. */
  id?: string;
}

/** An entry in a Menubar menu. */
export type MenubarEntry = MenubarItem | MenubarSection | MenubarSeparator;

/** A menu of a Menubar: its name in the bar, and its entries. */
export interface MenubarMenu {
  /** Unique within the menubar. */
  id: string;
  /** The menu's name in the bar; typeahead in the bar matches it. */
  label: string;
  items: readonly MenubarEntry[];
  /** Dims the menu's name; it can still be focused, but its menu doesn't open. */
  isDisabled?: boolean;
}

interface MenubarBaseProps {
  /** The menus, in order. */
  items: readonly MenubarMenu[];
  /** Called with an item's `id` when it's chosen, in any menu or submenu. */
  onAction?: (key: Key) => void;
  /** The size of the menus' names in the bar, and of the menu button on phones. Defaults to `sm`. */
  size?: ButtonSize;
  /** Classes for the root element. */
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Name the menubar with `aria-label` (which also names its menu button on phones; otherwise that's the `moreActions`
 * message) or `aria-labelledby`.
 */
export type MenubarProps = MenubarBaseProps & AccessibleNameProps;

/** Where focus goes in a menu the menubar opens itself: its first item, or the menu (`true`). */
type AutoFocus = 'first' | true;

/** The open menu. `autoFocus` is set when the menubar opened it, and left to its trigger otherwise. */
interface OpenMenu {
  id: string;
  /** New for every opening, so each gets its own popover (see BarMenu). */
  serial: number;
  autoFocus?: AutoFocus;
}

/** What the entries of every menu and submenu need. */
interface EntryContextValue {
  onAction: ((key: Key) => void) | undefined;
  isNonModal: boolean;
  shortcutText: (shortcut: CommandShortcut | string) => string;
}

const EntryContext = createContext<EntryContextValue>({
  onAction: undefined,
  isNonModal: false,
  shortcutText: (shortcut) => (typeof shortcut === 'string' ? shortcut : shortcut.key),
});

/** Marks a top-level menu (`data-menubar-menu`), so arrow keys can tell it from its submenus. */
const TOP_MENU_ATTRIBUTE = 'data-menubar-menu';
/** The popovers of menus and submenus: presses inside them aren't presses outside the open menu. */
const MENU_POPOVERS = '[data-trigger="MenuTrigger"], [data-trigger="SubmenuTrigger"]';

const nameClasses = [
  'hit-area inline-flex shrink-0 cursor-default items-center rounded-control whitespace-nowrap text-fg outline-none select-none',
  'not-aria-disabled:hover:bg-surface-3 aria-expanded:bg-surface-3 focus-visible:focus-ring',
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
].join(' ');

const labelOf = (menu: MenubarMenu) => menu.label;

const isToggle = (entry: MenubarEntry): entry is MenubarItem =>
  entry.type !== 'section' && entry.type !== 'separator' && entry.isSelected !== undefined;

function selectedIds(items: readonly MenubarItem[]): string[] {
  const ids: string[] = [];
  for (const item of items) {
    if (item.isSelected === true) {
      ids.push(item.id);
    }
  }
  return ids;
}

function renderItem(item: MenubarItem, context: EntryContextValue): ReactNode {
  const menuItem = (
    <MenuItem
      key={item.id}
      id={item.id}
      icon={item.icon}
      description={item.description}
      shortcut={item.shortcut === undefined ? undefined : context.shortcutText(item.shortcut)}
      tone={item.tone}
      isDisabled={item.isDisabled}
      onAction={item.onAction}
      textValue={item.label}
    >
      {item.label}
    </MenuItem>
  );
  if (item.items === undefined) {
    return menuItem;
  }
  return (
    <SubmenuTrigger key={item.id}>
      {menuItem}
      <Menu isNonModal={context.isNonModal} onAction={context.onAction}>
        <MenubarEntries entries={item.items} label={item.label} />
      </Menu>
    </SubmenuTrigger>
  );
}

function renderSection(section: MenubarSection, context: EntryContextValue): ReactNode {
  const selectionMode =
    section.selectionMode ??
    (section.items.some((item) => item.isSelected !== undefined) ? 'multiple' : undefined);
  return (
    <MenuSection
      key={section.id}
      id={section.id}
      title={section.title}
      aria-label={section['aria-label']}
      {...(selectionMode === undefined
        ? {}
        : { selectionMode, selectedKeys: selectedIds(section.items) })}
    >
      {section.items.map((item) => renderItem(item, context))}
    </MenuSection>
  );
}

/**
 * A menu's entries as Menu items, sections, separators and submenus. It renders only while its menu is open. Checkable
 * items outside a section are grouped, run by run, into checkbox sections named by the menu.
 */
function MenubarEntries({ entries, label }: { entries: readonly MenubarEntry[]; label: string }) {
  const context = useContext(EntryContext);
  return runsBy(entries, isToggle).flatMap((run, runIndex) => {
    const toggles = run.filter(isToggle);
    const [first] = toggles;
    if (first !== undefined) {
      return (
        <MenuSection
          key={`toggles-${first.id}`}
          aria-label={label}
          selectionMode="multiple"
          selectedKeys={selectedIds(toggles)}
        >
          {toggles.map((item) => renderItem(item, context))}
        </MenuSection>
      );
    }
    return run.map((entry, index) => {
      if (entry.type === 'separator') {
        return <MenuSeparator key={entry.id ?? `separator-${runIndex}-${index}`} />;
      }
      return entry.type === 'section' ? renderSection(entry, context) : renderItem(entry, context);
    });
  });
}

/** The next menu from `from`, `step` at a time and wrapping round, that isn't disabled; `from` when there's none. */
function nextEnabled(items: readonly MenubarMenu[], from: number, step: number): number {
  for (let offset = 1; offset < items.length; offset++) {
    const index = (((from + step * offset) % items.length) + items.length) % items.length;
    if (items[index]?.isDisabled !== true) {
      return index;
    }
  }
  return from;
}

interface BarMenuProps {
  menu: MenubarMenu;
  size: ButtonSize;
  isTabStop: boolean;
  /** The open menu, when it's this one. */
  open: OpenMenu | null;
  /** Another menu is open, so hovering this one's name switches to it. */
  isOtherOpen: boolean;
  onOpenChange: (id: string, isOpen: boolean) => void;
  onFocus: (id: string) => void;
  onHoverOpen: (menu: MenubarMenu) => void;
}

/** A menu's name in the bar (a `menuitem` button) and, unless it's disabled, its menu. */
function BarMenu({
  menu,
  size,
  isTabStop,
  open,
  isOtherOpen,
  onOpenChange,
  onFocus,
  onHoverOpen,
}: BarMenuProps) {
  const { onAction } = useContext(EntryContext);
  // A mouse press on the open menu's name closes it. React Aria's trigger opens on mouse down even when its menu is
  // open (the blur closes it, and it opens again), so a press that starts with the menu open closes it as it ends.
  const wasOpen = useRef(false);
  // React Aria focuses a menu only as it mounts, and a menu opened again while its popover is still animating out
  // would reuse that popover, leaving focus on the name. So every opening gets a popover of its own.
  const [menuKey, setMenuKey] = useState(open?.serial ?? 0);
  if (open !== null && open.serial !== menuKey) {
    setMenuKey(open.serial);
  }
  const name = (
    <button
      type="button"
      role="menuitem"
      data-key={menu.id}
      tabIndex={isTabStop ? 0 : -1}
      aria-disabled={menu.isDisabled === true || undefined}
      className={cn(nameClasses, sizeClasses[size])}
      onFocus={() => {
        onFocus(menu.id);
      }}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch' && isOtherOpen && menu.isDisabled !== true) {
          onHoverOpen(menu);
        }
      }}
    >
      {menu.label}
    </button>
  );
  if (menu.isDisabled === true) {
    return name;
  }
  return (
    <MenuTrigger
      isOpen={open !== null}
      onOpenChange={(isOpen) => {
        onOpenChange(menu.id, isOpen);
      }}
    >
      <Pressable
        onPressStart={() => {
          wasOpen.current = open !== null;
        }}
        onPress={(event) => {
          if (wasOpen.current && event.pointerType !== 'touch') {
            onOpenChange(menu.id, false);
          }
        }}
      >
        {name}
      </Pressable>
      <Menu
        key={menuKey}
        {...(open?.autoFocus === undefined ? {} : { autoFocus: open.autoFocus })}
        data-menubar-menu=""
        isNonModal
        onAction={onAction}
      >
        <MenubarEntries entries={menu.items} label={menu.label} />
      </Menu>
    </MenuTrigger>
  );
}

interface BarProps {
  items: readonly MenubarMenu[];
  size: ButtonSize;
  className: string | undefined;
  rootRef: Ref<HTMLDivElement> | undefined;
  /** `aria-label`, `aria-labelledby`, `data-*`. */
  rootProps: object;
}

function Bar({ items, size, className, rootRef, rootProps }: BarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const refs = useMemo(() => mergeRefs(ref, rootRef), [rootRef]);
  const { direction } = useLocale();
  const { activeKey, setActiveKey, elementFor, focusKey } = useRovingKey(ref);
  const [open, setOpen] = useState<OpenMenu | null>(null);
  const serial = useRef(0);
  const [typeahead] = useState(createTypeahead);
  const tabStop = items.some((menu) => menu.id === activeKey) ? activeKey : items[0]?.id;
  const isOpen = open !== null;

  // Non-modal menus don't close on a press outside, so the bar does that.
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const onPointerDown = (event: PointerEvent) => {
      const { target } = event;
      if (
        target instanceof Element &&
        ref.current?.contains(target) !== true &&
        target.closest(MENU_POPOVERS) === null
      ) {
        setOpen(null);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [isOpen]);

  /** A new opening of a menu (called from events only). */
  const opening = (id: string, autoFocus?: AutoFocus): OpenMenu => {
    serial.current += 1;
    return { id, serial: serial.current, autoFocus };
  };

  const onOpenChange = (id: string, isMenuOpen: boolean) => {
    const next = isMenuOpen ? opening(id) : null;
    setOpen((current) => {
      if (next !== null) {
        return current?.id === id ? current : next;
      }
      return current?.id === id ? null : current;
    });
  };

  /** Moves focus to a menu's name and opens its menu; the open one closes as focus leaves it. */
  const openMenu = (menu: MenubarMenu, autoFocus: AutoFocus) => {
    focusKey(menu.id);
    setOpen(opening(menu.id, autoFocus));
  };

  // Captured, so the keys that move between menus are handled before the open menu's own.
  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    const { target } = event;
    const root = ref.current;
    if (root === null || !(target instanceof HTMLElement) || event.ctrlKey || event.metaKey) {
      return;
    }
    const isRtl = isRightToLeft(root);
    const forward = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = isRtl ? 'ArrowRight' : 'ArrowLeft';
    const step = event.key === forward ? 1 : event.key === backward ? -1 : 0;
    const menuElement = target.closest('[role="menu"]');

    if (menuElement === null) {
      // On a menu's name in the bar. Down, Up, Enter and Space open its menu (React Aria's trigger keys).
      const index = items.findIndex((menu) => menu.id === target.dataset.key);
      if (index < 0 || event.altKey) {
        return;
      }
      let next = -1;
      if (step !== 0) {
        next = (index + step + items.length) % items.length;
      } else if (event.key === 'Home') {
        next = 0;
      } else if (event.key === 'End') {
        next = items.length - 1;
      } else if (isTypeaheadKey(event)) {
        next = typeahead.next(event.key, event.timeStamp, items, labelOf, index);
      }
      const menu = items[next];
      if (menu !== undefined) {
        event.preventDefault();
        event.stopPropagation();
        focusKey(menu.id);
      }
      return;
    }

    // In the open menu or one of its submenus.
    const current = items.findIndex((menu) => menu.id === open?.id);
    const openItem = items[current];
    if (openItem === undefined) {
      return;
    }
    if (event.key === 'Tab') {
      // Tab leaves the menubar: focus moves to the open menu's name (the Tab stop), which closes the menu, and the
      // browser's Tab goes on from there.
      event.stopPropagation();
      elementFor(openItem.id)?.focus();
      return;
    }
    if (step === 0 || event.altKey) {
      return;
    }
    // React Aria's submenu keys follow the locale: one opens an item's submenu, the other closes a submenu.
    const opensSubmenu = event.key === (direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
    if (
      opensSubmenu
        ? target.hasAttribute('aria-haspopup')
        : !menuElement.hasAttribute(TOP_MENU_ATTRIBUTE)
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const next = items[nextEnabled(items, current, step)];
    if (next !== undefined && next !== openItem) {
      openMenu(next, 'first');
    }
  };

  const onHoverOpen = (menu: MenubarMenu) => {
    openMenu(menu, true);
  };

  return (
    <div
      {...rootProps}
      ref={refs}
      role="menubar"
      className={cn('flex min-w-0 flex-wrap items-center gap-0.5', className)}
      onKeyDownCapture={onKeyDownCapture}
    >
      {items.map((menu) => (
        <BarMenu
          key={menu.id}
          menu={menu}
          size={size}
          isTabStop={menu.id === tabStop}
          open={open?.id === menu.id ? open : null}
          isOtherOpen={isOpen && open.id !== menu.id}
          onOpenChange={onOpenChange}
          onFocus={setActiveKey}
          onHoverOpen={onHoverOpen}
        />
      ))}
    </div>
  );
}

/**
 * A desktop-app menu bar (File, Edit, View…): each of `items` is a menu, with actions, checkable items, sections,
 * separators, submenus and shortcut hints, and choosing an item calls `onAction` with its `id`. The bar is one Tab
 * stop; Left and Right move between the menus' names (and switch the open menu), Down, Enter or Space open one,
 * Escape closes it, typing a name's first letters moves to it, and hovering another name while a menu is open switches
 * to it. On phones it's one menu button, with each menu as a submenu.
 */
export function Menubar({
  items,
  onAction,
  size = 'sm',
  className,
  ref,
  ...rootProps
}: MenubarProps) {
  const isPhone = useIsPhone();
  const messages = useEntryMessages(modifierKeyStrings);
  const context = useMemo<EntryContextValue>(() => {
    const isApple = isApplePlatform();
    const names = {
      ctrl: messages.modifierCtrl,
      alt: messages.modifierAlt,
      shift: messages.modifierShift,
    };
    return {
      onAction,
      isNonModal: !isPhone,
      shortcutText: (shortcut) =>
        typeof shortcut === 'string'
          ? shortcut
          : commandShortcutKeys(shortcut, isApple, names).join(isApple ? '' : '+'),
    };
  }, [messages, onAction, isPhone]);

  if (!isPhone) {
    return (
      <EntryContext.Provider value={context}>
        <Bar items={items} size={size} className={className} rootRef={ref} rootProps={rootProps} />
      </EntryContext.Provider>
    );
  }

  const { 'aria-label': ariaLabel, 'aria-labelledby': _labelledBy, ...dataProps } = rootProps;
  return (
    <EntryContext.Provider value={context}>
      <div {...dataProps} ref={ref} className={cn('flex', className)}>
        <OverflowMenu aria-label={ariaLabel ?? messages.moreActions} size={size}>
          {items.map((menu) => (
            <SubmenuTrigger key={menu.id}>
              <MenuItem id={menu.id} isDisabled={menu.isDisabled}>
                {menu.label}
              </MenuItem>
              <Menu onAction={onAction}>
                <MenubarEntries entries={menu.items} label={menu.label} />
              </Menu>
            </SubmenuTrigger>
          ))}
        </OverflowMenu>
      </div>
    </EntryContext.Provider>
  );
}
