// ScheduleTimeline's toolbar: day / week / custom views, previous / today / next, and the visible range.
import { NumberField } from '../NumberField/NumberField';
import type { ScheduleTimelineMessages } from './messages';
import { PeriodNav, ViewSwitch } from './PeriodControls';

export type TimelineView = 'day' | 'week' | 'custom';

const VIEWS: readonly TimelineView[] = ['day', 'week', 'custom'];

export interface TimelineToolbarProps {
  view: TimelineView;
  onViewChange: (view: TimelineView) => void;
  /** The custom view's length in days. */
  days: number;
  onDaysChange: (days: number) => void;
  onStep: (direction: -1 | 1) => void;
  onToday: () => void;
  /** The visible range as text. */
  rangeLabel: string;
  messages: ScheduleTimelineMessages;
}

export function TimelineToolbar({
  view,
  onViewChange,
  days,
  onDaysChange,
  onStep,
  onToday,
  rangeLabel,
  messages,
}: TimelineToolbarProps) {
  const viewLabels: Record<TimelineView, string> = {
    day: messages.scheduleViewDay,
    week: messages.scheduleViewWeek,
    custom: messages.scheduleViewCustom,
  };
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border p-2">
      <ViewSwitch
        aria-label={messages.scheduleView}
        views={VIEWS}
        labels={viewLabels}
        value={view}
        onChange={onViewChange}
      />
      {view === 'custom' && (
        <NumberField
          label={messages.scheduleDays}
          labelPosition="side"
          size="sm"
          minValue={1}
          maxValue={62}
          value={days}
          onChange={(value) => {
            if (value !== null && Number.isFinite(value)) {
              onDaysChange(Math.round(value));
            }
          }}
          className="w-40"
        />
      )}
      <PeriodNav onStep={onStep} onToday={onToday} messages={messages} />
      <p className="m-0 min-w-0 text-sm font-medium text-fg" aria-live="polite">
        {rangeLabel}
      </p>
    </div>
  );
}
