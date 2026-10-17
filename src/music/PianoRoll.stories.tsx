import type { Meta, StoryObj } from '@storybook/react-vite';
import { useLayoutEffect, useRef, useState } from 'react';
import { melodyNotes } from '../../test/music';
import { audioContext, playNote } from '../../test/musicSynth';
import { useBeatClock, type BeatWindow } from './beatClock';
import { MusicTransport } from './MusicTransport';
import type { MusicNote } from './notes';
import { PianoRoll, type PianoRollProps } from './PianoRoll';

const meta = {
  title: 'Music/PianoRoll',
  component: PianoRoll,
  parameters: { layout: 'padded' },
  args: { notes: melodyNotes },
} satisfies Meta<typeof PianoRoll>;
export default meta;
type Story = StoryObj<typeof meta>;

function Editable(props: Partial<PianoRollProps>) {
  const [notes, setNotes] = useState<MusicNote[]>(props.notes ? [...props.notes] : melodyNotes);
  return <PianoRoll {...props} notes={notes} onChange={setNotes} />;
}

/**
 * A 4-bar melody. Draw notes by pressing on the grid (or with the grid cursor and Enter), drag to move, drag a note's
 * right edge to resize, Control/Command+D to duplicate, and quantize to the snap.
 */
export const Melody: Story = {
  render: () => <Editable />,
};

/** G major highlighted: out-of-scale rows are shaded and the root rows tinted. */
export const ScaleHighlight: Story = {
  render: () => <Editable scale={{ root: 7, mode: 'major' }} />,
};

/** A playhead and a loop region from props; the keys of the notes under the playhead light up. */
export const PlayheadAndLoop: Story = {
  render: () => <Editable playhead={6.5} loop={{ start: 4, end: 8 }} />,
};

/** 6/8 time with an eighth-note triplet snap, and no velocity lane. */
export const CompoundTime: Story = {
  render: () => (
    <Editable
      timeSignature={{ beats: 6, unit: 8 }}
      defaultSnap="1/8t"
      hasVelocityLane={false}
      notes={[
        { id: 'a', pitch: 67, start: 0, duration: 1.5, velocity: 100 },
        { id: 'b', pitch: 69, start: 1.5, duration: 0.5, velocity: 90 },
        { id: 'c', pitch: 71, start: 2, duration: 1, velocity: 90 },
        { id: 'd', pitch: 72, start: 3, duration: 3, velocity: 110 },
      ]}
    />
  ),
};

/** Without `onChange` the roll is read-only: notes can be selected and auditioned, not edited. */
export const ReadOnly: Story = {
  args: { notes: melodyNotes, height: '16rem' },
};

/** Playback in sync with Web Audio: the beat clock runs on the AudioContext's clock and schedules notes ahead. */
export const Playback: Story = {
  tags: ['!visual'],
  render: function Render() {
    const [notes, setNotes] = useState<MusicNote[]>(melodyNotes);
    const [bpm, setBpm] = useState(100);
    const [isLooping, setLooping] = useState(true);
    const [context] = useState(() => audioContext());
    const notesRef = useRef(notes);
    useLayoutEffect(() => {
      notesRef.current = notes;
    });
    const { beat, isPlaying, play, pause, stop } = useBeatClock({
      bpm,
      audioContext: context,
      loop: isLooping ? { start: 0, end: 16 } : null,
      onSchedule: (window: BeatWindow) => {
        for (const note of notesRef.current) {
          if (note.start >= window.from && note.start < window.to) {
            playNote(
              note.pitch,
              note.velocity,
              window.timeAt(note.start),
              (note.duration * 60) / bpm,
            );
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
          isLooping={isLooping}
          onLoopingChange={setLooping}
        />
        <PianoRoll
          notes={notes}
          onChange={setNotes}
          playhead={beat}
          loop={isLooping ? { start: 0, end: 16 } : null}
          onAudition={(pitch, velocity) => {
            playNote(pitch, velocity);
          }}
        />
      </div>
    );
  },
};
