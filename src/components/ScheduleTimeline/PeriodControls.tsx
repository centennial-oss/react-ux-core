// Toolbar controls shared by ScheduleTimeline and EventCalendar: a switch between views, and previous / today / next
// buttons that step the visible range.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../Button/Button';
import { IconButton } from '../IconButton/IconButton';
import { ToggleButton, ToggleButtonGroup } from '../ToggleButton/ToggleButton';
import type { ScheduleTimelineMessages } from './messages';

export interface ViewSwitchProps<V extends string> {
  /** The views offered, in order. */
  views: readonly V[];
  /** Each view's button text. */
  labels: Readonly<Record<V, string>>;
  value: V;
  onChange: (view: V) => void;
  'aria-label': string;
}

/** One pressed button per view (radio semantics). */
export function ViewSwitch<V extends string>({
  views,
  labels,
  value,
  onChange,
  'aria-label': ariaLabel,
}: ViewSwitchProps<V>) {
  return (
    <ToggleButtonGroup
      aria-label={ariaLabel}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const chosen = views.find((candidate) => keys.has(candidate));
        if (chosen) {
          onChange(chosen);
        }
      }}
      isAttached
      size="sm"
      tone="accent"
    >
      {views.map((option) => (
        <ToggleButton key={option} id={option} className="min-w-hit font-normal">
          {labels[option]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export interface PeriodNavProps {
  /** Moves the range back (-1) or forward (1) by one period. */
  onStep: (direction: -1 | 1) => void;
  /** Moves the range to the one containing now. */
  onToday: () => void;
  messages: Pick<ScheduleTimelineMessages, 'schedulePrevious' | 'scheduleNext' | 'scheduleToday'>;
}

/** Previous, Today and Next. */
export function PeriodNav({ onStep, onToday, messages }: PeriodNavProps) {
  return (
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
  );
}
