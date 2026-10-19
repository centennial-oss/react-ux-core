// Observatory pipeline log lines for LogViewer stories and tests: deterministic (a seeded generator, fixed times).
import type { LogLevel, LogLine } from '../src/logs';

/** 22:00 UTC on 14 Oct 2026: the start of a night's observing run. */
export const LOG_START = Date.UTC(2026, 9, 14, 22, 0, 0);

const ESC = '\u001b';

type Source = 'scheduler' | 'pier-2' | 'camera-1' | 'dome' | 'guider' | 'pipeline';

const templates: readonly {
  level: LogLevel;
  source: Source;
  message: (n: number) => string;
  fields?: (n: number) => Record<string, unknown>;
}[] = [
  {
    level: 'info',
    source: 'scheduler',
    message: (n) => `Queued target M${String((n % 110) + 1)} for 300 s exposure`,
    fields: (n) => ({ target: `M${String((n % 110) + 1)}`, filter: 'R', priority: (n % 5) + 1 }),
  },
  {
    level: 'debug',
    source: 'pier-2',
    message: (n) =>
      `Slew complete: RA ${String(n % 24)}h${String(n % 60)}m, Dec +${String(n % 80)}°`,
  },
  {
    level: 'info',
    source: 'camera-1',
    message: (n) =>
      `${ESC}[32mExposure ${String(n)} read out${ESC}[0m in 2.4 s (${String(2048 + (n % 7))} × 2048)`,
    fields: (n) => ({ exposure: n, binning: '1x1', temperatureC: -20 + (n % 3) * 0.1 }),
  },
  {
    level: 'trace',
    source: 'guider',
    message: (n) => `Guide star centroid offset ${String((n % 9) / 10)}″`,
  },
  {
    level: 'warn',
    source: 'dome',
    message: (n) =>
      `${ESC}[33mWind gust ${String(30 + (n % 15))} km/h${ESC}[0m near the shutter limit`,
  },
  {
    level: 'info',
    source: 'pipeline',
    message: (n) => `Calibrated frame ${String(n)} with flat field and dark subtraction`,
  },
  {
    level: 'error',
    source: 'camera-1',
    message: (n) =>
      `${ESC}[1;31mShutter timeout${ESC}[0m on exposure ${String(n)}; retrying (attempt 1 of 3)`,
    fields: (n) => ({ exposure: n, timeoutMs: 5000, shutter: { state: 'stuck', position: 0.4 } }),
  },
  {
    level: 'info',
    source: 'scheduler',
    message: () => `Weather check passed: humidity 41%, seeing 1.2″`,
  },
];

// Mostly info and debug lines, with a warning every 13 and an error every 47 (a fatal at 997).
function templateFor(n: number) {
  if (n > 0 && n % 997 === 0) {
    return null;
  }
  if (n > 0 && n % 47 === 0) {
    return templates[6];
  }
  if (n > 0 && n % 13 === 0) {
    return templates[4];
  }
  const ordinary = [0, 1, 2, 3, 5, 7] as const;
  return templates[ordinary[(n * 7 + 3) % ordinary.length] ?? 0];
}

/** Line number `n` of the run, 200 ms apart from `LOG_START`. */
export function logLine(n: number, start = LOG_START): LogLine {
  const template = templateFor(n);
  const at = start + n * 200;
  if (!template) {
    return {
      id: `line-${String(n)}`,
      at,
      level: 'fatal',
      source: 'pier-2',
      message: `${ESC}[41;97mMount fault${ESC}[0m: axis 1 encoder lost; observing halted`,
      fields: { axis: 1, code: 'ENC_LOST' },
    };
  }
  return {
    id: `line-${String(n)}`,
    at,
    level: template.level,
    source: template.source,
    message: template.message(n),
    fields: template.fields?.(n),
  };
}

/** `count` lines numbered from `from`. */
export function logLines(count: number, from = 0): LogLine[] {
  return Array.from({ length: count }, (_, index) => logLine(from + index));
}

/** A short run with every level, ANSI colours and fields, for stories and accessibility checks. */
export const nightLog: LogLine[] = [
  {
    id: 'n1',
    at: LOG_START,
    level: 'info',
    source: 'scheduler',
    message: 'Night run started: 14 targets queued',
    fields: { site: 'Ridge observatory', operator: 'Ada', targets: 14 },
  },
  {
    id: 'n2',
    at: LOG_START + 1200,
    level: 'debug',
    source: 'dome',
    message: 'Shutter opening (azimuth 182°)',
  },
  { id: 'n3', at: LOG_START + 1400, level: 'trace', source: 'guider', message: 'Loop rate 2 Hz' },
  {
    id: 'n4',
    at: LOG_START + 8100,
    level: 'info',
    source: 'pier-2',
    message: `Slewing to ${ESC}[36mM31${ESC}[0m (RA 0h42m, Dec +41°16′)`,
  },
  {
    id: 'n5',
    at: LOG_START + 31_000,
    level: 'info',
    source: 'camera-1',
    message: `${ESC}[32mExposure 1 read out${ESC}[0m in 2.4 s`,
    fields: { exposure: 1, filter: 'R', binning: '1x1', temperatureC: -20 },
  },
  {
    id: 'n6',
    at: LOG_START + 45_500,
    level: 'warn',
    source: 'dome',
    message: `${ESC}[33mWind gust 41 km/h${ESC}[0m near the shutter limit`,
  },
  {
    id: 'n7',
    at: LOG_START + 62_250,
    level: 'error',
    source: 'camera-1',
    message: `${ESC}[1;31mShutter timeout${ESC}[0m on exposure 2; retrying (attempt 1 of 3)`,
    fields: { exposure: 2, timeoutMs: 5000, shutter: { state: 'stuck', position: 0.4 } },
  },
  {
    id: 'n8',
    at: LOG_START + 64_000,
    level: 'info',
    source: 'camera-1',
    message: 'Exposure 2 read out in 2.5 s after 1 retry',
  },
  {
    id: 'n9',
    at: LOG_START + 90_000,
    level: 'fatal',
    source: 'pier-2',
    message: `${ESC}[41;97mMount fault${ESC}[0m: axis 1 encoder lost; observing halted`,
    fields: { axis: 1, code: 'ENC_LOST' },
  },
  {
    id: 'n10',
    at: LOG_START + 95_000,
    source: 'pipeline',
    message:
      'Calibrated 2 frames → /data/2026-10-14/m31/ with flat field, dark subtraction and cosmic ray rejection; ' +
      'astrometric solution RMS 0.21″ over 412 reference stars from the Gaia catalogue',
  },
];
