// ScheduleTimeline's narrow layout (phones): an agenda list grouped by lane, then by day.
import { useId } from 'react';
import type { HeadingLevel } from '../../utils/types';
import { AgendaDays } from './AgendaDays';
import type { TimelineFormat } from './format';
import type { PlacedItem, TimelineLane } from './layout';
import type { ScheduleTimelineMessages } from './messages';

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
  const LaneHeading = `h${String(headingLevel)}` as 'h3';
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
      {items.length === 0 ? (
        <p className="m-0 text-sm text-fg-muted">{messages.scheduleLaneEmpty}</p>
      ) : (
        <AgendaDays
          items={items}
          conflictText={conflictText}
          format={format}
          itemTime={(placed) => format.itemTime(placed.start, placed.end)}
          rangeStart={rangeStart}
          headingLevel={Math.min(6, headingLevel + 1) as HeadingLevel}
          messages={messages}
        />
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
