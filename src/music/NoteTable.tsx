// The piano roll's table view: every note as a row (pitch, start, length, velocity) with fields to edit them, the
// accessible alternative to dragging notes on the grid.

import { Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '../components/Button/Button';
import { IconButton } from '../components/IconButton/IconButton';
import { Option } from '../components/ListBox';
import { NumberField } from '../components/NumberField/NumberField';
import { Select } from '../components/Select/Select';
import { useMusicMessages } from './messages';
import { sortNotes, type MusicNote } from './notes';
import { pitchesInRange, spellPitch, type PitchRange } from './pitch';

export interface NoteTableProps {
  notes: readonly MusicNote[];
  pitchRange: PitchRange;
  /** The smallest start and length step, in beats. */
  step: number;
  /** Called with the edited notes; without it the table is read-only. */
  onChange?: (notes: MusicNote[]) => void;
  /** Adds a note after the last one. */
  onAdd?: () => void;
  onAudition?: (pitch: number, velocity: number) => void;
}

/** An editable table of notes. */
export function NoteTable({
  notes,
  pitchRange,
  step,
  onChange,
  onAdd,
  onAudition,
}: NoteTableProps) {
  const messages = useMusicMessages();
  const sorted = useMemo(() => sortNotes(notes), [notes]);
  const pitches = useMemo(
    () =>
      pitchesInRange(pitchRange)
        .reverse()
        .map((pitch) => {
          const spelled = spellPitch(pitch);
          return {
            id: pitch,
            label: messages.musicPitchLabel(spelled),
            name: messages.musicPitchName(spelled),
          };
        }),
    [pitchRange, messages],
  );
  const isEditable = onChange !== undefined;
  const update = (id: string, change: Partial<MusicNote>) => {
    onChange?.(notes.map((note) => (note.id === id ? { ...note, ...change } : note)));
  };
  const headerClasses = 'px-2 py-2 text-start text-xs font-medium text-fg-muted';

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="relative min-w-0 overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[36rem] border-collapse text-sm text-fg">
          <caption className="sr-only">{messages.pianoRollNotes}</caption>
          <thead className="bg-surface-2">
            <tr>
              <th scope="col" className={headerClasses}>
                #
              </th>
              <th scope="col" className={headerClasses}>
                {messages.pianoRollPitch}
              </th>
              <th scope="col" className={headerClasses}>
                {messages.pianoRollStart}
              </th>
              <th scope="col" className={headerClasses}>
                {messages.pianoRollLength}
              </th>
              <th scope="col" className={headerClasses}>
                {messages.pianoRollVelocity}
              </th>
              {isEditable && (
                <th scope="col" className={headerClasses}>
                  <span className="sr-only">{messages.remove}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={isEditable ? 6 : 5} className="px-2 py-4 text-center text-fg-muted">
                  {messages.pianoRollNoNotes}
                </td>
              </tr>
            )}
            {sorted.map((note, index) => {
              const row = index + 1;
              const spelled = spellPitch(note.pitch);
              return (
                <tr key={note.id} className="border-t border-border">
                  <th
                    scope="row"
                    className="px-2 py-1.5 text-start font-normal text-fg-muted tabular-nums"
                  >
                    {row}
                  </th>
                  <td className="px-2 py-1.5">
                    {isEditable ? (
                      <Select
                        aria-label={messages.pianoRollField({
                          column: messages.pianoRollPitch,
                          row,
                        })}
                        size="sm"
                        items={pitches}
                        value={note.pitch}
                        className="w-28"
                        onChange={(pitch) => {
                          update(note.id, { pitch });
                          onAudition?.(pitch, note.velocity);
                        }}
                      >
                        {(item) => (
                          <Option id={item.id} textValue={item.name}>
                            {item.label}
                          </Option>
                        )}
                      </Select>
                    ) : (
                      <>
                        <span aria-hidden="true">{messages.musicPitchLabel(spelled)}</span>
                        <span className="sr-only">{messages.musicPitchName(spelled)}</span>
                      </>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {isEditable ? (
                      <NumberField
                        aria-label={messages.pianoRollField({
                          column: messages.pianoRollStart,
                          row,
                        })}
                        size="sm"
                        value={note.start}
                        minValue={0}
                        step={step}
                        formatOptions={{ maximumFractionDigits: 3 }}
                        className="w-28"
                        onChange={(start) => {
                          update(note.id, { start: start ?? 0 });
                        }}
                      />
                    ) : (
                      note.start
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {isEditable ? (
                      <NumberField
                        aria-label={messages.pianoRollField({
                          column: messages.pianoRollLength,
                          row,
                        })}
                        size="sm"
                        value={note.duration}
                        minValue={step}
                        step={step}
                        formatOptions={{ maximumFractionDigits: 3 }}
                        className="w-28"
                        onChange={(duration) => {
                          update(note.id, { duration: duration ?? step });
                        }}
                      />
                    ) : (
                      note.duration
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {isEditable ? (
                      <NumberField
                        aria-label={messages.pianoRollField({
                          column: messages.pianoRollVelocity,
                          row,
                        })}
                        size="sm"
                        value={note.velocity}
                        minValue={1}
                        maxValue={127}
                        step={1}
                        className="w-24"
                        onChange={(velocity) => {
                          update(note.id, { velocity: velocity ?? note.velocity });
                        }}
                      />
                    ) : (
                      note.velocity
                    )}
                  </td>
                  {isEditable && (
                    <td className="px-2 py-1.5">
                      <IconButton
                        icon={Trash2}
                        size="sm"
                        aria-label={messages.pianoRollRemoveNote({ row })}
                        onPress={() => {
                          onChange(notes.filter((other) => other.id !== note.id));
                        }}
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {isEditable && onAdd && (
        <Button size="sm" variant="outline" icon={Plus} className="self-start" onPress={onAdd}>
          {messages.pianoRollAddNote}
        </Button>
      )}
    </div>
  );
}
