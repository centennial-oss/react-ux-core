// ScheduleTimeline's toolbar: day / week / custom views, previous / today / next, and the visible range.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ToggleButton, ToggleButtonGroup } from 'react-aria-components';
import { Button } from '../Button/Button';
import { IconButton } from '../IconButton/IconButton';
import { NumberField } from '../NumberField/NumberField';
import type { ScheduleTimelineMessages } from './messages';

export type TimelineView = 'day' | 'week' | 'custom';

const VIEWS: readonly TimelineView[] = ['day', 'week', 'custom'];

const viewClasses = [
  'hit-area relative inline-flex h-8 min-w-hit cursor-pointer items-center justify-center px-3 text-sm text-fg select-none outline-none',
  'first:rounded-s-control last:rounded-e-control border-e border-border-strong last:border-e-0',
  'data-hovered:bg-surface-3 data-focus-visible:z-[1] data-focus-visible:focus-ring',
  'data-selected:bg-accent-solid data-selected:text-accent-on-solid',
].join(' ');

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
      <ToggleButtonGroup
        aria-label={messages.scheduleView}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[view]}
        onSelectionChange={(keys) => {
          const chosen = VIEWS.find((candidate) => keys.has(candidate));
          if (chosen) {
            onViewChange(chosen);
          }
        }}
        className="inline-flex rounded-control border border-border-strong"
      >
        {VIEWS.map((option) => (
          <ToggleButton key={option} id={option} className={viewClasses}>
            {viewLabels[option]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
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
      <div className="flex items-center gap-1">
        <IconButton
          icon={ChevronLeft}
          size="sm"
          variant="outline"
          aria-label={messages.schedulePrevious}
          onPress={() => {
            onStep(-1);
          }}
          className="rtl:-scale-x-100"
        />
        <Button size="sm" variant="outline" onPress={onToday}>
          {messages.scheduleToday}
        </Button>
        <IconButton
          icon={ChevronRight}
          size="sm"
          variant="outline"
          aria-label={messages.scheduleNext}
          onPress={() => {
            onStep(1);
          }}
          className="rtl:-scale-x-100"
        />
      </div>
      <p className="m-0 min-w-0 text-sm font-medium text-fg" aria-live="polite">
        {rangeLabel}
      </p>
    </div>
  );
}
