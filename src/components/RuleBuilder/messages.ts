import type { RuleFieldType, RuleOperator } from './types';

/** Strings for RuleBuilder and RuleList. */
export interface RuleBuilderMessages {
  /** The rule name field's label. */
  ruleName: string;
  /** The heading over the conditions. */
  ruleWhen: string;
  /** The heading over the actions. */
  ruleThen: string;
  /** The label of a group's AND/OR picker. */
  ruleJoin: string;
  /** The AND choice. */
  ruleJoinAll: string;
  /** The OR choice. */
  ruleJoinAny: string;
  /** The word shown between conditions joined with AND. */
  ruleJoinWordAnd: string;
  /** The word shown between conditions joined with OR. */
  ruleJoinWordOr: string;
  /** A condition row's accessible name ("Condition 2 of 3"). */
  ruleConditionLabel: (params: { index: number; total: number }) => string;
  /** A nested group's accessible name ("Group 3 of 3"). */
  ruleGroupLabel: (params: { index: number; total: number }) => string;
  /** The field picker's label. */
  ruleField: string;
  /** The operator picker's label. */
  ruleOperator: string;
  /** The value editor's label. */
  ruleValue: string;
  /** The first value of a range's label. */
  ruleValueFrom: string;
  /** The second value of a range's label. */
  ruleValueTo: string;
  /** Help under a text list value. */
  ruleListHint: string;
  /** An operator's name in the picker, which can depend on the field type ("is before" for dates). */
  ruleOperatorLabel: (params: { operator: RuleOperator; fieldType: RuleFieldType }) => string;
  /** The add-condition button. */
  ruleAddCondition: string;
  /** The add-group button. */
  ruleAddGroup: string;
  /** The remove button of a condition ("Remove condition 2"). */
  ruleRemoveCondition: (params: { index: number }) => string;
  /** The remove button of a group ("Remove group 3"). */
  ruleRemoveGroup: (params: { index: number }) => string;
  /** Shown in a group with no conditions. */
  ruleNoConditions: string;
  /** Announced after adding a condition. */
  ruleConditionAdded: (params: { index: number; total: number }) => string;
  /** Announced after removing a condition. */
  ruleConditionRemoved: (params: { index: number }) => string;
  /** Announced after adding a group. */
  ruleGroupAdded: (params: { index: number; total: number }) => string;
  /** Announced after removing a group. */
  ruleGroupRemoved: (params: { index: number }) => string;
  /** The action picker's label. */
  ruleAction: string;
  /** An action row's accessible name ("Action 1 of 2"). */
  ruleActionLabel: (params: { index: number; total: number }) => string;
  /** The add-action button. */
  ruleAddAction: string;
  /** The remove button of an action ("Remove action 1"). */
  ruleRemoveAction: (params: { index: number }) => string;
  /** Announced after adding an action. */
  ruleActionAdded: (params: { index: number; total: number }) => string;
  /** Announced after removing an action. */
  ruleActionRemoved: (params: { index: number }) => string;
  /** Error: the value is missing. */
  ruleValueRequired: string;
  /** Error: the value isn't a number. */
  ruleValueInvalidNumber: string;
  /** Error: the value isn't a valid regular expression. */
  ruleValueInvalidPattern: string;
  /** Error: the value isn't a CIDR block or address. */
  ruleValueInvalidCidr: string;
  /** Error: the value isn't a date. */
  ruleValueInvalidDate: string;
  /** Error: a range's second value is smaller than its first. */
  ruleValueRangeOrder: string;
  /** Error: the condition's field or operator no longer exists. */
  ruleValueUnknown: string;
  /**
   * One condition as a phrase ("path starts with /img"). `value` is the formatted value (a list is already joined
   * with "or"); `to` is a range's second value.
   */
  ruleSummaryCondition: (params: {
    field: string;
    operator: RuleOperator;
    fieldType: RuleFieldType;
    value: string;
    to: string;
  }) => string;
  /** A nested group inside the summary ("(cloud cover is more than 80% or wind speed is more than 40 km/h)"). */
  ruleSummaryGroup: (params: { conditions: string }) => string;
  /** The whole summary ("When … , notify the observer"). */
  ruleSummary: (params: { conditions: string; actions: string }) => string;
  /** The summary of a rule without conditions. */
  ruleSummaryAlways: (params: { actions: string }) => string;
  /** The actions part of a summary when there are none. */
  ruleSummaryNoActions: string;
  /** Stands in for a missing value in the summary. */
  ruleSummaryMissing: string;
  /** A true boolean value in the summary. */
  ruleSummaryTrue: string;
  /** A false boolean value in the summary. */
  ruleSummaryFalse: string;
  /** A number with the field's unit ("40 km/h"). */
  ruleValueWithUnit: (params: { value: string; unit: string }) => string;
  /** RuleList's description: how the rules are evaluated. */
  ruleListOrderHint: string;
  /** A rule's on/off switch ("Enable Frost warning"). */
  ruleEnable: (params: { name: string }) => string;
  /** A rule's edit button ("Edit Frost warning"). */
  ruleEdit: (params: { name: string }) => string;
  /** A rule's remove button ("Remove Frost warning"). */
  ruleRemove: (params: { name: string }) => string;
  /** The name shown for a rule without one ("Rule 2"). */
  ruleUntitled: (params: { index: number }) => string;
  /** Marks a disabled rule in the list. */
  ruleOff: string;
  /** Announced after a rule is removed. */
  ruleRemoved: (params: { name: string }) => string;
}

const operatorLabels: Record<RuleOperator, string> = {
  equals: 'is',
  notEquals: 'is not',
  contains: 'contains',
  startsWith: 'starts with',
  matches: 'matches pattern',
  in: 'is one of',
  notIn: 'is none of',
  gt: 'is more than',
  gte: 'is at least',
  lt: 'is less than',
  lte: 'is at most',
  between: 'is between',
  exists: 'is set',
};

const dateOperatorLabels: Partial<Record<RuleOperator, string>> = {
  gt: 'is after',
  gte: 'is on or after',
  lt: 'is before',
  lte: 'is on or before',
};

// The summary reads lists naturally: "country is US or CA" rather than "is one of US or CA".
const summaryVerbs: Partial<Record<RuleOperator, string>> = {
  in: 'is',
  notIn: 'is not',
  matches: 'matches',
};

export const defaultRuleBuilderMessages: RuleBuilderMessages = {
  ruleName: 'Rule name',
  ruleWhen: 'When',
  ruleThen: 'Then',
  ruleJoin: 'Match',
  ruleJoinAll: 'All of these (AND)',
  ruleJoinAny: 'Any of these (OR)',
  ruleJoinWordAnd: 'and',
  ruleJoinWordOr: 'or',
  ruleConditionLabel: ({ index, total }) => `Condition ${String(index)} of ${String(total)}`,
  ruleGroupLabel: ({ index, total }) => `Group ${String(index)} of ${String(total)}`,
  ruleField: 'Field',
  ruleOperator: 'Operator',
  ruleValue: 'Value',
  ruleValueFrom: 'From',
  ruleValueTo: 'To',
  ruleListHint: 'Separate values with commas.',
  ruleOperatorLabel: ({ operator, fieldType }) =>
    (fieldType === 'date' ? dateOperatorLabels[operator] : undefined) ?? operatorLabels[operator],
  ruleAddCondition: 'Add condition',
  ruleAddGroup: 'Add group',
  ruleRemoveCondition: ({ index }) => `Remove condition ${String(index)}`,
  ruleRemoveGroup: ({ index }) => `Remove group ${String(index)}`,
  ruleNoConditions: 'No conditions yet.',
  ruleConditionAdded: ({ index, total }) =>
    `Condition added, ${String(index)} of ${String(total)}.`,
  ruleConditionRemoved: ({ index }) => `Condition ${String(index)} removed.`,
  ruleGroupAdded: ({ index, total }) => `Group added, ${String(index)} of ${String(total)}.`,
  ruleGroupRemoved: ({ index }) => `Group ${String(index)} removed.`,
  ruleAction: 'Action',
  ruleActionLabel: ({ index, total }) => `Action ${String(index)} of ${String(total)}`,
  ruleAddAction: 'Add action',
  ruleRemoveAction: ({ index }) => `Remove action ${String(index)}`,
  ruleActionAdded: ({ index, total }) => `Action added, ${String(index)} of ${String(total)}.`,
  ruleActionRemoved: ({ index }) => `Action ${String(index)} removed.`,
  ruleValueRequired: 'Enter a value.',
  ruleValueInvalidNumber: 'Enter a number.',
  ruleValueInvalidPattern: 'Enter a valid regular expression.',
  ruleValueInvalidCidr: 'Enter an IP address or CIDR block.',
  ruleValueInvalidDate: 'Enter a date.',
  ruleValueRangeOrder: 'The second value must not be smaller than the first.',
  ruleValueUnknown: 'This field or operator is no longer available.',
  ruleSummaryCondition: ({ field, operator, fieldType, value, to }) => {
    if (operator === 'exists') {
      return `${field} is set`;
    }
    if (operator === 'between') {
      return `${field} is between ${value} and ${to}`;
    }
    const verb =
      (fieldType === 'date' ? dateOperatorLabels[operator] : undefined) ??
      summaryVerbs[operator] ??
      operatorLabels[operator];
    return `${field} ${verb} ${value}`;
  },
  ruleSummaryGroup: ({ conditions }) => `(${conditions})`,
  ruleSummary: ({ conditions, actions }) => `When ${conditions}, ${actions}`,
  ruleSummaryAlways: ({ actions }) => `Always ${actions}`,
  ruleSummaryNoActions: 'do nothing',
  ruleSummaryMissing: '…',
  ruleSummaryTrue: 'yes',
  ruleSummaryFalse: 'no',
  ruleValueWithUnit: ({ value, unit }) => `${value} ${unit}`,
  ruleListOrderHint: 'Rules are checked in order. The first rule that matches wins.',
  ruleEnable: ({ name }) => `Enable ${name}`,
  ruleEdit: ({ name }) => `Edit ${name}`,
  ruleRemove: ({ name }) => `Remove ${name}`,
  ruleUntitled: ({ index }) => `Rule ${String(index)}`,
  ruleOff: 'Off',
  ruleRemoved: ({ name }) => `${name} removed.`,
};
