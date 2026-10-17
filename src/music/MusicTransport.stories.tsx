import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { MusicTransport } from './MusicTransport';

const meta = {
  title: 'Music/MusicTransport',
  component: MusicTransport,
  args: { isPlaying: false, onPlayingChange: () => undefined, position: 0, bpm: 120 },
} satisfies Meta<typeof MusicTransport>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Every control: play, stop, the position in bars and beats, the tempo and the loop toggle. */
export const Full: Story = {
  render: function Render() {
    const [isPlaying, setPlaying] = useState(false);
    const [bpm, setBpm] = useState(96);
    const [isLooping, setLooping] = useState(true);
    return (
      <MusicTransport
        isPlaying={isPlaying}
        onPlayingChange={setPlaying}
        onStop={() => {
          setPlaying(false);
        }}
        position={10.5}
        bpm={bpm}
        onBpmChange={setBpm}
        isLooping={isLooping}
        onLoopingChange={setLooping}
      />
    );
  },
};

/** Playing in 3/4: just play/pause and the position. */
export const Minimal: Story = {
  args: { isPlaying: true, position: 7, timeSignature: { beats: 3, unit: 4 } },
};
