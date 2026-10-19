import type { Meta, StoryObj } from '@storybook/react-vite';
import { LayoutTemplate } from 'lucide-react';
import { useState } from 'react';
import { sampleLibrary } from '../../../test/dashboard';
import { Button } from '../../components/Button/Button';
import type { CollectionChangeResult, DashboardCollection, PageTemplate } from '../types';
import { ManageDashboardsDialog } from './ManageDashboardsDialog';

const meta = {
  title: 'Dashboard/ManageDashboardsDialog',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const templates: PageTemplate[] = [
  {
    id: 'service',
    name: 'Service health',
    description: 'Uptime, error rate and latency',
    icon: LayoutTemplate,
    widgets: [{ id: 'figures', type: 'ccux.statGroup', title: 'Figures', layout: { w: 12, h: 3 } }],
  },
  {
    id: 'traffic',
    name: 'Traffic',
    description: 'Requests by region',
    widgets: [{ id: 'requests', type: 'ccux.timeSeriesChart', layout: { w: 12, h: 5 } }],
  },
];

function personal(): DashboardCollection {
  const [collection] = sampleLibrary().collections;
  if (!collection) {
    throw new Error('The sample library has a personal collection.');
  }
  return collection;
}

function Host({
  apply = () => Promise.resolve(),
  editNotice,
}: {
  apply?: () => Promise<CollectionChangeResult>;
  editNotice?: string;
}) {
  const [collection, setCollection] = useState(personal);
  const [isOpen, setOpen] = useState(true);
  return (
    <div className="p-4">
      <Button
        onPress={() => {
          setOpen(true);
        }}
      >
        Manage dashboards
      </Button>
      <ManageDashboardsDialog
        collection={collection}
        isOpen={isOpen}
        onOpenChange={setOpen}
        onApplyCollectionChanges={apply}
        onApplied={(dashboards) => {
          setCollection((current) => ({ ...current, dashboards }));
        }}
        templates={templates}
        editNotice={editNotice}
      />
    </div>
  );
}

/** Rename, reorder (drag or buttons), move pages between dashboards, copy, delete, then Apply once (§13). */
export const Default: Story = {
  tags: ['visual-page'],
  render: () => <Host />,
};

/** A shared collection restates its notice (PERM-03). */
export const SharedNotice: Story = {
  tags: ['!visual'],
  render: () => (
    <Host editNotice="This collection is shared with your team. Changes affect everyone." />
  ),
};

/** The store refuses part of the change set: the dialog stays open and marks what wasn't applied (MGMT-06). */
export const PartialFailure: Story = {
  tags: ['!visual'],
  render: () => (
    <Host
      apply={() =>
        Promise.resolve({ failed: [{ id: 'ops', error: new Error('You no longer own this.') }] })
      }
    />
  ),
};
