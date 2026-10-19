import { describe, expect, it } from 'vitest';
import { createLiveBuffer } from './liveBuffer';

const START = Date.UTC(2026, 9, 16, 21);
const WINDOW = 5 * 60_000;
const RETAIN = WINDOW * 2;

describe('createLiveBuffer', () => {
  it('holds three series at 10 points a second for 10 minutes within the retention window', () => {
    const buffer = createLiveBuffer();
    const ids = ['north', 'south', 'west'];
    const perSeries = (RETAIN / 1000) * 10 + 1;
    let largest = 0;
    // One point per series every 100 ms, drawn on every other "frame" (about the rate a busy page manages).
    for (let step = 0; step < 10 * 60 * 10; step++) {
      const t = START + step * 100;
      for (const id of ids) {
        buffer.append(id, [{ t, v: step % 7 }]);
      }
      if (step % 2 === 1) {
        buffer.flush();
        buffer.prune(RETAIN);
        largest = Math.max(largest, buffer.size());
      }
    }
    expect(largest).toBeLessThanOrEqual(ids.length * perSeries);
    for (const id of ids) {
      const points = buffer.points(id);
      expect(points.length).toBeLessThanOrEqual(perSeries);
      expect((points.at(-1)?.x ?? 0) - (points[0]?.x ?? 0)).toBeLessThanOrEqual(RETAIN);
    }
  });

  it('keeps the drawn arrays (the same objects) and moves queued points in on flush', () => {
    const buffer = createLiveBuffer();
    const drawn = buffer.points('a');
    buffer.append('a', [
      { t: START, v: 1 },
      { t: new Date(START + 1000), v: null },
    ]);
    expect(drawn).toHaveLength(0);
    expect(buffer.pendingCount()).toBe(2);
    expect(buffer.flush()).toBe(true);
    expect(buffer.points('a')).toBe(drawn);
    expect(drawn).toEqual([
      { x: START, y: 1 },
      { x: START + 1000, y: null },
    ]);
    expect(buffer.pendingCount()).toBe(0);
    expect(buffer.flush()).toBe(false);
  });

  it('sorts points that arrive out of order', () => {
    const buffer = createLiveBuffer();
    buffer.append('a', [{ t: START + 2000, v: 2 }]);
    buffer.flush();
    buffer.append('a', [
      { t: START + 1000, v: 1 },
      { t: START + 3000, v: 3 },
    ]);
    buffer.flush();
    expect(buffer.points('a').map((point) => point.y)).toEqual([1, 2, 3]);
  });

  it('while paused, keeps the frozen view and bounds the queue by the retention window', () => {
    const buffer = createLiveBuffer();
    buffer.append('a', [{ t: START, v: 0 }]);
    buffer.flush();
    for (let step = 1; step <= 30 * 60 * 10; step++) {
      buffer.append('a', [{ t: START + step * 100, v: step }]);
      buffer.prune(RETAIN, true);
    }
    expect(buffer.points('a')).toHaveLength(1);
    expect(buffer.pendingCount()).toBeLessThanOrEqual((RETAIN / 1000) * 10 + 1);
    // Resuming catches up: the queue moves in, and the frozen point (now too old) goes.
    buffer.flush();
    buffer.prune(RETAIN);
    expect(buffer.points('a')[0]?.x).toBeGreaterThanOrEqual((buffer.latest() ?? 0) - RETAIN);
  });

  it('clears everything', () => {
    const buffer = createLiveBuffer();
    buffer.append('a', [{ t: START, v: 1 }]);
    buffer.flush();
    buffer.append('a', [{ t: START + 100, v: 2 }]);
    buffer.clear();
    expect(buffer.size()).toBe(0);
    expect(buffer.latest()).toBeUndefined();
  });
});
