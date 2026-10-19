// A tiny Web Audio synth for the /music playback stories: sine-and-triangle notes with a short envelope, and simple
// drum sounds from noise and pitched sines. The AudioContext is created on first use (a user gesture).

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;

/** The shared AudioContext, created (and resumed) on demand. */
export function audioContext(): AudioContext {
  context ??= new AudioContext();
  if (context.state === 'suspended') {
    void context.resume();
  }
  return context;
}

function frequency(pitch: number): number {
  return 440 * 2 ** ((pitch - 69) / 12);
}

/** Plays a MIDI pitch at `time` (seconds on the context's clock; now when omitted) for `duration` seconds. */
export function playNote(pitch: number, velocity = 100, time?: number, duration = 0.3): void {
  const ctx = audioContext();
  const start = time ?? ctx.currentTime;
  const gain = ctx.createGain();
  const peak = (velocity / 127) * 0.25;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, peak * 0.4),
    start + Math.max(0.05, duration),
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration + 0.15);
  gain.connect(ctx.destination);
  for (const type of ['sine', 'triangle'] as const) {
    const oscillator = ctx.createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = frequency(pitch);
    oscillator.connect(gain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.2);
  }
}

/** Plays a drum sound (`kick`, `snare`, `hat` or `open`) at `time`. */
export function playDrum(kind: string, velocity = 100, time?: number): void {
  const ctx = audioContext();
  const start = time ?? ctx.currentTime;
  const level = (velocity / 127) * 0.5;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  if (kind === 'kick') {
    const oscillator = ctx.createOscillator();
    oscillator.frequency.setValueAtTime(140, start);
    oscillator.frequency.exponentialRampToValueAtTime(45, start + 0.15);
    gain.gain.setValueAtTime(level, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
    oscillator.connect(gain);
    oscillator.start(start);
    oscillator.stop(start + 0.3);
    return;
  }
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    // A fixed pseudo-random sequence: noise doesn't need to be random, just noisy.
    let seed = 1;
    for (let index = 0; index < data.length; index++) {
      seed = (seed * 16807) % 2147483647;
      data[index] = (seed / 2147483647) * 2 - 1;
    }
  }
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = kind === 'snare' ? 'bandpass' : 'highpass';
  filter.frequency.value = kind === 'snare' ? 1800 : 7000;
  const length = kind === 'open' ? 0.35 : kind === 'snare' ? 0.18 : 0.05;
  gain.gain.setValueAtTime(level, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  source.connect(filter);
  filter.connect(gain);
  source.start(start);
  source.stop(start + length);
}
