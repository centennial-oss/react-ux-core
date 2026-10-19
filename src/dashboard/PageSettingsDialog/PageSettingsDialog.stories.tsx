import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { sampleLibrary } from '../../../test/dashboard';
import { Button } from '../../components/Button/Button';
import type { DashboardDocument, GridSettingsPolicy } from '../types';
import { withPageSettings } from './pageSettings';
import { PageSettingsDialog } from './PageSettingsDialog';

const meta = {
  title: 'Dashboard/PageSettingsDialog',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function operations(): DashboardDocument {
  const document = sampleLibrary().collections[0]?.dashboards[0];
  if (!document) {
    throw new Error('The sample library has an operations dashboard.');
  }
  return document;
}

const typeOf = () => undefined;

function Host({ policy }: { policy?: GridSettingsPolicy }) {
  const [document, setDocument] = useState(operations);
  const [isOpen, setOpen] = useState(true);
  const page = document.pages[0];
  if (!page) {
    return null;
  }
  return (
    <div className="p-4">
      <Button
        onPress={() => {
          setOpen(true);
        }}
      >
        Page settings
      </Button>
      <PageSettingsDialog
        document={document}
        page={page}
        typeOf={typeOf}
        policy={policy}
        isOpen={isOpen}
        onOpenChange={setOpen}
        onApply={(settings) => {
          setDocument((current) => withPageSettings(current, page.id, settings, undefined, typeOf));
        }}
      />
    </div>
  );
}

/** Title, columns, row sizing, density and compaction, with a preview of the rescaled layout (EDIT-26, GRID-03). */
export const Default: Story = {
  tags: ['visual-page'],
  render: () => <Host />,
};

/** The host locks the column count and where settings are stored. */
export const LockedFields: Story = {
  tags: ['!visual'],
  render: () => <Host policy={{ lockedFields: ['columns', 'scope'] }} />,
};
