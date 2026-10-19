// Toggle buttons: buttons that stay pressed. Alone, each is on or off (`aria-pressed`); in a ToggleButtonGroup they
// share a selection of one (radio semantics) or several, and arrow keys move between them.
import {
  createContext,
  useContext,
  useMemo,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from 'react';
import {
  ToggleButton as AriaToggleButton,
  ToggleButtonGroup as AriaToggleButtonGroup,
  type ToggleButtonGroupProps as AriaToggleButtonGroupProps,
  type ToggleButtonProps as AriaToggleButtonProps,
} from 'react-aria-components';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { toneSelectedClasses } from '../../utils/toneClasses';
import type { AccessibleNameProps } from '../../utils/types';
import {
  baseClasses,
  iconOnlyIconSizeClasses,
  iconOnlySizeClasses,
  iconSizeClasses,
  sizeClasses,
  variantToneClasses,
  type ButtonSize,
  type ButtonTone,
} from '../Button/Button.styles';
import { Tooltip } from '../Tooltip/Tooltip';

/** How an unpressed toggle looks; pressed, it's always the solid fill of its `tone`. */
export type ToggleButtonVariant = 'soft' | 'outline' | 'ghost';

type Orientation = 'horizontal' | 'vertical';

interface ToggleButtonLook {
  variant?: ToggleButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
}

interface GroupLook extends ToggleButtonLook {
  isAttached: boolean;
  orientation: Orientation;
}

/** The group's look, which its buttons take unless they set their own. */
const GroupLookContext = createContext<GroupLook | null>(null);

/**
 * An attached group draws one border with dividers between its buttons, which stay when a button is pressed. An
 * icon-only button sits alone in its tooltip's `display: contents` wrapper, where plain `first:` and `last:` would match
 * every button; so a button's place in the group comes from its wrapper when it has one, and from itself when not.
 */
const attachedClasses: Record<Orientation, string> = {
  horizontal: [
    'rounded-none border-0 border-e border-border-strong data-selected:border-border-strong',
    '[:not(span)>&:last-child]:border-e-0 [span:last-child>&]:border-e-0',
    '[:not(span)>&:first-child]:rounded-s-control [span:first-child>&]:rounded-s-control',
    '[:not(span)>&:last-child]:rounded-e-control [span:last-child>&]:rounded-e-control',
    'data-focus-visible:z-[1]',
  ].join(' '),
  vertical: [
    'rounded-none border-0 border-b border-border-strong data-selected:border-border-strong',
    '[:not(span)>&:last-child]:border-b-0 [span:last-child>&]:border-b-0',
    '[:not(span)>&:first-child]:rounded-t-control [span:first-child>&]:rounded-t-control',
    '[:not(span)>&:last-child]:rounded-b-control [span:last-child>&]:rounded-b-control',
    'data-focus-visible:z-[1]',
  ].join(' '),
};

interface ToggleButtonBaseProps
  extends
    ToggleButtonLook,
    Omit<AriaToggleButtonProps, 'className' | 'style' | 'children' | 'render'> {
  /** The label: the button's text, or with `isIconOnly` its accessible name and tooltip. */
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}

/** In icon-only mode the icon is required; the label becomes the accessible name and a tooltip. */
type ToggleButtonModeProps =
  | {
      /** An icon component, such as one from lucide-react, before the label. */
      icon?: IconComponent;
      /** Shows only the icon, keeping the label as the accessible name and showing it in a tooltip. */
      isIconOnly?: false;
    }
  | { icon: IconComponent; isIconOnly: true };

/**
 * `variant` (default `ghost`) sets the unpressed look, in neutral colours; `tone` (default `neutral`) colours the
 * pressed state, as the solid Button of that tone; `size` (default `md`) matches Button. In a ToggleButtonGroup these
 * default to the group's.
 */
export type ToggleButtonProps = ToggleButtonBaseProps & ToggleButtonModeProps;

/**
 * A button that stays pressed until pressed again, for a setting that's on or off: bold, mute, a filter. Alone it's a
 * toggle button (`aria-pressed`), controlled with `isSelected` / `onChange` or uncontrolled with `defaultSelected`.
 * In a ToggleButtonGroup give it an `id`; the group holds the selection.
 */
export function ToggleButton({
  children,
  icon: Icon,
  isIconOnly = false,
  variant,
  tone,
  size,
  className,
  ...rest
}: ToggleButtonProps) {
  const group = useContext(GroupLookContext);
  const shownSize = size ?? group?.size ?? 'md';
  const button = (
    <AriaToggleButton
      {...rest}
      className={cn(
        baseClasses,
        isIconOnly ? iconOnlySizeClasses[shownSize] : sizeClasses[shownSize],
        // Unpressed, a toggle is neutral; its tone shows once pressed.
        variantToneClasses[variant ?? group?.variant ?? 'ghost'].neutral,
        toneSelectedClasses[tone ?? group?.tone ?? 'neutral'],
        group?.isAttached === true && attachedClasses[group.orientation],
        className,
      )}
    >
      {Icon && (
        <Icon
          aria-hidden="true"
          className={cn(
            'shrink-0',
            isIconOnly ? iconOnlyIconSizeClasses[shownSize] : iconSizeClasses[shownSize],
          )}
        />
      )}
      {isIconOnly ? <span className="sr-only">{children}</span> : children}
    </AriaToggleButton>
  );
  return isIconOnly ? <Tooltip content={children}>{button}</Tooltip> : button;
}

/**
 * Inside a toolbar, React Aria makes a multiple-selection group a plain `group` but keeps its `aria-orientation`, which
 * a group can't have; only the toolbar (and a single-selection `radiogroup`) keeps it.
 */
function renderGroup(props: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      aria-orientation={props.role === 'group' ? undefined : props['aria-orientation']}
    />
  );
}

interface ToggleButtonGroupBaseProps
  extends
    ToggleButtonLook,
    Omit<
      AriaToggleButtonGroupProps,
      'className' | 'style' | 'children' | 'render' | 'aria-label' | 'aria-labelledby'
    > {
  /** The group's ToggleButtons, each with an `id`. */
  children: ReactNode;
  /** Joins the buttons into one bordered strip with dividers, rather than spacing them apart. */
  isAttached?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * `selectionMode` is `single` (the default) or `multiple`; `selectedKeys` / `onSelectionChange` control the selection,
 * or `defaultSelectedKeys` seeds it. `disallowEmptySelection` keeps one button pressed. `variant`, `tone` and `size`
 * apply to every button in the group.
 */
export type ToggleButtonGroupProps = ToggleButtonGroupBaseProps & AccessibleNameProps;

/**
 * A set of ToggleButtons sharing one selection: a single choice that can be cleared (text alignment), or several on at
 * once (bold, italic, underline). Arrow keys move focus between the buttons without changing anything; Enter or Space
 * presses one. Inside a Toolbar it joins the toolbar's arrow-key navigation.
 *
 * For picking exactly one of a few options, like a form value or a view switch that always has an answer, use
 * Pillbox: a radio group where Tab reaches the chosen option and the arrow keys choose.
 */
export function ToggleButtonGroup({
  children,
  variant,
  tone,
  size,
  isAttached = false,
  orientation = 'horizontal',
  className,
  ...rest
}: ToggleButtonGroupProps) {
  const look = useMemo(
    () => ({ variant, tone, size, isAttached, orientation }),
    [variant, tone, size, isAttached, orientation],
  );
  return (
    <AriaToggleButtonGroup
      {...rest}
      orientation={orientation}
      render={renderGroup}
      className={cn(
        'inline-flex',
        orientation === 'vertical' ? 'flex-col' : 'flex-row items-center',
        isAttached ? 'rounded-control border border-border-strong' : 'gap-1',
        className,
      )}
    >
      <GroupLookContext.Provider value={look}>{children}</GroupLookContext.Provider>
    </AriaToggleButtonGroup>
  );
}
