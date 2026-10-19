// The column settings dialog (editScope `all`): name, type, group, width, and the type's own checks.

import { useState } from 'react';
import { Button } from '../../components/Button/Button';
import { ButtonGroup } from '../../components/ButtonGroup/ButtonGroup';
import { Checkbox } from '../../components/Checkbox/Checkbox';
import { Dialog } from '../../components/Dialog/Dialog';
import { Option } from '../../components/ListBox/ListBoxParts';
import { NumberField } from '../../components/NumberField/NumberField';
import { Select } from '../../components/Select/Select';
import { TextArea } from '../../components/TextArea/TextArea';
import { TextField } from '../../components/TextField/TextField';
import { useSpreadsheetMessages } from './messages';
import { MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from './geometry';
import type { SpreadsheetColumn, SpreadsheetColumnType } from './types';
import { typeOf } from './values';

export interface ColumnSettingsDialogProps {
  column: SpreadsheetColumn;
  /** The column's current width in pixels. */
  width: number;
  isOpen: boolean;
  onSave: (column: SpreadsheetColumn) => void;
  onClose: () => void;
}

const TYPES: readonly SpreadsheetColumnType[] = ['text', 'number', 'boolean', 'date', 'enum'];

/**
 * Options from the choices text, one per line. A line that matches an existing option's label keeps its id; the other
 * lines take, in order, the ids of the options whose labels are gone (a rename), so cells keep their choice. Lines
 * left over are new choices, with their label as the id.
 */
export function optionsFromText(
  text: string,
  previous: readonly { id: string; label: string }[],
): { id: string; label: string }[] {
  const labels = [
    ...new Set(
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  ];
  const kept = new Map(previous.map((option) => [option.label, option]));
  const renamed = previous.filter((option) => !labels.includes(option.label));
  const used = new Set<string>();
  return labels.map((label) => {
    const option = kept.get(label) ?? renamed.shift();
    let id = option?.id ?? label;
    for (let suffix = 2; used.has(id); suffix++) {
      id = `${label}-${String(suffix)}`;
    }
    used.add(id);
    return { id, label };
  });
}

export function ColumnSettingsDialog({
  column,
  width,
  isOpen,
  onSave,
  onClose,
}: ColumnSettingsDialogProps) {
  const messages = useSpreadsheetMessages();
  const [label, setLabel] = useState(column.label);
  const [type, setType] = useState<SpreadsheetColumnType>(typeOf(column));
  const [group, setGroup] = useState(column.group ?? '');
  const [pixels, setPixels] = useState<number | null>(width);
  const [isRequired, setRequired] = useState(column.isRequired === true);
  const [isReadOnly, setReadOnly] = useState(column.isReadOnly === true);
  const [maxLength, setMaxLength] = useState<number | null>(column.maxLength ?? null);
  const [minValue, setMinValue] = useState<number | null>(column.minValue ?? null);
  const [maxValue, setMaxValue] = useState<number | null>(column.maxValue ?? null);
  const [step, setStep] = useState<number | null>(column.step ?? null);
  const [choices, setChoices] = useState(
    (column.options ?? []).map((option) => option.label).join('\n'),
  );

  const typeLabels: Record<SpreadsheetColumnType, string> = {
    text: messages.spreadsheetTypeText,
    number: messages.spreadsheetTypeNumber,
    boolean: messages.spreadsheetTypeBoolean,
    date: messages.spreadsheetTypeDate,
    enum: messages.spreadsheetTypeEnum,
  };
  const isLabelValid = label.trim() !== '';

  const save = () => {
    if (!isLabelValid) {
      return;
    }
    // Start from the column (keeping `validate`, `formatOptions`, `align`…), then set or drop each option.
    const {
      group: _group,
      maxLength: _maxLength,
      minValue: _minValue,
      maxValue: _maxValue,
      step: _step,
      options: _options,
      isRequired: _isRequired,
      isReadOnly: _isReadOnly,
      ...rest
    } = column;
    const next: SpreadsheetColumn = { ...rest, label: label.trim(), type };
    if (group.trim() !== '') {
      next.group = group.trim();
    }
    if (pixels !== null) {
      next.width = `${String(Math.round(pixels))}px`;
    }
    if (isRequired) {
      next.isRequired = true;
    }
    if (isReadOnly) {
      next.isReadOnly = true;
    }
    if (type === 'text' && maxLength !== null) {
      next.maxLength = maxLength;
    }
    if (type === 'number') {
      if (minValue !== null) {
        next.minValue = minValue;
      }
      if (maxValue !== null) {
        next.maxValue = maxValue;
      }
      if (step !== null && step > 0) {
        next.step = step;
      }
    }
    if (type === 'enum') {
      next.options = optionsFromText(choices, column.options ?? []);
    }
    if (type !== typeOf(column)) {
      // Formatting belongs to the old type.
      delete next.formatOptions;
    }
    onSave(next);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={messages.spreadsheetColumnSettingsTitle({ column: column.label })}
      footer={
        <ButtonGroup>
          <Button slot="close" variant="outline">
            {messages.cancel}
          </Button>
          <Button
            tone="accent"
            isDisabled={!isLabelValid}
            onPress={() => {
              save();
            }}
          >
            {messages.save}
          </Button>
        </ButtonGroup>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <TextField
          label={messages.spreadsheetColumnName}
          value={label}
          onChange={setLabel}
          isRequired
          isInvalid={!isLabelValid}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- the dialog opens to edit this name.
          autoFocus
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select<object, SpreadsheetColumnType>
            label={messages.spreadsheetColumnType}
            value={type}
            onChange={setType}
            description={type === typeOf(column) ? undefined : messages.spreadsheetTypeChangeHint}
          >
            {TYPES.map((candidate) => (
              <Option key={candidate} id={candidate}>
                {typeLabels[candidate]}
              </Option>
            ))}
          </Select>
          <TextField label={messages.spreadsheetColumnGroup} value={group} onChange={setGroup} />
          <NumberField
            label={messages.spreadsheetColumnWidth}
            value={pixels}
            onChange={setPixels}
            minValue={MIN_COLUMN_WIDTH}
            maxValue={MAX_COLUMN_WIDTH}
            step={1}
            suffix="px"
          />
          {type === 'text' && (
            <NumberField
              label={messages.spreadsheetColumnMaxLength}
              value={maxLength}
              onChange={setMaxLength}
              minValue={1}
              step={1}
            />
          )}
          {type === 'number' && (
            <>
              <NumberField label={messages.minimum} value={minValue} onChange={setMinValue} />
              <NumberField label={messages.maximum} value={maxValue} onChange={setMaxValue} />
              <NumberField
                label={messages.spreadsheetColumnStep}
                description={messages.spreadsheetColumnStepHint}
                value={step}
                onChange={setStep}
                minValue={0}
              />
            </>
          )}
        </div>
        {type === 'enum' && (
          <TextArea
            label={messages.spreadsheetColumnChoices}
            description={messages.spreadsheetColumnChoicesHint}
            value={choices}
            onChange={setChoices}
            minRows={4}
          />
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Checkbox isSelected={isRequired} onChange={setRequired}>
            {messages.spreadsheetColumnRequired}
          </Checkbox>
          <Checkbox isSelected={isReadOnly} onChange={setReadOnly}>
            {messages.spreadsheetColumnReadOnly}
          </Checkbox>
        </div>
      </form>
    </Dialog>
  );
}
