import { describe, expect, it } from 'vitest';
import { buildPdf, statementPages } from '../../../test/media';
import { classifyMediaError } from './mediaErrors';
import {
  amplitudeToDb,
  dbToPosition,
  peakDb,
  scaleMarks,
  updatePeakHold,
  zoneOf,
} from './meterMath';
import { pdfFileName } from './pdfActions';
import { findPageMatches } from './pdfSearch';
import { computePeaks, normalizePeaks, resamplePeaks } from './peaks';
import { inferMediaType } from './source';
import { bufferAhead, formatMediaTime, isAtLiveEdge } from './time';

describe('formatMediaTime', () => {
  it('formats minutes and seconds, and hours when needed', () => {
    expect(formatMediaTime(0)).toBe('0:00');
    expect(formatMediaTime(83.9)).toBe('1:23');
    expect(formatMediaTime(296)).toBe('4:56');
    expect(formatMediaTime(3723)).toBe('1:02:03');
  });

  it('pads to hours when the reference (the duration) reaches an hour', () => {
    expect(formatMediaTime(65, 3600)).toBe('0:01:05');
  });

  it('shows unknown times as dashes', () => {
    expect(formatMediaTime(Number.NaN)).toBe('--:--');
    expect(formatMediaTime(Number.POSITIVE_INFINITY)).toBe('--:--');
  });
});

describe('time ranges', () => {
  it('measures the buffer ahead of the playhead', () => {
    const ranges = [
      { start: 0, end: 10 },
      { start: 20, end: 35 },
    ];
    expect(bufferAhead(ranges, 4)).toBe(6);
    expect(bufferAhead(ranges, 15)).toBe(0);
    expect(bufferAhead(ranges, 30)).toBe(5);
  });

  it('knows when playback is at the live edge', () => {
    expect(isAtLiveEdge(95, 100)).toBe(true);
    expect(isAtLiveEdge(60, 100)).toBe(false);
    expect(isAtLiveEdge(10, undefined)).toBe(true);
  });
});

describe('peaks', () => {
  it('normalises signed and integer peaks to 0–1', () => {
    expect(normalizePeaks([0.2, -0.5, 1])).toEqual([0.2, 0.5, 1]);
    expect(normalizePeaks([0, 64, -128])).toEqual([0, 0.5, 1]);
    expect(normalizePeaks([Number.NaN, 0.4])).toEqual([0, 0.4]);
  });

  it('resamples to the bars that fit, keeping each bar’s loudest peak', () => {
    expect(resamplePeaks([0.1, 0.9, 0.2, 0.3, 0.5, 0.4], 3)).toEqual([0.9, 0.3, 0.5]);
    expect(resamplePeaks([0.5, 1], 4)).toHaveLength(4);
    expect(resamplePeaks([0.5], 0)).toEqual([]);
  });

  it('computes peaks from decoded channels', () => {
    const left = new Float32Array([0, 0.5, -0.25, 0.1]);
    const right = new Float32Array([0, -0.75, 0, 0]);
    expect(computePeaks([left, right], 2)).toEqual([0.75, 0.25]);
  });
});

describe('media errors', () => {
  it('tells a missing file, a refused one, CORS, codecs and decoding apart', () => {
    expect(classifyMediaError({ code: 4, status: 404 })).toBe('not-found');
    expect(classifyMediaError({ code: 4, status: 403 })).toBe('forbidden');
    expect(classifyMediaError({ code: 4, isUnreachable: true })).toBe('cors');
    expect(classifyMediaError({ code: 4 })).toBe('unsupported');
    expect(classifyMediaError({ code: 3 })).toBe('decode');
    expect(classifyMediaError({ code: 2 })).toBe('network');
    expect(classifyMediaError({})).toBe('generic');
  });
});

describe('inferMediaType', () => {
  it('infers HLS, DASH and progressive from the extension or MIME type', () => {
    expect(inferMediaType('https://cdn.example.com/live/master.m3u8?token=1')).toBe('hls');
    expect(inferMediaType('https://cdn.example.com/vod/manifest.mpd')).toBe('dash');
    expect(inferMediaType('https://cdn.example.com/talk.mp4')).toBe('progressive');
    expect(inferMediaType('/stream', 'auto', 'application/vnd.apple.mpegurl')).toBe('hls');
    expect(inferMediaType('/manifest.m3u8', 'progressive')).toBe('progressive');
  });
});

describe('meter math', () => {
  it('converts amplitudes to dBFS and positions on the scale', () => {
    expect(amplitudeToDb(1)).toBe(0);
    expect(amplitudeToDb(0.5)).toBeCloseTo(-6.02, 1);
    expect(amplitudeToDb(0)).toBe(Number.NEGATIVE_INFINITY);
    expect(peakDb(new Float32Array([0.1, -0.5, 0.25]))).toBeCloseTo(-6.02, 1);
    expect(dbToPosition(-30, -60)).toBe(0.5);
    expect(dbToPosition(-80, -60)).toBe(0);
    expect(dbToPosition(3, -60)).toBe(1);
  });

  it('places levels in zones and holds peaks for the hold time', () => {
    const zones = { warning: -12, clip: -1 };
    expect(zoneOf(-20, zones)).toBe('safe');
    expect(zoneOf(-6, zones)).toBe('warning');
    expect(zoneOf(-0.5, zones)).toBe('clip');
    const held = updatePeakHold({ db: -6, at: 0 }, -20, 1000, 1500);
    expect(held.db).toBe(-6);
    expect(updatePeakHold(held, -20, 1600, 1500).db).toBe(-20);
    expect(updatePeakHold(held, -3, 100, 1500).db).toBe(-3);
  });

  it('marks the scale every 6 dB, then every 12', () => {
    expect(scaleMarks(-60)).toEqual([0, -6, -12, -18, -24, -36, -48, -60]);
  });
});

describe('PDF search', () => {
  it('finds matches case-insensitively, including across runs and line breaks', () => {
    const text = {
      items: ['Invoice INV-', '01044 paid', 'on 12 March'],
      endsLine: [false, true, false],
    };
    const [first] = findPageMatches(3, text, 'inv-01044');
    expect(first?.page).toBe(3);
    expect(first?.parts).toEqual([
      { item: 0, start: 8, end: 12 },
      { item: 1, start: 0, end: 5 },
    ]);
    expect(findPageMatches(3, text, 'paid on')).toHaveLength(1);
    expect(findPageMatches(3, text, 'invoice')).toHaveLength(1);
    expect(findPageMatches(3, text, 'nothing')).toEqual([]);
    expect(findPageMatches(3, text, '  ')).toEqual([]);
  });

  it('names downloads after the title', () => {
    expect(pdfFileName('Statement: March')).toBe('Statement- March.pdf');
    expect(pdfFileName('report.PDF')).toBe('report.PDF');
  });

  it('builds a structurally valid PDF fixture', () => {
    const text = new TextDecoder().decode(buildPdf(statementPages));
    const startxref = Number(/startxref\n(\d+)/.exec(text)?.[1]);
    expect(text.slice(startxref, startxref + 4)).toBe('xref');
    const offset = Number(/0000000000 65535 f \n(\d{10})/.exec(text)?.[1]);
    expect(text.slice(offset, offset + 7)).toBe('1 0 obj');
  });
});
