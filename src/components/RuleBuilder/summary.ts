// The plain-language summary of a rule ("When path starts with /img and country is US or CA, cache for 1 hour"),
// built from the messages so translations control the wording. Lists use Intl.ListFormat for the locale's "and"/"or".

import { dateTimeFormat, listFormat, numberFormat } from '../../utils/intl';
import { formatDuration } from '../UnitField/format';
import type { RuleBuilderMessages } from './messages';
import { valueShape } from './ruleTree';
import {
  isConditionGroup,
  type Rule,
  type RuleAction,
  type RuleCondition,
  type RuleConditionGroup,
  type RuleField,
} from './types';
import { isValidDate, utcDay } from '../../utils/time';

export interface SummarizeRuleOptions {
  fields: readonly RuleField[];
  actions?: readonly RuleAction[];
  messages: RuleBuilderMessages;
  /** A BCP 47 locale for numbers, dates and lists. */
  locale: string;
}

function isMissing(value: unknown): boolean {
  return (
    value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
  );
}

/** One value as text for the summary. */
function formatValue(field: RuleField, value: unknown, options: SummarizeRuleOptions): string {
  const { messages, locale } = options;
  if (isMissing(value)) {
    return messages.ruleSummaryMissing;
  }
  switch (field.type) {
    case 'number': {
      const text = typeof value === 'number' ? numberFormat(locale).format(value) : String(value);
      return field.unit ? messages.ruleValueWithUnit({ value: text, unit: field.unit }) : text;
    }
    case 'duration':
      return typeof value === 'number'
        ? formatDuration(value, { locale, unitDisplay: 'long' })
        : String(value);
    case 'boolean':
      return value === true ? messages.ruleSummaryTrue : messages.ruleSummaryFalse;
    case 'enum':
    case 'multiEnum':
      return field.options?.find((option) => option.id === value)?.label ?? String(value);
    case 'date': {
      const date = utcDay(String(value));
      return !isValidDate(date)
        ? String(value)
        : dateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
    }
    default:
      return String(value).trim();
  }
}

function summarizeCondition(
  condition: RuleCondition,
  field: RuleField,
  options: SummarizeRuleOptions,
): string {
  const { messages, locale } = options;
  const shape = valueShape(field, condition.operator);
  let value = '';
  let to = '';
  if (shape === 'single') {
    value = formatValue(field, condition.value, options);
  } else if (shape === 'pair') {
    const [from, end] = Array.isArray(condition.value) ? (condition.value as unknown[]) : [];
    value = formatValue(field, from, options);
    to = formatValue(field, end, options);
  } else if (shape === 'list') {
    const values = Array.isArray(condition.value) ? (condition.value as unknown[]) : [];
    // "contains A and B" needs every one; "is A or B" any one.
    const type =
      condition.operator === 'contains' || condition.operator === 'equals'
        ? 'conjunction'
        : 'disjunction';
    value =
      values.length === 0
        ? messages.ruleSummaryMissing
        : listFormat(locale, { type }).format(
            values.map((item) => formatValue(field, item, options)),
          );
  }
  return messages.ruleSummaryCondition({
    field: field.summaryLabel ?? field.label,
    operator: condition.operator,
    fieldType: field.type,
    value,
    to,
  });
}

function summarizeGroup(
  group: RuleConditionGroup,
  options: SummarizeRuleOptions,
  byId: ReadonlyMap<string, RuleField>,
  isNested: boolean,
): string {
  const parts = group.items.flatMap((item) => {
    if (isConditionGroup(item)) {
      const text = summarizeGroup(item, options, byId, true);
      return text === '' ? [] : [text];
    }
    const field = byId.get(item.fieldId);
    return field ? [summarizeCondition(item, field, options)] : [];
  });
  if (parts.length === 0) {
    return '';
  }
  const text = listFormat(options.locale, {
    type: group.join === 'or' ? 'disjunction' : 'conjunction',
  }).format(parts);
  return isNested && parts.length > 1
    ? options.messages.ruleSummaryGroup({ conditions: text })
    : text;
}

/** A plain-language sentence for a rule, such as "When path starts with /img and country is US or CA, cache for 1 hour". */
export function summarizeRule(
  rule: Pick<Rule, 'when' | 'then'>,
  options: SummarizeRuleOptions,
): string {
  const { messages, locale } = options;
  const byId = new Map(options.fields.map((field) => [field.id, field]));
  const actionsById = new Map((options.actions ?? []).map((action) => [action.id, action]));
  const conditions = summarizeGroup(rule.when, options, byId, false);
  const actionParts = rule.then.flatMap((entry) => {
    const action = actionsById.get(entry.actionId);
    return action ? [action.summarize?.(entry.settings) ?? action.label] : [];
  });
  const actions =
    actionParts.length === 0
      ? messages.ruleSummaryNoActions
      : listFormat(locale, { type: 'conjunction' }).format(actionParts);
  return conditions === ''
    ? messages.ruleSummaryAlways({ actions })
    : messages.ruleSummary({ conditions, actions });
}
