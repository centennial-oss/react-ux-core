// The Move/Resize dialog (EDIT-18): column, row, width and height as numbers, held to the item's limits and the
// grid. It's the non-drag way to arrange widgets (WCAG 2.5.7), and the easiest one on touch screens.

import { useState } from 'react';
import { Button } from '../../components/Button/Button';
import { ButtonGroup } from '../../components/ButtonGroup/ButtonGroup';
import { Dialog } from '../../components/Dialog/Dialog';
import { NumberField } from '../../components/NumberField/NumberField';
import { limitsFor, type GridRect, type SizeLimits } from '../layout/engine';
import { useDashboardMessages } from '../messages';

export interface MoveResizeDialogProps {
  /** The item's name, in the title. */
  title: string;
  /** The item's current place and size. */
  rect: GridRect;
  columns: number;
  limits: SizeLimits | undefined;
  isResizable: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Called with the new place and size (zero-based grid units). */
  onApply: (rect: GridRect) => void;
}

/** A dialog with numeric fields for an item's column, row, width and height. */
export function MoveResizeDialog({
  title,
  rect,
  columns,
  limits,
  isResizable,
  isOpen,
  onOpenChange,
  onApply,
}: MoveResizeDialogProps) {
  const messages = useDashboardMessages();
  const range = limitsFor(limits, columns);
  // One-based in the fields, as people count columns and rows.
  const [values, setValues] = useState({
    column: rect.x + 1,
    row: rect.y + 1,
    width: rect.w,
    height: rect.h,
  });
  const [shownFor, setShownFor] = useState(isOpen);
  if (shownFor !== isOpen) {
    setShownFor(isOpen);
    if (isOpen) {
      setValues({ column: rect.x + 1, row: rect.y + 1, width: rect.w, height: rect.h });
    }
  }
  const maxColumn = Math.max(1, columns - values.width + 1);
  const ranges = {
    column: [1, maxColumn],
    row: [1, 9999],
    width: [range.minW, range.maxW],
    height: [range.minH, range.maxH],
  } as const;
  const isValid = (Object.keys(ranges) as (keyof typeof ranges)[]).every((key) => {
    const [min, max] = ranges[key];
    return Number.isInteger(values[key]) && values[key] >= min && values[key] <= max;
  });
  const field = (key: keyof typeof ranges, label: string, isDisabled = false) => {
    const [min, max] = ranges[key];
    const value = values[key];
    const isOut = !Number.isFinite(value) || value < min || value > max;
    return (
      <NumberField
        label={label}
        value={Number.isFinite(value) ? value : null}
        onChange={(next) => {
          setValues((current) => ({ ...current, [key]: next ?? Number.NaN }));
        }}
        minValue={min}
        maxValue={max}
        step={1}
        hasStepper
        isDisabled={isDisabled}
        isInvalid={isOut}
        errorMessage={isOut ? messages.numberOutOfRange({ min, max }) : undefined}
      />
    );
  };

  return (
    <Dialog
      title={messages.moveResizeTitle({ title })}
      size="sm"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      footer={(close) => (
        <ButtonGroup>
          <Button variant="outline" onPress={close}>
            {messages.cancel}
          </Button>
          <Button
            variant="solid"
            tone="accent"
            isDisabled={!isValid}
            onPress={() => {
              onApply({
                x: values.column - 1,
                y: values.row - 1,
                w: values.width,
                h: values.height,
              });
              close();
            }}
          >
            {messages.apply}
          </Button>
        </ButtonGroup>
      )}
    >
      <div className="grid grid-cols-2 gap-3 pb-2">
        {field('column', messages.gridColumn)}
        {field('row', messages.gridRow)}
        {field('width', messages.gridWidth, !isResizable)}
        {field('height', messages.gridHeight, !isResizable)}
      </div>
    </Dialog>
  );
}
