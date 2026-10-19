// Observatory bookings for ScheduleTimeline stories and tests: a week (Mon 12 – Sun 18 Oct 2026, UTC) of 10 lanes
// with 80 bookings and exactly 2 conflicts (overlapping pairs). Deterministic, with a frozen "now".
import type { TimelineItem, TimelineLane, TimelineRange } from '../src/components/ScheduleTimeline';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Monday 12 October 2026, 00:00 UTC. */
export const WEEK_START = Date.UTC(2026, 9, 12);
/** "Now" for stories and tests: Wednesday 14 October 2026, 21:30 UTC. */
export const SCHEDULE_NOW = Date.UTC(2026, 9, 14, 21, 30);

export const weekRange: TimelineRange = {
  start: new Date(WEEK_START),
  end: new Date(WEEK_START + 7 * DAY),
};

export const dayRange: TimelineRange = {
  start: new Date(WEEK_START + 2 * DAY),
  end: new Date(WEEK_START + 3 * DAY),
};

export const observatoryLanes: TimelineLane[] = [
  { id: 'pier-1', label: 'Pier 1', description: '0.6 m reflector' },
  { id: 'pier-2', label: 'Pier 2', description: '0.4 m refractor' },
  { id: 'spectro', label: 'Spectrograph', description: 'Échelle, R 20,000' },
  { id: 'camera-1', label: 'Camera 1', description: 'Wide-field CMOS' },
  { id: 'radio', label: 'Radio dish', description: '3 m, 21 cm line' },
  { id: 'solar', label: 'Solar telescope', description: 'Hydrogen-alpha' },
  { id: 'dome', label: 'Dome', description: 'Maintenance windows' },
  { id: 'outreach', label: 'Outreach', description: 'Public sessions' },
  { id: 'pipeline', label: 'Pipeline', description: 'Data reduction' },
  { id: 'lab', label: 'Optics lab', description: 'Bench time' },
];

const targets = ['M31', 'M42', 'Jupiter', 'Saturn', 'Vega', 'M13', 'Pleiades', 'Orion'] as const;

function labelFor(lane: string, index: number): string {
  const target = targets[index % targets.length] ?? 'M31';
  switch (lane) {
    case 'spectro':
      return `Spectra of ${target}`;
    case 'radio':
      return index % 2 === 0 ? 'Pulsar timing' : 'Hydrogen survey';
    case 'solar':
      return index % 2 === 0 ? 'Sunspot survey' : 'Prominence watch';
    case 'dome':
      return index === 7 ? 'Shutter service' : 'Mirror cleaning';
    case 'outreach':
      return `Public night: ${target}`;
    case 'pipeline':
      return 'Nightly reduction';
    case 'lab':
      return index % 2 === 0 ? 'Lens alignment' : 'Filter testing';
    default:
      return `${target} imaging`;
  }
}

const tones: Record<string, TimelineItem['tone']> = {
  dome: 'warning',
  outreach: 'success',
  pipeline: 'neutral',
  solar: 'danger',
};

/** Bookings that overlap another booking in their lane: Pier 2 on Wednesday and Spectrograph on Friday. */
const conflictDays: Record<string, number> = { 'pier-2': 2, spectro: 4 };

function makeItems(): TimelineItem[] {
  const items: TimelineItem[] = [];
  observatoryLanes.forEach((lane, laneIndex) => {
    const isDaytime = lane.id === 'solar' || lane.id === 'lab' || lane.id === 'dome';
    // One booking a day for seven days...
    for (let day = 0; day < 7; day += 1) {
      const startHour = isDaytime ? 9 + ((laneIndex + day) % 4) : 18 + ((laneIndex + day) % 4);
      const start = WEEK_START + day * DAY + startHour * HOUR;
      const length = (2 + (laneIndex % 3) * 0.5) * HOUR;
      items.push({
        id: `${lane.id}-${String(day)}`,
        laneId: lane.id,
        start: new Date(start),
        end: new Date(start + length),
        label: labelFor(lane.id, day),
        tone: tones[lane.id],
        isLocked: lane.id === 'dome' ? true : undefined,
        detail: lane.id === 'outreach' ? 'Booked by the astronomy club; 24 guests.' : undefined,
      });
    }
    // ...and an eighth that either sits apart (a morning slot) or overlaps (a conflict).
    const conflictDay = conflictDays[lane.id];
    const extraDay = conflictDay ?? laneIndex % 7;
    const sameDay = items.find((item) => item.id === `${lane.id}-${String(extraDay)}`);
    const extraStart =
      conflictDay !== undefined && sameDay
        ? (sameDay.start as Date).getTime() + HOUR
        : WEEK_START + extraDay * DAY + (isDaytime ? 14.5 : 6) * HOUR;
    items.push({
      id: `${lane.id}-7`,
      laneId: lane.id,
      start: new Date(extraStart),
      end: new Date(extraStart + 1.5 * HOUR),
      label: conflictDay === undefined ? labelFor(lane.id, 7) : 'Calibration frames',
      tone: tones[lane.id],
      isLocked: lane.id === 'dome' ? true : undefined,
    });
  });
  return items;
}

/** 80 bookings across the 10 lanes. */
export const observatoryItems: TimelineItem[] = makeItems();

/** A small set for focused tests: two lanes on Wednesday 14 October. */
export const smallLanes: TimelineLane[] = [
  { id: 'pier-1', label: 'Pier 1' },
  { id: 'pier-2', label: 'Pier 2' },
];

export const smallItems: TimelineItem[] = [
  {
    id: 'a',
    laneId: 'pier-1',
    start: Date.UTC(2026, 9, 14, 14, 0),
    end: Date.UTC(2026, 9, 14, 15, 30),
    label: 'Flat fields',
  },
  {
    id: 'b',
    laneId: 'pier-1',
    start: Date.UTC(2026, 9, 14, 15, 0),
    end: Date.UTC(2026, 9, 14, 16, 0),
    label: 'Dark frames',
  },
  {
    id: 'c',
    laneId: 'pier-1',
    start: Date.UTC(2026, 9, 14, 20, 0),
    end: Date.UTC(2026, 9, 14, 23, 0),
    label: 'M31 imaging',
  },
  {
    id: 'd',
    laneId: 'pier-2',
    start: Date.UTC(2026, 9, 14, 19, 0),
    end: Date.UTC(2026, 9, 14, 21, 0),
    label: 'Jupiter transit',
    isLocked: true,
  },
];
