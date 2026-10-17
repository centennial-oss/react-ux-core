// CopyField: a read-only value with a copy button, for IDs, URLs and commands. Long values truncate at the end or in
// the middle ("urn:observatory:archive…/m31/andromeda.fits"); copying, and selecting the text by hand, always get the
// full value.
import { useId, useState, type ReactNode, type Ref } from 'react';
import { useEntryMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { InfoTip } from '../InfoTip/InfoTip';
import {
  FieldLayout,
  fieldRootClasses,
  inputClasses,
  inputGroupClasses,
  inputHeightClasses,
  type FieldBaseProps,
} from '../Field/Field';
import { CopyButton } from './CopyButton';
import { defaultCopyFieldMessages } from './messages';

/** How many characters stay visible at the end of a middle-truncated value. */
const MIDDLE_TAIL = 16;

export interface CopyFieldProps extends FieldBaseProps {
  /** The value shown and copied. */
  value: string;
  /** Monospace, for IDs and commands. Defaults to true. */
  isMonospace?: boolean;
  /** Where a long value is cut: `end`, or `middle` to keep its start and end visible. Defaults to `end`. */
  truncate?: 'end' | 'middle';
  /** Extra buttons before the copy button, such as "Open" or "Regenerate". */
  actions?: ReactNode;
  onCopy?: () => void;
  onCopyError?: (error: unknown) => void;
  /** Names the copy button ("Copy {copyLabel}") when `label` isn't plain text. */
  copyLabel?: string;
  /** Names the field when there's no visible label. */
  'aria-label'?: string;
  isDisabled?: boolean;
  /** Defaults to `md`. */
  size?: 'sm' | 'md';
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** Splits a value for middle truncation, by code point so emoji and other astral characters stay whole. */
function splitMiddle(value: string): [string, string] {
  const characters = Array.from(value);
  const tail = Math.min(MIDDLE_TAIL, Math.floor(characters.length / 2));
  return [
    characters.slice(0, characters.length - tail).join(''),
    characters.slice(characters.length - tail).join(''),
  ];
}

/** A read-only value with a copy button. */
export function CopyField({
  label,
  description,
  errorMessage,
  labelPosition = 'top',
  infoTip,
  value,
  isMonospace = true,
  truncate = 'end',
  actions,
  onCopy,
  onCopyError,
  copyLabel,
  'aria-label': ariaLabel,
  isDisabled = false,
  size = 'md',
  className,
  ref,
  ...rest
}: CopyFieldProps) {
  const messages = useEntryMessages(defaultCopyFieldMessages);
  const labelId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const [hasFailed, setFailed] = useState(false);
  const buttonLabel =
    copyLabel ?? (typeof label === 'string' ? label : undefined) ?? ariaLabel ?? undefined;
  const appError = typeof errorMessage === 'function' ? undefined : errorMessage;
  const describedBy =
    [
      description !== undefined ? descriptionId : undefined,
      hasFailed || appError !== undefined ? errorId : undefined,
    ]
      .filter(Boolean)
      .join(' ') || undefined;
  const valueProps = {
    'aria-labelledby': label !== undefined ? labelId : undefined,
    'aria-label': label === undefined ? ariaLabel : undefined,
    'aria-describedby': describedBy,
  };
  const textClasses = cn(isMonospace && 'font-mono');
  const [head, tail] = splitMiddle(value);

  const labelElement =
    label === undefined ? null : (
      <span
        className={cn(
          'flex min-w-0 items-center gap-1',
          labelPosition === 'side' && '@md:items-start @md:pt-2.5',
        )}
      >
        <span id={labelId} className="font-medium text-fg">
          {label}
        </span>
        {infoTip !== undefined && <InfoTip>{infoTip}</InfoTip>}
      </span>
    );

  return (
    <div
      {...rest}
      ref={ref}
      data-readonly=""
      data-disabled={isDisabled || undefined}
      className={fieldRootClasses(className)}
    >
      <FieldLayout labelPosition={labelPosition} label={labelElement}>
        <div className={cn(inputGroupClasses, inputHeightClasses[size])}>
          {truncate === 'end' ? (
            <input
              {...valueProps}
              readOnly
              disabled={isDisabled}
              value={value}
              className={cn(inputClasses, textClasses, 'text-ellipsis')}
            />
          ) : (
            // A read-only textbox made of two parts, so the start shrinks with an ellipsis and the end stays visible.
            // Its text is the full value, for screen readers and for selecting by hand.
            <div
              {...valueProps}
              role="textbox"
              aria-readonly="true"
              aria-disabled={isDisabled || undefined}
              tabIndex={isDisabled ? -1 : 0}
              className={cn(
                'flex h-full min-w-0 flex-1 items-center self-stretch rounded-control px-3 text-base whitespace-pre text-fg outline-none sm:text-sm',
                'focus-visible:focus-ring',
                textClasses,
              )}
            >
              <span className="min-w-0 truncate">{head}</span>
              <span className="shrink-0">{tail}</span>
            </div>
          )}
          {actions !== undefined && (
            <span className="flex shrink-0 items-center gap-0.5">{actions}</span>
          )}
          <CopyButton
            value={value}
            label={buttonLabel}
            hasStatusText
            isDisabled={isDisabled}
            onCopy={() => {
              setFailed(false);
              onCopy?.();
            }}
            onCopyError={(error) => {
              setFailed(true);
              onCopyError?.(error);
            }}
            className="me-1"
          />
        </div>
        {description !== undefined && (
          <span id={descriptionId} className="text-xs text-fg-muted">
            {description}
          </span>
        )}
        {(hasFailed || appError !== undefined) && (
          <span id={errorId} className="text-xs font-medium text-danger-fg">
            {hasFailed ? messages.copyFailedHelp : appError}
          </span>
        )}
      </FieldLayout>
    </div>
  );
}
