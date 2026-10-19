import { render, screen, within } from '@testing-library/react';
import { createRef } from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { posterDataUrl, recordWebm, toneUrl } from '../../../test/media';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import { MultiView } from './MultiView';
import type { MediaSourceLoader } from './source';
import type { PlaybackStats } from './stats';
import { StreamPreview } from './StreamPreview';
import { VideoPlayer } from './VideoPlayer';
import type { MediaPlayerMessages } from './messages';

/** Overrides of this entry's strings (its interface joins `Messages` when the entry is wired up). */
const overrides = (strings: Partial<MediaPlayerMessages>) =>
  strings as unknown as Partial<Messages>;

const isDesktop = window.innerWidth >= 1024;

// A <video> plays a WAV like any media file, which covers the transport without a video codec; a short WebM
// recorded from a canvas covers the picture (resolution, frames).
const audioOnly = toneUrl({ seconds: 20 });
const captionsUrl = URL.createObjectURL(
  new Blob(['WEBVTT\n\n00:00.000 --> 00:20.000\nThe rings of Saturn\n'], { type: 'text/vtt' }),
);
let webm = '';
beforeAll(async () => {
  webm = URL.createObjectURL(await recordWebm(1.2));
});
afterAll(() => {
  URL.revokeObjectURL(audioOnly);
  URL.revokeObjectURL(captionsUrl);
  URL.revokeObjectURL(webm);
});

const poster = posterDataUrl();

describe('VideoPlayer', () => {
  it('is a group named by its title, with a play button over the picture and the transport', () => {
    render(<VideoPlayer src={audioOnly} title="Saturn flyby" poster={poster} />);
    const player = screen.getByRole('group', { name: 'Saturn flyby' });
    expect(within(player).getAllByRole('button', { name: 'Play' })).toHaveLength(2);
    expect(within(player).getByRole('slider', { name: 'Position' })).toBeInTheDocument();
  });

  it('plays and pauses from the keyboard, and mutes with M', async () => {
    const video = createRef<HTMLVideoElement>();
    render(<VideoPlayer src={audioOnly} title="Saturn flyby" mediaRef={video} />);
    await expect.poll(() => video.current?.duration).toBeCloseTo(20, 0);
    screen.getByRole('slider', { name: 'Position' }).focus();
    await userEvent.keyboard(' ');
    await expect.poll(() => video.current?.paused).toBe(false);
    await userEvent.keyboard('m');
    await expect.poll(() => video.current?.muted).toBe(true);
    await userEvent.keyboard('k');
    await expect.poll(() => video.current?.paused).toBe(true);
  });

  it.runIf(isDesktop)('seeks 5 s with the arrows', async () => {
    const video = createRef<HTMLVideoElement>();
    render(<VideoPlayer src={audioOnly} title="Saturn flyby" mediaRef={video} />);
    await expect.poll(() => video.current?.duration).toBeCloseTo(20, 0);
    screen.getByRole('button', { name: 'Mute' }).focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    await expect.poll(() => video.current?.currentTime).toBeCloseTo(10, 0);
  });

  it.runIf(isDesktop)('asks for full screen with F and the full-screen button', async () => {
    // The test page runs in a frame that may not allow full screen, so the request itself is checked.
    const request = vi
      .spyOn(HTMLElement.prototype, 'requestFullscreen')
      .mockImplementation(() => Promise.resolve());
    const isEnabled = vi.spyOn(document, 'fullscreenEnabled', 'get').mockReturnValue(true);
    const video = createRef<HTMLVideoElement>();
    render(<VideoPlayer src={audioOnly} title="Saturn flyby" mediaRef={video} />);
    const player = screen.getByRole('group', { name: 'Saturn flyby' });
    await expect.poll(() => video.current?.duration).toBeCloseTo(20, 0);
    screen.getByRole('slider', { name: 'Position' }).focus();
    await userEvent.keyboard('f');
    expect(request.mock.contexts[0]).toBe(player);
    await userEvent.click(screen.getByRole('button', { name: 'Full screen' }));
    expect(request).toHaveBeenCalledTimes(2);
    request.mockRestore();
    isEnabled.mockRestore();
  });

  it('turns captions on from the menu and toggles them with C', async () => {
    const video = createRef<HTMLVideoElement>();
    render(
      <VideoPlayer
        src={audioOnly}
        title="Saturn flyby"
        mediaRef={video}
        captions={[{ src: captionsUrl, srcLang: 'en', label: 'English' }]}
      />,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Captions' }));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'English' }));
    await expect.poll(() => video.current?.textTracks[0]?.mode).toBe('showing');
    // On phones the menu is a sheet: let it close (and hand focus back) before using the keyboard.
    await expect.poll(() => screen.queryByRole('menu')).toBeNull();
    const position = screen.getByRole('slider', { name: 'Position' });
    position.focus();
    await expect.poll(() => document.activeElement).toBe(position);
    await userEvent.keyboard('c');
    await expect.poll(() => video.current?.textTracks[0]?.mode).toBe('disabled');
    await userEvent.keyboard('c');
    await expect.poll(() => video.current?.textTracks[0]?.mode).toBe('showing');
  });

  it('shows playback stats as text and reports them once a second', async () => {
    const onStats = vi.fn<(stats: PlaybackStats) => void>();
    const video = createRef<HTMLVideoElement>();
    render(
      <VideoPlayer src={webm} title="Canvas" mediaRef={video} hasStatsOverlay onStats={onStats} />,
    );
    const stats = await screen.findByRole('region', { name: 'Playback stats' });
    await expect
      .poll(() => stats.textContent, { timeout: 5000 })
      .toEqual(expect.stringContaining('160×90'));
    expect(stats.textContent).toEqual(expect.stringContaining('Dropped frames'));
    expect(onStats.mock.lastCall?.[0].width).toBe(160);
    expect(typeof onStats.mock.lastCall?.[0].bufferSeconds).toBe('number');
    await userEvent.click(screen.getByRole('button', { name: 'Playback stats' }));
    expect(screen.queryByRole('region', { name: 'Playback stats' })).toBeNull();
  });

  it('autoplays only muted', async () => {
    const video = createRef<HTMLVideoElement>();
    render(<VideoPlayer src={audioOnly} title="Preview" mediaRef={video} shouldAutoPlay />);
    await expect.poll(() => video.current?.paused).toBe(false);
    expect(video.current?.muted).toBe(true);
  });

  it('goes to the live edge with Go live', async () => {
    const video = createRef<HTMLVideoElement>();
    render(<VideoPlayer src={audioOnly} title="Live" mediaRef={video} isLive />);
    await expect.poll(() => video.current?.duration).toBeCloseTo(20, 0);
    await userEvent.click(await screen.findByRole('button', { name: 'Go live' }));
    await expect.poll(() => video.current?.currentTime ?? 0).toBeGreaterThan(15);
  });

  it('fails clearly on DASH without a loader, and uses the app’s loader when given', async () => {
    const { unmount } = render(
      <VideoPlayer src="https://cdn.example.com/vod/manifest.mpd" title="DASH" />,
    );
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toEqual(expect.stringContaining('DASH'));
    unmount();
    const loadSource = vi.fn<MediaSourceLoader>((media) => {
      media.src = audioOnly;
      return undefined;
    });
    const video = createRef<HTMLVideoElement>();
    render(
      <VideoPlayer
        src="https://cdn.example.com/vod/manifest.mpd"
        title="DASH"
        loadSource={loadSource}
        mediaRef={video}
      />,
    );
    await expect.poll(() => loadSource.mock.calls.length).toBe(1);
    expect(loadSource.mock.calls[0]?.[1]).toBe('https://cdn.example.com/vod/manifest.mpd');
    expect(loadSource.mock.calls[0]?.[2]).toBe('dash');
    await expect.poll(() => video.current?.duration).toBeCloseTo(20, 0);
  });

  it('reports a missing HLS stream (through hls.js, or natively)', async () => {
    render(<VideoPlayer src="/media-fixtures-missing/stream/master.m3u8" title="Missing stream" />);
    const alert = await screen.findByRole('alert', {}, { timeout: 10_000 });
    expect(alert.textContent).toEqual(expect.stringContaining('404'));
  });

  it('takes its strings from UIProvider messages', () => {
    render(
      <UIProvider messages={overrides({ mediaPlay: 'Lire', mediaFullScreen: 'Plein écran' })}>
        <VideoPlayer src={audioOnly} title="Saturn flyby" />
      </UIProvider>,
    );
    expect(screen.getAllByRole('button', { name: 'Lire' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Plein écran' })).toBeInTheDocument();
  });

  it('never scrolls the page sideways and has no accessibility violations', async () => {
    const { container } = render(
      <div className="p-2">
        <VideoPlayer
          src={audioOnly}
          title="Saturn flyby"
          poster={poster}
          hasStatsOverlay
          captions={[{ src: captionsUrl, srcLang: 'en', label: 'English' }]}
        />
      </div>,
    );
    await screen.findByRole('button', { name: 'Captions' });
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    await expectNoAxeViolations(container);
  });
});

describe('StreamPreview', () => {
  it('shows its status chip and starts muted', async () => {
    const video = createRef<HTMLVideoElement>();
    render(
      <StreamPreview
        src={audioOnly}
        title="Encoder 1"
        status={{ tone: 'success', label: 'Live' }}
        mediaRef={video}
      />,
    );
    expect(screen.getByRole('group', { name: 'Encoder 1' }).textContent).toEqual(
      expect.stringContaining('Live'),
    );
    await expect.poll(() => video.current?.paused).toBe(false);
    expect(video.current?.muted).toBe(true);
  });
});

describe('MultiView', () => {
  const streams = [
    {
      id: 'one',
      src: audioOnly,
      title: 'Encoder 1',
      status: { tone: 'success' as const, label: 'Live' },
    },
    {
      id: 'two',
      src: audioOnly,
      title: 'Encoder 2',
      status: { tone: 'warning' as const, label: 'Degraded' },
    },
    {
      id: 'three',
      src: audioOnly,
      title: 'Encoder 3',
      status: { tone: 'neutral' as const, label: 'Offline' },
    },
  ];
  const videoOf = (title: string) =>
    screen.getByRole('group', { name: title }).querySelector('video');

  it('plays one tile’s audio at a time', async () => {
    const onAudioStreamChange = vi.fn();
    render(<MultiView streams={streams} onAudioStreamChange={onAudioStreamChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Listen to Encoder 2' }));
    expect(onAudioStreamChange).toHaveBeenLastCalledWith('two');
    await expect.poll(() => videoOf('Encoder 2')?.muted).toBe(false);
    expect(videoOf('Encoder 1')?.muted).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Listen to Encoder 3' }));
    await expect.poll(() => videoOf('Encoder 3')?.muted).toBe(false);
    expect(videoOf('Encoder 2')?.muted).toBe(true);
    expect(screen.getByRole('button', { name: 'Listen to Encoder 2' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('focuses a tile: first, full width, with full controls, without restarting it', async () => {
    render(<MultiView streams={streams} />);
    const before = videoOf('Encoder 3');
    expect(screen.queryByRole('slider', { name: 'Position' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Focus Encoder 3' }));
    const tile = document.querySelector('[data-stream-id="three"]');
    expect(tile?.className).toEqual(expect.stringContaining('col-span-full'));
    expect(
      within(screen.getByRole('group', { name: 'Encoder 3' })).getByRole('slider', {
        name: 'Position',
      }),
    ).toBeInTheDocument();
    expect(videoOf('Encoder 3')).toBe(before);
    await userEvent.click(screen.getByRole('button', { name: 'Focus Encoder 3' }));
    expect(tile?.className).not.toEqual(expect.stringContaining('col-span-full'));
  });

  it('pauses tiles that are scrolled out of view, and resumes them', async () => {
    render(
      <div>
        <div className="h-[200vh]" />
        <MultiView streams={streams.slice(0, 1)} />
      </div>,
    );
    const video = videoOf('Encoder 1');
    // It autoplays, then pauses because it's off-screen.
    await expect.poll(() => video?.readyState ?? 0).toBeGreaterThan(0);
    await expect.poll(() => video?.paused).toBe(true);
    screen.getByRole('group', { name: 'Encoder 1' }).scrollIntoView();
    await expect.poll(() => video?.paused, { timeout: 5000 }).toBe(false);
    window.scrollTo(0, 0);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<MultiView streams={streams} defaultFocusedStreamId="two" />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    await expectNoAxeViolations(container);
  });
});
