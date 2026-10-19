import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ReactNode } from 'react';
import { sampleChapters, samplePeaks } from '../../../test/media';
import { MediaTransport, type MediaTransportProps } from './MediaTransport';
import { Waveform } from './Waveform';

const meta = {
  title: 'Media/MediaTransport',
  component: MediaTransport,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof MediaTransport>;
export default meta;
type Story = StoryObj<Partial<MediaTransportProps>>;

/** A transport over its own clock (the story's state stands in for a media element). */
function Clocked({
  renderTimeline,
  ...props
}: Partial<MediaTransportProps> & {
  renderTimeline?: (time: number, seek: (time: number) => void) => ReactNode;
}) {
  const [isPlaying, setPlaying] = useState(false);
  const [time, setTime] = useState(props.currentTime ?? 83);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setMuted] = useState(false);
  return (
    <MediaTransport
      isPlaying={isPlaying}
      onPlayingChange={setPlaying}
      duration={296}
      buffered={[{ start: 0, end: 140 }]}
      playbackRate={rate}
      onPlaybackRateChange={setRate}
      volume={volume}
      onVolumeChange={setVolume}
      isMuted={isMuted}
      onMutedChange={setMuted}
      aria-label="Planetary talk"
      {...props}
      currentTime={time}
      onSeek={setTime}
      timeline={renderTimeline?.(time, setTime)}
    />
  );
}

/**
 * The full layout: the seek slider with buffered ranges over play/pause, skip ±15 s, the time (press it for the
 * time left), speed, volume and mute. Space plays and pauses; the arrows seek 5 s, 30 s with Shift.
 */
export const Full: Story = {
  render: () => <Clocked />,
};

/** One row, for tight spaces. */
export const Compact: Story = {
  render: () => <Clocked layout="compact" />,
};

/** Chapters marked on the timeline and listed in a menu, with previous and next for a playlist. */
export const ChaptersAndPlaylist: Story = {
  render: () => (
    <Clocked
      markers={sampleChapters}
      duration={130}
      currentTime={40}
      onPrevious={() => undefined}
      onNext={() => undefined}
    />
  ),
};

/** A live stream with a 10-minute DVR window, a minute behind the edge: "Go live" jumps to it. */
export const LiveWithDvr: Story = {
  render: () => (
    <Clocked
      isLive
      duration={Number.POSITIVE_INFINITY}
      seekable={{ start: 0, end: 600 }}
      currentTime={540}
      onPlaybackRateChange={undefined}
    />
  ),
};

/** A live stream without a DVR window: no seek slider, just the live badge. */
export const LiveAtEdge: Story = {
  render: () => (
    <Clocked
      isLive
      duration={Number.POSITIVE_INFINITY}
      seekable={{ start: 590, end: 600 }}
      currentTime={598}
      onPlaybackRateChange={undefined}
    />
  ),
};

/** Buffering: a spinner by the time, and "Buffering" is announced. */
export const Buffering: Story = {
  tags: ['!visual'],
  render: () => <Clocked isPlaying isWaiting onPlayingChange={() => undefined} />,
};

/** A waveform replaces the seek slider (the `timeline` slot). */
export const WithWaveform: Story = {
  render: () => (
    <Clocked
      currentTime={42}
      renderTimeline={(time, seek) => (
        <Waveform peaks={samplePeaks} currentTime={time} duration={296} onSeek={seek} />
      )}
    />
  ),
};

/** Disabled, for example while a source loads. */
export const Disabled: Story = {
  render: () => <Clocked isDisabled />,
};
