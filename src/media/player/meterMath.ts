// AudioMeter's arithmetic: amplitudes to decibels, positions on the scale, zones and peak hold.

/** Decibels full scale of a linear amplitude (0–1); silence is −Infinity. */
export function amplitudeToDb(amplitude: number): number {
  return amplitude > 0 ? 20 * Math.log10(amplitude) : Number.NEGATIVE_INFINITY;
}

/** The loudest sample's level in dBFS. */
export function peakDb(samples: Float32Array): number {
  let max = 0;
  for (const sample of samples) {
    const magnitude = Math.abs(sample);
    if (magnitude > max) {
      max = magnitude;
    }
  }
  return amplitudeToDb(max);
}

/** A level's position on a scale from `minDb` (0) to 0 dB (1), clamped. */
export function dbToPosition(db: number, minDb: number): number {
  if (!Number.isFinite(db) || db <= minDb) {
    return 0;
  }
  return Math.min(1, (db - minDb) / -minDb);
}

export type MeterZone = 'safe' | 'warning' | 'clip';

export interface MeterZones {
  warning: number;
  clip: number;
}

/** The zone a level falls in. */
export function zoneOf(db: number, zones: MeterZones): MeterZone {
  if (db >= zones.clip) {
    return 'clip';
  }
  return db >= zones.warning ? 'warning' : 'safe';
}

/** One channel's peak-hold state. */
export interface PeakHold {
  db: number;
  at: number;
}

/** The held peak after a new level at time `now`: a higher level replaces it, and it drops after `holdMs`. */
export function updatePeakHold(hold: PeakHold, db: number, now: number, holdMs: number): PeakHold {
  if (db >= hold.db || now - hold.at > holdMs) {
    return { db, at: now };
  }
  return hold;
}

/** Scale marks between `minDb` and 0: every 6 dB to −24, then every 12. */
export function scaleMarks(minDb: number): number[] {
  const marks: number[] = [];
  for (let db = 0; db >= minDb; db -= db > -24 ? 6 : 12) {
    marks.push(db);
  }
  return marks;
}
