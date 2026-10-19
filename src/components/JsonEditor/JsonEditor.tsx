// JsonEditor: a JSON document in the standard field frame. A monospaced text area that grows with its content,
// checks the JSON as you type (the error names the line and column), and formats it on request.
import { Braces, CircleCheck } from 'lucide-react';
import { useId, useMemo, useRef, type Ref } from 'react';
import { ButtonContext, TextArea, TextField } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import type { JsonEditorMessages, JsonProblemCode } from '../../provider/messages';
import { cn } from '../../utils/cn';
import { useControllableState } from '../../utils/useControllableState';
import { Button } from '../Button/Button';
import {
  FieldDescription,
  FieldErrorMessage,
  FieldLabel,
  FieldLayout,
  fieldRootClasses,
  inputClasses,
  inputGroupClasses,
  type FieldBaseProps,
} from '../Field/Field';
import { useAutoGrow } from '../TextArea/useAutoGrow';
import { checkJson } from './json';

function describeFound(found: string | undefined): string {
  if (found === undefined) {
    return 'the end of the text';
  }
  if (found === '\n' || found === '\r') {
    return 'a line break';
  }
  if (found === '\t') {
    return 'a tab';
  }
  if (found === ' ') {
    return 'a space';
  }
  return `“${found}”`;
}

function jsonReason(code: JsonProblemCode, found: string): string {
  switch (code) {
    case 'end':
      return 'The JSON ends too soon: a value or closing bracket is missing';
    case 'value':
      return `Expected a value (text in double quotes, a number, an object, a list, true, false or null), found ${found}`;
    case 'propertyName':
      return `Expected a property name in double quotes, found ${found}`;
    case 'colon':
      return `Expected a colon after the property name, found ${found}`;
    case 'objectSeparator':
      return `Expected a comma or a closing brace, found ${found}`;
    case 'arraySeparator':
      return `Expected a comma or a closing bracket, found ${found}`;
    case 'trailingComma':
      return 'Remove this comma: nothing follows it';
    case 'escape':
      return 'Invalid escape sequence in text: use \\", \\\\, \\n, \\t or \\u followed by four hex digits';
    case 'unterminatedString':
      return 'Text isn’t closed with a double quote before the end of the line';
    case 'controlCharacter':
      return 'Text can’t contain tabs or control characters: use \\t or \\u escapes';
    case 'number':
      return 'Invalid number';
    case 'extraText':
      return `Unexpected ${found} after the end of the JSON`;
  }
}

/** English defaults of JsonEditor's strings (see `Messages`). */
export const defaultJsonEditorMessages: JsonEditorMessages = {
  formatJson: 'Format',
  validJson: 'Valid JSON',
  jsonProblem: ({ code, line, column, found }) =>
    `Line ${line}, column ${column}: ${jsonReason(code, describeFound(found))}`,
};

export interface JsonEditorProps extends Omit<FieldBaseProps, 'labelPosition' | 'infoTip'> {
  /** The JSON text. Controlled. */
  value?: string;
  /** The initial text, uncontrolled. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  /**
   * The value failed a check outside the editor (a required check, a server error): shows `errorMessage`. The
   * editor reports JSON problems itself, as you type, and those take precedence.
   */
  isInvalid?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  /** The form field name. */
  name?: string;
  /** Names the editor when there's no visible `label`. */
  'aria-label'?: string;
  /** Lines shown when empty or short. Defaults to 8. */
  minRows?: number;
  /** Lines before the editor scrolls inside instead of growing. Defaults to 30. */
  maxRows?: number;
  /** Spaces per level when formatting. Defaults to 2. */
  indent?: number;
  className?: string;
  /** The field's root element. */
  ref?: Ref<HTMLDivElement>;
}

/** A JSON document in a field: monospaced, growing, checked as you type, with a Format button. */
export function JsonEditor({
  label,
  description,
  errorMessage,
  value: valueProp,
  defaultValue,
  onChange,
  onBlur,
  isInvalid = false,
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  name,
  'aria-label': ariaLabel,
  minRows = 8,
  maxRows = 30,
  indent = 2,
  className,
  ref,
}: JsonEditorProps) {
  const messages = useEntryMessages(defaultJsonEditorMessages);
  const [value, setValue] = useControllableState(valueProp, defaultValue ?? '', onChange);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const statusId = useId();
  useAutoGrow(textareaRef, frameRef, value, minRows, maxRows);

  const check = useMemo(() => (value.trim() ? checkJson(value) : null), [value]);
  const problem = check && !check.isValid ? messages.jsonProblem(check.problem) : undefined;
  const canFormat = Boolean(check?.isValid) && !isDisabled && !isReadOnly;

  const format = () => {
    if (!check?.isValid) {
      return;
    }
    const formatted = JSON.stringify(check.value, null, indent);
    if (formatted !== value) {
      setValue(formatted);
    }
  };

  return (
    <TextField
      ref={ref}
      name={name}
      aria-label={ariaLabel}
      value={value}
      onChange={setValue}
      onBlur={onBlur}
      isInvalid={problem !== undefined || isInvalid}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      validationBehavior="aria"
      aria-describedby={check?.isValid ? statusId : undefined}
      className={fieldRootClasses(className)}
    >
      <FieldLayout
        label={
          <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-4 gap-y-1">
            {label !== undefined ? (
              <FieldLabel isRequired={isRequired}>{label}</FieldLabel>
            ) : (
              <span />
            )}
            {!isReadOnly && (
              // A text field doesn't provide button context, but clear any an ancestor might.
              <ButtonContext.Provider value={null}>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Braces}
                  isDisabled={!canFormat}
                  onPress={format}
                >
                  {messages.formatJson}
                </Button>
              </ButtonContext.Provider>
            )}
          </div>
        }
      >
        <div ref={frameRef} className={cn(inputGroupClasses, 'items-stretch')}>
          <TextArea
            ref={textareaRef}
            rows={minRows}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            wrap="off"
            className={cn(inputClasses, 'h-auto resize-none overflow-x-auto py-2 font-mono')}
          />
        </div>
        {check?.isValid && (
          <span id={statusId} className="inline-flex items-center gap-1 text-xs text-success-fg">
            <CircleCheck aria-hidden="true" className="size-3.5 shrink-0" />
            {messages.validJson}
          </span>
        )}
        {description !== undefined && <FieldDescription>{description}</FieldDescription>}
        <FieldErrorMessage>{problem ?? errorMessage}</FieldErrorMessage>
      </FieldLayout>
    </TextField>
  );
}
