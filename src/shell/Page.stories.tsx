import type { Meta, StoryObj } from '@storybook/react-vite';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { TabPanel } from '../components/Tabs';
import { Plus } from 'lucide-react';
import { Page } from './Page';

const meta = {
  title: 'Shell/Page',
  component: Page,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Page>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithActions: Story = {
  args: {
    title: 'Customers & meters',
    subtitle: 'Newlian Glenn',
    breadcrumbs: [
      { id: 'org', label: 'Newlian Vale Lightwardens', href: '#' },
      { id: 'site', label: 'Newlian Glenn', href: '#' },
      { id: 'page', label: 'Customers & meters' },
    ],
    primaryAction: (
      <Button tone="accent" icon={Plus}>
        Add meter
      </Button>
    ),
    notices: (
      <Banner tone="info">A page-level notice sits between the header and the content.</Banner>
    ),
    children: (
      <Card title="Content" headingLevel={2}>
        The page's content.
      </Card>
    ),
  },
};

export const WithTabs: Story = {
  args: {
    title: 'Elowyth Thornquill',
    subtitle: 'S60R-8AE366 · Residential Plus',
    tabs: [
      { id: 'commercial', label: 'Commercial' },
      { id: 'technical', label: 'Technical' },
    ],
    children: (
      <>
        <TabPanel id="commercial">Commercial details</TabPanel>
        <TabPanel id="technical">Technical details</TabPanel>
      </>
    ),
  },
};
