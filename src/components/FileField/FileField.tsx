import { FolderOpen } from 'lucide-react';
import { useId, useRef, type ReactNode, type Ref } from 'react';
import {
  FieldErrorContext,
  FileTrigger,
  LabelContext,
  Provider,
  TextContext,
  type DropZoneProps as AriaDropZoneProps,
} from 'react-aria-components';
import { useMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { Button } from '../Button/Button';
import { FieldFrame, fieldRootClasses, type FieldBaseProps } from '../Field/Field';
import { DropZone } from './DropZone';
import type { FileItem, UploadFunction } from './files';
import { FileList } from './FileList';
import { useFileItems } from './useFileItems';

/** React Aria's FieldError reads this; FileField isn't a React Aria field, so it supplies its own. */
const validDetails: ValidityState = {
  badInput: false,
  customError: false,
  patternMismatch: false,
  rangeOverflow: false,
  rangeUnderflow: false,
  stepMismatch: false,
  tooLong: false,
  tooShort: false,
  typeMismatch: false,
  valid: true,
  valueMissing: false,
};

export interface FileFieldProps<R = unknown>
  extends
    FieldBaseProps,
    Pick<AriaDropZoneProps, 'aria-label' | 'aria-labelledby' | 'aria-describedby'> {
  /** The files, controlled. Update an item's `status`, `progress` or `error` to report an upload the app runs. */
  value?: FileItem<R>[];
  /** The initial files, uncontrolled. */
  defaultValue?: FileItem<R>[];
  /** Called with the new list whenever files are added or removed, or an upload this field runs moves on. */
  onChange?: (items: FileItem<R>[]) => void;
  /**
   * Accepted types: MIME types (`application/pdf`), wildcards (`image/*`) or extensions (`.csv`). The file chooser
   * offers only these, and other dropped or pasted files are turned away with a message.
   */
  accept?: readonly string[];
  /** The largest file accepted, in bytes. Larger files are turned away with a message. */
  maxSize?: number;
  /** With `allowsMultiple`, the most files the field holds. Extra files are turned away with a message. */
  maxFiles?: number;
  /** Whether the field holds several files. Without it, a new file replaces the current one. */
  allowsMultiple?: boolean;
  /**
   * Uploads each added file as soon as it's added, with progress, cancel and retry. The library never uploads by
   * itself: without this, files stay `pending` for the app (or a form) to handle.
   */
  upload?: UploadFunction<R>;
  /** The drop zone's text. Defaults to "Drop files here" (`messages.dropFiles`). */
  dropLabel?: ReactNode;
  isDisabled?: boolean;
  /** Shows `errorMessage` and marks the field invalid. */
  isInvalid?: boolean;
  isRequired?: boolean;
  className?: string;
  /** The field's root element. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Choose files with a button, or drag and drop or paste them onto the drop zone. Files are checked against `accept`,
 * `maxSize` and `maxFiles`, and listed with their size, upload progress and errors, each with a remove button. With
 * an `upload` function the field uploads each file as it's added; otherwise the app reports progress and errors by
 * updating the items (controlled `value`).
 */
export function FileField<R = unknown>({
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  value,
  defaultValue,
  onChange,
  accept,
  maxSize,
  maxFiles,
  allowsMultiple = false,
  upload,
  dropLabel,
  isDisabled = false,
  isInvalid = false,
  isRequired = false,
  className,
  ref,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: FileFieldProps<R>) {
  const messages = useMessages();
  const labelId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const chooseRef = useRef<HTMLButtonElement>(null);
  const { items, rejections, addFiles, remove, retry } = useFileItems<R>({
    value,
    defaultValue,
    onChange,
    accept,
    maxSize,
    maxFiles,
    allowsMultiple,
    upload,
  });

  const describedBy = [
    ariaDescribedBy,
    description !== undefined ? descriptionId : undefined,
    isInvalid && errorMessage !== undefined ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      {...rest}
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy ?? (label !== undefined ? labelId : undefined)}
      aria-describedby={describedBy || undefined}
      data-invalid={isInvalid || undefined}
      data-disabled={isDisabled || undefined}
      className={fieldRootClasses(className)}
    >
      <Provider
        values={[
          [LabelContext, { id: labelId, elementType: 'span' }],
          [
            TextContext,
            { slots: { description: { id: descriptionId }, errorMessage: { id: errorId } } },
          ],
          [FieldErrorContext, { isInvalid, validationErrors: [], validationDetails: validDetails }],
        ]}
      >
        <FieldFrame
          label={label}
          description={description}
          errorMessage={errorMessage}
          labelPosition={labelPosition}
          infoTip={infoTip}
          isRequired={isRequired}
        >
          <DropZone
            label={dropLabel}
            isDisabled={isDisabled}
            onDrop={addFiles}
            className={cn(isInvalid && 'border-danger-solid')}
          >
            <FileTrigger
              acceptedFileTypes={accept}
              allowsMultiple={allowsMultiple}
              onSelect={(files) => {
                if (files) {
                  addFiles(Array.from(files));
                }
              }}
            >
              <Button
                ref={chooseRef}
                variant="outline"
                size="sm"
                icon={FolderOpen}
                isDisabled={isDisabled}
              >
                {messages.chooseFiles}
              </Button>
            </FileTrigger>
          </DropZone>
          {rejections.length > 0 && (
            <ul role="alert" className="flex flex-col gap-0.5 text-xs font-medium text-danger-fg">
              {rejections.map((rejection, index) => (
                <li key={index}>{rejection}</li>
              ))}
            </ul>
          )}
          {items.length > 0 && (
            <FileList
              items={items}
              canUpload={upload !== undefined}
              isDisabled={isDisabled}
              onRemove={(id) => {
                remove(id);
                // The removed row's button is gone; keep focus in the field.
                chooseRef.current?.focus();
              }}
              onRetry={retry}
            />
          )}
        </FieldFrame>
      </Provider>
    </div>
  );
}
