// Deterministic people, activity and uptime data for the Avatar, ActivityTimeline and UptimeBar stories and tests.
// Pictures are inline SVG data URLs, so nothing loads from the network.

/** A small picture: a planet on a sky, drawn as an SVG data URL. */
function picture(sky: string, planet: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${sky}"/><circle cx="32" cy="36" r="16" fill="${planet}"/><ellipse cx="32" cy="36" rx="26" ry="6" fill="none" stroke="#ffffff" stroke-opacity="0.7" stroke-width="2"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** A picture URL that fails to load (an invalid data URL), for the fallback to initials. */
export const brokenPicture = 'data:image/png;base64,not-an-image';

export const people = [
  { name: 'Ada Lovelace', src: picture('#1f3a6e', '#f2c14e') },
  { name: 'Grace Hopper' },
  { name: 'Katherine Johnson', src: picture('#3b1f5c', '#e8a87c') },
  { name: 'Alan Turing' },
  { name: 'Vera Rubin' },
  { name: 'Carl Sagan' },
  { name: 'Mae Jemison' },
  { name: 'Edwin Hubble' },
] as const;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** The instant the activity stories and tests treat as "now": Oct 16, 2026, 3:00 PM UTC. */
export const ACTIVITY_NOW = Date.UTC(2026, 9, 16, 15, 0, 0);

/** Actions and targets that the generated timeline cycles through. */
const actions = [
  { action: 'calibrated', target: 'Telescope array' },
  { action: 'updated the observing schedule for', target: 'North dome' },
  { action: 'archived readings from', target: 'Spectrometer 2' },
  { action: 'commented on', target: 'Night log, Oct 12' },
  { action: 'restarted', target: 'Archive' },
  { action: 'deployed', target: 'Weather station' },
];

/**
 * `count` events over the `days` calendar days (in UTC) up to `now`, newest first: an even share each day, in the 12
 * hours before `now`'s time of day. Every fifth one has a detail, and the actors and actions cycle.
 */
export function activityEvents(count: number, days: number, now: number = ACTIVITY_NOW) {
  const perDay = Math.ceil(count / days);
  return Array.from({ length: count }, (_, index) => {
    const day = Math.floor(index / perDay);
    const slot = index % perDay;
    const person = people[index % people.length] ?? people[0];
    const kind = actions[index % actions.length] ?? { action: '', target: '' };
    return {
      id: `event-${String(index)}`,
      at: now - 20 * MINUTE - day * 24 * HOUR - slot * Math.floor((12 * HOUR) / perDay),
      actor: { name: person.name, avatarSrc: 'src' in person ? person.src : undefined },
      action: kind.action,
      target: { label: kind.target, href: `#/${kind.target.toLowerCase().replace(/\W+/g, '-')}` },
      detail: index % 5 === 0 ? `Notes for event ${String(index + 1)}.` : undefined,
    };
  });
}

/** `count` days ending Oct 16, 2026 (oldest first), mostly 100% with a few dips, a gap and some incidents. */
export function uptimeDays(count: number, seed = 0) {
  const end = Date.UTC(2026, 9, 16);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(end - (count - 1 - index) * 86_400_000).toISOString().slice(0, 10);
    const step = (index * 7 + seed * 13) % 41;
    if (step === 3 && seed % 3 === 1) {
      return { date, uptime: null };
    }
    if (step === 17) {
      return { date, uptime: 98.4, incidents: 2 };
    }
    if (step === 29 || step === 8) {
      return { date, uptime: 99.82, incidents: 1 };
    }
    return { date, uptime: 100, incidents: 0 };
  });
}

export const services = [
  'Telescope array',
  'Archive',
  'Weather station',
  'Spectrometer',
  'Dome control',
  'Data pipeline',
  'Public website',
  'Image viewer',
  'Alerts',
  'Scheduler',
  'Sky survey',
  'Calibration lab',
];
