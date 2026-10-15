import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { TextArea } from './TextArea';

const meta = {
  title: 'Inputs/TextArea',
  component: TextArea,
  args: { label: 'Notes', placeholder: 'Anything the installer should know' },
} satisfies Meta<typeof TextArea>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <TextArea label="Notes" description="Visible to everyone on the project" isRequired />
      <TextArea
        label="Reason for change"
        isInvalid
        errorMessage="Tell us why the tariff changed"
        defaultValue="Because"
      />
      <TextArea
        label="Read-only"
        isReadOnly
        defaultValue="Installed on 4 March by the north team."
      />
      <TextArea label="Disabled" isDisabled defaultValue="Archived" />
    </div>
  ),
};

/** The area grows with its content from `minRows` up to `maxRows`, then scrolls. */
export const AutoGrow: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <TextArea label="One row to start" minRows={1} maxRows={4} defaultValue="Short" />
      <TextArea
        label="Capped at four rows"
        minRows={2}
        maxRows={4}
        defaultValue={[
          'Line one',
          'Line two',
          'Line three',
          'Line four',
          'Line five',
          'Line six',
        ].join('\n')}
      />
    </div>
  ),
};

/** With `maxLength` and `hasCharacterCount`, a counter shows how much is left. */
export const CharacterCount: Story = {
  render: () => (
    <div className="max-w-md">
      <TextArea
        label="Site description"
        description="Shown on the public status page"
        maxLength={140}
        hasCharacterCount
        defaultValue="Rooftop array with 42 panels and a battery."
      />
    </div>
  ),
};

/** Side labels sit beside the area in wide containers and move on top in narrow ones. */
export const SideLabel: Story = {
  render: () => (
    <div className="max-w-xl">
      <TextArea label="Notes" labelPosition="side" description="Visible to your team" />
    </div>
  ),
};

/** Controlled with `value` / `onChange`. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function ControlledStory() {
    const [value, setValue] = useState('');
    return (
      <div className="flex max-w-md flex-col gap-2">
        <TextArea
          label="Message"
          value={value}
          onChange={setValue}
          maxLength={280}
          hasCharacterCount
        />
        <p className="text-sm text-fg-muted">
          {value.split('\n').length} line{value.split('\n').length === 1 ? '' : 's'}
        </p>
      </div>
    );
  },
};
