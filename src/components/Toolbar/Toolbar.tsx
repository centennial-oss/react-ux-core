// Toolbar: a row (or column) of controls that the arrow keys move between, on React Aria's Toolbar. Its `items` are
// actions that overflow: what doesn't fit moves into a "More actions" menu at the end, lowest priority first.
import type { ReactNode, Ref } from 'react';
import type { Key, ToolbarProps as AriaToolbarProps } from 'react-aria-components';
import { cn } from '../../utils/cn';
import { runsBy } from '../../utils/collections';
import type { IconComponent } from '../../utils/icon';
import { useListFormat } from '../../utils/intl';
import type { AccessibleNameProps } from '../../utils/types';
import { Button } from '../Button/Button';
import type { ButtonSize } from '../Button/Button.styles';
import { IconButton } from '../IconButton/IconButton';
import { MenuItem, MenuSection, MenuSeparator } from '../Menu/Menu';
import { OverflowMenu } from '../Menu/MenuButtons';
import { ToggleButton } from '../ToggleButton/ToggleButton';
import { Tooltip } from '../Tooltip/Tooltip';
import { renderToolbarGroups } from './toolbarGroups';
import { ToolbarFrame, type ToolbarOrientation } from './ToolbarFrame';
import { useToolbarOverflow } from './useToolbarOverflow';

type Orientation = ToolbarOrientation;

interface ToolbarItemBase {
  /** Unique within the toolbar; the toolbar's `onAction` receives it. */
  id: string;
  /** The item's text, in the bar and the overflow menu. With `isIconOnly`, its accessible name and tooltip. */
  label: string;
  /** Called when the item is pressed, in the bar or the overflow menu (before the toolbar's `onAction`). */
  onAction?: () => void;
  /**
   * Makes the item a toggle showing this state: a pressed button (`aria-pressed`) in the bar, a checked item in the
   * overflow menu. Pressing it calls `onAction`; the app flips the state.
   */
  isSelected?: boolean;
  isDisabled?: boolean;
  /** `danger` for destructive actions. */
  tone?: 'neutral' | 'danger';
  /**
   * Higher priorities stay in the bar longer when space runs out; among equal priorities the last item moves into
   * the menu first. Defaults to 0.
   */
  priority?: number;
  /**
   * The name of the item's group, such as "Text style". Neighbouring items in the same group sit together, with a
   * separator between groups (in the menu too), and the group's toggles in the overflow menu are a section it names.
   */
  group?: string;
}

/** An action in a Toolbar's `items`. Icon-only items need their `icon`. */
export type ToolbarItem = ToolbarItemBase &
  (
    | {
        /** An icon component, such as one from lucide-react, before the label. */
        icon?: IconComponent;
        /** Shows only the icon in the bar, with the label as its accessible name and tooltip. */
        isIconOnly?: false;
      }
    | { icon: IconComponent; isIconOnly: true }
  );

interface ToolbarBaseProps extends Omit<
  AriaToolbarProps,
  'className' | 'style' | 'children' | 'render' | 'aria-label' | 'aria-labelledby'
> {
  /**
   * Controls placed before the `items`, which always stay in the bar: buttons, ToggleButtonGroups, Separators. They
   * never move into the menu, so where they may not fit (a phone), let them wrap with `className="flex-wrap"` or use
   * `items`. Keep text fields out of a horizontal toolbar: its arrow keys move between controls rather than through
   * the text.
   */
  children?: ReactNode;
  /**
   * Actions after the `children`. With items, the toolbar fills its container's width (height when vertical), and
   * the items that don't fit move into a "More actions" menu at its end, lowest `priority` first.
   */
  items?: readonly ToolbarItem[];
  /** Called with an item's `id` when it's pressed, in the bar or the overflow menu. */
  onAction?: (key: Key) => void;
  /** The size of the item buttons and the "More actions" button. Defaults to `md`. */
  size?: ButtonSize;
  /** Classes for the root element. `justify-end` (or `justify-center`) also lines up the `items` that way. */
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** `orientation` is `horizontal` (the default) or `vertical`; the arrow keys follow it. */
export type ToolbarProps = ToolbarBaseProps & AccessibleNameProps;

/** With items, the toolbar's size comes from its container, never from the items it shows. */
const overflowRootClasses: Record<Orientation, string> = {
  horizontal: 'w-full min-w-0',
  vertical: 'h-full min-h-0',
};

/** The items take the space the `children` leave, and line up as the root's `justify-*` says. */
const itemsClasses: Record<Orientation, string> = {
  horizontal:
    'flex min-w-0 flex-1 flex-row flex-nowrap items-center [justify-content:inherit] gap-1',
  vertical: 'flex min-h-0 flex-1 flex-col flex-nowrap items-center [justify-content:inherit] gap-1',
};

const separatorClasses: Record<Orientation, string> = {
  horizontal: 'mx-1 my-2',
  vertical: 'mx-2 my-1',
};

const NO_ITEMS: readonly ToolbarItem[] = [];
/** Joins toggle labels into a name for their menu section ("Bold, Italic") when they have no group. */
const LABEL_LIST: Intl.ListFormatOptions = { type: 'unit', style: 'short' };

interface ItemButtonProps {
  item: ToolbarItem;
  size: ButtonSize;
  onPress: () => void;
}

/** An item in the bar: a ghost button, an icon button with a tooltip, or a toggle. */
function ItemButton({ item, size, onPress }: ItemButtonProps) {
  const { label, isDisabled, tone = 'neutral' } = item;
  if (item.isSelected !== undefined) {
    const toggle = { isSelected: item.isSelected, onChange: onPress, isDisabled, tone, size };
    return item.isIconOnly === true ? (
      <ToggleButton {...toggle} icon={item.icon} isIconOnly>
        {label}
      </ToggleButton>
    ) : (
      <ToggleButton {...toggle} icon={item.icon}>
        {label}
      </ToggleButton>
    );
  }
  if (item.isIconOnly === true) {
    return (
      <Tooltip content={label}>
        <IconButton
          icon={item.icon}
          aria-label={label}
          size={size}
          tone={tone}
          isDisabled={isDisabled}
          onPress={onPress}
        />
      </Tooltip>
    );
  }
  return (
    <Button
      variant="ghost"
      size={size}
      tone={tone}
      icon={item.icon}
      isDisabled={isDisabled}
      onPress={onPress}
    >
      {label}
    </Button>
  );
}

function menuItem(item: ToolbarItem) {
  return (
    <MenuItem
      key={item.id}
      id={item.id}
      icon={item.icon}
      tone={item.tone}
      isDisabled={item.isDisabled}
      onAction={item.onAction}
    >
      {item.label}
    </MenuItem>
  );
}

/**
 * The overflow menu's items, group by group. Toggles go in sections that show them checked, named by their group, or
 * else by the toolbar's `aria-label`, or else by their own labels.
 */
function menuItems(
  items: readonly ToolbarItem[],
  toolbarLabel: string | undefined,
  list: Intl.ListFormat,
): ReactNode[] {
  return runsBy(items, (item) => item.group).flatMap((group, groupIndex) => [
    groupIndex > 0 && <MenuSeparator key={`separator-${group[0]?.id ?? ''}`} />,
    ...runsBy(group, (item) => item.isSelected !== undefined).map((run) =>
      run[0]?.isSelected === undefined ? (
        run.map(menuItem)
      ) : (
        <MenuSection
          key={`toggles-${run[0].id}`}
          aria-label={run[0].group ?? toolbarLabel ?? list.format(run.map((item) => item.label))}
          selectionMode="multiple"
          selectedKeys={run.filter((item) => item.isSelected).map((item) => item.id)}
        >
          {run.map(menuItem)}
        </MenuSection>
      ),
    ),
  ]);
}

/**
 * Controls that share one Tab stop: the arrow keys move between them (following `orientation`, reversed right to
 * left), Tab leaves the toolbar, and coming back returns to the control used last. Put buttons, ToggleButtons,
 * ToggleButtonGroups and Separators in `children`.
 *
 * `items` adds actions with priority-based overflow: when they don't all fit, the lowest-priority ones move into a
 * "More actions" menu at the end, which runs the same actions. Nothing moves while everything fits.
 */
export function Toolbar({
  children,
  items = NO_ITEMS,
  onAction,
  size = 'md',
  orientation = 'horizontal',
  className,
  ...rest
}: ToolbarProps) {
  const { ref: itemsRef, hidden } = useToolbarOverflow(items, orientation, size);
  const list = useListFormat(LABEL_LIST);
  const hasItems = items.length > 0;
  const shown = hidden.size === 0 ? items : items.filter((item) => !hidden.has(item.id));
  const overflowing = hidden.size === 0 ? [] : items.filter((item) => hidden.has(item.id));
  const press = (item: ToolbarItem) => () => {
    item.onAction?.();
    onAction?.(item.id);
  };

  return (
    <ToolbarFrame
      {...rest}
      orientation={orientation}
      className={cn(hasItems && overflowRootClasses[orientation], className)}
    >
      {children}
      {hasItems && (
        <div ref={itemsRef} className={itemsClasses[orientation]}>
          {renderToolbarGroups(
            runsBy(shown, (item) => item.group),
            separatorClasses[orientation],
            (item) => (
              <div key={item.id} data-toolbar-item={item.id} className="flex shrink-0">
                <ItemButton item={item} size={size} onPress={press(item)} />
              </div>
            ),
            orientation,
          )}
          {overflowing.length > 0 && (
            <div data-toolbar-more="" className="flex shrink-0">
              <OverflowMenu
                size={size}
                // React Aria's menu also passes the item's value; the toolbar reports the id alone, as in the bar.
                onAction={
                  onAction &&
                  ((key) => {
                    onAction(key);
                  })
                }
              >
                {menuItems(overflowing, rest['aria-label'], list)}
              </OverflowMenu>
            </div>
          )}
        </div>
      )}
    </ToolbarFrame>
  );
}
