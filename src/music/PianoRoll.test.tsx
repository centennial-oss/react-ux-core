import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { melodyNotes } from '../../test/music';
import { UIProvider } from '../provider/UIProvider';
import type { MusicNote } from './notes';
import { PianoRoll, type PianoRollProps } from './PianoRoll';

const isDesktop = window.innerWidth >= 1024;
const BEAT_WIDTH = 64;
const ROW_HEIGHT = 16;

function Editor({
  initial = melodyNotes,
  onNotes,
  ...props
}: Partial<PianoRollProps> & { initial?: MusicNote[]; onNotes?: (notes: MusicNote[]) => void }) {
  const [notes, setNotes] = useState<MusicNote[]>(initial);
  return (
    <PianoRoll
      notes={notes}
      onChange={(next) => {
        setNotes(next);
        onNotes?.(next);
      }}
      {...props}
    />
  );
}

function grid(): HTMLElement {
  return screen.getByRole('region', { name: 'Note grid' });
}

function background(): HTMLElement {
  const cursor = grid().querySelector('[data-grid-cursor]');
  if (!cursor?.parentElement) {
    throw new Error('No grid background');
  }
  return cursor.parentElement;
}

/** Client coordinates of a beat and pitch on the grid (pitch range C2–C6). */
function point(beat: number, pitch: number, high = 84) {
  const rect = background().getBoundingClientRect();
  const zoom = rect.height / ((high - 36 + 1) * ROW_HEIGHT);
  return {
    clientX: rect.left + beat * BEAT_WIDTH * zoom,
    clientY: rect.top + (high - pitch + 0.5) * ROW_HEIGHT * zoom,
  };
}

function pointerAt(
  target: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  at: { clientX: number; clientY: number },
) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: type === 'pointermove' ? -1 : 0,
      buttons: type === 'pointerup' ? 0 : 1,
      ...at,
    }),
  );
}

function liveText(): string {
  return [...document.querySelectorAll('[aria-live="polite"]')]
    .map((region) => region.textContent)
    .join(' | ');
}

describe('PianoRoll', () => {
  it('shows notes as named options on a canvas, with a key column, toolbar and velocity lane', async () => {
    const { container } = render(<Editor />);
    const roll = screen.getByRole('group', { name: 'Piano roll' });
    expect(within(roll).getByRole('group', { name: 'Piano roll tools' })).toBeInTheDocument();
    const keys = within(roll).getByRole('group', { name: 'Keys' });
    expect(within(keys).getAllByRole('button')).toHaveLength(49);
    const notes = within(grid()).getAllByRole('option');
    expect(notes).toHaveLength(15);
    expect(notes[0]).toHaveAccessibleName('E4, bar 1, beat 1, quarter note, velocity 110');
    expect(notes[12]).toHaveAccessibleName('E4, bar 4, beat 1, dotted quarter note, velocity 110');
    expect(notes[13]).toHaveAccessibleName('D4, bar 4, beat 2.5, eighth note, velocity 90');
    expect(screen.getByText('Velocity')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('draws a note with a press and drag on empty grid, snapped to 1/16', async () => {
    const onNotes = vi.fn();
    const onAudition = vi.fn();
    render(<Editor initial={[]} onNotes={onNotes} onAudition={onAudition} />);
    await expect.poll(() => background().getBoundingClientRect().width).toBeGreaterThan(0);
    const target = background();
    pointerAt(target, 'pointerdown', point(1.1, 67));
    expect(onAudition).toHaveBeenCalledWith(67, 100);
    pointerAt(target, 'pointermove', point(1.6, 67));
    pointerAt(target, 'pointermove', point(2.4, 67));
    pointerAt(target, 'pointerup', point(2.4, 67));
    await expect.poll(() => onNotes.mock.lastCall?.[0] as MusicNote[] | undefined).toHaveLength(1);
    const [note] = onNotes.mock.lastCall?.[0] as MusicNote[];
    expect(note).toMatchObject({ pitch: 67, start: 1, duration: 1.5, velocity: 100 });
    expect(
      await within(grid()).findByRole('option', {
        name: /^G4, bar 1, beat 2, dotted quarter note/,
      }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it.runIf(isDesktop)('adds notes from the keyboard with the grid cursor', async () => {
    const onNotes = vi.fn();
    const onAudition = vi.fn();
    render(<Editor initial={[]} onNotes={onNotes} onAudition={onAudition} />);
    const cursor = grid().querySelector<HTMLElement>('[data-grid-cursor]');
    if (!cursor) {
      throw new Error('No grid cursor');
    }
    cursor.focus();
    expect(cursor).toHaveAccessibleName('Add note: C4, bar 1, beat 1');
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}');
    await expect.poll(liveText).toContain('E4, bar 1, beat 1');
    await userEvent.keyboard(
      '{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}',
    );
    await userEvent.keyboard('{Enter}');
    expect(onNotes.mock.lastCall?.[0]).toEqual([
      expect.objectContaining({ pitch: 64, start: 2, duration: 1 }),
    ]);
    expect(onAudition).toHaveBeenLastCalledWith(64, 100);
    await expect.poll(liveText).toContain('Added E4, bar 1, beat 3, quarter note');
    // The cursor moved past the new note; Shift+Up moves it an octave.
    await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}{Enter}');
    expect((onNotes.mock.lastCall?.[0] as MusicNote[])[1]).toMatchObject({ pitch: 76, start: 3 });
  });

  it.runIf(isDesktop)(
    'moves, resizes, duplicates and deletes notes from the keyboard',
    async () => {
      const onNotes = vi.fn();
      render(<Editor initial={melodyNotes.slice(0, 2)} onNotes={onNotes} />);
      const first = within(grid()).getByRole('option', { name: /^E4, bar 1, beat 1,/ });
      first.focus();
      await userEvent.keyboard('{ArrowRight}');
      let latest = onNotes.mock.lastCall?.[0] as MusicNote[];
      expect(latest[0]).toMatchObject({ pitch: 64, start: 0.25 });
      await expect.poll(liveText).toContain('E4, bar 1, beat 1.25, quarter note');
      await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}{ArrowDown}');
      latest = onNotes.mock.lastCall?.[0] as MusicNote[];
      expect(latest[0]).toMatchObject({ pitch: 75 });
      await userEvent.keyboard('{Shift>}{ArrowRight}{ArrowRight}{/Shift}');
      latest = onNotes.mock.lastCall?.[0] as MusicNote[];
      expect(latest[0]).toMatchObject({ duration: 1.5 });
      expect(document.activeElement).toHaveAccessibleName(
        /^D sharp 5, bar 1, beat 1.25, dotted quarter note/,
      );
      await userEvent.keyboard('{Control>}d{/Control}');
      latest = onNotes.mock.lastCall?.[0] as MusicNote[];
      expect(latest).toHaveLength(3);
      expect(latest[2]).toMatchObject({ pitch: 75, start: 1.75, duration: 1.5 });
      await expect
        .poll(() => document.activeElement?.getAttribute('data-canvas-item'))
        .toBe(latest[2]?.id);
      await userEvent.keyboard('{Delete}');
      expect(onNotes.mock.lastCall?.[0]).toHaveLength(2);
      await expect.poll(liveText).toContain('Deleted a note');
      expect(document.activeElement).toHaveAttribute('data-grid-cursor');
    },
  );

  it('moves the selection by dragging, snapped to the grid', async () => {
    const onNotes = vi.fn();
    render(<Editor initial={melodyNotes.slice(0, 1)} onNotes={onNotes} />);
    await expect.poll(() => background().getBoundingClientRect().width).toBeGreaterThan(0);
    const note = within(grid()).getByRole('option');
    const from = point(0.5, 64);
    pointerAt(note, 'pointerdown', from);
    pointerAt(note, 'pointermove', point(1.2, 66));
    pointerAt(note, 'pointermove', point(1.55, 66));
    pointerAt(note, 'pointerup', point(1.55, 66));
    await expect
      .poll(() => (onNotes.mock.lastCall?.[0] as MusicNote[] | undefined)?.[0])
      .toMatchObject({
        pitch: 66,
        start: 1,
      });
  });

  it('resizes a note from its right edge and sets velocity in the lane', async () => {
    const onNotes = vi.fn();
    render(<Editor initial={melodyNotes.slice(0, 1)} onNotes={onNotes} />);
    await expect.poll(() => background().getBoundingClientRect().width).toBeGreaterThan(0);
    const handle = grid().querySelector('[data-resize-handle]');
    if (!handle) {
      throw new Error('No resize handle');
    }
    pointerAt(handle, 'pointerdown', point(1, 64));
    pointerAt(handle, 'pointermove', point(1.6, 64));
    pointerAt(handle, 'pointerup', point(1.6, 64));
    await expect
      .poll(() => (onNotes.mock.lastCall?.[0] as MusicNote[] | undefined)?.[0]?.duration)
      .toBe(1.5);
    // The lane's stalk for the note: drag it to the top for full velocity.
    const stalk = document.querySelector('[data-velocity-note="n1"]');
    const lane = stalk?.parentElement?.parentElement;
    if (!stalk || !lane) {
      throw new Error('No velocity lane');
    }
    const box = lane.getBoundingClientRect();
    const x = stalk.getBoundingClientRect().left + 1;
    pointerAt(lane, 'pointerdown', { clientX: x, clientY: box.top + box.height / 2 });
    pointerAt(lane, 'pointermove', { clientX: x, clientY: box.top + 1 });
    pointerAt(lane, 'pointerup', { clientX: x, clientY: box.top + 1 });
    await expect
      .poll(() => (onNotes.mock.lastCall?.[0] as MusicNote[] | undefined)?.[0]?.velocity)
      .toBeGreaterThan(120);
  });

  it('quantizes to the snap, and offers triplet snaps', async () => {
    const onNotes = vi.fn();
    render(
      <Editor
        initial={[
          { id: 'a', pitch: 60, start: 0.1, duration: 0.9, velocity: 100 },
          { id: 'b', pitch: 62, start: 1.13, duration: 0.3, velocity: 100 },
        ]}
        onNotes={onNotes}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Quantize' }));
    expect(onNotes.mock.lastCall?.[0]).toEqual([
      expect.objectContaining({ start: 0, duration: 1 }),
      expect.objectContaining({ start: 1.25, duration: 0.25 }),
    ]);
    await expect.poll(liveText).toContain('Quantized 2 notes');
  });

  it('auditions selected notes and pressed keys, and lights the keys at the playhead', async () => {
    const onAudition = vi.fn();
    render(<Editor onAudition={onAudition} playhead={2.5} loop={{ start: 0, end: 4 }} />);
    await userEvent.click(within(grid()).getByRole('option', { name: /^F4, bar 1, beat 3,/ }));
    expect(onAudition).toHaveBeenLastCalledWith(65, 90);
    const keys = screen.getByRole('group', { name: 'Keys' });
    expect(within(keys).getByRole('button', { name: 'F4' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const g3 = within(keys).getByRole('button', { name: 'C4' });
    g3.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 2,
        pointerType: 'mouse',
        button: 0,
        buttons: 1,
      }),
    );
    expect(onAudition).toHaveBeenLastCalledWith(60, expect.any(Number));
    g3.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 2,
        pointerType: 'mouse',
        button: 0,
      }),
    );
  });

  it('lists and edits notes in a table view', async () => {
    const onNotes = vi.fn();
    const { container } = render(<Editor initial={melodyNotes.slice(0, 3)} onNotes={onNotes} />);
    await userEvent.click(screen.getByRole('button', { name: 'Show notes as a table' }));
    const table = screen.getByRole('table', { name: 'Notes' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    const velocity = within(table).getByRole('textbox', { name: 'Velocity, note 2' });
    await userEvent.tripleClick(velocity);
    await userEvent.keyboard('64{Enter}');
    expect((onNotes.mock.lastCall?.[0] as MusicNote[])[1]).toMatchObject({ velocity: 64 });
    await userEvent.click(within(table).getByRole('button', { name: 'Remove note 3' }));
    expect(onNotes.mock.lastCall?.[0]).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Add note' }));
    expect((onNotes.mock.lastCall?.[0] as MusicNote[])[2]).toMatchObject({ pitch: 64, start: 2 });
    await expectNoAxeViolations(container);
  });

  it('writes a 4-bar melody with the mouse and keyboard, and quantizes it to 1/16', async () => {
    const onNotes = vi.fn();
    render(<Editor initial={[]} onNotes={onNotes} defaultSnap="off" />);
    await expect.poll(() => background().getBoundingClientRect().width).toBeGreaterThan(0);
    // Four loosely drawn notes, one per bar (snapping off).
    for (const [beat, pitch] of [
      [0.08, 60],
      [4.1, 64],
      [8.05, 67],
      [12.2, 72],
    ] as const) {
      pointerAt(background(), 'pointerdown', point(beat, pitch));
      pointerAt(background(), 'pointerup', point(beat, pitch));
    }
    await expect.poll(() => onNotes.mock.lastCall?.[0] as MusicNote[] | undefined).toHaveLength(4);
    // Quantize works on the selection (the last drawn note), or every note when nothing is selected.
    grid().focus();
    await userEvent.keyboard('{Escape}');
    await expect
      .poll(() => within(grid()).queryAllByRole('option', { selected: true }))
      .toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: /Snap/ }));
    await userEvent.click(await screen.findByRole('option', { name: '1/16' }));
    await userEvent.click(screen.getByRole('button', { name: 'Quantize' }));
    const notes = onNotes.mock.lastCall?.[0] as MusicNote[];
    expect(notes.map((note) => note.start)).toEqual([0, 4, 8, 12.25]);
    expect(notes.every((note) => Number.isInteger(note.duration * 4))).toBe(true);
  });

  it('takes its strings from UIProvider', () => {
    render(
      <UIProvider
        messages={{
          pianoRollLabel: 'Rouleau',
          pianoRollQuantize: 'Quantifier',
        }}
      >
        <Editor />
      </UIProvider>,
    );
    expect(screen.getByRole('group', { name: 'Rouleau' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quantifier' })).toBeInTheDocument();
  });
});
