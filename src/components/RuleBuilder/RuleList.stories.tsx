import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { observatoryActions, observatoryFields, observatoryRules } from '../../../test/rules';
import { Button } from '../Button/Button';
import { Drawer } from '../Drawer/Drawer';
import { RuleBuilder } from './RuleBuilder';
import { RuleList } from './RuleList';
import type { Rule } from './types';

const meta = {
  title: 'Inputs/RuleList',
  component: RuleList,
  args: {
    label: 'Alert rules',
    fields: observatoryFields,
    actions: observatoryActions,
    defaultValue: observatoryRules,
  },
} satisfies Meta<typeof RuleList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** Rules in evaluation order: the first match wins. Drag, or use the move buttons, to reorder; switch rules off. */
export const Default: Story = {
  render: (args) => (
    <div className="max-w-3xl">
      <RuleList {...args} allowsRemoving />
    </div>
  ),
};

/** Without summaries, just names and switches. */
export const Compact: Story = {
  render: (args) => (
    <div className="max-w-xl">
      <RuleList {...args} hasSummary={false} />
    </div>
  ),
};

/** Read-only: the order and states show, nothing moves. */
export const ReadOnly: Story = {
  render: (args) => (
    <div className="max-w-3xl">
      <RuleList {...args} isReadOnly />
    </div>
  ),
};

function EditableRules() {
  const [rules, setRules] = useState<Rule[]>(observatoryRules);
  const [editing, setEditing] = useState<Rule | null>(null);
  return (
    <div className="max-w-3xl">
      <RuleList
        label="Alert rules"
        fields={observatoryFields}
        actions={observatoryActions}
        value={rules}
        onChange={setRules}
        onEdit={setEditing}
        allowsRemoving
      />
      <Drawer
        title={editing?.name ?? ''}
        isOpen={editing !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditing(null);
          }
        }}
        footer={
          <Button
            onPress={() => {
              if (editing) {
                setRules(rules.map((rule) => (rule.id === editing.id ? editing : rule)));
              }
              setEditing(null);
            }}
          >
            Save
          </Button>
        }
      >
        {editing && (
          <RuleBuilder
            fields={observatoryFields}
            actions={observatoryActions}
            value={editing}
            onChange={setEditing}
          />
        )}
      </Drawer>
    </div>
  );
}

/** Each rule's edit button opens a RuleBuilder in a Drawer. */
export const EditInDrawer: Story = {
  tags: ['!visual'],
  render: () => <EditableRules />,
};
