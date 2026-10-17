import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { sampleChapters, samplePeaks } from '../../../test/media';
import { Waveform, type WaveformProps } from './Waveform';

const meta = {
  title: 'Media/Waveform',
  component: Waveform,
  parameters: { layout: 'padded' },
  args: { peaks: samplePeaks, currentTime: 42, duration: 130 },
} satisfies Meta<typeof Waveform>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Seeks on click, tap or drag, and with the arrows (5 s, 30 s with Shift), Home and End. */
function Seekable(props: Omit<WaveformProps, 'onSeek'>) {
  const [time, setTime] = useState(props.currentTime);
  return <Waveform {...props} currentTime={time} onSeek={setTime} />;
}

/** A recording's peaks with the played part filled and a playhead. */
export const Default: Story = {
  render: (args) => <Seekable {...args} />,
};

/** Chapters marked along the top. */
export const WithMarkers: Story = {
  render: (args) => <Seekable {...args} markers={sampleChapters} />,
};

/** The three sizes: `sm` fits a message bubble. */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <Seekable {...args} size="sm" />
      <Seekable {...args} size="md" />
      <Seekable {...args} size="lg" />
    </div>
  ),
};

/** Without `onSeek` it only shows progress. */
export const ReadOnly: Story = {};
