import { Menu as MenuIcon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { createContext, useContext, type ReactNode, type Ref } from 'react';
import { Badge } from '../components/Badge/Badge';
import { IconButton } from '../components/IconButton/IconButton';

import { cn } from '../utils/cn';
import type { IconComponent } from '../utils/icon';
import { useNavToggle, useShell, useShellLayout, type ShellLayout } from './ShellContext';
import { useShellMessages } from './messages';

/** The header's menu toggle, as `menuToggleIcon` and `menuToggleClassName` see it. */
export interface MenuToggleState {
  /** True while the sidebar is expanded (desktop) or its drawer is open (phone, tablet). */
  isExpanded: boolean;
  layout: ShellLayout;
}

const PanelOpenIcon: IconComponent = ({ className, ...props }) => (
  <PanelLeftOpen {...props} className={cn('rtl:-scale-x-100', className)} />
);
const PanelCloseIcon: IconComponent = ({ className, ...props }) => (
  <PanelLeftClose {...props} className={cn('rtl:-scale-x-100', className)} />
);

/**
 * A `menuToggleIcon` that shows panel icons on tablet and desktop (close while expanded, open while collapsed) and
 * keeps the menu icon on phones. The panel icons mirror in right-to-left layouts.
 */
export function panelMenuToggleIcon({ isExpanded, layout }: MenuToggleState): IconComponent {
  if (layout === 'phone') {
    return MenuIcon;
  }
  return isExpanded ? PanelCloseIcon : PanelOpenIcon;
}

/** Menu items the header hands to its UserMenu on phones, where the header's other actions don't fit. */
export const HeaderCompactActionsContext = createContext<ReactNode>(undefined);

/** The header's actions as menu items, when the header is compact (phones); otherwise undefined. */
export function useCompactActions(): ReactNode {
  return useContext(HeaderCompactActionsContext);
}

export interface HeaderProps {
  /** The app's name or logo, usually a link home. */
  brand: ReactNode;
  /** Usually a `HierarchyPicker` (compact on phones). */
  scopePicker?: ReactNode;
  /** Usually a `StatusBar` (a single dot on phones). */
  statusBar?: ReactNode;
  /** Actions such as help and a `SettingsMenu`, shown on tablet and desktop. */
  actions?: ReactNode;
  /**
   * The same actions as menu items (`MenuItem`, `MenuSection`, or `SettingsMenuItems`), which the `UserMenu` shows
   * on phones in place of `actions`.
   */
  compactActions?: ReactNode;
  /** Usually a `UserMenu`. */
  userMenu?: ReactNode;
  /** Marks a non-production deployment ("Staging"), with a stripe and a badge. */
  environmentLabel?: ReactNode;
  /** Shows the menu toggle that opens or collapses the AppShell's sidebar. Defaults to true. */
  hasMenuToggle?: boolean;
  /**
   * Picks the menu toggle's icon from its state. Defaults to the menu (hamburger) icon in every state.
   * `panelMenuToggleIcon` shows panel icons on tablet and desktop and keeps the menu icon on phones.
   */
  menuToggleIcon?: (state: MenuToggleState) => IconComponent;
  /**
   * Classes for the menu toggle, or a function of its state, for example to colour it while the sidebar is
   * expanded: `({ isExpanded }) => isExpanded ? 'text-accent-fg' : undefined`.
   */
  menuToggleClassName?: string | ((state: MenuToggleState) => string | undefined);
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * The app's top bar: the menu toggle (wired to the AppShell's sidebar), brand, scope picker, status bar, actions
 * and the user menu. On phones it keeps the menu toggle, brand, a compact scope picker and the user menu; the other
 * actions move into the user menu (`compactActions`).
 */
export function Header({
  brand,
  scopePicker,
  statusBar,
  actions,
  compactActions,
  userMenu,
  environmentLabel,
  hasMenuToggle = true,
  menuToggleIcon,
  menuToggleClassName,
  className,
  ref,
  ...rest
}: HeaderProps) {
  const messages = useShellMessages();
  const shell = useShell();
  const ownLayout = useShellLayout();
  const layout = shell?.layout ?? ownLayout;
  const isCompact = layout === 'phone';
  const toggle = useNavToggle();
  const toggleLabel = toggle
    ? {
        open: messages.openNavigation,
        close: messages.closeNavigation,
        collapse: messages.collapseSidebar,
        expand: messages.expandSidebar,
      }[toggle.label]
    : '';
  const toggleState: MenuToggleState = { isExpanded: toggle?.isExpanded ?? false, layout };
  const hasEnvironment =
    environmentLabel !== undefined && environmentLabel !== null && environmentLabel !== false;
  return (
    <HeaderCompactActionsContext.Provider value={isCompact ? compactActions : undefined}>
      <div
        {...rest}
        ref={ref}
        className={cn(
          'flex h-header min-w-0 items-center gap-1 border-b border-border bg-surface-2 px-2 sm:gap-2 sm:px-4',
          hasEnvironment && 'border-t-4 border-t-warning-solid',
          className,
        )}
      >
        {hasMenuToggle && toggle && (
          <IconButton
            icon={menuToggleIcon?.(toggleState) ?? MenuIcon}
            aria-label={toggleLabel}
            aria-expanded={toggle.isExpanded}
            onPress={toggle.toggle}
            className={
              typeof menuToggleClassName === 'function'
                ? menuToggleClassName(toggleState)
                : menuToggleClassName
            }
          />
        )}
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          {brand}
          {hasEnvironment && (
            <Badge tone="warning" variant="solid">
              {environmentLabel}
            </Badge>
          )}
        </div>
        {scopePicker !== undefined && (
          <div className="flex min-w-0 shrink items-center">{scopePicker}</div>
        )}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
          {statusBar}
          {!isCompact && actions !== undefined && (
            <div className="flex items-center gap-1">{actions}</div>
          )}
          {userMenu}
        </div>
      </div>
    </HeaderCompactActionsContext.Provider>
  );
}
