import type { Meta, StoryObj } from '@storybook/react-vite';
import { useLayoutEffect, useRef, useState } from 'react';
import { drumPattern, drumRows } from '../../test/music';
import { audioContext, playDrum } from '../../test/musicSynth';
import { useBeatClock, type BeatWindow } from './beatClock';
import { MusicTransport } from './MusicTransport';
import { StepSequencer, type StepPattern } from './StepSequencer';

const meta = {
  title: 'Music/StepSequencer',
  component: StepSequencer,
  parameters: { layout: 'padded' },
  args: { rows: drumRows },
} satisfies Meta<typeof StepSequencer>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A 16-step drum pattern with step 5 playing. Fill shows velocity; row names audition their sound. */
export const DrumPattern: Story = {
  args: { defaultValue: drumPattern, currentStep: 4, onAudition: () => undefined },
};

/** An empty 8-step pattern in groups of two. */
export const Empty: Story = {
  args: { steps: 8, stepsPerBeat: 2 },
};

/** Disabled. */
export const Disabled: Story = {
  args: { defaultValue: drumPattern, isDisabled: true },
};

/** Playback with a transport: steps are sixteenth notes scheduled ahead on the Web Audio clock. */
export const Playback: Story = {
  tags: ['!visual'],
  render: function Render() {
    const [pattern, setPattern] = useState<StepPattern>(drumPattern);
    const [bpm, setBpm] = useState(110);
    const [context] = useState(() => audioContext());
    const patternRef = useRef(pattern);
    useLayoutEffect(() => {
      patternRef.current = pattern;
    });
    const { beat, isPlaying, play, pause, stop } = useBeatClock({
      bpm,
      audioContext: context,
      loop: { start: 0, end: 4 },
      onSchedule: (window: BeatWindow) => {
        for (let step = Math.ceil(window.from * 4); step < window.to * 4; step++) {
          for (const row of drumRows) {
            const velocity = patternRef.current[row.id]?.[step % 16] ?? 0;
            if (velocity > 0) {
              playDrum(row.id, velocity, window.timeAt(step / 4));
            }
          }
        }
      },
    });
    return (
      <div className="flex flex-col gap-3">
        <MusicTransport
          isPlaying={isPlaying}
          onPlayingChange={(isPlaying) => {
            if (isPlaying) {
              play();
            } else {
              pause();
            }
          }}
          onStop={stop}
          position={beat}
          bpm={bpm}
          onBpmChange={setBpm}
        />
        <StepSequencer
          rows={drumRows}
          value={pattern}
          onChange={setPattern}
          currentStep={isPlaying ? Math.floor(beat * 4) % 16 : undefined}
          onAudition={(row) => {
            playDrum(row);
          }}
        />
      </div>
    );
  },
};
