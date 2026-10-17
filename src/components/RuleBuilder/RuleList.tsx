// RuleList: an ordered list of rules where the first match wins (CDN behaviours, firewall rules, alert routing). Built
// on ReorderableList, so rules move by drag handle, keyboard drag and drop, or up/down buttons, each move announced.
// Every row has an on/off Switch, the rule's summary, and optional edit and remove buttons.

import { Pencil, Trash2 } from 'lucide-react';
import { useState, type ReactNode, type Ref } from 'react';
import { useLocale } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { useControllableState } from '../../utils/useControllableState';
import { Badge } from '../Badge/Badge';
import { IconButton } from '../IconButton/IconButton';
import { ReorderableList, type ReorderableItem } from '../ReorderableList/ReorderableList';
import { Switch } from '../Switch/Switch';
import { defaultRuleBuilderMessages } from './messages';
import { summarizeRule } from './summary';
import type { Rule, RuleAction, RuleField } from './types';

export interface RuleListProps {
  /** The rules in evaluation order, controlled. */
  value?: readonly Rule[];
  /** The initial rules, uncontrolled. */
  defaultValue?: readonly Rule[];
  /** Called with the rules after a move, a toggle or a removal. */
  onChange?: (rules: Rule[]) => void;
  /** The fields the rules test, for their summaries. */
  fields: readonly RuleField[];
  /** The actions the rules run, for their summaries. */
  actions?: readonly RuleAction[];
  /** The visible label. Without one, pass `aria-label`. */
  label?: ReactNode;
  'aria-label'?: string;
  /** Help under the list. Defaults to the `ruleListOrderHint` message ("The first rule that matches wins."). */
  description?: ReactNode;
  /** Shows each rule's summary under its name. Defaults to true. */
  hasSummary?: boolean;
  /** Adds an edit button to each row, such as one that opens a RuleBuilder in a Drawer. */
  onEdit?: (rule: Rule) => void;
  /** Adds a remove button to each row. Defaults to false. */
  allowsRemoving?: boolean;
  /** Shows the order and states without letting them change. */
  isReadOnly?: boolean;
  isDisabled?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** Rules in order, first match wins, with drag-to-reorder and an on/off switch per rule. */
export function RuleList({
  value,
  defaultValue = [],
  onChange,
  fields,
  actions,
  label,
  'aria-label': ariaLabel,
  description,
  hasSummary = true,
  onEdit,
  allowsRemoving = false,
  isReadOnly = false,
  isDisabled = false,
  className,
  ref,
}: RuleListProps) {
  const messages = useEntryMessages(defaultRuleBuilderMessages);
  const { locale } = useLocale();
  const [rules, setRules] = useControllableState<readonly Rule[]>(
    value,
    defaultValue,
    onChange as ((next: readonly Rule[]) => void) | undefined,
  );
  const [announcement, setAnnouncement] = useState('');
  const isLocked = isReadOnly || isDisabled;

  const nameOf = (rule: Rule, index: number) =>
    rule.name.trim() === '' ? messages.ruleUntitled({ index: index + 1 }) : rule.name;

  const items: ReorderableItem[] = rules.map((rule, index) => {
    const name = nameOf(rule, index);
    return {
      id: rule.id,
      textValue: name,
      label: (
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span
              className={cn('min-w-0 font-medium break-words', !rule.isEnabled && 'text-fg-muted')}
            >
              {name}
            </span>
            {!rule.isEnabled && <Badge>{messages.ruleOff}</Badge>}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <Switch
              aria-label={messages.ruleEnable({ name })}
              isSelected={rule.isEnabled}
              isDisabled={isDisabled}
              isReadOnly={isReadOnly}
              onChange={(isEnabled) => {
                setRules(
                  rules.map((current) =>
                    current.id === rule.id ? { ...current, isEnabled } : current,
                  ),
                );
              }}
            />
            {onEdit && !isLocked && (
              <IconButton
                icon={Pencil}
                variant="ghost"
                size="sm"
                aria-label={messages.ruleEdit({ name })}
                onPress={() => {
                  onEdit(rule);
                }}
              />
            )}
            {allowsRemoving && !isLocked && (
              <IconButton
                icon={Trash2}
                variant="ghost"
                size="sm"
                aria-label={messages.ruleRemove({ name })}
                onPress={() => {
                  setRules(rules.filter((current) => current.id !== rule.id));
                  setAnnouncement(messages.ruleRemoved({ name }));
                }}
              />
            )}
          </span>
        </span>
      ),
      description: hasSummary
        ? summarizeRule(rule, { fields, actions, messages, locale })
        : undefined,
    };
  });

  return (
    <div ref={ref} className={cn('relative min-w-0', className)}>
      <ReorderableList
        items={items}
        value={rules.map((rule) => rule.id)}
        onChange={(order) => {
          const byId = new Map(rules.map((rule) => [rule.id, rule]));
          setRules(order.flatMap((id) => byId.get(id) ?? []));
        }}
        label={label}
        aria-label={ariaLabel}
        description={description ?? messages.ruleListOrderHint}
        isReadOnly={isReadOnly}
        isDisabled={isDisabled}
      />
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
