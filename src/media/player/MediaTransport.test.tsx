import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { sampleChapters, samplePeaks } from '../../../test/media';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { MediaTransport, type MediaTransportProps } from './MediaTransport';
import { Waveform } from './Waveform';
import type { MediaPlayerMessages } from './messages';

/** Overrides of this entry's strings (its interface joins `Messages` when the entry is wired up). */
const overrides = (strings: Partial<MediaPlayerMessages>) =>
  strings as unknown as Partial<Messages>;

const isDesktop = window.innerWidth >= 1024;
const isTouch = navigator.maxTouchPoints > 0;

/** A transport over a fake clock, with every control wired. */
function Harness(props: Partial<MediaTransportProps> & { onSeekSpy?: (time: number) => void }) {
  const { onSeekSpy, currentTime: _start, ...rest } = props;
  const [isPlaying, setPlaying] = useState(false);
  const [time, setTime] = useState(props.currentTime ?? 83);
  const [rate, setRate] = useState(1);
  const [isMuted, setMuted] = useState(false);
  return (
    <div className="p-4">
      <MediaTransport
        isPlaying={isPlaying}
        onPlayingChange={setPlaying}
        currentTime={time}
        duration={296}
        onSeek={(next) => {
          onSeekSpy?.(next);
          setTime(next);
        }}
        buffered={[{ start: 0, end: 120 }]}
        playbackRate={rate}
        onPlaybackRateChange={setRate}
        isMuted={isMuted}
        onMutedChange={setMuted}
        onVolumeChange={() => undefined}
        aria-label="Talk"
        {...rest}
      />
    </div>
  );
}

const seekSlider = () => screen.getByRole('slider', { name: 'Position' });

describe('MediaTransport', () => {
  it('names the seek slider and reads its value as a time', async () => {
    render(<Harness />);
    await expect.poll(() => seekSlider().getAttribute('aria-valuetext')).toBe('1:23 of 4:56');
    expect(screen.getByRole('group', { name: 'Talk' })).toBeInTheDocument();
  });

  it('plays and pauses from the button and from Space', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    seekSlider().focus();
    await userEvent.keyboard(' ');
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it.runIf(isDesktop)('seeks 5 s with the arrows and 30 s with Shift', async () => {
    const onSeek = vi.fn();
    render(<Harness onSeekSpy={onSeek} />);
    seekSlider().focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onSeek).toHaveBeenLastCalledWith(88);
    await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}');
    expect(onSeek).toHaveBeenLastCalledWith(58);
    await expect.poll(() => seekSlider().getAttribute('aria-valuetext')).toBe('0:58 of 4:56');
  });

  it('skips 15 s with the skip buttons', async () => {
    const onSeek = vi.fn();
    render(<Harness onSeekSpy={onSeek} />);
    await userEvent.click(screen.getByRole('button', { name: 'Forward 15 seconds' }));
    expect(onSeek).toHaveBeenLastCalledWith(98);
    await userEvent.click(screen.getByRole('button', { name: 'Back 15 seconds' }));
    expect(onSeek).toHaveBeenLastCalledWith(83);
  });

  it('shows the time left when the time readout is pressed', async () => {
    render(<Harness />);
    const readout = screen.getByRole('button', { name: '1:23 / 4:56' });
    expect(readout).toHaveAccessibleDescription('1:23 elapsed of 4:56');
    await userEvent.click(readout);
    const remaining = screen.getByRole('button', { name: '−3:33 / 4:56' });
    expect(remaining).toHaveAccessibleDescription('3:33 left of 4:56');
  });

  it('changes the speed from the speed menu', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Playback speed, 1×' }));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: '1.5×' }));
    await expect
      .poll(() => screen.queryByRole('button', { name: 'Playback speed, 1.5×' }))
      .toBeInTheDocument();
  });

  it('toggles mute', async () => {
    render(<Harness />);
    const mute = screen.getByRole('button', { name: 'Mute' });
    await userEvent.click(mute);
    expect(mute).toHaveAttribute('aria-pressed', 'true');
  });

  it('jumps to a chapter from the chapters menu, with ticks on the timeline', async () => {
    const onSeek = vi.fn();
    const { container } = render(<Harness onSeekSpy={onSeek} markers={sampleChapters} />);
    await userEvent.click(screen.getByRole('button', { name: 'Chapters' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /Gas giants/ }));
    expect(onSeek).toHaveBeenLastCalledWith(71);
    expect(container.querySelectorAll('.bg-fg[aria-hidden="true"]').length).toBeGreaterThanOrEqual(
      4,
    );
  });

  it('jumps to the live edge with Go live, and reads a live position', async () => {
    const onSeek = vi.fn();
    render(
      <Harness
        onSeekSpy={onSeek}
        isLive
        duration={Number.POSITIVE_INFINITY}
        seekable={{ start: 0, end: 600 }}
        currentTime={540}
      />,
    );
    await expect.poll(() => seekSlider().getAttribute('aria-valuetext')).toBe('1:00 behind live');
    await userEvent.click(screen.getByRole('button', { name: 'Go live' }));
    expect(onSeek).toHaveBeenLastCalledWith(600);
    expect(await screen.findByRole('button', { name: 'Live' })).toBeInTheDocument();
  });

  it.runIf(isTouch)('plays with a real tap', async () => {
    render(<Harness />);
    await commands.tap('button[aria-label="Play"]');
    await expect.poll(() => screen.queryByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('takes its strings from UIProvider messages', () => {
    render(
      <UIProvider
        messages={overrides({ mediaPlay: 'Lecture', mediaPosition: 'Position dans le fichier' })}
      >
        <Harness />
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: 'Lecture' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Position dans le fichier' })).toBeInTheDocument();
  });

  it('never scrolls the page sideways and has no accessibility violations', async () => {
    const { container } = render(<Harness markers={sampleChapters} onPrevious={() => undefined} />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    await expectNoAxeViolations(container);
  });
});

describe('Waveform', () => {
  it('is a seek slider read as a time, drawn from the peaks', async () => {
    const { container } = render(
      <div className="w-80 p-2">
        <Waveform peaks={samplePeaks} currentTime={30} duration={120} onSeek={() => undefined} />
      </div>,
    );
    await expect.poll(() => seekSlider().getAttribute('aria-valuetext')).toBe('0:30 of 2:00');
    await expect
      .poll(() => container.querySelector('path')?.getAttribute('d')?.length ?? 0)
      .toBeGreaterThan(100);
  });

  it.runIf(isDesktop)('seeks with the keyboard and with a click', async () => {
    const onSeek = vi.fn<(seconds: number) => void>();
    render(
      <div className="w-80 p-2">
        <Waveform peaks={samplePeaks} currentTime={30} duration={120} onSeek={onSeek} />
      </div>,
    );
    seekSlider().focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onSeek).toHaveBeenLastCalledWith(35);
    await userEvent.keyboard('{End}');
    await expect.poll(() => onSeek.mock.lastCall?.[0]).toBe(120);
    const track = seekSlider().closest('[data-media-seek]')?.querySelector('svg')?.parentElement;
    expect(track).not.toBeNull();
    if (track) {
      await userEvent.click(track, { position: { x: 10, y: 20 } });
      await expect.poll(() => (onSeek.mock.lastCall?.[0] ?? 999) < 20).toBe(true);
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Waveform peaks={samplePeaks} currentTime={30} duration={120} onSeek={() => undefined} />,
    );
    await expectNoAxeViolations(container);
  });
});
