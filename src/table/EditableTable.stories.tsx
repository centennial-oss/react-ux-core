import type { Meta, StoryObj } from '@storybook/react-vite';
import { useId, useState } from 'react';
import {
  exposureLadder,
  ladderColumns,
  newRung,
  rungLabel,
  validateLadder,
  type Rung,
} from '../../test/exposureLadder';
import { EditableTable, type EditableTableProps } from './EditableTable';

const meta = {
  title: 'Table/EditableTable',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Ladder({
  initial = exposureLadder,
  ...props
}: Partial<EditableTableProps<Rung>> & { initial?: Rung[] }) {
  const [rows, setRows] = useState(initial);
  const titleId = useId();
  return (
    <div className="flex flex-col gap-2">
      <h2 id={titleId} className="text-base font-semibold text-fg">
        Exposure ladder
      </h2>
      <EditableTable<Rung>
        aria-labelledby={titleId}
        rows={rows}
        columns={ladderColumns}
        getRowId={(rung) => rung.id}
        getRowLabel={rungLabel}
        onChange={setRows}
        validate={validateLadder}
        newRow={() => newRung(rows)}
        duplicateRow={(rung) => ({ ...rung, id: newRung(rows).id })}
        isReorderable
        maxItems={8}
        {...props}
      />
    </div>
  );
}

/**
 * A camera's six-rung exposure ladder. Tab into the grid, move with the arrow keys, press Enter (or double-click) to
 * edit, Escape to cancel and Tab to the next cell while editing. Each exposure must be higher than the previous
 * rung's; the row's actions move, duplicate and remove it.
 */
export const ExposureLadder: Story = {
  render: () => <Ladder />,
};

/** Errors show on the cell (linked with aria-describedby) and in a summary above the table that jumps to the cell. */
export const WithErrors: Story = {
  render: () => (
    <Ladder
      initial={exposureLadder.map((rung) =>
        rung.id === 'r4'
          ? { ...rung, exposureMs: 4 }
          : rung.id === 'r6'
            ? { ...rung, fps: null }
            : rung,
      )}
    />
  ),
};

/** `editMode="always"` shows every editor; a click edits straight away. The keyboard model is the same. */
export const AlwaysEditing: Story = {
  render: () => <Ladder editMode="always" />,
};

/** At `maxItems` the add button turns off and says why. */
export const Full: Story = {
  render: () => <Ladder maxItems={6} />,
};

/** No rows yet. */
export const Empty: Story = {
  render: () => <Ladder initial={[]} />,
};

/** Read-only and disabled: no editors, actions or add button. */
export const Disabled: Story = {
  render: () => <Ladder isDisabled />,
};

/** In a narrow container (or on a phone) each row becomes an editable card, with move buttons. */
export const Cards: Story = {
  render: () => (
    <div className="max-w-sm">
      <Ladder initial={exposureLadder.slice(0, 3)} />
    </div>
  ),
};
