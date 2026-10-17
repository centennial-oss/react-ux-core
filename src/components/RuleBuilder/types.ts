import type { ReactNode } from 'react';

/** The kinds of value a rule field holds; each picks the condition's value editor. */
export type RuleFieldType =
  'text' | 'number' | 'enum' | 'multiEnum' | 'boolean' | 'date' | 'duration' | 'cidr';

/** How a condition compares a field with its value. */
export type RuleOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'startsWith'
  | 'matches'
  | 'in'
  | 'notIn'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'exists';

/** A field conditions can test, such as a request path or an instrument's temperature. */
export interface RuleField {
  id: string;
  /** The name in the field picker ("Wind speed"). */
  label: string;
  /** The name inside a summary sentence ("wind speed"). Defaults to `label`. */
  summaryLabel?: string;
  type: RuleFieldType;
  /** The operators offered for this field, in order; the first is picked when the field is chosen. */
  operators: readonly RuleOperator[];
  /** The choices for `enum` and `multiEnum` fields. */
  options?: readonly { id: string; label: string }[];
  /** A unit shown after `number` values ("km/h"), in the editor and the summary. */
  unit?: string;
}

/**
 * One test: a field, an operator and a value. The value's shape follows the operator: `between` holds a
 * `[from, to]` pair, `in`/`notIn` (and every `multiEnum` operator) an array, `exists` `null`, and the rest one value.
 * Values are strings for `text`, `enum` and `cidr`, numbers for `number` and `duration` (milliseconds), booleans for
 * `boolean`, and ISO dates ("2026-10-16") for `date`. An empty value is `null` (or `''` for text).
 */
export interface RuleCondition {
  id: string;
  fieldId: string;
  operator: RuleOperator;
  value: unknown;
}

/** Conditions (and nested groups) joined with AND or OR. */
export interface RuleConditionGroup {
  id: string;
  join: 'and' | 'or';
  items: readonly (RuleCondition | RuleConditionGroup)[];
}

/** Props for an action's settings editor. */
export interface RuleActionSettingsProps {
  value: unknown;
  onChange: (value: unknown) => void;
}

/** Something a rule does when it matches ("Cache", "Notify the observer"). */
export interface RuleAction {
  id: string;
  label: string;
  /**
   * Renders the editor for the action's settings, built from CCUX fields (or a `ConfigForm` from `/form`). Without
   * it the action has no settings.
   */
  renderSettings?: (props: RuleActionSettingsProps) => ReactNode;
  /** The settings given to a newly added action. Defaults to `null`. */
  defaultSettings?: unknown;
  /** The action as a phrase for the summary ("cache for 1 hour"). Defaults to the label. */
  summarize?: (settings: unknown) => string;
}

/** An action a rule runs, with its settings. */
export interface RuleActionEntry {
  actionId: string;
  settings: unknown;
}

/** A named rule: when its conditions match, it runs its actions. */
export interface Rule {
  id: string;
  name: string;
  when: RuleConditionGroup;
  then: readonly RuleActionEntry[];
  isEnabled: boolean;
}

/** A problem with a condition's value, from `validateRule`. */
export type RuleConditionError =
  | 'unknownField'
  | 'unknownOperator'
  | 'required'
  | 'invalidNumber'
  | 'invalidPattern'
  | 'invalidCidr'
  | 'invalidDate'
  | 'rangeOrder';

export function isConditionGroup(
  item: RuleCondition | RuleConditionGroup,
): item is RuleConditionGroup {
  return 'items' in item;
}
