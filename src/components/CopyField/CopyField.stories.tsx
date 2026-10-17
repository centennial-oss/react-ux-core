import type { Meta, StoryObj } from '@storybook/react-vite';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { IconButton } from '../IconButton/IconButton';
import { CopyButton } from './CopyButton';
import { CopyField } from './CopyField';

const archiveId =
  'urn:observatory:archive:north-ridge:surveys/2026/messier/m31/andromeda-mosaic-final-v12.fits';

const meta = {
  title: 'Inputs/CopyField',
  component: CopyField,
  args: { label: 'Webhook URL', value: 'https://hooks.example.com/telescope/7f3c9a' },
} satisfies Meta<typeof CopyField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const Variants: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <CopyField label="Observation ID" value="OBS-2026-10-16-0042" />
      <CopyField
        label="Archive object"
        description="The middle is cut, so the file name stays visible."
        value={archiveId}
        truncate="middle"
      />
      <CopyField label="Archive object (end)" value={archiveId} />
      <CopyField label="Ingest command" value="astro ingest --site mauna-kea --night 2026-10-16" />
      <CopyField label="Station name" value="Northern Ridge Observatory" isMonospace={false} />
      <CopyField label="Small" size="sm" value="m31-andromeda" />
      <CopyField label="Disabled" isDisabled value="OBS-2026-10-16-0001" />
      <CopyField label="Side label" labelPosition="side" value="OBS-2026-10-16-0042" />
    </div>
  ),
};

/** Extra actions sit before the copy button. */
export const WithActions: Story = {
  render: () => (
    <div className="max-w-md">
      <CopyField
        label="Webhook URL"
        value="https://hooks.example.com/telescope/7f3c9a"
        actions={
          <>
            <IconButton icon={ExternalLink} size="sm" aria-label="Open webhook URL" />
            <IconButton icon={RefreshCw} size="sm" aria-label="Regenerate webhook URL" />
          </>
        }
      />
    </div>
  ),
};

/** CopyButton on its own, beside any text. */
export const Button: StoryObj<typeof CopyButton> = {
  render: () => (
    <p className="flex items-center gap-2 text-sm text-fg">
      <code className="font-mono">OBS-2026-10-16-0042</code>
      <CopyButton value="OBS-2026-10-16-0042" label="observation ID" />
    </p>
  ),
};
