import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SearchField } from './SearchField';

const SITES = [
  'North depot',
  'South depot',
  'Harbour office',
  'Hilltop array',
  'Riverside battery',
];

const meta = {
  title: 'Inputs/SearchField',
  component: SearchField,
  args: { label: 'Search sites', placeholder: 'Name or ID' },
} satisfies Meta<typeof SearchField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <SearchField label="Search" placeholder="Sites, devices or people" />
      <SearchField label="With a query" defaultValue="battery" />
      <SearchField
        label="Invalid"
        defaultValue="a"
        isInvalid
        errorMessage="Enter at least 2 characters"
      />
      <SearchField label="Disabled" isDisabled placeholder="Search" />
      <SearchField label="Small" size="sm" placeholder="Search" />
      <SearchField aria-label="Search the table" placeholder="Search without a visible label" />
    </div>
  ),
};

/** With `hasShortcut`, pressing "/" anywhere on the page focuses the field. The hint hides on touch screens. */
export const Shortcut: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="max-w-md">
      <SearchField label="Search" placeholder="Press / to jump here" hasShortcut />
    </div>
  ),
};

/** `onSearch` runs once typing pauses (300 ms by default); Enter runs it at once. */
export const LiveResults: Story = {
  tags: ['!visual'],
  render: function LiveResultsStory() {
    const [query, setQuery] = useState('');
    const results = SITES.filter((site) => site.toLowerCase().includes(query.toLowerCase()));
    return (
      <div className="flex max-w-md flex-col gap-3">
        <SearchField label="Search sites" onSearch={setQuery} hasShortcut />
        <ul className="flex flex-col gap-1 text-sm text-fg">
          {results.map((site) => (
            <li key={site}>{site}</li>
          ))}
        </ul>
      </div>
    );
  },
};

/** Controlled with `value` / `onChange`, which fires on every keystroke. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function ControlledStory() {
    const [query, setQuery] = useState('depot');
    return (
      <div className="flex max-w-md flex-col gap-2">
        <SearchField label="Search" value={query} onChange={setQuery} />
        <p className="text-sm text-fg-muted">Query: {query || 'empty'}</p>
      </div>
    );
  },
};
