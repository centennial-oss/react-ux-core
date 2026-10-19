import { describe, expect, it } from 'vitest';
import { observatoryFields, weatherHoldRule } from '../../../test/rules';
import {
  appendItem,
  conditionError,
  countConditions,
  emptyValue,
  removeItem,
  updateItem,
  validateRule,
  valueShape,
  withField,
  withOperator,
} from './ruleTree';
import type { RuleCondition, RuleField } from './types';

function field(id: string): RuleField {
  const found = observatoryFields.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`No field ${id}`);
  }
  return found;
}

const condition = (fieldId: string, operator: RuleCondition['operator'], value: unknown) => ({
  id: 'x',
  fieldId,
  operator,
  value,
});

describe('valueShape and emptyValue', () => {
  it('follows the operator and field type', () => {
    expect(valueShape(field('wind'), 'gt')).toBe('single');
    expect(valueShape(field('wind'), 'between')).toBe('pair');
    expect(valueShape(field('target'), 'in')).toBe('list');
    expect(valueShape(field('filters'), 'contains')).toBe('list');
    expect(valueShape(field('source'), 'exists')).toBe('none');
    expect(emptyValue(field('target'), 'equals')).toBe('');
    expect(emptyValue(field('wind'), 'between')).toEqual([null, null]);
    expect(emptyValue(field('dome'), 'equals')).toBe(true);
    expect(emptyValue(field('wind'), 'gt')).toBeNull();
  });

  it('keeps a value across operators of the same shape and resets it otherwise', () => {
    const base = condition('wind', 'gt', 40);
    expect(withOperator(base, field('wind'), 'gte').value).toBe(40);
    expect(withOperator(base, field('wind'), 'between').value).toEqual([null, null]);
    const switched = withField(base, field('target'));
    expect(switched).toMatchObject({ fieldId: 'target', operator: 'equals', value: '' });
  });
});

describe('conditionError', () => {
  it('checks values by type', () => {
    expect(conditionError(field('wind'), condition('wind', 'gt', 40))).toBeNull();
    expect(conditionError(field('wind'), condition('wind', 'gt', null))).toBe('required');
    expect(conditionError(field('wind'), condition('wind', 'gt', 'fast'))).toBe('invalidNumber');
    expect(conditionError(field('target'), condition('target', 'matches', '(M3'))).toBe(
      'invalidPattern',
    );
    expect(conditionError(field('target'), condition('target', 'matches', '^M\\d+$'))).toBeNull();
    expect(conditionError(field('source'), condition('source', 'in', ['10.0.0.0/8']))).toBeNull();
    expect(conditionError(field('source'), condition('source', 'in', ['10.0.0.300/8']))).toBe(
      'invalidCidr',
    );
    expect(conditionError(field('source'), condition('source', 'exists', null))).toBeNull();
    expect(conditionError(field('night'), condition('night', 'equals', '2026-02-30x'))).toBe(
      'invalidDate',
    );
    expect(conditionError(field('target'), condition('target', 'in', []))).toBe('required');
  });

  it('flags ranges whose end is before their start', () => {
    expect(conditionError(field('wind'), condition('wind', 'between', [10, 40]))).toBeNull();
    expect(conditionError(field('wind'), condition('wind', 'between', [40, 10]))).toBe(
      'rangeOrder',
    );
    expect(
      conditionError(field('night'), condition('night', 'between', ['2026-10-20', '2026-10-01'])),
    ).toBe('rangeOrder');
  });

  it('flags unknown fields and operators', () => {
    expect(conditionError(undefined, condition('gone', 'equals', 'a'))).toBe('unknownField');
    expect(conditionError(field('wind'), condition('wind', 'contains', 'a'))).toBe(
      'unknownOperator',
    );
  });
});

describe('tree edits', () => {
  it('updates, appends and removes items anywhere in the tree', () => {
    const { when } = weatherHoldRule;
    expect(countConditions(when)).toBe(3);
    const updated = updateItem(when, 'c3', (item) => ({ ...item, value: 50 }));
    expect(JSON.stringify(updated)).toContain('"value":50');
    expect(when).toBe(weatherHoldRule.when);
    const appended = appendItem(when, 'g1', condition('temperature', 'lt', 0));
    expect(countConditions(appended)).toBe(4);
    const removed = removeItem(appended, 'g1');
    expect(countConditions(removed)).toBe(1);
  });

  it('lists every problem for validateRule', () => {
    expect(validateRule(weatherHoldRule, observatoryFields)).toEqual([]);
    const broken = updateItem(weatherHoldRule.when, 'c2', (item) => ({ ...item, value: null }));
    expect(validateRule({ when: broken }, observatoryFields)).toEqual([
      { conditionId: 'c2', error: 'required' },
    ]);
  });
});
