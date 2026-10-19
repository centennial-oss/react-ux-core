import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { KeyValueEditor, type KeyValuePair } from './KeyValueEditor';

const headers: KeyValuePair[] = [
  { id: 'accept', key: 'Accept', value: 'application/json' },
  { id: 'cache', key: 'Cache-Control', value: 'no-cache' },
  { id: 'agent', key: 'User-Agent', value: 'north-ridge-telescope/2.1' },
];

const environment: KeyValuePair[] = [
  { id: 'site', key: 'SITE', value: 'north-ridge' },
  { id: 'telescope', key: 'TELESCOPE', value: 'NR-1' },
  { id: 'token', key: 'ARCHIVE_TOKEN', value: 'nr-7f3c9a1e', isSecret: true },
];

const meta = {
  title: 'Inputs/KeyValueEditor',
  component: KeyValueEditor,
  args: { label: 'Headers', keyLabel: 'Header', defaultValue: headers },
} satisfies Meta<typeof KeyValueEditor>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** HTTP headers with suggested names. Header names are case-insensitive, so duplicates ignore case. */
export const Headers: Story = {
  render: () => (
    <div className="max-w-3xl">
      <KeyValueEditor
        label="Request headers"
        description="Sent with every request to the archive."
        keyLabel="Header"
        keySuggestions={['Accept', 'Authorization', 'Cache-Control', 'Content-Type', 'User-Agent']}
        hasCaseSensitiveKeys={false}
        defaultValue={headers}
      />
    </div>
  ),
};

/** Environment variables with a secret toggle per row. Paste a .env block into a key to add many rows. */
export const EnvironmentVariables: Story = {
  render: () => (
    <div className="max-w-3xl">
      <KeyValueEditor
        label="Environment"
        keyLabel="Variable"
        hasSecretToggle
        maxItems={20}
        defaultValue={environment}
      />
    </div>
  ),
};

/** Duplicate keys are flagged on both rows; a value without a key and custom validation show on the row too. */
export const Errors: Story = {
  render: () => (
    <div className="max-w-3xl">
      <KeyValueEditor
        label="Tags"
        keyLabel="Tag"
        validate={(pair) =>
          pair.key === 'planet' && pair.value === 'Pluto' ? 'Pluto is a dwarf planet' : undefined
        }
        defaultValue={[
          { id: 'a', key: 'moon', value: 'Europa' },
          { id: 'b', key: 'moon', value: 'Titan' },
          { id: 'c', key: '', value: 'orphan' },
          { id: 'd', key: 'planet', value: 'Pluto' },
        ]}
      />
    </div>
  ),
};

/** Narrow containers (phones) show each row as a stacked key/value pair. */
export const Narrow: Story = {
  render: () => (
    <div className="max-w-xs">
      <KeyValueEditor
        label="Environment"
        keyLabel="Variable"
        hasSecretToggle
        defaultValue={environment}
      />
    </div>
  ),
};

export const ReadOnlyAndEmpty: Story = {
  render: () => (
    <div className="flex max-w-3xl flex-col gap-6">
      <KeyValueEditor
        label="Read-only headers"
        keyLabel="Header"
        isReadOnly
        defaultValue={headers}
      />
      <KeyValueEditor label="Query parameters" keyLabel="Parameter" addLabel="Add parameter" />
    </div>
  ),
};

/** Controlled, showing the value as JSON. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function ControlledStory() {
    const [value, setValue] = useState<KeyValuePair[]>(environment);
    return (
      <div className="flex max-w-3xl flex-col gap-4">
        <KeyValueEditor
          label="Environment"
          keyLabel="Variable"
          value={value}
          onChange={setValue}
          hasSecretToggle
        />
        <pre className="overflow-x-auto rounded-card bg-surface-2 p-3 text-xs">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    );
  },
};
