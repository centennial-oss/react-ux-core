import { describe, expect, it, vi } from 'vitest';
import { createDataRuntime, requestKey } from './runtime';

/** A load that settles when told to. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('requestKey (DATA-10)', () => {
  it('is independent of key order', () => {
    expect(requestKey({ a: 1, b: { y: 2, x: [1, 2] } })).toBe(
      requestKey({ b: { x: [1, 2], y: 2 }, a: 1 }),
    );
    expect(requestKey({ a: 1 })).not.toBe(requestKey({ a: 2 }));
  });
});

describe('createDataRuntime', () => {
  it('shares one call between identical requests in flight (DATA-10)', async () => {
    const runtime = createDataRuntime();
    const load = vi.fn(() => Promise.resolve('data'));
    const first = runtime.request('k', load, { signal: new AbortController().signal });
    const second = runtime.request('k', load, { signal: new AbortController().signal });
    await expect(Promise.all([first, second])).resolves.toEqual(['data', 'data']);
    expect(load).toHaveBeenCalledTimes(1);
    // Once settled, the same key loads again.
    await runtime.request('k', load, { signal: new AbortController().signal });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('caps concurrent loads and queues the rest, higher priority first (DATA-11)', async () => {
    const runtime = createDataRuntime(2);
    const gates = Array.from({ length: 4 }, () => deferred<string>());
    const started: number[] = [];
    const run = (index: number, priority: number) =>
      runtime.request(
        `k${String(index)}`,
        () => {
          started.push(index);
          return gates[index]?.promise ?? Promise.resolve('');
        },
        { signal: new AbortController().signal, priority },
      );
    const results = [run(0, 0), run(1, 0), run(2, 0), run(3, 1)];
    await flush();
    expect(started).toEqual([0, 1]);
    expect(runtime.stats).toEqual({ running: 2, queued: 2 });
    gates[0]?.resolve('a');
    await flush();
    // The visible widget (priority 1) jumps the queue.
    expect(started).toEqual([0, 1, 3]);
    for (const gate of gates) {
      gate.resolve('x');
    }
    await Promise.all(results);
    expect(started).toEqual([0, 1, 3, 2]);
  });

  it('aborts a load only when every caller has given up, and frees its slot at once (DATA-08)', async () => {
    const runtime = createDataRuntime(1);
    const signals: AbortSignal[] = [];
    const neverEnds = (signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<string>(() => undefined);
    };
    const one = new AbortController();
    const two = new AbortController();
    const first = runtime.request('slow', neverEnds, { signal: one.signal });
    const second = runtime.request('slow', neverEnds, { signal: two.signal });
    await flush();
    one.abort();
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    expect(signals[0]?.aborted).toBe(false);
    two.abort();
    await expect(second).rejects.toMatchObject({ name: 'AbortError' });
    expect(signals[0]?.aborted).toBe(true);
    // The loader ignored its signal, but the next load still runs.
    await expect(
      runtime.request('next', () => Promise.resolve('ran'), {
        signal: new AbortController().signal,
      }),
    ).resolves.toBe('ran');
  });

  it('passes a load’s rejection to every caller', async () => {
    const runtime = createDataRuntime();
    const error = new Error('down');
    const load = () => Promise.reject(error);
    const calls = [
      runtime.request('k', load, { signal: new AbortController().signal }),
      runtime.request('k', load, { signal: new AbortController().signal }),
    ];
    await expect(calls[0]).rejects.toBe(error);
    await expect(calls[1]).rejects.toBe(error);
  });

  it('rejects at once when the signal is already aborted', async () => {
    const runtime = createDataRuntime();
    const controller = new AbortController();
    controller.abort();
    const load = vi.fn(() => Promise.resolve(1));
    await expect(runtime.request('k', load, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(load).not.toHaveBeenCalled();
  });
});
