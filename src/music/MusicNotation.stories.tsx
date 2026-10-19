import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { bassLine, odeToJoyLeadSheet, odeToJoyMusicXml, odeToJoyOpening } from '../../test/music';
import { MusicNotation } from './MusicNotation';
import { noteBeats } from './notation';

// The visual suite waits for `data-notation-status` to leave `loading` (VexFlow and its font load on first use).
const meta = {
  title: 'Music/MusicNotation',
  component: MusicNotation,
  parameters: { layout: 'padded' },
  args: { score: odeToJoyLeadSheet },
} satisfies Meta<typeof MusicNotation>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A 32-bar lead sheet with chord symbols, wrapped to the container's width. */
export const LeadSheet: Story = {};

/** The playhead's measure is shaded and its note drawn in the accent colour. */
export const Playhead: Story = {
  args: { score: odeToJoyOpening, playhead: { measure: 2, beat: 3 } },
};

/** The same opening read from MusicXML (key, time, harmony, a dotted note, a tie, a chord and rests). */
export const FromMusicXml: Story = {
  name: 'From MusicXML',
  args: { score: odeToJoyMusicXml },
};

/** Bass clef in F major and 3/4, with accidentals, a tie across the bar line, a rest and a chord, zoomed in. */
export const BassClef: Story = {
  args: { score: bassLine, zoom: 1.25 },
};

/** Four measures a line at a fixed size, scrolling sideways in narrow containers. */
export const FixedLayout: Story = {
  args: { isResponsive: false, zoom: 0.8 },
};

/** A score that can't be read. */
export const Unreadable: Story = {
  args: { score: '<not-a-score/>' },
};

/** Follows a playhead through the lead sheet at 140 BPM; pressing a note reports its id. */
export const FollowingPlayback: Story = {
  tags: ['!visual'],
  render: function Render() {
    const [beat, setBeat] = useState(0);
    const [pressed, setPressed] = useState<string | null>(null);
    useEffect(() => {
      const start = performance.now();
      let frame = requestAnimationFrame(function tick(now) {
        setBeat((((now - start) / 1000) * 140) / 60);
        frame = requestAnimationFrame(tick);
      });
      return () => {
        cancelAnimationFrame(frame);
      };
    }, []);
    const perBar = noteBeats({ duration: 'whole' }, { beats: 4, unit: 4 });
    const total = odeToJoyLeadSheet.measures.length * perBar;
    const position = beat % total;
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-fg-muted">{pressed ?? '—'}</p>
        <MusicNotation
          score={odeToJoyLeadSheet}
          playhead={{ measure: Math.floor(position / perBar) + 1, beat: (position % perBar) + 1 }}
          onNotePress={setPressed}
        />
      </div>
    );
  },
};
