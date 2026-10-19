// The edit popover's content: the label (chosen from the label options, or typed), the note, and delete. Changes
// apply as they're made; Done closes the popover.
import { Trash2 } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import { Radio, RadioGroup } from '../../components/RadioGroup/RadioGroup';
import { TextArea } from '../../components/TextArea/TextArea';
import { TextField } from '../../components/TextField/TextField';
import type { MediaImageStrings } from './messages';
import type { Annotation } from './types';

export interface AnnotationEditorProps {
  annotation: Annotation;
  labelOptions: readonly string[] | undefined;
  onChange: (annotation: Annotation) => void;
  onDelete: () => void;
  onDone: () => void;
  messages: MediaImageStrings;
}

export function AnnotationEditor({
  annotation,
  labelOptions,
  onChange,
  onDelete,
  onDone,
  messages,
}: AnnotationEditorProps) {
  // A label that isn't one of the options (set by the app, or typed before the options existed) stays choosable.
  const options =
    labelOptions && annotation.label !== '' && !labelOptions.includes(annotation.label)
      ? [...labelOptions, annotation.label]
      : labelOptions;
  return (
    <div className="flex w-full flex-col gap-3 sm:w-72">
      {options && options.length > 0 ? (
        <RadioGroup
          label={messages.annotatorLabel}
          orientation="horizontal"
          value={annotation.label === '' ? null : annotation.label}
          onChange={(label) => {
            onChange({ ...annotation, label });
          }}
        >
          {options.map((option, index) => (
            <Radio
              key={option}
              value={option}
              // The editor is a dialog the user just opened: focus starts on the chosen label (or the first), so the
              // arrow keys change it straight away.
              // eslint-disable-next-line jsx-a11y/no-autofocus -- see above.
              autoFocus={annotation.label === '' ? index === 0 : option === annotation.label}
            >
              {option}
            </Radio>
          ))}
        </RadioGroup>
      ) : (
        <TextField
          label={messages.annotatorLabel}
          // The editor is a dialog the user just opened: focus starts in its first field.
          // eslint-disable-next-line jsx-a11y/no-autofocus -- see above.
          autoFocus
          value={annotation.label}
          onChange={(label) => {
            onChange({ ...annotation, label });
          }}
        />
      )}
      <TextArea
        label={messages.annotatorNote}
        minRows={2}
        value={annotation.note ?? ''}
        onChange={(note) => {
          onChange({ ...annotation, note: note === '' ? undefined : note });
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" tone="danger" size="sm" icon={Trash2} onPress={onDelete}>
          {messages.delete}
        </Button>
        <Button tone="accent" size="sm" onPress={onDone}>
          {messages.annotatorDone}
        </Button>
      </div>
    </div>
  );
}
