// EventCalendar's pointer editing: what a press landed on (an event and its resize handle, or an empty day), and the
// drag by whole days that the month grid and the all-day row share. Handlers sit on each region, not on every event,
// so events stay plain memoised elements.
import type { PointerEvent } from 'react';
import { usePointerDrag } from '../../utils/usePointerDrag';
import { addDays } from '../ScheduleTimeline/zone';
import type { CalendarEntry } from './layout';

/** What a press in a region landed on. */
export type PressTarget =
  | { kind: 'event'; key: string; entryId: string; handle: 'start' | 'end' | undefined }
  | { kind: 'day'; day: number }
  | null;

export function pressTargetOf(event: PointerEvent): PressTarget {
  const target = event.target as HTMLElement;
  // Buttons ("+N more") keep their own press.
  if (target.closest('button')) {
    return null;
  }
  const eventElement = target.closest<HTMLElement>('[data-entry]');
  if (eventElement) {
    const handle = target.closest<HTMLElement>('[data-handle]')?.dataset.handle;
    return {
      kind: 'event',
      key: eventElement.dataset.key ?? '',
      entryId: eventElement.dataset.entry ?? '',
      handle: handle === 'start' || handle === 'end' ? handle : undefined,
    };
  }
  const day = target.closest<HTMLElement>('[data-day]')?.dataset.day;
  return day === undefined ? null : { kind: 'day', day: Number(day) };
}

/** The column under `clientX` in an element split into `columns` equal columns (mirrored right to left). */
export function columnAt(clientX: number, rect: DOMRect, columns: number, isRtl: boolean): number {
  const column = Math.floor(((clientX - rect.left) / Math.max(1, rect.width)) * columns);
  const clamped = Math.min(columns - 1, Math.max(0, column));
  return isRtl ? columns - 1 - clamped : clamped;
}

/** A drag by whole days: moving an event, moving its end, or drawing out a new all-day event. */
export interface DayDrag {
  kind: 'move' | 'end' | 'create';
  /** The pressed event's key and id (not for `create`). */
  key?: string;
  entryId?: string;
  /** The day (index into the boundaries) the press began on. */
  day: number;
  /** The event's times when the drag began (for `create`, the pressed day's). In a preview, where it would land. */
  start: number;
  end: number;
}

interface DayDragOptions {
  /** The visible days' boundaries. */
  days: readonly number[];
  timeZone: string;
  /** The shortest a timed event may get. */
  snapMs: number;
  /** The day under the pointer. */
  dayAt: (clientX: number, clientY: number) => number;
  entryById: ReadonlyMap<string, CalendarEntry>;
  onCommit: (entry: CalendarEntry, start: number, end: number) => void;
  onCreate: (start: number, end: number, isAllDay: boolean) => void;
  onOpenDetails: (key: string) => void;
}

/** The shortest end an event may have: a day after an all-day start, or one snap after a timed one. */
export function minimumEnd(
  entry: Pick<CalendarEntry, 'start' | 'isAllDay'>,
  timeZone: string,
  snapMs: number,
): number {
  return entry.isAllDay ? addDays(entry.start, 1, timeZone) : entry.start + snapMs;
}

/** Pointer handlers and the preview for dragging events by whole days. */
export function useDayDrag({
  days,
  timeZone,
  snapMs,
  dayAt,
  entryById,
  onCommit,
  onCreate,
  onOpenDetails,
}: DayDragOptions) {
  const resolve = (state: DayDrag, day: number): DayDrag => {
    const delta = day - state.day;
    if (state.kind === 'create') {
      const from = Math.min(state.day, day);
      const to = Math.max(state.day, day);
      return { ...state, start: days[from] ?? state.start, end: days[to + 1] ?? state.end };
    }
    if (state.kind === 'end') {
      const entry = state.entryId === undefined ? undefined : entryById.get(state.entryId);
      const end = addDays(state.end, delta, timeZone);
      return {
        ...state,
        end: entry ? Math.max(end, minimumEnd(entry, timeZone, snapMs)) : end,
      };
    }
    return {
      ...state,
      start: addDays(state.start, delta, timeZone),
      end: addDays(state.end, delta, timeZone),
    };
  };
  const drag = usePointerDrag<DayDrag, DayDrag>({
    resolve: ({ state }, clientX, clientY) => resolve(state, dayAt(clientX, clientY)),
    onDrop: ({ state }, result) => {
      if (state.kind === 'create') {
        onCreate(result.start, result.end, true);
        return;
      }
      const entry = state.entryId === undefined ? undefined : entryById.get(state.entryId);
      if (entry) {
        onCommit(entry, result.start, result.end);
      }
    },
    onPress: ({ state, pointerType }) => {
      if (state.key !== undefined) {
        onOpenDetails(state.key);
      } else if (state.kind === 'create' && pointerType === 'touch') {
        // Touch scrolling needs the empty days, so a tap (not a drag) adds an all-day event there.
        onCreate(state.start, state.end, true);
      }
    },
  });
  /** Starts a press on an event or an empty day (`canCreate`), from a pointerdown in the region. */
  const onPointerDown = (
    event: PointerEvent<HTMLElement>,
    { isEditable, canCreate }: { isEditable: boolean; canCreate: boolean },
  ) => {
    const target = pressTargetOf(event);
    if (target?.kind === 'event') {
      const entry = entryById.get(target.entryId);
      if (!entry) {
        return;
      }
      const day = dayAt(event.clientX, event.clientY);
      drag.begin(
        event,
        {
          kind: target.handle === 'end' ? 'end' : 'move',
          key: target.key,
          entryId: entry.id,
          day,
          start: entry.start,
          end: entry.end,
        },
        !isEditable || entry.item.isLocked === true,
      );
    } else if (target?.kind === 'day' && canCreate) {
      drag.begin(event, {
        kind: 'create',
        day: target.day,
        start: days[target.day] ?? 0,
        end: days[target.day + 1] ?? 0,
      });
    }
  };
  return { ...drag, onPointerDown };
}
