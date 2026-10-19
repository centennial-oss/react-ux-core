import { render, screen } from '@testing-library/react';
import { Profiler, createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { AudioMeter, type AudioMeterHandle } from './AudioMeter';
import type { MediaPlayerMessages } from './messages';

/** Overrides of this entry's strings (its interface joins `Messages` when the entry is wired up). */
const overrides = (strings: Partial<MediaPlayerMessages>) =>
  strings as unknown as Partial<Messages>;

const isDesktop = window.innerWidth >= 1024;

/** Painted pixels in a meter canvas that aren't the unlit segments' colour (the top segment's, for a level below it). */
function litPixels(canvas: HTMLCanvasElement): number {
  const context = canvas.getContext('2d');
  if (!context) {
    return 0;
  }
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let unlit: number[] | undefined;
  let count = 0;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) {
      continue;
    }
    const colour = [data[index], data[index + 1], data[index + 2]];
    unlit ??= colour as number[];
    if (colour.some((value, channel) => value !== unlit?.[channel])) {
      count += 1;
    }
  }
  return count;
}

describe('AudioMeter', () => {
  it('is a labelled group with a text readout per channel', async () => {
    render(<AudioMeter label="Program" levels={[-18, -20.5]} />);
    const meter = screen.getByRole('group', { name: 'Program' });
    await expect.poll(() => meter.textContent).toEqual(expect.stringContaining('L −18.0 dBFS'));
    expect(meter.textContent).toEqual(expect.stringContaining('R −20.5 dBFS'));
  });

  it('draws segmented bars on canvases', async () => {
    const { container } = render(<AudioMeter label="Program" levels={[-6, -40]} />);
    const [left, right] = Array.from(container.querySelectorAll('canvas'));
    if (!left || !right) {
      throw new Error('Expected two canvases');
    }
    await expect.poll(() => litPixels(left)).toBeGreaterThan(0);
    expect(litPixels(left)).toBeGreaterThan(litPixels(right));
  });

  it('takes 60 fps pushes through its handle without re-rendering React', async () => {
    const handle = createRef<AudioMeterHandle>();
    let commits = 0;
    const { container } = render(
      <Profiler
        id="meter"
        onRender={() => {
          commits += 1;
        }}
      >
        <AudioMeter label="Program" handleRef={handle} />
      </Profiler>,
    );
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const before = commits;
    const started = performance.now();
    for (let frame = 0; frame < 30; frame += 1) {
      handle.current?.push([-30 + (frame % 10), -24]);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    // Only the once-a-second readout may have re-rendered: at most once per second that passed (frames run slowly
    // on a busy machine), and never once per push.
    const seconds = Math.ceil((performance.now() - started) / 1000);
    expect(commits - before).toBeLessThanOrEqual(seconds);
    expect(commits - before).toBeLessThan(30);
    const canvas = container.querySelector('canvas');
    expect(canvas && litPixels(canvas)).toBeGreaterThan(0);
  });

  it('latches the clip indicator until it’s pressed, announcing the clip once', async () => {
    const handle = createRef<AudioMeterHandle>();
    render(<AudioMeter label="Program" handleRef={handle} />);
    handle.current?.push([-0.2, -12]);
    const reset = await screen.findByRole('button', { name: 'Reset clip indicator, L' });
    await expect.poll(() => reset.hasAttribute('data-clipped')).toBe(true);
    const live = document.querySelector('[aria-live="assertive"]');
    expect(live?.textContent).toBe('L clipped');
    handle.current?.push([-30, -30]);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(reset).toHaveAttribute('data-clipped');
    expect(screen.getByRole('button', { name: 'Reset clip indicator, R' })).not.toHaveAttribute(
      'data-clipped',
    );
    await userEvent.click(reset);
    expect(reset).not.toHaveAttribute('data-clipped');
    expect(live?.textContent).toBe('');
  });

  it.runIf(isDesktop)('resets the clip indicator from the keyboard', async () => {
    const handle = createRef<AudioMeterHandle>();
    render(<AudioMeter label="Program" handleRef={handle} />);
    handle.current?.push([0, 0]);
    const reset = await screen.findByRole('button', { name: 'Reset clip indicator, R' });
    await expect.poll(() => reset.hasAttribute('data-clipped')).toBe(true);
    reset.focus();
    await userEvent.keyboard('{Enter}');
    expect(reset).not.toHaveAttribute('data-clipped');
  });

  it('reads levels straight from an audio node', async () => {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.value = 0.5;
    oscillator.connect(gain);
    oscillator.start();
    await context.resume();
    render(<AudioMeter label="Synth" source={gain} channelCount={1} channelLabels={['Mono']} />);
    const meter = screen.getByRole('group', { name: 'Synth' });
    await expect.poll(() => meter.textContent, { timeout: 4000 }).toMatch(/Mono −(5|6|7)\.\d dBFS/);
    oscillator.stop();
    await context.close();
  });

  it('lays out horizontally', () => {
    render(<AudioMeter label="Program" levels={[-12, -14]} orientation="horizontal" />);
    expect(screen.getByRole('group', { name: 'Program' })).toHaveAttribute(
      'data-orientation',
      'horizontal',
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('takes its strings from UIProvider messages', async () => {
    render(
      <UIProvider messages={overrides({ meterLeft: 'G', meterRight: 'D' })}>
        <AudioMeter label="Programme" levels={[-10, -11]} />
      </UIProvider>,
    );
    await expect
      .poll(() => screen.getByRole('group', { name: 'Programme' }).textContent)
      .toEqual(expect.stringContaining('G −10.0 dBFS'));
    expect(screen.getByRole('button', { name: 'Reset clip indicator, D' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div className="flex gap-6 p-2">
        <AudioMeter label="Program" levels={[-8, -0.5]} />
        <AudioMeter label="Mic" levels={[-30]} channelLabels={['Mic 1']} orientation="horizontal" />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});
