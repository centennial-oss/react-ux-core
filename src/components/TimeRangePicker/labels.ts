// Presets and human-readable labels for time ranges. Strings come from the messages object and Intl.

import { DateFormatter } from '@internationalized/date';
import type { CommonMessages, timeRangeStrings } from '../../provider/coreStrings';

/** The strings time range labels need. */
export type TimeRangeMessages = CommonMessages & typeof timeRangeStrings;
import { numberFormat, unitName } from '../../utils/intl';
import {
  isSameTimeRange,
  lastAmount,
  resolveTimeRange,
  type TimeRange,
  type TimeUnit,
} from './resolveTimeRange';

/** A ready-made range offered first in the picker, for example "Last 24 hours". */
export interface TimeRangePreset {
  /** Unique within the list. */
  id: string;
  /** The preset's name, shown in the list and on the trigger while it's the current range. */
  label: string;
  value: TimeRange;
}

/** The default presets: last hour, 24 hours, 7 days, 30 days, and this month, labelled from `messages`. */
export function getDefaultTimeRangePresets(messages: TimeRangeMessages): TimeRangePreset[] {
  return [
    {
      id: 'last-hour',
      label: messages.timeRangeLastHour,
      value: { kind: 'relative', from: '-1h', to: 'now' },
    },
    {
      id: 'last-24-hours',
      label: messages.timeRangeLast24Hours,
      value: { kind: 'relative', from: '-24h', to: 'now' },
    },
    {
      id: 'last-7-days',
      label: messages.timeRangeLast7Days,
      value: { kind: 'relative', from: '-7d', to: 'now' },
    },
    {
      id: 'last-30-days',
      label: messages.timeRangeLast30Days,
      value: { kind: 'relative', from: '-30d', to: 'now' },
    },
    {
      id: 'this-month',
      label: messages.timeRangeThisMonth,
      value: { kind: 'relative', from: 'now/M', to: 'now' },
    },
  ];
}

const UNIT_NAMES: Record<TimeUnit, string> = {
  s: 'second',
  m: 'minute',
  h: 'hour',
  d: 'day',
  w: 'week',
  M: 'month',
  y: 'year',
};

/** An amount of a unit, localised and pluralised by Intl, for example "3 hours". */
export function formatTimeAmount(amount: number, unit: TimeUnit, locale: string): string {
  return numberFormat(locale, {
    style: 'unit',
    unit: UNIT_NAMES[unit],
    unitDisplay: 'long',
  }).format(amount);
}

/** Just the unit's name as Intl writes it after `amount`, for example "hours" for 3. */
export function formatTimeUnit(unit: TimeUnit, amount: number, locale: string): string {
  return unitName(locale, UNIT_NAMES[unit], 'long', amount);
}

export interface FormatTimeRangeOptions {
  /** The library's strings, with the time range group (see `TimeRangeMessages`). */
  messages: TimeRangeMessages;
  /** BCP 47 locale for numbers, units and dates. */
  locale: string;
  /** IANA time zone that dates are shown in and relative ranges resolve in. */
  timeZone: string;
  /** A range equal to one of these shows the preset's label. */
  presets?: readonly TimeRangePreset[];
  /** For ranges shown as dates: the current time. Defaults to now. */
  now?: Date | number;
  /** 12- or 24-hour times. Defaults to the locale's. */
  hourCycle?: 12 | 24;
}

/**
 * A short label for a range: a matching preset's label; "Last 3 hours" for a `-3h` → `now` range (the amount
 * formatted by Intl); otherwise the resolved start and end dates. Returns an empty string for a malformed range.
 */
export function formatTimeRange(value: TimeRange, options: FormatTimeRangeOptions): string {
  const preset = options.presets?.find((candidate) => isSameTimeRange(candidate.value, value));
  if (preset) {
    return preset.label;
  }
  const last = lastAmount(value);
  if (last) {
    return options.messages.timeRangeLast({
      amount: formatTimeAmount(last.amount, last.unit, options.locale),
    });
  }
  try {
    const { start, end } = resolveTimeRange(value, options.now ?? Date.now(), options.timeZone);
    return new DateFormatter(options.locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: options.timeZone,
      ...(options.hourCycle !== undefined && {
        hourCycle: options.hourCycle === 12 ? 'h12' : 'h23',
      }),
    }).formatRange(start, end);
  } catch {
    return '';
  }
}
