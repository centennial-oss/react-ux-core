import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef } from 'react';
import { AudioMeter, type AudioMeterHandle } from './AudioMeter';

const meta = {
  title: 'Media/AudioMeter',
  component: AudioMeter,
  parameters: { layout: 'padded' },
  args: { label: 'Program', levels: [-18, -21] },
} satisfies Meta<typeof AudioMeter>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A stereo program meter: segments in the safe, warning (−12) and clip (−1 dBFS) zones, a dB scale and a readout. */
export const Stereo: Story = {};

/** Hot levels in the warning zone, and a clipped left channel whose indicator stays lit until pressed. */
export const Clipping: Story = {
  args: { levels: [-0.4, -9] },
};

/** Horizontal, filling its container, with named channels. */
export const Horizontal: Story = {
  args: {
    label: 'Encoder inputs',
    levels: [-14, -30, -48],
    channelLabels: ['Host', 'Guest', 'Room'],
    orientation: 'horizontal',
  },
};

/** Custom zones (a quieter house standard) and a shorter scale. */
export const CustomZones: Story = {
  args: {
    label: 'Dialogue',
    levels: [-22],
    channelLabels: ['Mic'],
    zones: { warning: -18, clip: -6 },
    minDb: -48,
  },
};

/** Loudness units on the scale and readout. */
export const Lufs: Story = {
  name: 'LUFS',
  args: { label: 'Integrated loudness', levels: [-23, -23.5], scale: 'lufs' },
};

function Animated() {
  const handle = useRef<AudioMeterHandle>(null);
  useEffect(() => {
    // Levels pushed every frame through the handle: no React re-renders.
    let frame = requestAnimationFrame(function step(now) {
      const t = now / 1000;
      handle.current?.push([
        -14 + Math.sin(t * 3.1) * 8 + Math.sin(t * 17) * 3,
        -16 + Math.sin(t * 2.3 + 1) * 8 + Math.sin(t * 13) * 3,
      ]);
      frame = requestAnimationFrame(step);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);
  return <AudioMeter label="Program" handleRef={handle} length="lg" />;
}

/** 60 fps levels through `handleRef.push`, with peak hold. */
export const Live: Story = {
  tags: ['!visual'],
  render: () => <Animated />,
};
