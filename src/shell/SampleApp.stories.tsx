import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  BarChart3,
  CircleHelp,
  FileText,
  Gauge,
  LayoutDashboard,
  MapPin,
  Plug,
  Plus,
  Receipt,
  Users,
  Zap,
} from 'lucide-react';
import { createContext, useContext, useState, type MouseEvent } from 'react';
import { Badge } from '../components/Badge/Badge';
import { Button } from '../components/Button/Button';
import { Card } from '../components/Card/Card';
import { IconButton } from '../components/IconButton/IconButton';
import { MenuItem, MenuSection } from '../components/Menu/Menu';
import { StatTile } from '../components/StatTile/StatTile';
import { StatusDot } from '../components/StatusDot/StatusDot';
import { TabPanel } from '../components/Tabs/Tabs';
import { LinkContext } from '../provider/context';
import type { LinkComponentProps } from '../provider/link';
import { AppShell } from './AppShell';
import { BottomTabBar } from './BottomTabBar';
import { Footer } from './Footer';
import { Header, panelMenuToggleIcon } from './Header';
import { HierarchyPicker } from './hierarchy/HierarchyPicker';
import { PageHeader } from './PageHeader';
import { SettingsMenu, SettingsMenuItems } from './SettingsMenu';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import type { HierarchyNode, HierarchyPath, NavSection, StatusCategory } from './types';
import { UserMenu } from './UserMenu';

const meta = {
  title: 'Shell/Sample app',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// A tiny in-story router: links change the current path instead of loading a page.
const NavigateContext = createContext<(href: string) => void>(() => undefined);

function StoryLink({ href, onClick, children, ...props }: LinkComponentProps) {
  const navigate = useContext(NavigateContext);
  return (
    <a
      {...props}
      href={href}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          navigate(href);
        }
      }}
    >
      {children}
    </a>
  );
}

const sections: NavSection[] = [
  {
    id: 'operate',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
      {
        id: 'sites',
        label: 'Sites',
        icon: MapPin,
        href: '/sites',
        badge: 3,
        children: [
          { id: 'sites-map', label: 'Map', href: '/sites/map' },
          { id: 'sites-groups', label: 'Groups', href: '/sites/groups' },
        ],
      },
      { id: 'meters', label: 'Meters', icon: Gauge, href: '/meters' },
      { id: 'usage', label: 'Usage', icon: BarChart3, href: '/usage' },
    ],
  },
  {
    id: 'billing',
    title: 'Billing',
    items: [
      { id: 'invoices', label: 'Invoices', icon: Receipt, href: '/invoices' },
      { id: 'tariffs', label: 'Tariffs', icon: Zap, href: '/tariffs' },
      { id: 'reports', label: 'Reports', icon: FileText, href: '/reports' },
    ],
  },
  {
    id: 'admin',
    title: 'Admin',
    items: [
      { id: 'users', label: 'Users', icon: Users, href: '/users' },
      { id: 'integrations', label: 'Integrations', icon: Plug, href: '/integrations' },
    ],
  },
];

const plant12: HierarchyNode = { id: 'plant-12', label: 'Plant 12', description: 'Denver, CO' };
const plant14: HierarchyNode = { id: 'plant-14', label: 'Plant 14', description: 'Boulder, CO' };
const depot3: HierarchyNode = { id: 'depot-3', label: 'Depot 3', description: 'Austin, TX' };
const depot7: HierarchyNode = { id: 'depot-7', label: 'Depot 7', description: 'Houston, TX' };
const north: HierarchyNode = { id: 'north', label: 'North', children: [plant12, plant14] };
const south: HierarchyNode = { id: 'south', label: 'South', children: [depot3, depot7] };
// One organisation: its level is skipped and hidden.
const acme: HierarchyNode = { id: 'acme', label: 'Acme Energy', children: [north, south] };
const scopes = [acme];
const levels = [
  { id: 'org', label: 'Organisation' },
  { id: 'region', label: 'Region' },
  { id: 'location', label: 'Location' },
];
const initialScope: HierarchyPath = [acme, north, plant12];

const categories: StatusCategory[] = [
  {
    id: 'meters',
    label: 'Meters',
    icon: Gauge,
    severity: 'warning',
    alerts: [
      { id: 'offline', text: 'Meters not reporting', count: 3, severity: 'warning' },
      { id: 'late', text: 'Readings more than an hour late', severity: 'warning' },
    ],
  },
  { id: 'billing', label: 'Billing', icon: Receipt, severity: 'ok', alerts: [] },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Plug,
    severity: 'error',
    alerts: [{ id: 'sync', text: 'Accounting sync failed', severity: 'error' }],
  },
];

function SitesPage() {
  const [tab, setTab] = useState('overview');
  return (
    <PageHeader
      breadcrumbs={[
        { id: 'home', label: 'Home', href: '/' },
        { id: 'sites', label: 'Sites', href: '/sites' },
        { id: 'plant', label: 'Plant 12' },
      ]}
      title="Plant 12"
      subtitle="Denver, CO · 48 meters"
      status={<StatusDot tone="warning" label="3 meters offline" />}
      primaryAction={<Button icon={Plus}>Add meter</Button>}
      secondaryActions={[
        { id: 'export', label: 'Export', icon: FileText, onPress: () => undefined },
        { id: 'report', label: 'Usage report', icon: BarChart3, href: '/reports' },
      ]}
      quickActions={
        <>
          <MenuItem id="rename">Rename</MenuItem>
          <MenuItem id="archive" tone="danger">
            Archive
          </MenuItem>
        </>
      }
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'meters', label: 'Meters', badge: <Badge>48</Badge> },
        { id: 'tariff', label: 'Tariff' },
        { id: 'contacts', label: 'Contacts' },
        { id: 'history', label: 'History' },
      ]}
      selectedTab={tab}
      onTabChange={setTab}
    >
      <TabPanel id="overview" className="pt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Usage today" value="1,284 kWh" />
          <StatTile label="Peak demand" value="212 kW" />
          <StatTile label="Meters online" value="45 of 48" />
        </div>
      </TabPanel>
      {['meters', 'tariff', 'contacts', 'history'].map((id) => (
        <TabPanel key={id} id={id} className="pt-4">
          <Card>Content for this tab.</Card>
        </TabPanel>
      ))}
    </PageHeader>
  );
}

function OtherPage({ path }: { path: string }) {
  const item = sections
    .flatMap((section) => section.items)
    .flatMap((entry) => [entry, ...(entry.children ?? [])])
    .find((entry) => entry.href === path);
  return (
    <PageHeader
      title={item?.label ?? 'Dashboard'}
      subtitle="A page of the sample app."
      primaryAction={<Button variant="outline">Refresh</Button>}
    />
  );
}

function SampleApp({
  startPath = '/sites',
  hasPanelToggle = false,
}: {
  startPath?: string;
  /** Panel icons on the header's toggle (accent while expanded), and no collapse button in the sidebar. */
  hasPanelToggle?: boolean;
}) {
  const [path, setPath] = useState(startPath);
  const [isCollapsed, setCollapsed] = useState(false);
  const [scope, setScope] = useState<HierarchyPath>(initialScope);
  const brand = (
    <StoryLink href="/" className="rounded-control text-base font-semibold text-fg outline-none">
      Gridline
    </StoryLink>
  );
  return (
    <NavigateContext.Provider value={setPath}>
      <LinkContext.Provider value={StoryLink}>
        <AppShell
          header={
            <Header
              brand={brand}
              environmentLabel="Staging"
              menuToggleIcon={hasPanelToggle ? panelMenuToggleIcon : undefined}
              menuToggleClassName={
                hasPanelToggle
                  ? ({ isExpanded }) => (isExpanded ? 'text-accent-fg' : undefined)
                  : undefined
              }
              scopePicker={
                <HierarchyPicker
                  tree={scopes}
                  levels={levels}
                  value={scope}
                  onSelect={setScope}
                  recent={[[acme, south, depot3]]}
                />
              }
              statusBar={<StatusBar categories={categories} asOf={Date.UTC(2026, 9, 15, 15, 42)} />}
              actions={
                <>
                  <IconButton icon={CircleHelp} aria-label="Help" />
                  <SettingsMenu />
                </>
              }
              compactActions={
                <>
                  <MenuSection aria-label="Help">
                    <MenuItem id="help" icon={CircleHelp}>
                      Help
                    </MenuItem>
                  </MenuSection>
                  <SettingsMenuItems />
                </>
              }
              userMenu={
                <UserMenu name="Ada Lovelace" secondary="Acme Energy · Administrator">
                  <MenuSection aria-label="Account">
                    <MenuItem id="profile">Profile</MenuItem>
                    <MenuItem id="sign-out">Sign out</MenuItem>
                  </MenuSection>
                </UserMenu>
              }
            />
          }
          sidebar={
            <Sidebar
              sections={sections}
              currentPath={path}
              isCollapsed={isCollapsed}
              onCollapsedChange={setCollapsed}
              hasCollapseButton={!hasPanelToggle}
              drawerHeader={brand}
            />
          }
          bottomBar={
            <BottomTabBar
              items={[
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
                { id: 'sites', label: 'Sites', icon: MapPin, href: '/sites', badge: 3 },
                { id: 'usage', label: 'Usage', icon: BarChart3, href: '/usage' },
                { id: 'invoices', label: 'Invoices', icon: Receipt, href: '/invoices' },
              ]}
              currentPath={path}
              hasMoreButton
            />
          }
          footer={
            <Footer
              version="2.4.0"
              build="a1b2c3d"
              links={[
                { id: 'status', label: 'Service status', href: '/status' },
                { id: 'privacy', label: 'Privacy', href: '/privacy' },
              ]}
            />
          }
        >
          {path.startsWith('/sites') ? <SitesPage /> : <OtherPage path={path} />}
        </AppShell>
      </LinkContext.Provider>
    </NavigateContext.Provider>
  );
}

/**
 * A complete app frame. Resize the window (or use the viewport toolbar): phones get a drawer, a compact header and a
 * bottom tab bar; tablets get the icon rail; desktop gets the full sidebar, which collapses to a rail. Links change
 * the page through the app's `LinkComponent`.
 */
export const SampleApp_: Story = {
  name: 'Sample app',
  render: () => <SampleApp />,
};

/**
 * The header's menu toggle as the only sidebar control: panel icons on tablet and desktop (`panelMenuToggleIcon`),
 * coloured while the sidebar is expanded, with the menu icon kept on phones. The sidebar's own collapse button is
 * hidden (`hasCollapseButton={false}`).
 */
export const HeaderPanelToggle: Story = {
  name: 'Header panel toggle',
  render: () => <SampleApp hasPanelToggle />,
};
