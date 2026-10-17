// A camera's exposure ladder: the EditableTable fixture shared by its stories and tests.
import { editableColumnsFor, type EditableTableErrors } from '../src/table/editableColumns';
import { numberEditor, selectEditor } from '../src/table/editors';

export interface Rung {
  id: string;
  resolution: string;
  exposureMs: number | null;
  gain: number | null;
  fps: number | null;
}

export const resolutions = [
  { id: '4096x3072', label: '4096 × 3072' },
  { id: '2048x1536', label: '2048 × 1536' },
  { id: '1024x768', label: '1024 × 768' },
  { id: '640x480', label: '640 × 480' },
];

/** Six rungs, from short exposures at full resolution to long ones binned down. */
export const exposureLadder: Rung[] = [
  { id: 'r1', resolution: '4096x3072', exposureMs: 1, gain: 0, fps: 120 },
  { id: 'r2', resolution: '4096x3072', exposureMs: 2, gain: 0, fps: 60 },
  { id: 'r3', resolution: '2048x1536', exposureMs: 5, gain: 6, fps: 30 },
  { id: 'r4', resolution: '2048x1536', exposureMs: 10, gain: 6, fps: 30 },
  { id: 'r5', resolution: '1024x768', exposureMs: 20, gain: 12, fps: 15 },
  { id: 'r6', resolution: '640x480', exposureMs: 50, gain: 12, fps: 10 },
];

export const PREVIOUS_RUNG_ERROR = 'Must be higher than the previous rung';

/** Exposures must rise from rung to rung, and the frame rate must fit the exposure. */
export function validateLadder(rows: readonly Rung[]): EditableTableErrors {
  const errors: Record<string, Record<string, string>> = {};
  rows.forEach((rung, index) => {
    const previous = rows[index - 1];
    if (
      previous &&
      rung.exposureMs !== null &&
      previous.exposureMs !== null &&
      rung.exposureMs <= previous.exposureMs
    ) {
      errors[rung.id] = { ...errors[rung.id], exposureMs: PREVIOUS_RUNG_ERROR };
    }
    if (rung.exposureMs !== null && rung.fps !== null && rung.fps * rung.exposureMs > 1000) {
      errors[rung.id] = { ...errors[rung.id], fps: 'Too fast for this exposure' };
    }
  });
  return errors;
}

const col = editableColumnsFor<Rung>();

/** A rung's name from its position. */
export const rungLabel = (_rung: Rung, index: number) => `Rung ${String(index + 1)}`;

export const ladderColumns = [
  col.computed('rung', () => undefined, {
    header: 'Rung',
    isRowHeader: true,
    cell: ({ rowIndex }) => `Rung ${String(rowIndex + 1)}`,
  }),
  col.field('resolution', {
    header: 'Resolution',
    editor: selectEditor({ options: resolutions }),
    cell: ({ value }) => resolutions.find((option) => option.id === value)?.label ?? value,
    minWidth: '10rem',
  }),
  col.field('exposureMs', {
    header: 'Exposure (ms)',
    label: 'Exposure',
    align: 'end',
    isRequired: true,
    editor: numberEditor({ minValue: 0.01, maxValue: 10_000 }),
    minWidth: '8rem',
  }),
  col.field('gain', {
    header: 'Gain (dB)',
    label: 'Gain',
    align: 'end',
    editor: numberEditor({ minValue: 0, maxValue: 48 }),
    minWidth: '7rem',
  }),
  col.field('fps', {
    header: 'Frame rate (fps)',
    label: 'Frame rate',
    align: 'end',
    isRequired: true,
    editor: numberEditor({ minValue: 1, maxValue: 1000 }),
    minWidth: '7rem',
  }),
];

/** A new rung for `rows`, with the next free id (deterministic, for stories and tests). */
export function newRung(rows: readonly Rung[]): Rung {
  const last = Math.max(0, ...rows.map((rung) => Number(rung.id.slice(1))));
  return { id: `r${String(last + 1)}`, resolution: '640x480', exposureMs: null, gain: 0, fps: 10 };
}
