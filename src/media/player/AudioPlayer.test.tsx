import { render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { samplePeaks, toneUrl } from '../../../test/media';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { AudioPlayer, type AudioTrack } from './AudioPlayer';
import type { MediaPlayerMessages } from './messages';

/** Overrides of this entry's strings (its interface joins `Messages` when the entry is wired up). */
const overrides = (strings: Partial<MediaPlayerMessages>) =>
  strings as unknown as Partial<Messages>;

const isDesktop = window.innerWidth >= 1024;
const isTouch = navigator.maxTouchPoints > 0;

const urls = [toneUrl({ seconds: 12 }), toneUrl({ seconds: 6, frequency: 660 })];
afterAll(() => {
  for (const url of urls) {
    URL.revokeObjectURL(url);
  }
});

const tracks: AudioTrack[] = [
  { id: 'a', src: urls[0] ?? '', title: 'Solar wind', artist: 'Ada', durationMs: 12_000 },
  { id: 'b', src: urls[1] ?? '', title: 'Saturn’s rings', artist: 'Grace', durationMs: 6_000 },
];
const [first, second] = tracks as [AudioTrack, AudioTrack];

const seekSlider = () => screen.getByRole('slider', { name: 'Position' });

describe('AudioPlayer', () => {
  it('is a group named by its track, with the title, artist and transport', () => {
    render(<AudioPlayer track={first} />);
    expect(screen.getByRole('group', { name: 'Solar wind (Ada)' })).toBeInTheDocument();
    expect(screen.getByText('Solar wind')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(seekSlider()).toBeInTheDocument();
  });

  it('plays and pauses real audio, reporting the time', async () => {
    const audio = createRef<HTMLAudioElement>();
    const onTimeUpdate = vi.fn<(ms: number) => void>();
    render(<AudioPlayer track={first} mediaRef={audio} onTimeUpdate={onTimeUpdate} />);
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    await expect.poll(() => audio.current?.paused).toBe(false);
    await expect.poll(() => audio.current?.currentTime ?? 0).toBeGreaterThan(0.2);
    // timeupdate fires a few times a second, so the report can trail the element's own clock.
    await expect.poll(() => onTimeUpdate.mock.lastCall?.[0] ?? 0).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await expect.poll(() => audio.current?.paused).toBe(true);
  });

  it.runIf(isDesktop)(
    'seeks with the arrows and plays with Space from the seek slider',
    async () => {
      const audio = createRef<HTMLAudioElement>();
      render(<AudioPlayer track={first} mediaRef={audio} preload="auto" />);
      await expect.poll(() => audio.current?.duration).toBeCloseTo(12, 0);
      seekSlider().focus();
      await userEvent.keyboard('{ArrowRight}');
      await expect.poll(() => audio.current?.currentTime).toBeCloseTo(5, 0);
      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
      await expect.poll(() => audio.current?.currentTime).toBeCloseTo(12, 0);
      await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}');
      await expect.poll(() => audio.current?.currentTime).toBeCloseTo(0, 0);
      await userEvent.keyboard(' ');
      await expect.poll(() => audio.current?.paused).toBe(false);
      await expect
        .poll(() => seekSlider().getAttribute('aria-valuetext'))
        .toMatch(/^0:0\d of 0:12$/);
      await userEvent.keyboard(' ');
      await expect.poll(() => audio.current?.paused).toBe(true);
    },
  );

  it('changes the playback speed', async () => {
    const audio = createRef<HTMLAudioElement>();
    render(<AudioPlayer track={first} mediaRef={audio} playbackRates={[1, 1.5, 2]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Playback speed, 1×' }));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: '2×' }));
    await expect.poll(() => audio.current?.playbackRate).toBe(2);
  });

  it('plays one player at a time in the same group', async () => {
    const one = createRef<HTMLAudioElement>();
    const two = createRef<HTMLAudioElement>();
    render(
      <>
        <AudioPlayer track={first} mediaRef={one} variant="compact" />
        <AudioPlayer track={second} mediaRef={two} variant="compact" />
      </>,
    );
    const [playOne, playTwo] = screen.getAllByRole('button', { name: 'Play' });
    if (!playOne || !playTwo) {
      throw new Error('Expected two play buttons');
    }
    await userEvent.click(playOne);
    await expect.poll(() => one.current?.paused).toBe(false);
    await userEvent.click(playTwo);
    await expect.poll(() => two.current?.paused).toBe(false);
    await expect.poll(() => one.current?.paused).toBe(true);
  });

  it('moves along a playlist with next and previous', async () => {
    const onTrackChange = vi.fn();
    render(<AudioPlayer track={first} playlist={tracks} onTrackChange={onTrackChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next track' }));
    expect(onTrackChange).toHaveBeenLastCalledWith('b');
    expect(
      await screen.findByRole('group', { name: 'Saturn’s rings (Grace)' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Previous track' }));
    expect(onTrackChange).toHaveBeenLastCalledWith('a');
  });

  it('follows a controlled track', () => {
    function Controlled() {
      const [track, setTrack] = useState(first);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setTrack(second);
            }}
          >
            Switch
          </button>
          <AudioPlayer track={track} />
        </>
      );
    }
    render(<Controlled />);
    screen.getByRole('button', { name: 'Switch' }).click();
    return expect
      .poll(() => screen.queryByRole('group', { name: 'Saturn’s rings (Grace)' }))
      .toBeInTheDocument();
  });

  it('says clearly when the file is missing', async () => {
    render(
      <AudioPlayer
        track={{ id: 'gone', src: '/media-fixtures-missing/lost.wav', title: 'Lost' }}
        preload="auto"
      />,
    );
    const alert = await screen.findByRole('alert', {}, { timeout: 5000 });
    expect(alert.textContent).toEqual(expect.stringContaining('404'));
  });

  it('says clearly when the format can’t be played', async () => {
    const junk = URL.createObjectURL(
      new Blob([new Uint8Array(512).fill(7)], { type: 'audio/mpeg' }),
    );
    render(<AudioPlayer track={{ id: 'junk', src: junk, title: 'Junk' }} preload="auto" />);
    const alert = await screen.findByRole('alert', {}, { timeout: 5000 });
    expect(alert.textContent).toEqual(expect.stringContaining('can’t play this format'));
    URL.revokeObjectURL(junk);
  });

  it('shows a waveform from peaks, which seeks', async () => {
    const audio = createRef<HTMLAudioElement>();
    const { container } = render(
      <AudioPlayer
        track={first}
        mediaRef={audio}
        waveform={{ peaks: samplePeaks }}
        preload="auto"
      />,
    );
    expect(screen.getAllByRole('slider', { name: 'Position' })).toHaveLength(1);
    await expect.poll(() => container.querySelector('svg path')).not.toBeNull();
    await expect.poll(() => audio.current?.duration).toBeCloseTo(12, 0);
    if (isDesktop) {
      seekSlider().focus();
      await userEvent.keyboard('{ArrowRight}');
      await expect.poll(() => audio.current?.currentTime).toBeCloseTo(5, 0);
    }
  });

  it('decodes a small file for its waveform', async () => {
    const { container } = render(<AudioPlayer track={second} waveform="decode" />);
    await expect
      .poll(() => container.querySelector('svg path')?.getAttribute('d')?.length ?? 0, {
        timeout: 5000,
      })
      .toBeGreaterThan(50);
  });

  it('fits a message bubble in the inline variant', () => {
    render(
      <div className="w-64">
        <AudioPlayer track={second} variant="inline" waveform={{ peaks: samplePeaks }} />
      </div>,
    );
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Playback speed/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mute' })).toBeNull();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('publishes the track to the system media controls while playing', async () => {
    const audio = createRef<HTMLAudioElement>();
    render(<AudioPlayer track={first} mediaRef={audio} />);
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    await expect.poll(() => navigator.mediaSession.metadata?.title).toBe('Solar wind');
    expect(navigator.mediaSession.metadata?.artist).toBe('Ada');
    audio.current?.pause();
  });

  it('leaves the system media controls alone when asked', async () => {
    navigator.mediaSession.metadata = null;
    const audio = createRef<HTMLAudioElement>();
    render(<AudioPlayer track={second} mediaRef={audio} shouldUseMediaSession={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    await expect.poll(() => audio.current?.paused).toBe(false);
    expect(navigator.mediaSession.metadata).toBeNull();
    audio.current?.pause();
  });

  it.runIf(isTouch)('plays with a real tap', async () => {
    const audio = createRef<HTMLAudioElement>();
    render(<AudioPlayer track={first} mediaRef={audio} variant="compact" />);
    await commands.tap('button[aria-label="Play"]');
    await expect.poll(() => audio.current?.paused).toBe(false);
    audio.current?.pause();
  });

  it('takes its strings from UIProvider messages', () => {
    render(
      <UIProvider messages={overrides({ mediaPlay: 'Écouter', mediaNextTrack: 'Piste suivante' })}>
        <AudioPlayer track={first} playlist={tracks} />
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: 'Écouter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Piste suivante' })).toBeInTheDocument();
  });

  it('never scrolls the page sideways and has no accessibility violations', async () => {
    const { container } = render(
      <div className="flex flex-col gap-4 p-2">
        <AudioPlayer
          track={first}
          playlist={tracks}
          markers={[{ at: 4000, label: 'Chorus' }]}
          waveform={{ peaks: samplePeaks }}
        />
        <AudioPlayer track={second} variant="compact" />
        <AudioPlayer track={second} variant="inline" />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    await expectNoAxeViolations(container);
  });
});
