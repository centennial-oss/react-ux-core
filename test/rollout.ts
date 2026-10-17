// A deterministic firmware rollout to telescope mounts across six observatory sites (6 × 52 = 312 targets), for
// RolloutProgress's stories and tests.
import type { RolloutStage, RolloutTarget } from '../src/components/RolloutProgress';

export const rolloutSites = [
  { code: 'MK', name: 'Mauna Kea' },
  { code: 'PA', name: 'Paranal' },
  { code: 'LP', name: 'La Palma' },
  { code: 'SS', name: 'Siding Spring' },
  { code: 'KP', name: 'Kitt Peak' },
  { code: 'SU', name: 'Sutherland' },
] as const;

export const MOUNTS_PER_SITE = 52;
export const ROLLOUT_TOTAL = rolloutSites.length * MOUNTS_PER_SITE;

export const rolloutStages: RolloutStage[] = [
  { id: 'canary', label: 'Canary', percent: 1 },
  { id: 'early', label: 'Early', percent: 10 },
  { id: 'half', label: 'Half', percent: 50 },
  { id: 'all', label: 'Everything', percent: 100 },
];

/** 9:00:00 UTC on 14 March 2026: the first target's update time. */
export const ROLLOUT_STARTED_AT = Date.UTC(2026, 2, 14, 9, 0, 0);

const failures: Record<number, string> = {
  17: 'Checksum mismatch after flashing; the mount kept firmware 4.1.',
  101: 'Encoder calibration timed out (axis 2).',
  245: 'Lost contact during reboot.',
};
const offline = new Set([50, 51]);

/** The order targets are processed in: round-robin across sites, so every site advances together. */
function processingOrder(index: number): number {
  return (index % MOUNTS_PER_SITE) * rolloutSites.length + Math.floor(index / MOUNTS_PER_SITE);
}

/**
 * The targets after `processed` of them have finished. The next `running` are updating; three fail along the way and
 * two are skipped (offline). `retried` turns the failures back to running.
 */
export function rolloutTargets(
  processed: number,
  { running = 12, retried = false }: { running?: number; retried?: boolean } = {},
): RolloutTarget[] {
  return Array.from({ length: ROLLOUT_TOTAL }, (_, index) => {
    const site = rolloutSites[Math.floor(index / MOUNTS_PER_SITE)] ?? rolloutSites[0];
    const number = String((index % MOUNTS_PER_SITE) + 1).padStart(2, '0');
    const order = processingOrder(index);
    const base = {
      id: `${site.code}-${number}`,
      label: `Mount ${site.code}-${number}`,
      group: site.name,
    };
    if (order < processed) {
      const at = ROLLOUT_STARTED_AT + order * 4000;
      if (offline.has(order)) {
        return { ...base, status: 'skipped', detail: 'Offline for maintenance.', at };
      }
      const failure = failures[order];
      if (failure !== undefined) {
        return retried
          ? { ...base, status: 'running', at }
          : { ...base, status: 'failed', detail: failure, at };
      }
      return { ...base, status: 'succeeded', at };
    }
    if (order < processed + running) {
      return { ...base, status: 'running' };
    }
    return { ...base, status: 'pending' };
  });
}

/** The stage a rollout is in after `processed` targets. */
export function rolloutStageAt(processed: number): string {
  const share = processed / ROLLOUT_TOTAL;
  return share < 0.01 ? 'canary' : share < 0.1 ? 'early' : share < 0.5 ? 'half' : 'all';
}
