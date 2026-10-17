import type { Meta, StoryObj } from '@storybook/react-vite';
import { assetOr, posterDataUrl, toneUrl } from '../../../test/media';
import { MultiView } from './MultiView';
import { StreamPreview } from './StreamPreview';
import { VideoPlayer } from './VideoPlayer';

// Media playback isn't deterministic, so these stories are left out of the visual suite. Without the real files in
// `.storybook/public/media` they fall back to a generated tone (the transport works; the picture is the poster).
const poster = posterDataUrl(640, 360);
const tone = toneUrl({ seconds: 90, frequency: 220, sampleRate: 4000 });
const captions = URL.createObjectURL(
  new Blob(
    [
      'WEBVTT\n\n00:00.000 --> 00:06.000\nSaturn’s rings are mostly water ice.\n\n00:06.000 --> 00:12.000\nThe widest spans 280,000 km.\n',
    ],
    { type: 'text/vtt' },
  ),
);

const meta = {
  title: 'Media/VideoPlayer',
  component: VideoPlayer,
  tags: ['!visual'],
  parameters: { layout: 'padded' },
  args: { src: tone, title: 'Saturn flyby', poster },
} satisfies Meta<typeof VideoPlayer>;
export default meta;
type Story = StoryObj<typeof meta>;

const real = (path: string) => async () => ({ src: await assetOr(path, () => tone) });

/**
 * A progressive file (`.storybook/public/media/sample.mp4` when present) with the transport, captions, speed,
 * picture-in-picture and full screen. Space, F, M, C and the arrows work anywhere in the player.
 */
export const Progressive: Story = {
  loaders: [real('media/sample.mp4')],
  render: (args, { loaded }) => (
    <VideoPlayer
      {...args}
      src={(loaded as { src: string }).src}
      captions={[{ src: captions, srcLang: 'en', label: 'English', isDefault: true }]}
      playbackRates={[0.5, 1, 1.5, 2]}
    />
  ),
};

/**
 * An HLS stream (`.storybook/public/media/stream/master.m3u8`): hls.js loads on demand, the quality menu lists the
 * ladder, and the stats overlay shows the rendition and bitrate switching.
 */
export const HlsWithStats: Story = {
  name: 'HLS with stats',
  loaders: [real('media/stream/master.m3u8')],
  render: (args, { loaded }) => (
    <VideoPlayer
      {...args}
      src={(loaded as { src: string }).src}
      hasStatsOverlay
      onStats={() => undefined}
    />
  ),
};

/** A live stream: "Go live" and the DVR window (here a file played as live). */
export const Live: Story = {
  args: { isLive: true },
};

/** DASH without a `loadSource` hook in a browser that can't play it natively: a clear error. */
export const DashWithoutLoader: Story = {
  name: 'DASH without a loader',
  args: { src: 'https://cdn.example.com/vod/manifest.mpd', title: 'DASH stream' },
};

/** Compact controls in one row. */
export const Compact: Story = {
  args: { controlsLayout: 'compact' },
};

/** A stream preview: a status chip, muted autoplay, compact controls, paused off-screen. */
export const Preview: Story = {
  render: () => (
    <div className="max-w-md">
      <StreamPreview
        src={tone}
        poster={poster}
        title="Encoder 1 — main stage"
        status={{ tone: 'success', label: 'Live' }}
      />
    </div>
  ),
};

/**
 * Four previews in a MultiView: listen to one at a time, focus one (it spans the width, with full controls), and
 * tiles scrolled out of view pause.
 */
export const Wall: Story = {
  loaders: [real('media/stream/master.m3u8')],
  render: (_args, { loaded }) => {
    const { src } = loaded as { src: string };
    return (
      <MultiView
        columns={{ base: 1, sm: 2 }}
        streams={[
          {
            id: 'main',
            src,
            poster,
            title: 'Main stage',
            status: { tone: 'success', label: 'Live' },
          },
          {
            id: 'north',
            src,
            poster,
            title: 'North dome',
            status: { tone: 'success', label: 'Live' },
          },
          {
            id: 'south',
            src,
            poster,
            title: 'South dome',
            status: { tone: 'warning', label: 'Degraded' },
          },
          {
            id: 'lab',
            src: 'media/missing-stream.m3u8',
            poster,
            title: 'Lab camera',
            status: { tone: 'neutral', label: 'Offline' },
          },
        ]}
      />
    );
  },
};
