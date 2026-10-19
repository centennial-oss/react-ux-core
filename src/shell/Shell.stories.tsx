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
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../components/Badge/Badge';
import { Button } from '../components/Button/Button';
import { IconButton } from '../components/IconButton/IconButton';
import { MenuItem, MenuSection } from '../components/Menu/Menu';
import { StatusDot } from '../components/StatusDot/StatusDot';
import { TabPanel } from '../components/Tabs/Tabs';
import { BottomTabBar } from './BottomTabBar';
import { Footer } from './Footer';
import { Header } from './Header';
import { HierarchyPicker } from './hierarchy/HierarchyPicker';
import { PageHeader } from './PageHeader';
import { SettingsMenu } from './SettingsMenu';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import type { HierarchyNode, HierarchyPath, NavSection, StatusCategory } from './types';
import { UserMenu } from './UserMenu';

const meta = {
  title: 'Shell/Parts',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

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
    ],
  },
  {
    id: 'billing',
    title: 'Billing',
    items: [
      { id: 'invoices', label: 'Invoices', icon: Receipt, href: '/invoices' },
      { id: 'tariffs', label: 'Tariffs', icon: Zap, href: '/tariffs' },
    ],
  },
];

/** The expanded sidebar: sections with headings, badges, and a parent open around the current page. */
export const SidebarExpanded: Story = {
  render: () => {
    const [isCollapsed, setCollapsed] = useState(false);
    return (
      <div className="h-[30rem]">
        <Sidebar
          sections={sections}
          currentPath="/sites/map"
          isCollapsed={isCollapsed}
          onCollapsedChange={setCollapsed}
          footer={<span className="text-xs text-fg-muted">Acme Energy</span>}
        />
      </div>
    );
  },
};

/** The icon rail: each icon is named by a tooltip; Sites opens its pages in a flyout. */
export const SidebarRail: Story = {
  render: () => {
    const [isCollapsed, setCollapsed] = useState(true);
    return (
      <div className="h-[30rem]">
        <Sidebar
          sections={sections}
          currentPath="/sites/map"
          isCollapsed={isCollapsed}
          onCollapsedChange={setCollapsed}
        />
      </div>
    );
  },
};

const plant12: HierarchyNode = { id: 'plant-12', label: 'Plant 12', description: 'Denver, CO' };
const plant14: HierarchyNode = { id: 'plant-14', label: 'Plant 14', description: 'Boulder, CO' };
const depot3: HierarchyNode = { id: 'depot-3', label: 'Depot 3', description: 'Austin, TX' };
const north: HierarchyNode = { id: 'north', label: 'North', children: [plant12, plant14] };
const south: HierarchyNode = { id: 'south', label: 'South', children: [depot3] };
const globex: HierarchyNode = { id: 'globex', label: 'Globex', children: [] };
const acme: HierarchyNode = { id: 'acme', label: 'Acme Energy', children: [north, south] };
const levels = [
  { id: 'org', label: 'Organisation' },
  { id: 'region', label: 'Region' },
  { id: 'location', label: 'Location' },
];

const categories: StatusCategory[] = [
  {
    id: 'meters',
    label: 'Meters',
    icon: Gauge,
    severity: 'warning',
    alerts: [{ id: 'offline', text: 'Meters not reporting', count: 3, severity: 'warning' }],
  },
  { id: 'billing', label: 'Billing', icon: Receipt, severity: 'ok', alerts: [] },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Plug,
    severity: 'error',
    alerts: [
      {
        id: 'sync',
        text: 'Accounting sync failed',
        severity: 'error',
        action: { label: 'Retry', onPress: () => undefined },
      },
    ],
  },
];

/** The header with every slot, marked as a staging deployment. */
export const HeaderWithEverything: Story = {
  render: () => {
    const [scope, setScope] = useState<HierarchyPath>([acme, north, plant12]);
    return (
      <Header
        brand={<span className="text-base font-semibold">Gridline</span>}
        environmentLabel="Staging"
        scopePicker={
          <HierarchyPicker
            tree={[acme, globex]}
            levels={levels}
            value={scope}
            onSelect={setScope}
          />
        }
        statusBar={<StatusBar categories={categories} />}
        actions={
          <>
            <IconButton icon={CircleHelp} aria-label="Help" />
            <SettingsMenu />
          </>
        }
        userMenu={
          <UserMenu name="Ada Lovelace" secondary="Acme Energy · Administrator">
            <MenuSection aria-label="Account">
              <MenuItem id="sign-out">Sign out</MenuItem>
            </MenuSection>
          </UserMenu>
        }
      />
    );
  },
};

/**
 * The scope picker's panel: search across every location, Recent, and a column per level. Acme is the only
 * organisation, so its level is skipped.
 */
export const HierarchyPickerOpen: Story = {
  tags: ['visual-page'],
  render: () => {
    const [scope, setScope] = useState<HierarchyPath>([acme, north, plant12]);
    return (
      <HierarchyPicker
        tree={[acme]}
        levels={levels}
        value={scope}
        onSelect={setScope}
        recent={[[acme, south, depot3]]}
        searchLeaves={(query) =>
          Promise.resolve(
            [plant12, plant14, depot3]
              .filter((leaf) => leaf.label.toLowerCase().includes(query.toLowerCase()))
              .map((leaf) => [acme, leaf === depot3 ? south : north, leaf]),
          )
        }
        defaultOpen
      />
    );
  },
};

/** A page header with breadcrumbs, a status, actions and tabs (a Select on phones). */
export const PageHeaderWithTabs: Story = {
  render: () => (
    <PageHeader
      breadcrumbs={[
        { id: 'sites', label: 'Sites', href: '/sites' },
        { id: 'north', label: 'North', href: '/sites/north' },
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
    >
      {['overview', 'meters', 'tariff', 'contacts', 'history'].map((id) => (
        <TabPanel key={id} id={id} className="pt-4 text-sm text-fg-muted">
          Tab content.
        </TabPanel>
      ))}
    </PageHeader>
  ),
};

/** A plain page header: a title, subtitle and one action. */
export const PageHeaderSimple: Story = {
  render: () => (
    <PageHeader
      title="Invoices"
      subtitle="All invoices for Acme Energy"
      primaryAction={<Button variant="outline">Export</Button>}
    />
  ),
};

/** Status categories; each opens its alerts. Phones show one dot with the worst severity. */
export const StatusBarCategories: Story = {
  render: () => <StatusBar categories={categories} updatedAt={Date.UTC(2026, 9, 15, 15, 42)} />,
};

/** The footer: version, build, the time zone and links. */
export const FooterWithLinks: Story = {
  render: () => (
    <Footer
      version="2.4.0"
      build="a1b2c3d"
      links={[
        { id: 'status', label: 'Service status', href: '/status' },
        { id: 'privacy', label: 'Privacy', href: '/privacy' },
      ]}
    />
  ),
};

/** The phone tab bar (shown on phones only), with a badge and More. */
export const BottomTabs: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    // A transform makes this box the containing block of the fixed bar, so the bar sits at its bottom (in an app,
    // it's the bottom of the screen).
    <div className="relative h-40 translate-z-0">
      <BottomTabBar
        items={[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
          { id: 'sites', label: 'Sites', icon: MapPin, href: '/sites', badge: 3 },
          { id: 'usage', label: 'Usage', icon: BarChart3, href: '/usage' },
          { id: 'invoices', label: 'Invoices', icon: Receipt, href: '/invoices' },
        ]}
        currentPath="/sites"
        hasMoreButton
      />
    </div>
  ),
};
