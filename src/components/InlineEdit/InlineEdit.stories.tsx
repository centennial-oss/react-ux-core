import type { Meta, StoryObj } from '@storybook/react-vite';
import { Option } from '../ListBox/ListBoxParts';
import { NumberField } from '../NumberField/NumberField';
import { Select } from '../Select/Select';
import { InlineEdit } from './InlineEdit';

// Stories of the string version; CustomEditors shows other values.
const StringInlineEdit = InlineEdit<string>;

const meta = {
  title: 'Inputs/InlineEdit',
  component: StringInlineEdit,
  args: { label: 'Project name', defaultValue: 'Apollo guidance computer' },
} satisfies Meta<typeof StringInlineEdit>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** Text or a heading with its edit button; pressing anywhere on the text edits it. */
export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <InlineEdit
        aria-label="Project name"
        headingLevel={2}
        defaultValue="Apollo guidance computer"
      />
      <InlineEdit label="Owner" defaultValue="Margaret Hamilton" />
      <InlineEdit label="Description" placeholder="Add a description" />
      <InlineEdit
        label="Notes"
        isMultiline
        defaultValue={'Flight software for the command module.\nReviewed weekly.'}
      />
      <InlineEdit label="Mission" defaultValue="Apollo 11" isDisabled />
      <InlineEdit label="Project code" defaultValue="AGC-1969" isReadOnly />
    </div>
  ),
};

/** The field in place of the text, with Save and Cancel; a heading edits in its own font. */
export const Editing: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <InlineEdit
        aria-label="Project name"
        headingLevel={2}
        defaultValue="Apollo guidance computer"
        defaultEditing
      />
      <InlineEdit
        label="Owner"
        description="Shown on the project page."
        defaultValue="Margaret Hamilton"
        defaultEditing
      />
      <InlineEdit
        label="Notes"
        isMultiline
        minRows={2}
        defaultValue={'Flight software for the command module.\nReviewed weekly.'}
        defaultEditing
      />
      <InlineEdit label="Tag" size="sm" defaultValue="guidance" defaultEditing />
    </div>
  ),
};

/**
 * `onSave` returns a promise: the Save button spins and the field is read-only until it settles. Here a name
 * containing "taken" fails with a message, and an empty one fails `validate` as you type.
 */
export const AsyncSave: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="max-w-md">
      <InlineEdit
        label="Project name"
        defaultValue="Apollo guidance computer"
        validate={(value) => (value.trim() === '' ? 'Enter a name.' : null)}
        onSave={async (value) => {
          await new Promise((resolve) => {
            setTimeout(resolve, 800);
          });
          return value.includes('taken') ? 'That name is already taken.' : undefined;
        }}
      />
    </div>
  ),
};

/** What leaving the field does: save (the default), cancel, or keep it open. */
export const BlurActions: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <InlineEdit label="Saves on blur" defaultValue="Apollo" />
      <InlineEdit label="Cancels on blur" defaultValue="Gemini" blurAction="cancel" />
      <InlineEdit label="Stays open" defaultValue="Mercury" blurAction="none" />
      <InlineEdit label="No buttons" defaultValue="Skylab" hasActionButtons={false} />
    </div>
  ),
};

/** Any field through `renderEditor`, with `formatValue` for the text: a NumberField and a Select. */
export const CustomEditors: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <InlineEdit<number | null>
        label="Exposure"
        defaultValue={30}
        formatValue={(seconds) => (seconds === null ? '' : `${seconds} s`)}
        renderEditor={(props) => <NumberField {...props} minValue={1} suffix="s" />}
      />
      <InlineEdit
        label="Status"
        defaultValue="review"
        formatValue={(id) => statuses.find((status) => status.id === id)?.label ?? ''}
        renderEditor={(props) => (
          <Select<object, string> {...props}>
            {statuses.map((status) => (
              <Option key={status.id} id={status.id}>
                {status.label}
              </Option>
            ))}
          </Select>
        )}
      />
    </div>
  ),
};

const statuses = [
  { id: 'draft', label: 'Draft' },
  { id: 'review', label: 'In review' },
  { id: 'done', label: 'Done' },
];
