import type { Meta, StoryObj } from '@storybook/react-vite';
import { assetOr, posterDataUrl, samplePeaks, toneUrl } from '../../../test/media';
import { AudioPlayer, type AudioTrack } from './AudioPlayer';

// Tones generated in the browser stand in for recordings, so the stories need no files. `preload="none"` keeps the
// visual stories still (nothing loads until Play).
const talk: AudioTrack = {
  id: 'talk',
  src: toneUrl({ seconds: 130, frequency: 330, sampleRate: 4000 }),
  title: 'A tour of the outer planets',
  artist: 'Grace, Mount Wilson Observatory',
  durationMs: 130_000,
  artworkSrc: posterDataUrl(160, 160),
};
const playlist: AudioTrack[] = [
  talk,
  {
    id: 'rings',
    src: toneUrl({ seconds: 48, frequency: 440, sampleRate: 4000 }),
    title: 'How Saturn’s rings formed',
    artist: 'Ada',
    durationMs: 48_000,
  },
  {
    id: 'moons',
    src: toneUrl({ seconds: 75, frequency: 520, sampleRate: 4000 }),
    title: 'Moons of Jupiter',
    artist: 'Ada',
    durationMs: 75_000,
  },
];
const voiceNote: AudioTrack = {
  id: 'note',
  src: toneUrl({ seconds: 14, frequency: 600 }),
  title: 'Voice message',
  durationMs: 14_000,
};

const meta = {
  title: 'Media/AudioPlayer',
  component: AudioPlayer,
  parameters: { layout: 'padded' },
  args: { track: talk, preload: 'none' },
} satisfies Meta<typeof AudioPlayer>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The full player: artwork, title, a waveform from precomputed peaks (it seeks), the transport, speed and volume.
 * Space plays and pauses, the arrows seek 5 s (30 s with Shift), M mutes.
 */
export const Full: Story = {
  args: { waveform: { peaks: samplePeaks } },
};

/** Without a waveform the seek slider shows buffered ranges. Chapters are marked and listed in a menu. */
export const WithChapters: Story = {
  args: {
    markers: [
      { at: 0, label: 'Introduction' },
      { at: 34_000, label: 'Jupiter' },
      { at: 71_000, label: 'Saturn' },
      { at: 102_000, label: 'Uranus and Neptune' },
    ],
  },
};

/** A playlist adds previous and next, and moves along at the end of a track. */
export const Playlist: Story = {
  args: { playlist },
};

/** The compact variant: a title line over one row of controls. */
export const Compact: Story = {
  args: { variant: 'compact', playlist },
};

/** The inline variant, in a message bubble: play, a small waveform and the time. */
export const InlineInMessage: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-1 rounded-card bg-accent-bg p-3 text-accent-fg">
      <AudioPlayer
        track={voiceNote}
        variant="inline"
        waveform={{ peaks: samplePeaks.slice(0, 120) }}
        preload="none"
      />
      <span className="text-xs">Grace · 09:41</span>
    </div>
  ),
};

/** Several players: starting one pauses the others (one shared `exclusiveGroup`). */
export const ExclusivePlayback: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="flex flex-col gap-3">
      {playlist.map((track) => (
        <AudioPlayer key={track.id} track={track} variant="compact" preload="none" />
      ))}
    </div>
  ),
};

/** `waveform="decode"` decodes a small file in the browser for its waveform. */
export const DecodedWaveform: Story = {
  tags: ['!visual'],
  args: { track: voiceNote, waveform: 'decode', preload: 'metadata' },
};

/** A missing file says so (404). */
export const MissingFile: Story = {
  tags: ['!visual'],
  args: {
    track: { id: 'lost', src: 'media/missing-recording.mp3', title: 'Lost recording' },
    preload: 'metadata',
  },
};

/**
 * A real MP3 from `.storybook/public/media/sample.mp3` with its peaks from `sample-peaks.json`, when those files
 * are there (otherwise a generated tone and the sample peaks).
 */
export const RealFile: Story = {
  tags: ['!visual'],
  loaders: [
    async () => {
      const src = await assetOr('media/sample.mp3', () => voiceNote.src);
      let peaks: readonly number[] = samplePeaks;
      try {
        const response = await fetch('media/sample-peaks.json');
        if (response.ok && response.headers.get('content-type')?.includes('json')) {
          const json = (await response.json()) as { data?: number[] } | number[];
          peaks = Array.isArray(json) ? json : (json.data ?? samplePeaks);
        }
      } catch {
        // Not there: the sample peaks.
      }
      return { src, peaks };
    },
  ],
  render: (_args, { loaded }) => {
    const { src, peaks } = loaded as { src: string; peaks: readonly number[] };
    return (
      <AudioPlayer
        track={{ id: 'sample', src, title: 'Sample recording', type: 'audio/mpeg' }}
        waveform={{ peaks }}
      />
    );
  },
};
