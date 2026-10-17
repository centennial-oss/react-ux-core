// Shared fixtures for RuleBuilder and RuleList: an observatory's alert rules.
import { Option } from '../src/components/ListBox/ListBoxParts';
import type { Rule, RuleAction, RuleField } from '../src/components/RuleBuilder/types';
import { Select } from '../src/components/Select/Select';
import { DurationField } from '../src/components/UnitField/DurationField';
import { formatDuration } from '../src/components/UnitField/format';

export const observatoryFields: RuleField[] = [
  {
    id: 'instrument',
    label: 'Instrument',
    summaryLabel: 'instrument',
    type: 'enum',
    operators: ['equals', 'notEquals', 'in', 'notIn'],
    options: [
      { id: 'nr1', label: 'Telescope NR-1' },
      { id: 'spectrograph', label: 'Spectrograph' },
      { id: 'allsky', label: 'All-sky camera' },
    ],
  },
  {
    id: 'temperature',
    label: 'Temperature',
    summaryLabel: 'temperature',
    type: 'number',
    unit: '°C',
    operators: ['lt', 'lte', 'gt', 'gte', 'between'],
  },
  {
    id: 'wind',
    label: 'Wind speed',
    summaryLabel: 'wind speed',
    type: 'number',
    unit: 'km/h',
    operators: ['gt', 'gte', 'lt', 'lte', 'between'],
  },
  {
    id: 'cloud',
    label: 'Cloud cover',
    summaryLabel: 'cloud cover',
    type: 'number',
    unit: 'oktas',
    operators: ['gt', 'gte', 'lt', 'lte'],
  },
  {
    id: 'window',
    label: 'Time window',
    summaryLabel: 'the time window',
    type: 'duration',
    operators: ['gt', 'lt', 'between'],
  },
  {
    id: 'target',
    label: 'Target',
    summaryLabel: 'target',
    type: 'text',
    operators: ['equals', 'startsWith', 'contains', 'matches', 'in', 'notIn'],
  },
  {
    id: 'filters',
    label: 'Filters',
    summaryLabel: 'filters',
    type: 'multiEnum',
    operators: ['contains', 'in'],
    options: [
      { id: 'r', label: 'Red' },
      { id: 'g', label: 'Green' },
      { id: 'b', label: 'Blue' },
      { id: 'ha', label: 'Hydrogen-alpha' },
    ],
  },
  {
    id: 'dome',
    label: 'Dome open',
    summaryLabel: 'dome open',
    type: 'boolean',
    operators: ['equals'],
  },
  {
    id: 'night',
    label: 'Night of',
    summaryLabel: 'the night',
    type: 'date',
    operators: ['equals', 'gt', 'lt', 'between'],
  },
  {
    id: 'source',
    label: 'Source address',
    summaryLabel: 'source address',
    type: 'cidr',
    operators: ['in', 'notIn', 'exists'],
  },
];

const channels = [
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'Text message' },
];

export const observatoryActions: RuleAction[] = [
  {
    id: 'closeDome',
    label: 'Close the dome',
    summarize: () => 'close the dome',
  },
  {
    id: 'notify',
    label: 'Notify the observer',
    defaultSettings: 'email',
    summarize: (settings) =>
      settings === 'sms' ? 'text the observer' : 'notify the observer by email',
    renderSettings: ({ value, onChange }) => (
      <Select
        label="Channel"
        items={channels}
        value={typeof value === 'string' ? value : null}
        onChange={onChange}
      >
        {(item) => <Option id={item.id}>{item.label}</Option>}
      </Select>
    ),
  },
  {
    id: 'pause',
    label: 'Pause observations',
    defaultSettings: 3_600_000,
    summarize: (settings) =>
      typeof settings === 'number'
        ? `pause observations for ${formatDuration(settings, { locale: 'en-US', unitDisplay: 'long' })}`
        : 'pause observations',
    renderSettings: ({ value, onChange }) => (
      <DurationField
        label="Pause for"
        value={typeof value === 'number' ? value : null}
        onChange={onChange}
      />
    ),
  },
];

/** Three conditions (one in a nested OR group) and two actions. */
export const weatherHoldRule: Rule = {
  id: 'weather-hold',
  name: 'Weather hold',
  isEnabled: true,
  when: {
    id: 'root',
    join: 'and',
    items: [
      { id: 'c1', fieldId: 'instrument', operator: 'equals', value: 'nr1' },
      {
        id: 'g1',
        join: 'or',
        items: [
          { id: 'c2', fieldId: 'cloud', operator: 'gt', value: 6 },
          { id: 'c3', fieldId: 'wind', operator: 'gt', value: 40 },
        ],
      },
    ],
  },
  then: [
    { actionId: 'closeDome', settings: null },
    { actionId: 'notify', settings: 'email' },
  ],
};

export const WEATHER_HOLD_SUMMARY =
  'When instrument is Telescope NR-1 and (cloud cover is more than 6 oktas or wind speed is more than 40 km/h), close the dome and notify the observer by email';

export const observatoryRules: Rule[] = [
  weatherHoldRule,
  {
    id: 'frost',
    name: 'Frost warning',
    isEnabled: true,
    when: {
      id: 'frost-root',
      join: 'and',
      items: [
        { id: 'f1', fieldId: 'temperature', operator: 'lt', value: 0 },
        { id: 'f2', fieldId: 'dome', operator: 'equals', value: true },
      ],
    },
    then: [{ actionId: 'notify', settings: 'sms' }],
  },
  {
    id: 'calibration',
    name: 'Calibration targets',
    isEnabled: false,
    when: {
      id: 'cal-root',
      join: 'and',
      items: [
        { id: 'k1', fieldId: 'target', operator: 'in', value: ['Vega', 'Arcturus'] },
        { id: 'k2', fieldId: 'window', operator: 'lt', value: 1_800_000 },
      ],
    },
    then: [{ actionId: 'pause', settings: 600_000 }],
  },
];
