import { Check, ChevronRight } from 'lucide-react';
import { createContext, useContext, type ReactNode } from 'react';
import {
  Header,
  Keyboard,
  Menu as AriaMenu,
  MenuContext,
  MenuItem as AriaMenuItem,
  MenuSection as AriaMenuSection,
  MenuTrigger as AriaMenuTrigger,
  Popover as AriaPopover,
  PopoverContext,
  Separator,
  SubmenuTrigger as AriaSubmenuTrigger,
  Text,
  useSlottedContext,
  type MenuItemProps as AriaMenuItemProps,
  type MenuProps as AriaMenuProps,
  type MenuSectionProps as AriaMenuSectionProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import {
  disabledClasses,
  focusedSurfaceClasses,
  selectedSolidClasses,
} from '../../utils/stateClasses';
import { useIsPhone } from '../../utils/useMediaQuery';
import { SheetSurface } from '../Overlay/SheetSurface';
import { popoverClasses } from '../Overlay/styles';

/** True inside a `layout="choice"` section, so items draw as segments. */
const ChoiceContext = createContext(false);

/**
 * Pairs a trigger (its first child, usually a Button) with a `Menu` (its second child). Controlled with
 * `isOpen` / `onOpenChange` or uncontrolled with `defaultOpen`; `trigger="longPress"` opens on long press.
 */
export const MenuTrigger = AriaMenuTrigger;

/** Opens a nested menu from a `MenuItem` (its first child) with a `Menu` (its second child). */
export const SubmenuTrigger = AriaSubmenuTrigger;

export interface MenuProps<T extends object> extends Omit<
  AriaMenuProps<T>,
  'className' | 'style' | 'render'
> {
  /**
   * Content above the items, inside the popover or sheet, that isn't an item and can't be focused: for example the
   * signed-in user's name in an account menu. Point the menu's `aria-labelledby` at it to name the menu by it.
   */
  header?: ReactNode;
  /**
   * Leaves the rest of the page usable while the menu's popover is open: nothing is covered, made inert or hidden
   * from screen readers, and the menu closes when focus leaves it rather than on a press outside. For menus that work
   * together, such as a Menubar's, where hovering the next menu's trigger switches to it. Phone sheets ignore it.
   */
  isNonModal?: boolean;
  className?: string;
}

/**
 * A list of actions or choices with full keyboard support (arrow keys, typeahead, Escape, focus return). Inside a
 * MenuTrigger it opens in a popover placed to avoid the screen edges, or a bottom sheet on phones; on its own it's
 * an inline menu.
 */
export function Menu<T extends object>({ header, isNonModal, className, ...props }: MenuProps<T>) {
  const triggerContext = useContext(MenuContext);
  // React Aria renders a submenu inside its item, not inside SubmenuTrigger, and names the trigger on the popover
  // context it provides there. A submenu opens beside its item, never as a phone sheet.
  const isSubmenu = useSlottedContext(PopoverContext)?.trigger === 'SubmenuTrigger';
  const isPhone = useIsPhone();

  const menu = (
    <AriaMenu
      {...props}
      className={cn(
        'flex min-w-48 flex-col gap-0.5 p-1 text-sm outline-none',
        isPhone && 'p-2',
        className,
      )}
    />
  );

  const headed =
    header === undefined ? (
      menu
    ) : (
      <>
        <div className={cn('border-b border-border px-3 py-2', isPhone && 'px-4')}>{header}</div>
        {menu}
      </>
    );
  if (!triggerContext) {
    return header === undefined ? menu : <div className="flex flex-col">{headed}</div>;
  }

  if (isPhone && !isSubmenu) {
    const labelledBy =
      'aria-labelledby' in triggerContext ? triggerContext['aria-labelledby'] : undefined;
    return (
      <SheetSurface
        aria-label={props['aria-label']}
        aria-labelledby={props['aria-label'] === undefined ? labelledBy : undefined}
      >
        <div className="overflow-auto">{headed}</div>
      </SheetSurface>
    );
  }

  return (
    <AriaPopover
      // A submenu opens beside its item. On phones the menu is a full-width sheet with no room beside it, so a
      // submenu opens over the sheet, above its item (below it when there's more room there).
      placement={isSubmenu ? (isPhone ? 'top' : undefined) : 'bottom start'}
      isNonModal={isNonModal}
      className={cn('max-h-[60vh]', header !== undefined && 'flex flex-col', popoverClasses)}
    >
      {header === undefined ? (
        menu
      ) : (
        <div className="flex min-h-0 flex-col overflow-auto">{headed}</div>
      )}
    </AriaPopover>
  );
}

export interface MenuItemProps<T extends object = object> extends Omit<
  AriaMenuItemProps<T>,
  'className' | 'style' | 'children'
> {
  children: ReactNode;
  icon?: IconComponent;
  /** Secondary text under the label. */
  description?: ReactNode;
  /** A keyboard shortcut hint, for example "⌘E". It's a hint only; the app handles the shortcut. */
  shortcut?: string;
  /** `danger` for destructive actions. */
  tone?: 'neutral' | 'danger';
  className?: string;
}

const itemClasses = [
  'group/item relative flex min-h-hit cursor-default items-center gap-2 rounded-control px-2 py-1.5 outline-none select-none',
  focusedSurfaceClasses,
  'data-open:bg-surface-3',
  disabledClasses,
].join(' ');

const choiceItemClasses = [
  'flex min-h-hit flex-1 cursor-default flex-col items-center justify-center gap-0.5 rounded-control border border-border px-2 py-1.5 text-xs outline-none select-none',
  focusedSurfaceClasses,
  'data-selected:border-transparent',
  selectedSolidClasses,
  disabledClasses,
].join(' ');

/** An item in a Menu. In a section with `selectionMode`, it shows a check when selected. */
export function MenuItem<T extends object = object>({
  children,
  icon: Icon,
  description,
  shortcut,
  tone = 'neutral',
  className,
  textValue,
  ...rest
}: MenuItemProps<T>) {
  const isChoice = useContext(ChoiceContext);
  const label = typeof children === 'string' ? children : undefined;

  if (isChoice) {
    return (
      <AriaMenuItem
        {...rest}
        textValue={textValue ?? label}
        className={cn(choiceItemClasses, className)}
      >
        {Icon && <Icon aria-hidden="true" className="size-4" />}
        <Text slot="label">{children}</Text>
      </AriaMenuItem>
    );
  }

  return (
    <AriaMenuItem
      {...rest}
      textValue={textValue ?? label}
      className={cn(itemClasses, tone === 'danger' ? 'text-danger-fg' : 'text-fg', className)}
    >
      {({ isSelected, selectionMode, hasSubmenu }) => (
        <>
          {selectionMode !== 'none' && (
            <span className="flex size-4 shrink-0 items-center justify-center">
              {isSelected && <Check aria-hidden="true" className="size-4" />}
            </span>
          )}
          {Icon && (
            <Icon
              aria-hidden="true"
              className="size-4 shrink-0 text-fg-muted group-data-focused/item:text-current"
            />
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <Text slot="label" className="truncate">
              {children}
            </Text>
            {description !== undefined && (
              <Text slot="description" className="text-xs text-fg-muted">
                {description}
              </Text>
            )}
          </span>
          {shortcut !== undefined && (
            <Keyboard className="ms-4 shrink-0 font-sans text-xs text-fg-muted">
              {shortcut}
            </Keyboard>
          )}
          {hasSubmenu && (
            <ChevronRight
              aria-hidden="true"
              className="size-4 shrink-0 text-fg-muted rtl:rotate-180"
            />
          )}
        </>
      )}
    </AriaMenuItem>
  );
}

export interface MenuSectionProps<T extends object> extends Omit<
  AriaMenuSectionProps<T>,
  'className' | 'style' | 'children' | 'items'
> {
  /** The section's items. For a dynamic list, use `<Collection items={…}>` from react-aria-components here. */
  children: ReactNode;
  /** A visible heading for the section. Without one, give the section an `aria-label`. */
  title?: ReactNode;
  /**
   * `choice` draws the items as a row of segments that stays open while changing (single selection), for example a
   * theme switcher in a settings menu.
   */
  layout?: 'list' | 'choice';
  className?: string;
}

/** A group of menu items, optionally with a heading and its own selection (checkbox or radio items). */
export function MenuSection<T extends object>({
  title,
  layout = 'list',
  className,
  children,
  ...rest
}: MenuSectionProps<T>) {
  const isChoice = layout === 'choice';
  return (
    <ChoiceContext.Provider value={isChoice}>
      <AriaMenuSection
        {...rest}
        {...(isChoice
          ? {
              selectionMode: 'single' as const,
              shouldCloseOnSelect: false,
              disallowEmptySelection: true,
            }
          : {})}
        className={cn(
          'flex flex-col gap-0.5',
          isChoice && 'flex-row flex-wrap gap-1 p-1',
          className,
        )}
      >
        {title !== undefined && (
          <Header
            className={cn(
              'px-2 pt-2 pb-1 text-xs font-semibold text-fg-muted',
              isChoice && 'basis-full px-0 pt-1',
            )}
          >
            {title}
          </Header>
        )}
        {children}
      </AriaMenuSection>
    </ChoiceContext.Provider>
  );
}

/** A divider between groups of menu items. */
export function MenuSeparator() {
  return <Separator className="mx-1 my-1 h-px border-0 bg-border" />;
}
