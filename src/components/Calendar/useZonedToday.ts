import { today as todayIn, type CalendarDate } from '@internationalized/date';
import { useMemo } from 'react';
import { useTimeZone } from '../../provider/context';

/**
 * The time zone a calendar or date picker works in (`timeZoneProp`, else `UIProvider`'s `timeZone`, else the
 * browser's zone) and today's date there. `today` keeps its identity until the zone changes, since React Aria compares
 * dates by identity.
 */
export function useZonedToday(timeZoneProp?: string): { timeZone: string; today: CalendarDate } {
  const defaultTimeZone = useTimeZone();
  const timeZone = timeZoneProp ?? defaultTimeZone;
  const today = useMemo(() => todayIn(timeZone), [timeZone]);
  return { timeZone, today };
}
