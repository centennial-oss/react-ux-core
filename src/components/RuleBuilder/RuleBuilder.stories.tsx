import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { observatoryActions, observatoryFields, weatherHoldRule } from '../../../test/rules';
import { RuleBuilder, type RuleBuilderProps } from './RuleBuilder';
import type { Rule } from './types';

const emptyRule: Rule = {
  id: 'new',
  name: '',
  isEnabled: true,
  when: { id: 'root', join: 'and', items: [] },
  then: [],
};

/** One condition per value editor: text, number, enum, multi-enum, boolean, date, duration and CIDR. */
const everyTypeRule: Rule = {
  id: 'every',
  name: 'Every value type',
  isEnabled: true,
  when: {
    id: 'root',
    join: 'and',
    items: [
      { id: 't', fieldId: 'target', operator: 'startsWith', value: 'M' },
      { id: 'n', fieldId: 'temperature', operator: 'between', value: [-5, 2] },
      { id: 'e', fieldId: 'instrument', operator: 'in', value: ['nr1', 'allsky'] },
      { id: 'm', fieldId: 'filters', operator: 'contains', value: ['r', 'ha'] },
      { id: 'b', fieldId: 'dome', operator: 'equals', value: true },
      { id: 'd', fieldId: 'night', operator: 'gt', value: '2026-10-16' },
      { id: 'w', fieldId: 'window', operator: 'lt', value: 5_400_000 },
      { id: 'c', fieldId: 'source', operator: 'in', value: ['192.0.2.0/24'] },
    ],
  },
  then: [{ actionId: 'pause', settings: 3_600_000 }],
};

const invalidRule: Rule = {
  ...emptyRule,
  name: 'Needs fixing',
  when: {
    id: 'root',
    join: 'and',
    items: [
      { id: 'p', fieldId: 'target', operator: 'matches', value: '(M3' },
      { id: 'r', fieldId: 'wind', operator: 'between', value: [40, 10] },
    ],
  },
};

function Stateful({ initial, ...props }: { initial: Rule } & Partial<RuleBuilderProps>) {
  const [rule, setRule] = useState(initial);
  return (
    <div className="max-w-4xl">
      <RuleBuilder
        fields={observatoryFields}
        actions={observatoryActions}
        value={rule}
        onChange={setRule}
        {...props}
      />
    </div>
  );
}

const meta = {
  title: 'Inputs/RuleBuilder',
  component: RuleBuilder,
  args: { fields: observatoryFields, actions: observatoryActions, defaultValue: weatherHoldRule },
} satisfies Meta<typeof RuleBuilder>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** An observatory alert: three conditions (two in a nested OR group) and two actions, read back as a summary. */
export const AlertRule: Story = {
  render: () => <Stateful initial={weatherHoldRule} />,
};

/** A new rule: add conditions, a nested group and actions. */
export const Empty: Story = {
  render: () => <Stateful initial={emptyRule} />,
};

/** Every value editor: text, a number range, enum lists, a boolean switch, a date, a duration and CIDR blocks. */
export const EveryValueType: Story = {
  render: () => <Stateful initial={everyTypeRule} />,
};

/** Values are checked by type: a bad regular expression and a range that ends before it starts. */
export const Validation: Story = {
  render: () => <Stateful initial={invalidRule} />,
};

/** Conditions only, without a name or actions: a segment or a filter. `maxDepth={3}` lets groups nest twice. */
export const ConditionsOnly: Story = {
  render: () => (
    <Stateful initial={weatherHoldRule} actions={[]} hasNameField={false} maxDepth={3} />
  ),
};

/** Disabled: the rule can be read but not changed. */
export const Disabled: Story = {
  render: () => <Stateful initial={weatherHoldRule} isDisabled />,
};
