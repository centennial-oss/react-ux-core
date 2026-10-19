import { useState, type ReactNode, type Ref } from 'react';
import type { Key, MenuItemProps as AriaMenuItemProps } from 'react-aria-components';
import { Breadcrumbs, type BreadcrumbItem } from '../components/Breadcrumbs/Breadcrumbs';
import { Button } from '../components/Button/Button';
import { MenuItem, MenuSeparator } from '../components/Menu/Menu';
import { OverflowMenu } from '../components/Menu/MenuButtons';
import { Option } from '../components/ListBox/ListBoxParts';
import { Select } from '../components/Select/Select';
import { Tab, TabList, Tabs } from '../components/Tabs/Tabs';
import { useLinkComponent } from '../provider/context';
import type { LinkComponentType } from '../provider/link';
import { cn } from '../utils/cn';
import type { IconComponent } from '../utils/icon';
import { useShell, useShellLayout } from './ShellContext';
import { useShellMessages } from './messages';

/** A secondary page action: a button on wider screens, an item in the quick-actions menu on phones. */
export interface PageAction {
  id: string;
  label: string;
  icon?: IconComponent;
  onPress?: () => void;
  /** Links through `UIProvider`'s `LinkComponent`. */
  href?: string;
  isDisabled?: boolean;
  tone?: 'neutral' | 'danger';
}

export interface PageTab {
  id: string;
  label: string;
  icon?: IconComponent;
  badge?: ReactNode;
}

export interface PageHeaderProps {
  breadcrumbs?: readonly BreadcrumbItem[];
  /** The page's title: its `h1`. */
  title: ReactNode;
  subtitle?: ReactNode;
  /** Beside the title, for example a StatusDot or Badge. */
  status?: ReactNode;
  /** The main action, usually a solid Button. It stays visible on phones. */
  primaryAction?: ReactNode;
  secondaryActions?: readonly PageAction[];
  /** More actions (`MenuItem`, `MenuSection`) in an overflow menu. */
  quickActions?: ReactNode;
  /** Called with the `id` of a chosen quick action. */
  onQuickAction?: (key: Key) => void;
  /** Tabs under the header. The panels (`TabPanel`) go in `children`. */
  tabs?: readonly PageTab[];
  selectedTab?: string;
  defaultSelectedTab?: string;
  onTabChange?: (id: string) => void;
  /** Names the tab list. Defaults to the `pageSections` message. */
  tabsLabel?: string;
  /** The tab panels, when there are `tabs`. */
  children?: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

type MenuItemRender = NonNullable<AriaMenuItemProps['render']>;

function menuItemRenderer(LinkComponent: LinkComponentType): MenuItemRender {
  return (props) => ('href' in props ? <LinkComponent {...props} /> : <div {...props} />);
}

/** Phones show the tabs as a Select when there are more than this many. */
const MAX_PHONE_TABS = 4;

/**
 * The top of a page: breadcrumbs, the title (`h1`) with a status, a subtitle and the page's actions, optionally
 * over a row of tabs whose end holds the quick-actions menu. On phones the title and subtitle stack, secondary
 * actions move into the quick-actions menu, and more than four tabs become a Select.
 */
export function PageHeader({
  breadcrumbs,
  title,
  subtitle,
  status,
  primaryAction,
  secondaryActions = [],
  quickActions,
  onQuickAction,
  tabs,
  selectedTab,
  defaultSelectedTab,
  onTabChange,
  tabsLabel,
  children,
  className,
  ref,
  ...rest
}: PageHeaderProps) {
  const messages = useShellMessages();
  const LinkComponent = useLinkComponent();
  const shell = useShell();
  const ownLayout = useShellLayout();
  const isPhone = (shell?.layout ?? ownLayout) === 'phone';
  const hasQuickActions = quickActions !== undefined && quickActions !== null;
  const menuActions = isPhone ? secondaryActions : [];
  const hasMenu = hasQuickActions || menuActions.length > 0;

  const overflow = hasMenu && (
    <OverflowMenu onAction={onQuickAction}>
      {menuActions.map((action) => (
        <MenuItem
          key={action.id}
          id={`page-action:${action.id}`}
          icon={action.icon}
          tone={action.tone}
          href={action.href}
          render={action.href === undefined ? undefined : menuItemRenderer(LinkComponent)}
          isDisabled={action.isDisabled}
          onAction={action.onPress}
          textValue={action.label}
        >
          {action.label}
        </MenuItem>
      ))}
      {menuActions.length > 0 && hasQuickActions && <MenuSeparator />}
      {quickActions}
    </OverflowMenu>
  );
  const hasTabs = tabs !== undefined && tabs.length > 0;
  const isTabSelect = hasTabs && isPhone && tabs.length > MAX_PHONE_TABS;
  // One current tab for both the tab row and the phone Select (controlled with `selectedTab`, or kept here).
  const [ownTab, setOwnTab] = useState(defaultSelectedTab ?? tabs?.[0]?.id);
  const currentTab = selectedTab ?? ownTab;
  const changeTab = (id: string) => {
    setOwnTab(id);
    onTabChange?.(id);
  };

  const header = (
    <div className="flex min-w-0 flex-col gap-2">
      {breadcrumbs !== undefined && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="min-w-0 text-xl font-semibold break-words text-fg sm:text-2xl">
              {title}
            </h1>
            {status}
          </div>
          {subtitle !== undefined && <p className="text-sm text-fg-muted">{subtitle}</p>}
        </div>
        {(primaryAction !== undefined || secondaryActions.length > 0 || (hasMenu && !hasTabs)) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {!isPhone &&
              secondaryActions.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  tone={action.tone}
                  icon={action.icon}
                  isDisabled={action.isDisabled}
                  {...(action.href !== undefined
                    ? { href: action.href }
                    : { onPress: action.onPress })}
                >
                  {action.label}
                </Button>
              ))}
            {primaryAction}
            {!hasTabs && overflow}
          </div>
        )}
      </div>
    </div>
  );

  if (!hasTabs) {
    return (
      <div {...rest} ref={ref} className={cn('flex min-w-0 flex-col gap-4 pb-4', className)}>
        {header}
      </div>
    );
  }

  return (
    <div {...rest} ref={ref} className={cn('flex min-w-0 flex-col gap-4', className)}>
      {header}
      <Tabs
        selectedKey={currentTab}
        onSelectionChange={(key) => {
          changeTab(String(key));
        }}
      >
        {isTabSelect && (
          <div className="flex items-end gap-2">
            <Select
              aria-label={tabsLabel ?? messages.pageSections}
              items={tabs}
              value={currentTab ?? null}
              onChange={changeTab}
              className="min-w-0 flex-1"
            >
              {(tab) => (
                <Option id={tab.id} icon={tab.icon} textValue={tab.label}>
                  {tab.label}
                </Option>
              )}
            </Select>
            {overflow}
          </div>
        )}
        <TabList
          aria-label={tabsLabel ?? messages.pageSections}
          actions={isTabSelect ? undefined : overflow}
          // With a Select in charge on phones, the tab row stays in place (the panels are labelled by it) but hidden.
          className={isTabSelect ? 'hidden' : undefined}
        >
          {tabs.map((tab) => (
            <Tab key={tab.id} id={tab.id} icon={tab.icon} badge={tab.badge}>
              {tab.label}
            </Tab>
          ))}
        </TabList>
        {children}
      </Tabs>
    </div>
  );
}
