// ScheduleTimeline's narrow layout (phones): an agenda list grouped by lane, then by day.
import { Lock, TriangleAlert } from 'lucide-react';
import { useId } from 'react';
import { cn } from '../../utils/cn';
import type { HeadingLevel, Tone } from '../../utils/types';
import type { TimelineFormat } from './format';
import type { PlacedItem, TimelineLane } from './layout';
import type { ScheduleTimelineMessages } from './messages';

const dotClasses: Record<Tone, string> = {
  neutral: 'bg-neutral-solid',
  accent: 'bg-accent-solid',
  success: 'bg-success-solid',
  warning: 'bg-warning-solid',
  danger: 'bg-danger-solid',
};

const headingTags = { 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5', 6: 'h6' } as const;

export interface TimelineAgendaProps {
  lanes: readonly TimelineLane[];
  laneItems: ReadonlyMap<string, readonly PlacedItem[]>;
  conflictText: (id: string) => string;
  format: TimelineFormat;
  rangeStart: number;
  headingLevel: HeadingLevel;
  messages: ScheduleTimelineMessages;
}

function AgendaLane({
  lane,
  items,
  conflictText,
  format,
  rangeStart,
  headingLevel,
  messages,
}: Omit<TimelineAgendaProps, 'lanes' | 'laneItems'> & {
  lane: TimelineLane;
  items: readonly PlacedItem[];
}) {
  const headingId = useId();
  const LaneHeading = headingTags[headingLevel];
  const DayHeading = headingTags[Math.min(6, headingLevel + 1) as HeadingLevel];
  const days: { key: string; first: number; items: PlacedItem[] }[] = [];
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
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div>
        <LaneHeading id={headingId} className="m-0 text-sm font-semibold text-fg">
          {lane.label}
        </LaneHeading>
        {lane.description !== undefined && (
          <div className="text-xs text-fg-muted">{lane.description}</div>
        )}
      </div>
      {days.length === 0 ? (
        <p className="m-0 text-sm text-fg-muted">{messages.scheduleLaneEmpty}</p>
      ) : (
        days.map((day) => (
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
                        className={cn('size-2 shrink-0 rounded-full', dotClasses[tone])}
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
                    <div className="text-xs text-fg-muted tabular-nums">
                      {format.itemTime(placed.start, placed.end)}
                    </div>
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
        ))
      )}
    </section>
  );
}

/** Lanes in order, each with its items in the range grouped by day. */
export function TimelineAgenda({ lanes, laneItems, ...rest }: TimelineAgendaProps) {
  return (
    <div className="flex flex-col gap-4 p-3">
      {lanes.map((lane) => (
        <AgendaLane key={lane.id} lane={lane} items={laneItems.get(lane.id) ?? []} {...rest} />
      ))}
    </div>
  );
}
