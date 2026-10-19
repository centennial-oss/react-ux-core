// What a world clock shows, worked out once a minute per clock (label, date, offset, difference, day or night) and,
// for the time itself, on every tick. Formatters come from the shared Intl cache.

import { dateTimeFormat, listFormat, numberFormat } from '../../utils/intl';
import { DAY_MS } from '../../utils/time';
import type { GanttWorkingHours } from '../GanttChart/scale';
import { zonedParts, zoneOffset, type ZonedParts } from '../ScheduleTimeline/zone';
import type { WorldClockMessages } from './messages';

/** A clock: an IANA time zone and, optionally, its name. */
export interface WorldClockItem {
  id: string;
  /** IANA time zone, such as `Europe/London`. */
  timeZone: string;
  /** Defaults to the zone's city: `America/New_York` becomes "New York". */
  label?: string;
}

/** A clock's minute-level details. `error` is set (and the rest left empty) when its zone isn't known. */
export interface ClockInfo {
  id: string;
  timeZone: string;
  label: string;
  error?: string;
  parts?: ZonedParts;
  date?: string;
  offset?: string;
  difference?: string;
  isDay: boolean;
  isWorking?: boolean;
  /** The clock's full name for screen readers, to the minute: "London, 3:42 PM, Tuesday". */
  name: string;
}

export interface ClockInfoOptions {
  locale: string;
  localZone: string;
  hourCycle?: 12 | 24;
  hasDate: boolean;
  hasOffset: boolean;
  hasDifference: boolean;
  hasDayNight: boolean;
  workingHours?: GanttWorkingHours;
  workingDays: readonly number[];
  messages: WorldClockMessages;
}

const HOUR_MS = 3_600_000;

/** The city in an IANA zone name: `America/Argentina/Buenos_Aires` becomes "Buenos Aires". */
export function zoneCity(timeZone: string): string {
  return timeZone.slice(timeZone.lastIndexOf('/') + 1).replaceAll('_', ' ');
}

function isKnownZone(locale: string, timeZone: string): boolean {
  try {
    dateTimeFormat(locale, { timeZone });
    return true;
  } catch {
    return false;
  }
}

function timeOptions(
  timeZone: string,
  hourCycle: 12 | 24 | undefined,
  hasSeconds: boolean,
): Intl.DateTimeFormatOptions {
  return {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    ...(hasSeconds && { second: '2-digit' }),
    ...(hourCycle !== undefined && { hourCycle: hourCycle === 12 ? 'h12' : 'h23' }),
  };
}

/** The time in `timeZone` as Intl parts, so the day period ("PM") can be styled apart wherever the locale puts it. */
export function formatClockTime(
  ms: number,
  timeZone: string,
  locale: string,
  hourCycle: 12 | 24 | undefined,
  hasSeconds: boolean,
): Intl.DateTimeFormatPart[] {
  return dateTimeFormat(locale, timeOptions(timeZone, hourCycle, hasSeconds)).formatToParts(ms);
}

/** The calendar day `ms` falls on in a zone, as whole days since the epoch, for comparing days across zones. */
function dayNumber(parts: ZonedParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day) / DAY_MS;
}

function hourDifference(locale: string, hours: number, unitDisplay: 'narrow' | 'long'): string {
  return numberFormat(locale, {
    style: 'unit',
    unit: 'hour',
    unitDisplay,
    signDisplay: 'always',
    maximumFractionDigits: 2,
  }).format(hours);
}

/** Each clock's minute-level details at instant `ms` (the start of a minute). */
export function clockInfos(
  items: readonly WorldClockItem[],
  ms: number,
  options: ClockInfoOptions,
): ClockInfo[] {
  const { locale, localZone, hourCycle, messages, workingHours, workingDays } = options;
  const names = listFormat(locale, { type: 'unit', style: 'short' });
  const localOffset = zoneOffset(ms, localZone);
  const localDay = dayNumber(zonedParts(ms, localZone));

  return items.map(({ id, timeZone, label = zoneCity(timeZone) }) => {
    if (!isKnownZone(locale, timeZone)) {
      const error = messages.worldClockUnknownZone({ timeZone });
      return { id, timeZone, label, error, isDay: true, name: names.format([label, error]) };
    }
    const parts = zonedParts(ms, timeZone);
    const time = formatClockTime(ms, timeZone, locale, hourCycle, false)
      .map((part) => part.value)
      .join('');
    const spoken = [label, time];

    const weekdayOptions: Intl.DateTimeFormatOptions = options.hasDate
      ? { timeZone, weekday: 'long', month: 'long', day: 'numeric' }
      : { timeZone, weekday: 'long' };
    spoken.push(dateTimeFormat(locale, weekdayOptions).format(ms));
    const date = options.hasDate
      ? dateTimeFormat(locale, {
          timeZone,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }).format(ms)
      : undefined;

    const offset = options.hasOffset
      ? dateTimeFormat(locale, { timeZone, timeZoneName: 'shortOffset' })
          .formatToParts(ms)
          .find((part) => part.type === 'timeZoneName')?.value
      : undefined;
    if (offset !== undefined) {
      spoken.push(offset);
    }

    let difference: string | undefined;
    if (options.hasDifference) {
      const hours = (zoneOffset(ms, timeZone) - localOffset) / HOUR_MS;
      const days = dayNumber(parts) - localDay;
      const day =
        days > 0
          ? messages.worldClockTomorrow
          : days < 0
            ? messages.worldClockYesterday
            : undefined;
      const hourText = (unitDisplay: 'narrow' | 'long') =>
        hours === 0 ? messages.worldClockSameTime : hourDifference(locale, hours, unitDisplay);
      difference = day === undefined ? hourText('narrow') : `${hourText('narrow')} · ${day}`;
      spoken.push(hourText('long'), ...(day === undefined ? [] : [day]));
    }

    const isDay = parts.hour >= 6 && parts.hour < 18;
    if (options.hasDayNight) {
      spoken.push(isDay ? messages.worldClockDay : messages.worldClockNight);
    }
    let isWorking: boolean | undefined;
    if (workingHours) {
      const hour = parts.hour + parts.minute / 60;
      isWorking =
        workingDays.includes(parts.weekday) &&
        hour >= workingHours.start &&
        hour < workingHours.end;
      spoken.push(isWorking ? messages.worldClockWorking : messages.worldClockNotWorking);
    }

    return {
      id,
      timeZone,
      label,
      parts,
      date,
      offset,
      difference,
      isDay,
      isWorking,
      name: names.format(spoken),
    };
  });
}
