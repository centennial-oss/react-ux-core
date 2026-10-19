// The row editor: one row as a form, a field per visible column, with the same parsing and checks as the cells. Handy
// on phones, where cells are small. Previous and Next save and move on.

import { useState } from 'react';
import { Button } from '../../components/Button/Button';
import { ButtonGroup } from '../../components/ButtonGroup/ButtonGroup';
import { Checkbox } from '../../components/Checkbox/Checkbox';
import { Dialog } from '../../components/Dialog/Dialog';
import { Option } from '../../components/ListBox/ListBoxParts';
import { Select } from '../../components/Select/Select';
import { TextField } from '../../components/TextField/TextField';
import { useSpreadsheetMessages } from './messages';
import type { SpreadsheetRow, SpreadsheetValue } from './types';
import { parseForColumn, type ColumnFormat } from './values';

export interface RowEditorField {
  format: ColumnFormat;
  isReadOnly: boolean;
}

export interface RowEditorDialogProps {
  row: SpreadsheetRow;
  /** The row's number, formatted. */
  rowNumber: string;
  fields: readonly RowEditorField[];
  hasPrevious: boolean;
  hasNext: boolean;
  isOpen: boolean;
  /** Saves the changed values; then closes, or moves to the previous or next row. */
  onSave: (
    values: Readonly<Record<string, SpreadsheetValue>>,
    then: 'close' | 'previous' | 'next',
  ) => void;
  onClose: () => void;
}

const EMPTY = '__empty';

export function RowEditorDialog({
  row,
  rowNumber,
  fields,
  hasPrevious,
  hasNext,
  isOpen,
  onSave,
  onClose,
}: RowEditorDialogProps) {
  const messages = useSpreadsheetMessages();
  const draftsOf = (source: SpreadsheetRow) =>
    Object.fromEntries(
      fields.map(({ format }) => [format.column.id, format.copy(source[format.column.id])]),
    );
  const [drafts, setDrafts] = useState<Record<string, string>>(() => draftsOf(row));
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Previous and Next show another row in the same dialog: start over from its values.
  const [shownRow, setShownRow] = useState(row);
  if (shownRow !== row) {
    setShownRow(row);
    setDrafts(draftsOf(row));
    setErrors({});
  }
  const firstEditable = fields.findIndex((field) => !field.isReadOnly);

  const setDraft = (id: string, text: string) => {
    setDrafts((current) => ({ ...current, [id]: text }));
    if (errors[id] !== undefined) {
      setErrors(({ [id]: _, ...rest }) => rest);
    }
  };

  const save = (then: 'close' | 'previous' | 'next') => {
    const values: Record<string, SpreadsheetValue> = {};
    const found: Record<string, string> = {};
    for (const { format, isReadOnly } of fields) {
      const id = format.column.id;
      const text = drafts[id] ?? '';
      if (isReadOnly || text === format.copy(row[id])) {
        continue;
      }
      const parsed = parseForColumn(format, text, row);
      if (parsed.error === undefined) {
        values[id] = parsed.value;
      } else {
        found[id] = parsed.error;
      }
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    onSave(values, then);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={messages.spreadsheetRowTitle({ row: rowNumber })}
      size="lg"
      footer={
        <ButtonGroup layout="between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              isDisabled={!hasPrevious}
              onPress={() => {
                save('previous');
              }}
            >
              {messages.spreadsheetPreviousRow}
            </Button>
            <Button
              variant="outline"
              isDisabled={!hasNext}
              onPress={() => {
                save('next');
              }}
            >
              {messages.spreadsheetNextRow}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button slot="close" variant="outline">
              {messages.cancel}
            </Button>
            <Button
              tone="accent"
              onPress={() => {
                save('close');
              }}
            >
              {messages.save}
            </Button>
          </div>
        </ButtonGroup>
      }
    >
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          save('close');
        }}
      >
        {fields.map(({ format, isReadOnly }, index) => {
          const { column } = format;
          const text = drafts[column.id] ?? '';
          const error = errors[column.id];
          // The dialog opens on the first field that can change.
          const focusProps = index === Math.max(0, firstEditable) ? { autoFocus: true } : {};
          if (format.type === 'boolean') {
            return (
              <Checkbox
                key={column.id}
                className="self-end"
                isSelected={text === 'TRUE'}
                isReadOnly={isReadOnly}
                onChange={(isSelected) => {
                  setDraft(column.id, isSelected ? 'TRUE' : 'FALSE');
                }}
                {...focusProps}
              >
                {column.label}
              </Checkbox>
            );
          }
          if (format.type === 'enum') {
            const options = column.options ?? [];
            const current = options.find((option) => option.label === text)?.id ?? EMPTY;
            return (
              <Select<object, string>
                key={column.id}
                label={column.label}
                value={current}
                isDisabled={isReadOnly}
                isInvalid={error !== undefined}
                errorMessage={error}
                onChange={(id) => {
                  setDraft(column.id, id === EMPTY ? '' : (format.optionLabels.get(id) ?? id));
                }}
                {...focusProps}
              >
                {[{ id: EMPTY, label: messages.notSet }, ...options].map((option) => (
                  <Option key={option.id} id={option.id}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            );
          }
          return (
            <TextField
              key={column.id}
              label={column.label}
              value={text}
              isReadOnly={isReadOnly}
              isRequired={column.isRequired}
              isInvalid={error !== undefined}
              errorMessage={error}
              inputMode={format.type === 'number' ? 'decimal' : undefined}
              placeholder={format.type === 'date' ? '2026-10-17' : undefined}
              maxLength={format.type === 'text' ? column.maxLength : undefined}
              onChange={(next) => {
                setDraft(column.id, next);
              }}
              {...focusProps}
            />
          );
        })}
      </form>
    </Dialog>
  );
}
