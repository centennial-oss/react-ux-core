import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { playNote } from '../../test/musicSynth';
import { PianoKeyboard } from './PianoKeyboard';

const meta = {
  title: 'Music/PianoKeyboard',
  component: PianoKeyboard,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PianoKeyboard>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Two octaves from C3 to C5 with the Cs labelled. Keys are buttons named by pitch. */
export const Default: Story = {};

/** Every key labelled, with a C minor chord highlighted (the highlight's text is part of each key's name). */
export const ChordHighlight: Story = {
  args: {
    labels: 'all',
    range: { low: 55, high: 76 },
    highlightedNotes: [
      { pitch: 60, tone: 'accent', label: 'root' },
      { pitch: 63, tone: 'success', label: 'minor third' },
      { pitch: 67, tone: 'warning', label: 'fifth' },
    ],
  },
};

/** Keys shown pressed by playback: a G major chord, one of them on a black key. */
export const ActiveNotes: Story = {
  args: { activeNotes: [55, 59, 62, 66], labels: 'none' },
};

/** Four octaves (C2–C6). On narrow screens it scrolls inside itself, opening on middle C, with octave buttons. */
export const WideRange: Story = {
  args: { range: { low: 36, high: 84 } },
};

/** With computer-keyboard playing (A W S E D …, Z and X for octaves), which a switch turns off. */
export const QwertyInput: Story = {
  args: { hasQwertyInput: true },
};

/** Disabled. */
export const Disabled: Story = {
  args: { isDisabled: true, activeNotes: [60] },
};

/**
 * Listens to every MIDI input once access is granted. What it shows depends on the browser (support and permission),
 * so it isn't in the visual suite.
 */
export const MidiInput: Story = {
  tags: ['!visual'],
  args: { midiInput: 'auto' },
};

/** Plays a simple synth: touch, mouse, glissando, computer keyboard and MIDI all sound. */
export const Playable: Story = {
  tags: ['!visual'],
  render: function Render() {
    const [active, setActive] = useState<number[]>([]);
    return (
      <PianoKeyboard
        hasQwertyInput
        midiInput="auto"
        activeNotes={active}
        onNoteOn={(pitch, velocity) => {
          playNote(pitch, velocity, undefined, 0.6);
          setActive((current) => [...current, pitch]);
        }}
        onNoteOff={(pitch) => {
          setActive((current) => current.filter((other) => other !== pitch));
        }}
      />
    );
  },
};
