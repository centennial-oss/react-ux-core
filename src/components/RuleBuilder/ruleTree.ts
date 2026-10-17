// Pure helpers for rules: the shape each operator's value takes, value checks by field type, and immutable edits to
// the condition tree. The builder and the summary use them; apps can call `validateRule` before saving.

import { parseCidr } from '../CidrField/cidr';
import {
  isConditionGroup,
  type Rule,
  type RuleCondition,
  type RuleConditionError,
  type RuleConditionGroup,
  type RuleField,
  type RuleOperator,
} from './types';

type Item = RuleCondition | RuleConditionGroup;

/** How many values an operator takes: none (`exists`), one, a `[from, to]` pair, or a list. */
export type RuleValueShape = 'none' | 'single' | 'pair' | 'list';

export function valueShape(field: RuleField, operator: RuleOperator): RuleValueShape {
  if (operator === 'exists') {
    return 'none';
  }
  if (operator === 'between') {
    return 'pair';
  }
  if (operator === 'in' || operator === 'notIn' || field.type === 'multiEnum') {
    return 'list';
  }
  return 'single';
}

/** The value a condition starts with for a field and operator. */
export function emptyValue(field: RuleField, operator: RuleOperator): unknown {
  switch (valueShape(field, operator)) {
    case 'none':
      return null;
    case 'pair':
      return [null, null];
    case 'list':
      return [];
    case 'single':
      if (field.type === 'boolean') {
        return true;
      }
      return field.type === 'text' || field.type === 'cidr' ? '' : null;
  }
}

/** The condition after picking another operator: the value stays when it still fits, or starts empty. */
export function withOperator(
  condition: RuleCondition,
  field: RuleField,
  operator: RuleOperator,
): RuleCondition {
  const isSameShape = valueShape(field, condition.operator) === valueShape(field, operator);
  return {
    ...condition,
    operator,
    value: isSameShape ? condition.value : emptyValue(field, operator),
  };
}

/** The condition after picking another field: its first operator and an empty value. */
export function withField(condition: RuleCondition, field: RuleField): RuleCondition {
  const operator = field.operators[0] ?? 'equals';
  return { ...condition, fieldId: field.id, operator, value: emptyValue(field, operator) };
}

function isEmpty(value: unknown): boolean {
  return (
    value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
  );
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

/** Checks one value (not a pair or list) for the field's type. */
function singleError(
  field: RuleField,
  operator: RuleOperator,
  value: unknown,
): RuleConditionError | null {
  if (isEmpty(value)) {
    return 'required';
  }
  switch (field.type) {
    case 'number':
    case 'duration':
      return typeof value === 'number' && Number.isFinite(value) ? null : 'invalidNumber';
    case 'cidr':
      return typeof value === 'string' && parseCidr(value).isValid ? null : 'invalidCidr';
    case 'date':
      return typeof value === 'string' &&
        isoDate.test(value) &&
        !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
        ? null
        : 'invalidDate';
    case 'text':
      if (operator === 'matches') {
        try {
          new RegExp(String(value));
        } catch {
          return 'invalidPattern';
        }
      }
      return null;
    default:
      return null;
  }
}

/** The first problem with a condition, or `null` when it's complete and valid. */
export function conditionError(
  field: RuleField | undefined,
  condition: RuleCondition,
): RuleConditionError | null {
  if (!field) {
    return 'unknownField';
  }
  if (!field.operators.includes(condition.operator)) {
    return 'unknownOperator';
  }
  const { operator, value } = condition;
  switch (valueShape(field, operator)) {
    case 'none':
      return null;
    case 'single':
      return singleError(field, operator, value);
    case 'list': {
      const values = Array.isArray(value) ? (value as unknown[]) : [];
      if (values.length === 0) {
        return 'required';
      }
      for (const item of values) {
        const error = singleError(field, operator, item);
        if (error) {
          return error;
        }
      }
      return null;
    }
    case 'pair': {
      const [from, to] = Array.isArray(value) ? (value as unknown[]) : [];
      const error = singleError(field, operator, from) ?? singleError(field, operator, to);
      if (error) {
        return error;
      }
      // Numbers compare as numbers; ISO dates compare as text.
      return (from as number | string) > (to as number | string) ? 'rangeOrder' : null;
    }
  }
}

/** Every condition with a problem, in order. An empty list means the rule can be saved. */
export function validateRule(
  rule: Pick<Rule, 'when'>,
  fields: readonly RuleField[],
): { conditionId: string; error: RuleConditionError }[] {
  const byId = new Map(fields.map((field) => [field.id, field]));
  const problems: { conditionId: string; error: RuleConditionError }[] = [];
  const walk = (group: RuleConditionGroup) => {
    for (const item of group.items) {
      if (isConditionGroup(item)) {
        walk(item);
        continue;
      }
      const error = conditionError(byId.get(item.fieldId), item);
      if (error) {
        problems.push({ conditionId: item.id, error });
      }
    }
  };
  walk(rule.when);
  return problems;
}

/** The group with the item `id` (anywhere below it) passed through `update`. */
export function updateItem(
  group: RuleConditionGroup,
  id: string,
  update: (item: Item) => Item,
): RuleConditionGroup {
  if (group.id === id) {
    return update(group) as RuleConditionGroup;
  }
  return {
    ...group,
    items: group.items.map((item) => {
      if (item.id === id) {
        return update(item);
      }
      return isConditionGroup(item) ? updateItem(item, id, update) : item;
    }),
  };
}

/** The group without the item `id` (anywhere below it). */
export function removeItem(group: RuleConditionGroup, id: string): RuleConditionGroup {
  return {
    ...group,
    items: group.items
      .filter((item) => item.id !== id)
      .map((item) => (isConditionGroup(item) ? removeItem(item, id) : item)),
  };
}

/** The group with `item` added at the end of the group `groupId`. */
export function appendItem(
  group: RuleConditionGroup,
  groupId: string,
  item: Item,
): RuleConditionGroup {
  return updateItem(group, groupId, (target) =>
    isConditionGroup(target) ? { ...target, items: [...target.items, item] } : target,
  );
}

/** The number of conditions in a group and its nested groups. */
export function countConditions(group: RuleConditionGroup): number {
  return group.items.reduce(
    (total, item) => total + (isConditionGroup(item) ? countConditions(item) : 1),
    0,
  );
}
