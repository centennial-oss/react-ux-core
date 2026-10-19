import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { TagField } from './TagField';

const languages = [
  'C',
  'C#',
  'C++',
  'Elixir',
  'Go',
  'Haskell',
  'Java',
  'JavaScript',
  'Kotlin',
  'Python',
  'Ruby',
  'Rust',
  'Swift',
  'TypeScript',
];

function emailProblem(tag: string): string | undefined {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tag) ? undefined : 'Not an email address';
}

const meta = {
  title: 'Inputs/TagField',
  component: TagField,
  args: { label: 'Tags', placeholder: 'Add tags' },
} satisfies Meta<typeof TagField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  tags: ['!visual'],
  args: { description: 'Press Enter or type a comma after each tag.' },
};

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <TagField
        label="Keywords"
        placeholder="Add keywords"
        description="Press Enter or type a comma after each one."
      />
      <TagField label="Keywords" defaultValue={['solar', 'battery', 'grid-tied']} />
      <TagField
        label="Recipients"
        defaultValue={['ada@example.com', 'grace@example', 'katherine@example.com']}
        validateTag={emailProblem}
      />
      <TagField
        label="Keywords"
        isRequired
        isInvalid
        errorMessage="Add at least one keyword"
        placeholder="Add keywords"
      />
      <TagField label="Keywords" defaultValue={['solar', 'battery']} isReadOnly />
      <TagField label="Keywords" defaultValue={['solar', 'battery']} isDisabled />
      <TagField label="Keywords" size="sm" defaultValue={['solar', 'battery']} />
      <TagField
        label="Keywords"
        labelPosition="side"
        infoTip="Used for search."
        defaultValue={['solar']}
      />
    </div>
  ),
};

/** Suggestions filter as you type; anything else can still be added. */
export const Suggestions: Story = {
  render: () => (
    <div className="max-w-md">
      <TagField
        label="Languages"
        suggestions={languages}
        defaultValue={['TypeScript', 'Go']}
        placeholder="Add languages"
      />
    </div>
  ),
};

/** `allowsCustomValue={false}` accepts only tags from the list, and `maxItems` caps how many. */
export const FromListOnly: Story = {
  render: () => (
    <div className="max-w-md">
      <TagField
        label="Languages"
        description="Up to three, from the list."
        suggestions={languages}
        allowsCustomValue={false}
        maxItems={3}
        defaultValue={['Rust']}
      />
    </div>
  ),
};

/** Drag tags into order, or focus a tag, press Tab to its handle, and use Enter and the arrow keys. */
export const Reorderable: Story = {
  render: () => (
    <div className="max-w-md">
      <TagField
        label="Priority order"
        description="Drag to reorder; the first is the most important."
        isReorderable
        defaultValue={['Security', 'Performance', 'Accessibility', 'Cost']}
      />
    </div>
  ),
};

/** Paste a list such as "a, b, c" or one item per line: it splits into tags. */
export const PasteAList: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="max-w-md">
      <TagField
        label="Recipients"
        description="Paste a list of addresses, separated by commas, semicolons or lines."
        delimiters={[',', ';']}
        validateTag={emailProblem}
      />
    </div>
  ),
};

function ControlledExample() {
  const [value, setValue] = useState<string[]>(['north', 'south']);
  return (
    <div className="flex max-w-md flex-col gap-3">
      <TagField label="Regions" value={value} onChange={setValue} isReorderable />
      <output className="text-sm text-fg-muted">{JSON.stringify(value)}</output>
    </div>
  );
}

export const Controlled: Story = {
  tags: ['!visual'],
  render: () => <ControlledExample />,
};

/** Long tags truncate inside the field instead of widening the page. */
export const LongTags: Story = {
  render: () => (
    <div className="max-w-xs">
      <TagField
        label="Paths"
        defaultValue={[
          'src/components/TagField/TagField.stories.tsx',
          'docs',
          'a-very-long-tag-without-any-spaces-that-would-otherwise-overflow',
        ]}
      />
    </div>
  ),
};
