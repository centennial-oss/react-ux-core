// AssetPicker (FR-066): a form field that chooses one asset from the media library, such as a post's featured image.
// It shows the chosen asset's thumbnail, name and details (flagging an image without alt text) with Choose/Change
// and Remove buttons; Choose opens MediaLibrary in a dialog, where the user can also upload and describe files.

import { ImagePlus, TriangleAlert, X } from 'lucide-react';
import { useId, useState, type Ref } from 'react';
import {
  FieldErrorContext,
  LabelContext,
  Provider,
  TextContext,
  useLocale,
} from 'react-aria-components';
import { Button } from '../../components/Button/Button';
import { Dialog } from '../../components/Dialog/Dialog';
import { FieldFrame, fieldRootClasses, type FieldBaseProps } from '../../components/Field/Field';
import { fileKind } from '../../components/FileField/fileKind';
import { FileKindIcon } from '../../components/FileField/FileKindIcon';
import { formatFileSize } from '../../components/FileField/files';
import { cn } from '../../utils/cn';
import { useControllableState } from '../../utils/useControllableState';
import { isMissingAlt, type MediaAsset } from './assets';
import { fileKindLabel } from './fileSource';
import { MediaLibrary, type MediaLibraryProps } from './MediaLibrary';
import { useMediaFilesMessages } from './messages';

/** React Aria's FieldError reads this; AssetPicker isn't a React Aria field, so it supplies its own. */
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

export interface AssetPickerProps
  extends
    FieldBaseProps,
    Omit<
      MediaLibraryProps,
      'selectionMode' | 'onSelect' | 'aria-label' | 'className' | 'ref' | 'height'
    > {
  /** The chosen asset, controlled (`null` for none). */
  value?: MediaAsset | null;
  /** The asset chosen at first, uncontrolled. */
  defaultValue?: MediaAsset | null;
  /** Called with the chosen asset, or `null` when it's removed. */
  onChange?: (asset: MediaAsset | null) => void;
  /** The dialog's title. Defaults to the field's label when it's text, otherwise the `assetPickerDialog` message. */
  dialogTitle?: string;
  /** The library's height in the dialog. Defaults to `min(32rem, 60dvh)`. */
  libraryHeight?: string;
  isDisabled?: boolean;
  isRequired?: boolean;
  /** Shows `errorMessage` and marks the field invalid. */
  isInvalid?: boolean;
  /** Names the field when it has no visible label. */
  'aria-label'?: string;
  className?: string;
  /** The field's root element. */
  ref?: Ref<HTMLDivElement>;
}

/** Chooses one asset from the media library in a dialog, showing the chosen one's thumbnail. */
export function AssetPicker({
  label,
  description,
  errorMessage,
  labelPosition,
  infoTip,
  value,
  defaultValue,
  onChange,
  dialogTitle,
  libraryHeight = 'min(32rem, 60dvh)',
  isDisabled = false,
  isRequired = false,
  isInvalid = false,
  'aria-label': ariaLabel,
  className,
  ref,
  ...libraryProps
}: AssetPickerProps) {
  const messages = useMediaFilesMessages();
  const { locale } = useLocale();
  const labelId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const [asset, setAsset] = useControllableState<MediaAsset | null>(
    value,
    defaultValue ?? null,
    onChange,
  );
  const [isOpen, setOpen] = useState(false);

  const describedBy = [
    description !== undefined ? descriptionId : undefined,
    isInvalid && errorMessage !== undefined ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(' ');
  const kind = asset ? fileKind(asset) : undefined;
  const kindLabel = kind ? fileKindLabel(kind, messages) : '';

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      aria-labelledby={label !== undefined ? labelId : undefined}
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
          <div
            className={cn(
              'flex min-w-0 flex-wrap items-center gap-3 rounded-card border bg-surface-1 p-2',
              isInvalid ? 'border-danger-solid' : 'border-border',
              isDisabled && 'opacity-50',
            )}
          >
            <span
              aria-hidden="true"
              className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-3 text-fg-muted"
            >
              {asset && kind === 'image' ? (
                <img
                  src={asset.thumbnailUrl ?? asset.url}
                  alt=""
                  draggable={false}
                  className="size-full object-cover"
                />
              ) : kind ? (
                <FileKindIcon kind={kind} className="size-7" />
              ) : (
                <ImagePlus className="size-7" />
              )}
            </span>
            <span className="min-w-0 flex-1 basis-32">
              {asset ? (
                <>
                  <span className="block truncate font-medium">{asset.name}</span>
                  <span className="block truncate text-xs text-fg-muted">
                    {asset.size === undefined
                      ? kindLabel
                      : messages.fileKindAndSize({
                          kind: kindLabel,
                          size: formatFileSize(asset.size, locale),
                        })}
                  </span>
                  {isMissingAlt(asset) && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-warning-fg">
                      <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                      {messages.libraryMissingAlt}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-fg-muted">{messages.assetPickerEmpty}</span>
              )}
            </span>
            <span className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                aria-haspopup="dialog"
                isDisabled={isDisabled}
                onPress={() => {
                  setOpen(true);
                }}
              >
                {asset ? messages.assetPickerChange : messages.assetPickerChoose}
              </Button>
              {asset && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={X}
                  isDisabled={isDisabled}
                  onPress={() => {
                    setAsset(null);
                  }}
                >
                  {messages.remove}
                </Button>
              )}
            </span>
          </div>
        </FieldFrame>
      </Provider>
      <Dialog
        title={dialogTitle ?? (typeof label === 'string' ? label : messages.assetPickerDialog)}
        size="xl"
        isOpen={isOpen}
        onOpenChange={setOpen}
      >
        <MediaLibrary
          {...libraryProps}
          height={libraryHeight}
          selectionMode="single"
          onSelect={(assets) => {
            const [chosen] = assets;
            if (chosen) {
              setAsset(chosen);
              setOpen(false);
            }
          }}
        />
      </Dialog>
    </div>
  );
}
