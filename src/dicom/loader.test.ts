import { describe, expect, it, vi } from 'vitest';
import { itemAt, phantomFiles, toImageIds } from '../../test/dicom';
import { createImageCache, DicomLoadError, loadDicomImage } from './loader';
import type { DicomImage } from './parseDicom';

describe('loadDicomImage', () => {
  it('fetches and decodes wadouri: and plain blob URLs', async () => {
    const id = itemAt(toImageIds(phantomFiles({ slices: 1, size: 16 })));
    const signal = new AbortController().signal;
    const image = await loadDicomImage(id, signal);
    expect(image.width).toBe(16);
    const plain = await loadDicomImage(id.slice('wadouri:'.length), signal);
    expect(plain.pixels).toEqual(image.pixels);
  });

  it('refuses schemes it doesn’t understand', async () => {
    await expect(
      loadDicomImage('wadors:https://example.com/studies/1', new AbortController().signal),
    ).rejects.toBeInstanceOf(DicomLoadError);
  });
});

describe('createImageCache', () => {
  const fake = (id: string): DicomImage => ({
    width: 1,
    height: 1,
    pixels: new Uint8Array([id.length]),
  });

  it('shares requests in flight and keeps loaded frames', async () => {
    const loader = vi.fn((id: string) => Promise.resolve(fake(id)));
    const cache = createImageCache(loader, 10);
    const [a, b] = await Promise.all([cache.load('a'), cache.load('a')]);
    expect(a).toBe(b);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(cache.peek('a')).toBe(a);
  });

  it('cancels requests that are no longer wanted, and evicts the oldest frames', async () => {
    const signals: AbortSignal[] = [];
    const cache = createImageCache((id, signal) => {
      signals.push(signal);
      return id === 'slow' ? new Promise(() => undefined) : Promise.resolve(fake(id));
    }, 2);
    void cache.load('slow', true).catch(() => undefined);
    void cache.load('pinned').catch(() => undefined);
    cache.cancelExcept(new Set(['other']));
    expect(signals[0]?.aborted).toBe(true);
    // A request loaded without isCancellable (such as a thumbnail) is never cancelled.
    expect(signals[1]?.aborted).toBe(false);
    await cache.load('a');
    await cache.load('b');
    await cache.load('c');
    expect(cache.peek('a')).toBeUndefined();
    expect(cache.peek('c')).toBeDefined();
  });

  it('forgets failures so the next load retries', async () => {
    let calls = 0;
    const cache = createImageCache(() => {
      calls++;
      return calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(fake('x'));
    }, 4);
    await expect(cache.load('x')).rejects.toThrow('offline');
    await expect(cache.load('x')).resolves.toBeDefined();
  });
});
