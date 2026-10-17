// RuleBuilder: "when these conditions match, do these actions" (CDN behaviours, alert rules, segments, feature-flag
// targeting, firewall rules). Each condition row is field → operator → a value editor typed by the field; conditions
// sit in AND/OR groups that nest up to `maxDepth`; actions carry settings rendered by the app. Every row and group is
// a labelled group ("Condition 2 of 3"), adding and removing is announced and moves focus sensibly, values are checked
// by type, and a plain-language summary reads the rule back.

import { Plus, Trash2 } from 'lucide-react';
import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type Ref,
} from 'react';
import { useLocale } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { mergeRefs } from '../../utils/mergeRefs';
import type { HeadingLevel } from '../../utils/types';
import { useControllableState } from '../../utils/useControllableState';
import { Button } from '../Button/Button';
import { IconButton } from '../IconButton/IconButton';
import { Option } from '../ListBox/ListBoxParts';
import { Select } from '../Select/Select';
import { Heading } from '../Text/Text';
import { TextField } from '../TextField/TextField';
import { ConditionValue } from './ConditionValue';
import { defaultRuleBuilderMessages, type RuleBuilderMessages } from './messages';
import {
  appendItem,
  conditionError,
  emptyValue,
  removeItem,
  updateItem,
  withField,
  withOperator,
} from './ruleTree';
import { summarizeRule } from './summary';
import {
  isConditionGroup,
  type Rule,
  type RuleAction,
  type RuleActionEntry,
  type RuleCondition,
  type RuleConditionError,
  type RuleConditionGroup,
  type RuleField,
  type RuleOperator,
} from './types';

export interface RuleBuilderProps {
  /** The fields conditions can test. */
  fields: readonly RuleField[];
  /** The actions a rule can run. Without any, the rule has conditions only (a segment, a filter). */
  actions?: readonly RuleAction[];
  /** The rule, controlled. */
  value?: Rule;
  /** The initial rule, uncontrolled. Defaults to an empty, enabled rule. */
  defaultValue?: Rule;
  onChange?: (rule: Rule) => void;
  /** How deep groups nest; the top group counts as 1. Defaults to 2 (one level of nested groups). */
  maxDepth?: number;
  /** Shows a plain-language summary under the rule. Defaults to true. */
  hasSummary?: boolean;
  /** Shows the rule name field. Defaults to true. */
  hasNameField?: boolean;
  /** Makes ids for added conditions and groups. Defaults to ids unique within the builder. */
  createId?: () => string;
  /** The level of the "When" and "Then" headings. Defaults to 3. */
  headingLevel?: HeadingLevel;
  isDisabled?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

type Item = RuleCondition | RuleConditionGroup;

type FocusTarget =
  | { kind: 'item'; id: string }
  | { kind: 'add'; groupId: string }
  | { kind: 'action'; index: number }
  | { kind: 'addAction' };

const errorMessages: Record<RuleConditionError, keyof RuleBuilderMessages> = {
  unknownField: 'ruleValueUnknown',
  unknownOperator: 'ruleValueUnknown',
  required: 'ruleValueRequired',
  invalidNumber: 'ruleValueInvalidNumber',
  invalidPattern: 'ruleValueInvalidPattern',
  invalidCidr: 'ruleValueInvalidCidr',
  invalidDate: 'ruleValueInvalidDate',
  rangeOrder: 'ruleValueRangeOrder',
};

interface BuilderContext {
  fields: readonly RuleField[];
  fieldsById: ReadonlyMap<string, RuleField>;
  maxDepth: number;
  isDisabled: boolean;
  touched: ReadonlySet<string>;
  messages: RuleBuilderMessages;
  errorIdPrefix: string;
  setWhen: (update: (when: RuleConditionGroup) => RuleConditionGroup) => void;
  addCondition: (group: RuleConditionGroup) => void;
  addGroup: (group: RuleConditionGroup) => void;
  remove: (group: RuleConditionGroup, item: Item, index: number) => void;
  markTouched: (id: string) => void;
}

/** Whether focus left `event.currentTarget` for somewhere other than an overlay it opened (a list, a calendar). */
function isLeaving(event: FocusEvent<HTMLElement>): boolean {
  const next = event.relatedTarget;
  if (!(next instanceof Element)) {
    return true;
  }
  if (event.currentTarget.contains(next)) {
    return false;
  }
  return next.closest('[role="listbox"], [role="dialog"], [data-react-aria-top-layer]') === null;
}

function ConditionRow({
  condition,
  index,
  total,
  group,
  ctx,
}: {
  condition: RuleCondition;
  index: number;
  total: number;
  group: RuleConditionGroup;
  ctx: BuilderContext;
}) {
  const { messages, fieldsById, isDisabled } = ctx;
  const field = fieldsById.get(condition.fieldId);
  const error = conditionError(field, condition);
  const isFormatError =
    error !== null &&
    error !== 'required' &&
    // CidrField and CidrList flag bad blocks themselves.
    !(error === 'invalidCidr' && field?.type === 'cidr');
  const shownError =
    error !== null && (isFormatError || (error === 'required' && ctx.touched.has(condition.id)))
      ? error
      : null;
  const errorId = `${ctx.errorIdPrefix}-${condition.id}`;
  const update = (next: RuleCondition) => {
    ctx.setWhen((when) => updateItem(when, condition.id, () => next));
  };
  const operators = (field?.operators ?? []).map((operator) => ({
    id: operator,
    label: messages.ruleOperatorLabel({ operator, fieldType: field?.type ?? 'text' }),
  }));

  return (
    <div
      role="group"
      aria-label={messages.ruleConditionLabel({ index: index + 1, total })}
      aria-describedby={shownError ? errorId : undefined}
      data-condition-id={condition.id}
      onBlur={(event) => {
        if (isLeaving(event)) {
          ctx.markTouched(condition.id);
        }
      }}
      className="flex min-w-0 flex-col gap-1.5 rounded-control border border-border bg-surface-2 p-2"
    >
      {/* Narrow rows: the field beside the remove button, then the operator and the value. Wide rows: one line. */}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 @lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto]">
        <Select
          aria-label={messages.ruleField}
          className="col-start-1 row-start-1"
          items={ctx.fields}
          value={field ? field.id : null}
          onChange={(fieldId: string) => {
            const next = fieldsById.get(fieldId);
            if (next && next.id !== condition.fieldId) {
              update(withField(condition, next));
            }
          }}
          isDisabled={isDisabled}
        >
          {(item) => <Option id={item.id}>{item.label}</Option>}
        </Select>
        <Select
          aria-label={messages.ruleOperator}
          className="col-span-2 @lg:col-span-1 @lg:col-start-2 @lg:row-start-1"
          items={operators}
          value={field?.operators.includes(condition.operator) ? condition.operator : null}
          onChange={(operator: RuleOperator) => {
            if (field && operator !== condition.operator) {
              update(withOperator(condition, field, operator));
            }
          }}
          isDisabled={isDisabled || !field}
        >
          {(item) => <Option id={item.id}>{item.label}</Option>}
        </Select>
        <div className="col-span-2 min-w-0 @lg:col-span-1 @lg:col-start-3 @lg:row-start-1">
          {field && (
            <ConditionValue
              field={field}
              operator={condition.operator}
              value={condition.value}
              onChange={(value) => {
                update({ ...condition, value });
              }}
              isInvalid={shownError !== null}
              isDisabled={isDisabled}
            />
          )}
        </div>
        {!isDisabled && (
          <IconButton
            icon={Trash2}
            variant="ghost"
            aria-label={messages.ruleRemoveCondition({ index: index + 1 })}
            onPress={() => {
              ctx.remove(group, condition, index);
            }}
            className="col-start-2 row-start-1 @lg:col-start-4"
          />
        )}
      </div>
      {shownError && (
        <span id={errorId} className="text-xs font-medium text-danger-fg">
          {messages[errorMessages[shownError]] as string}
        </span>
      )}
    </div>
  );
}

function GroupEditor({
  group,
  depth,
  label,
  labelledBy,
  onRemove,
  removeLabel,
  ctx,
}: {
  group: RuleConditionGroup;
  depth: number;
  label?: string;
  labelledBy?: string;
  onRemove?: () => void;
  removeLabel?: string;
  ctx: BuilderContext;
}) {
  const { messages, isDisabled } = ctx;
  const total = group.items.length;
  const joinWord = group.join === 'or' ? messages.ruleJoinWordOr : messages.ruleJoinWordAnd;
  const joinOptions = [
    { id: 'and' as const, label: messages.ruleJoinAll },
    { id: 'or' as const, label: messages.ruleJoinAny },
  ];
  return (
    <div
      role="group"
      aria-label={label}
      aria-labelledby={labelledBy}
      data-group-id={group.id}
      className={cn(
        '@container flex min-w-0 flex-col gap-3',
        depth > 1 && 'rounded-card border border-border bg-surface-1 p-3',
      )}
    >
      <div className="flex min-w-0 items-end justify-between gap-2">
        <Select
          aria-label={messages.ruleJoin}
          items={joinOptions}
          value={group.join}
          onChange={(join: 'and' | 'or') => {
            ctx.setWhen((when) =>
              updateItem(when, group.id, (item) => ({ ...(item as RuleConditionGroup), join })),
            );
          }}
          isDisabled={isDisabled}
          size="sm"
          className="w-56 max-w-full min-w-0"
        >
          {(item) => <Option id={item.id}>{item.label}</Option>}
        </Select>
        {onRemove && removeLabel !== undefined && !isDisabled && (
          <IconButton icon={Trash2} variant="ghost" aria-label={removeLabel} onPress={onRemove} />
        )}
      </div>
      {total === 0 ? (
        <p className="text-sm text-fg-muted">{messages.ruleNoConditions}</p>
      ) : (
        <ol className="flex min-w-0 flex-col gap-2">
          {group.items.map((item, index) => (
            <li key={item.id} className="flex min-w-0 flex-col gap-2">
              {index > 0 && (
                // The join is in the group's picker; the word between rows is for sighted readers.
                <span
                  aria-hidden="true"
                  className="ps-2 text-xs font-semibold tracking-wide text-fg-muted uppercase"
                >
                  {joinWord}
                </span>
              )}
              {isConditionGroup(item) ? (
                <GroupEditor
                  group={item}
                  depth={depth + 1}
                  label={messages.ruleGroupLabel({ index: index + 1, total })}
                  removeLabel={messages.ruleRemoveGroup({ index: index + 1 })}
                  onRemove={() => {
                    ctx.remove(group, item, index);
                  }}
                  ctx={ctx}
                />
              ) : (
                <ConditionRow
                  condition={item}
                  index={index}
                  total={total}
                  group={group}
                  ctx={ctx}
                />
              )}
            </li>
          ))}
        </ol>
      )}
      {!isDisabled && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            data-rule-add={group.id}
            onPress={() => {
              ctx.addCondition(group);
            }}
          >
            {messages.ruleAddCondition}
          </Button>
          {depth < ctx.maxDepth && (
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              onPress={() => {
                ctx.addGroup(group);
              }}
            >
              {messages.ruleAddGroup}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Builds a rule from conditions in AND/OR groups and the actions to run when it matches, with a summary. */
export function RuleBuilder({
  fields,
  actions = [],
  value,
  defaultValue,
  onChange,
  maxDepth = 2,
  hasSummary = true,
  hasNameField = true,
  createId,
  headingLevel = 3,
  isDisabled = false,
  className,
  ref,
}: RuleBuilderProps) {
  const messages = useEntryMessages(defaultRuleBuilderMessages);
  const { locale } = useLocale();
  const idPrefix = useId();
  const whenId = useId();
  const thenId = useId();
  const summaryId = useId();
  const idCounter = useRef(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pendingFocus = useRef<FocusTarget | null>(null);
  const [rule, setRule] = useControllableState<Rule>(
    value,
    defaultValue ?? {
      id: idPrefix,
      name: '',
      when: { id: `${idPrefix}-when`, join: 'and', items: [] },
      then: [],
      isEnabled: true,
    },
    onChange,
  );
  const [announcement, setAnnouncement] = useState('');
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const fieldsById = useMemo(() => new Map(fields.map((field) => [field.id, field])), [fields]);
  const actionsById = useMemo(
    () => new Map(actions.map((action) => [action.id, action])),
    [actions],
  );

  const newId = () => createId?.() ?? `${idPrefix}-${String(idCounter.current++)}`;
  const newCondition = (): RuleCondition | null => {
    const [field] = fields;
    if (!field) {
      return null;
    }
    const operator = field.operators[0] ?? 'equals';
    return { id: newId(), fieldId: field.id, operator, value: emptyValue(field, operator) };
  };
  const setWhen = (update: (when: RuleConditionGroup) => RuleConditionGroup) => {
    setRule({ ...rule, when: update(rule.when) });
  };
  const setThen = (then: RuleActionEntry[]) => {
    setRule({ ...rule, then });
  };

  const ctx: BuilderContext = {
    fields,
    fieldsById,
    maxDepth,
    isDisabled,
    touched,
    messages,
    errorIdPrefix: `${idPrefix}-error`,
    setWhen,
    addCondition: (group) => {
      const condition = newCondition();
      if (!condition) {
        return;
      }
      setWhen((when) => appendItem(when, group.id, condition));
      pendingFocus.current = { kind: 'item', id: condition.id };
      const total = group.items.length + 1;
      setAnnouncement(messages.ruleConditionAdded({ index: total, total }));
    },
    addGroup: (group) => {
      const condition = newCondition();
      const nested: RuleConditionGroup = {
        id: newId(),
        join: group.join === 'and' ? 'or' : 'and',
        items: condition ? [condition] : [],
      };
      setWhen((when) => appendItem(when, group.id, nested));
      pendingFocus.current = { kind: 'item', id: nested.id };
      const total = group.items.length + 1;
      setAnnouncement(messages.ruleGroupAdded({ index: total, total }));
    },
    remove: (group, item, index) => {
      setWhen((when) => removeItem(when, item.id));
      const neighbour = group.items[index + 1] ?? group.items[index - 1];
      pendingFocus.current = neighbour
        ? { kind: 'item', id: neighbour.id }
        : { kind: 'add', groupId: group.id };
      setAnnouncement(
        isConditionGroup(item)
          ? messages.ruleGroupRemoved({ index: index + 1 })
          : messages.ruleConditionRemoved({ index: index + 1 }),
      );
    },
    markTouched: (id) => {
      setTouched((current) => (current.has(id) ? current : new Set(current).add(id)));
    },
  };

  const addAction = () => {
    const used = new Set(rule.then.map((entry) => entry.actionId));
    const action = actions.find((candidate) => !used.has(candidate.id)) ?? actions[0];
    if (!action) {
      return;
    }
    const next = [...rule.then, { actionId: action.id, settings: action.defaultSettings ?? null }];
    setThen(next);
    pendingFocus.current = { kind: 'action', index: next.length - 1 };
    setAnnouncement(messages.ruleActionAdded({ index: next.length, total: next.length }));
  };
  const removeAction = (index: number) => {
    const next = rule.then.filter((_, at) => at !== index);
    setThen(next);
    pendingFocus.current =
      next.length === 0
        ? { kind: 'addAction' }
        : { kind: 'action', index: Math.min(index, next.length - 1) };
    setAnnouncement(messages.ruleActionRemoved({ index: index + 1 }));
  };

  // Focus follows the change: the added row's first control, the row after a removed one, or the add button.
  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (!target) {
      return;
    }
    pendingFocus.current = null;
    const root = rootRef.current;
    let element: HTMLElement | null | undefined;
    if (target.kind === 'item') {
      const row = root?.querySelector(
        `[data-condition-id="${CSS.escape(target.id)}"], [data-group-id="${CSS.escape(target.id)}"]`,
      );
      element = row?.querySelector<HTMLElement>('button, input');
    } else if (target.kind === 'add') {
      element = root?.querySelector<HTMLElement>(`[data-rule-add="${CSS.escape(target.groupId)}"]`);
    } else if (target.kind === 'action') {
      element = root
        ?.querySelector(`[data-action-index="${String(target.index)}"]`)
        ?.querySelector<HTMLElement>('button, input');
    } else {
      element = root?.querySelector<HTMLElement>('[data-rule-add-action]');
    }
    element?.focus();
  }, [rule]);

  const summary = hasSummary ? summarizeRule(rule, { fields, actions, messages, locale }) : '';

  return (
    <div
      ref={mergeRefs(ref, rootRef)}
      className={cn('relative flex min-w-0 flex-col gap-5 text-sm text-fg', className)}
    >
      {hasNameField && (
        <TextField
          label={messages.ruleName}
          value={rule.name}
          onChange={(name) => {
            setRule({ ...rule, name });
          }}
          isDisabled={isDisabled}
          autoComplete="off"
        />
      )}
      <section aria-labelledby={whenId} className="flex min-w-0 flex-col gap-2">
        <Heading level={headingLevel} size="sm" id={whenId}>
          {messages.ruleWhen}
        </Heading>
        <GroupEditor group={rule.when} depth={1} labelledBy={whenId} ctx={ctx} />
      </section>
      {actions.length > 0 && (
        <section aria-labelledby={thenId} className="flex min-w-0 flex-col gap-2">
          <Heading level={headingLevel} size="sm" id={thenId}>
            {messages.ruleThen}
          </Heading>
          {rule.then.length > 0 && (
            <ol className="flex min-w-0 flex-col gap-2">
              {rule.then.map((entry, index) => {
                const action = actionsById.get(entry.actionId);
                return (
                  // Entries have no ids of their own; the same action may appear twice.
                  <li key={`${String(index)}-${entry.actionId}`}>
                    <div
                      role="group"
                      aria-label={messages.ruleActionLabel({
                        index: index + 1,
                        total: rule.then.length,
                      })}
                      data-action-index={index}
                      className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface-1 p-3"
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <Select
                          aria-label={messages.ruleAction}
                          items={actions}
                          value={action ? action.id : null}
                          onChange={(actionId: string) => {
                            if (actionId === entry.actionId) {
                              return;
                            }
                            const next = actionsById.get(actionId);
                            setThen(
                              rule.then.map((current, at) =>
                                at === index
                                  ? { actionId, settings: next?.defaultSettings ?? null }
                                  : current,
                              ),
                            );
                          }}
                          isDisabled={isDisabled}
                          className="min-w-0 flex-1"
                        >
                          {(item) => <Option id={item.id}>{item.label}</Option>}
                        </Select>
                        {!isDisabled && (
                          <IconButton
                            icon={Trash2}
                            variant="ghost"
                            aria-label={messages.ruleRemoveAction({ index: index + 1 })}
                            onPress={() => {
                              removeAction(index);
                            }}
                          />
                        )}
                      </div>
                      {action?.renderSettings?.({
                        value: entry.settings,
                        onChange: (settings) => {
                          setThen(
                            rule.then.map((current, at) =>
                              at === index ? { ...current, settings } : current,
                            ),
                          );
                        },
                      })}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {!isDisabled && (
            <div>
              <Button
                variant="outline"
                size="sm"
                icon={Plus}
                data-rule-add-action=""
                onPress={addAction}
              >
                {messages.ruleAddAction}
              </Button>
            </div>
          )}
        </section>
      )}
      {hasSummary && (
        <div
          role="group"
          aria-labelledby={summaryId}
          className="flex min-w-0 flex-col gap-1 rounded-control bg-surface-2 p-3"
        >
          <span id={summaryId} className="text-xs font-medium text-fg-muted">
            {messages.summary}
          </span>
          <p data-rule-summary="" className="break-words">
            {summary}
          </p>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
