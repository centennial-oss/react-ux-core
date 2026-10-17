import { describe, expect, it } from 'vitest';
import {
  observatoryActions,
  observatoryFields,
  observatoryRules,
  WEATHER_HOLD_SUMMARY,
  weatherHoldRule,
} from '../../../test/rules';
import { defaultRuleBuilderMessages } from './messages';
import { summarizeRule } from './summary';
import type { Rule, RuleField } from './types';

const options = {
  fields: observatoryFields,
  actions: observatoryActions,
  messages: defaultRuleBuilderMessages,
  locale: 'en-US',
};

describe('summarizeRule', () => {
  it('reads a rule with a nested OR group and two actions', () => {
    expect(summarizeRule(weatherHoldRule, options)).toBe(WEATHER_HOLD_SUMMARY);
  });

  it('formats lists, durations, booleans and ranges', () => {
    const [, frost, calibration] = observatoryRules as [Rule, Rule, Rule];
    expect(summarizeRule(frost, options)).toBe(
      'When temperature is less than 0 °C and dome open is yes, text the observer',
    );
    expect(summarizeRule(calibration, options)).toBe(
      'When target is Vega or Arcturus and the time window is less than 30 minutes, pause observations for 10 minutes',
    );
    const range: Rule = {
      ...frost,
      when: {
        id: 'r',
        join: 'or',
        items: [
          { id: 'a', fieldId: 'wind', operator: 'between', value: [10, 40] },
          { id: 'b', fieldId: 'night', operator: 'gt', value: '2026-10-16' },
          { id: 'c', fieldId: 'filters', operator: 'contains', value: ['r', 'ha'] },
          { id: 'd', fieldId: 'source', operator: 'exists', value: null },
        ],
      },
      then: [],
    };
    expect(summarizeRule(range, options)).toBe(
      'When wind speed is between 10 km/h and 40 km/h, the night is after Oct 16, 2026, filters contains Red and Hydrogen-alpha, or source address is set, do nothing',
    );
  });

  it('matches the CDN example from the spec', () => {
    const fields: RuleField[] = [
      { id: 'path', label: 'Path', summaryLabel: 'path', type: 'text', operators: ['startsWith'] },
      {
        id: 'country',
        label: 'Country',
        summaryLabel: 'country',
        type: 'enum',
        operators: ['in'],
        options: [
          { id: 'US', label: 'US' },
          { id: 'CA', label: 'CA' },
        ],
      },
    ];
    const rule: Rule = {
      id: 'cdn',
      name: 'Images',
      isEnabled: true,
      when: {
        id: 'root',
        join: 'and',
        items: [
          { id: 'a', fieldId: 'path', operator: 'startsWith', value: '/img' },
          { id: 'b', fieldId: 'country', operator: 'in', value: ['US', 'CA'] },
        ],
      },
      then: [{ actionId: 'cache', settings: 3_600_000 }],
    };
    expect(
      summarizeRule(rule, {
        ...options,
        fields,
        actions: [{ id: 'cache', label: 'Cache', summarize: () => 'cache for 1 hour' }],
      }),
    ).toBe('When path starts with /img and country is US or CA, cache for 1 hour');
  });

  it('marks missing values and reads rules without conditions', () => {
    const rule: Rule = {
      ...weatherHoldRule,
      when: {
        id: 'r',
        join: 'and',
        items: [{ id: 'a', fieldId: 'wind', operator: 'gt', value: null }],
      },
    };
    expect(summarizeRule(rule, options)).toContain('wind speed is more than …');
    expect(
      summarizeRule({ ...weatherHoldRule, when: { id: 'r', join: 'and', items: [] } }, options),
    ).toBe('Always close the dome and notify the observer by email');
  });
});
