// Waveform peaks: normalising precomputed peaks, resampling them to the bars that fit, and computing them from
// decoded audio (for small files only; long files should ship a peaks JSON made on the server).

/** Files larger than this aren't decoded in the browser for a waveform (8 MB, a few minutes of MP3). */
export const MAX_DECODE_BYTES = 8 * 1024 * 1024;

/**
 * Peaks scaled to 0–1 by their largest magnitude. Accepts 0–1 values, signed samples (−1–1) or integer peaks (such as
 * audiowaveform's 8- or 16-bit data); magnitudes are used. Non-finite values count as silence.
 */
export function normalizePeaks(peaks: readonly number[]): number[] {
  let max = 0;
  const magnitudes = peaks.map((value) => {
    const magnitude = Number.isFinite(value) ? Math.abs(value) : 0;
    max = Math.max(max, magnitude);
    return magnitude;
  });
  if (max === 0) {
    return magnitudes;
  }
  return max <= 1 ? magnitudes : magnitudes.map((value) => value / max);
}

/** Resamples peaks to `count` bars, keeping each bar's loudest peak (so short transients don't vanish). */
export function resamplePeaks(peaks: readonly number[], count: number): number[] {
  const bars = Math.max(0, Math.floor(count));
  if (bars === 0 || peaks.length === 0) {
    return [];
  }
  const result: number[] = [];
  const ratio = peaks.length / bars;
  for (let bar = 0; bar < bars; bar += 1) {
    const from = Math.floor(bar * ratio);
    const to = Math.max(from + 1, Math.floor((bar + 1) * ratio));
    let max = 0;
    for (let index = from; index < to && index < peaks.length; index += 1) {
      max = Math.max(max, peaks[index] ?? 0);
    }
    result.push(max);
  }
  return result;
}

/** Peaks (0–1) from decoded channel data: the loudest sample of any channel in each of `count` buckets. */
export function computePeaks(channels: readonly Float32Array[], count: number): number[] {
  const length = channels[0]?.length ?? 0;
  const buckets = Math.max(0, Math.floor(count));
  if (length === 0 || buckets === 0) {
    return [];
  }
  const size = length / buckets;
  const peaks: number[] = [];
  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const from = Math.floor(bucket * size);
    const to = Math.min(length, Math.max(from + 1, Math.floor((bucket + 1) * size)));
    let max = 0;
    for (const data of channels) {
      for (let index = from; index < to; index += 1) {
        const sample = Math.abs(data[index] ?? 0);
        if (sample > max) {
          max = sample;
        }
      }
    }
    peaks.push(Math.min(1, max));
  }
  return peaks;
}

/** Raised when a file is too large to decode for a waveform. */
export class PeaksTooLargeError extends Error {
  constructor() {
    super('The file is too large to decode in the browser; provide precomputed peaks.');
    this.name = 'PeaksTooLargeError';
  }
}

/**
 * Fetches and decodes a small audio file with Web Audio and returns `count` peaks. Throws `PeaksTooLargeError` past
 * `maxBytes` (checked from Content-Length before downloading when the server sends it).
 */
export async function decodePeaks(
  src: string,
  {
    count = 1000,
    maxBytes = MAX_DECODE_BYTES,
    signal,
  }: { count?: number; maxBytes?: number; signal?: AbortSignal } = {},
): Promise<number[]> {
  const response = await fetch(src, { signal });
  if (!response.ok) {
    throw new Error(`HTTP ${String(response.status)}`);
  }
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > maxBytes) {
    void response.body?.cancel();
    throw new PeaksTooLargeError();
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > maxBytes) {
    throw new PeaksTooLargeError();
  }
  // An OfflineAudioContext decodes without needing a user gesture or an audio output.
  const context = new OfflineAudioContext(1, 1, 44100);
  const audio = await context.decodeAudioData(buffer);
  const channels: Float32Array[] = [];
  for (let channel = 0; channel < audio.numberOfChannels; channel += 1) {
    channels.push(audio.getChannelData(channel));
  }
  return computePeaks(channels, count);
}
