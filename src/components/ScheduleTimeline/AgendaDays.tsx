// An agenda's days: items grouped under a heading for the day they start on (or the range's first day, for items that
// began before it), each with its times, lock, conflicts and detail. ScheduleTimeline's phone agenda shows these per
// lane; EventCalendar's agenda view and its "+N more" list show them for the whole calendar.
import { Lock, TriangleAlert } from 'lucide-react';
import { cn } from '../../utils/cn';
import { toneFillClasses } from '../../utils/toneClasses';
import type { HeadingLevel } from '../../utils/types';
import type { TimelineFormat } from './format';
import type { TimelineItem } from './layout';
import type { ScheduleTimelineMessages } from './messages';

/** An item in an agenda: its instants as epoch milliseconds, and what to show of it. */
export interface AgendaEntry {
  id: string;
  start: number;
  end: number;
  item: Pick<TimelineItem, 'label' | 'tone' | 'isLocked' | 'detail'>;
}

export interface AgendaDaysProps<E extends AgendaEntry> {
  /** Sorted by start. */
  items: readonly E[];
  /** The items an item conflicts with, joined (such as "A and B"), or empty. */
  conflictText?: (id: string) => string;
  format: Pick<TimelineFormat, 'dayKey' | 'longDay'>;
  /** An item's times as text. */
  itemTime: (entry: E) => string;
  /** Items that began before this instant are listed under its day. */
  rangeStart: number;
  /** The level of the day headings. */
  headingLevel: HeadingLevel;
  messages: Pick<ScheduleTimelineMessages, 'scheduleLocked' | 'scheduleConflictsWith'>;
}

const NO_CONFLICTS = () => '';

/** The items' days, each a heading and a list. */
export function AgendaDays<E extends AgendaEntry>({
  items,
  conflictText = NO_CONFLICTS,
  format,
  itemTime,
  rangeStart,
  headingLevel,
  messages,
}: AgendaDaysProps<E>) {
  const DayHeading = `h${String(headingLevel)}` as 'h4';
  const days: { key: string; first: number; items: E[] }[] = [];
  for (const item of items) {
    const first = Math.max(item.start, rangeStart);
    const key = format.dayKey(first);
    const last = days.at(-1);
    if (last?.key === key) {
      last.items.push(item);
    } else {
      days.push({ key, first, items: [item] });
    }
  }
  return days.map((day) => (
    <div key={day.key} className="flex flex-col gap-1">
      <DayHeading className="m-0 text-xs font-medium text-fg-muted">
        {format.longDay(day.first)}
      </DayHeading>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {day.items.map((placed) => {
          const conflicts = conflictText(placed.id);
          const tone = placed.item.tone ?? 'accent';
          return (
            <li
              key={placed.id}
              className={cn(
                'flex flex-col gap-0.5 rounded-control border bg-surface-1 px-3 py-2',
                conflicts === '' ? 'border-border' : 'border-warning-border',
              )}
            >
              <div className="flex items-center gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className={cn('size-2 shrink-0 rounded-full', toneFillClasses[tone])}
                />
                <span className="font-medium text-fg">{placed.item.label}</span>
                {placed.item.isLocked && (
                  <Lock
                    role="img"
                    aria-label={messages.scheduleLocked}
                    className="size-3.5 shrink-0 text-fg-muted"
                  />
                )}
              </div>
              <div className="text-xs text-fg-muted tabular-nums">{itemTime(placed)}</div>
              {conflicts !== '' && (
                <div className="flex items-center gap-1 text-xs text-warning-fg">
                  <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                  {messages.scheduleConflictsWith({ items: conflicts })}
                </div>
              )}
              {placed.item.detail !== undefined && (
                <div className="text-xs text-fg-muted">{placed.item.detail}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  ));
}
