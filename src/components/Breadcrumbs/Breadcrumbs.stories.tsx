import type { Meta, StoryObj } from '@storybook/react-vite';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';

const SHORT: BreadcrumbItem[] = [
  { id: 'home', label: 'Home', href: '#home' },
  { id: 'sites', label: 'Sites', href: '#sites' },
  { id: 'plant', label: 'Plant 12' },
];

const LONG: BreadcrumbItem[] = [
  { id: 'org', label: 'Centennial Utilities', href: '#org' },
  { id: 'region', label: 'Northern region', href: '#region' },
  { id: 'sites', label: 'Industrial sites', href: '#sites' },
  { id: 'plant', label: 'Plant 12 (Riverside)', href: '#plant' },
  { id: 'meters', label: 'Meters', href: '#meters' },
  { id: 'meter', label: 'Meter M-1042' },
];

const meta = {
  title: 'Display/Breadcrumbs',
  component: Breadcrumbs,
  args: { items: SHORT },
} satisfies Meta<typeof Breadcrumbs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** Links to each level, with the current page last (`aria-current="page"`, not a link). */
export const Basic: Story = { tags: ['!visual'] };

/**
 * A long trail at full width. Where it doesn't fit (on phones), the middle items collapse into a menu, keeping the
 * first item and as many of the items nearest the current page as fit.
 */
export const LongTrail: Story = {
  args: { items: LONG },
};

/** The same trail in a narrow column: collapsed. The menu's items are links too. */
export const Collapsed: Story = {
  args: { items: LONG },
  render: (args) => (
    <div className="max-w-72 rounded-card border border-border bg-surface-2 p-3">
      <Breadcrumbs {...args} />
    </div>
  ),
};

/** When even the first and last items don't fit beside the menu, their labels truncate instead of widening the page. */
export const Truncated: Story = {
  args: {
    items: [
      { id: 'org', label: 'Centennial Utilities Holdings International', href: '#org' },
      { id: 'region', label: 'Northern region', href: '#region' },
      { id: 'meter', label: 'Meter M-1042 on the main incoming supply at Riverside' },
    ],
  },
  render: (args) => (
    <div className="max-w-60">
      <Breadcrumbs {...args} />
    </div>
  ),
};
