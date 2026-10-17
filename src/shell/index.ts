// The app shell kit: layout and navigation that take data and callbacks (no router or storage).
export { AppShell, type AppShellProps } from './AppShell';
export { Brand, type BrandProps } from './Brand';
export { BottomTabBar, useIsKeyboardOpen, type BottomTabBarProps } from './BottomTabBar';
export { Footer, type FooterProps } from './Footer';
export {
  Header,
  panelMenuToggleIcon,
  useCompactActions,
  type HeaderProps,
  type MenuToggleState,
} from './Header';
export { HierarchyPicker, type HierarchyPickerProps } from './hierarchy/HierarchyPicker';
export type { SearchLeaves } from './hierarchy/HierarchyPanel';
export type { LoadChildren } from './hierarchy/model';
export { NotificationBell, type NotificationBellProps } from './NotificationBell';
export {
  NotificationCenter,
  type NotificationCenterProps,
  type NotificationFilter,
  type NotificationItem,
} from './NotificationCenter';
export { defaultNotificationMessages, type NotificationMessages } from './notificationMessages';
export { Page, type PageProps } from './Page';
export { PageHeader, type PageAction, type PageHeaderProps, type PageTab } from './PageHeader';
export {
  SettingsMenu,
  SettingsMenuItems,
  ThemeMenuSection,
  type SettingsMenuItemsProps,
  type SettingsMenuProps,
} from './SettingsMenu';
export { useShell, useShellLayout, type ShellContextValue, type ShellLayout } from './ShellContext';
export { Sidebar, type SidebarProps } from './Sidebar';
export { sortAlerts, StatusBar, worstSeverity, type StatusBarProps } from './StatusBar';
export type {
  BottomTabItem,
  FooterLink,
  HierarchyLevel,
  HierarchyNode,
  HierarchyPath,
  IsActive,
  NavItem,
  NavSection,
  Severity,
  StatusAlert,
  StatusCategory,
} from './types';
export { initialsOf, UserMenu, type UserMenuProps } from './UserMenu';
