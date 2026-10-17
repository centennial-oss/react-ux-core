// CopyButton: an IconButton that copies a value. It flips to a check and "Copied" for 2 s (in its tooltip, and
// beside it with `hasStatusText`), announces the result politely, and shows a failure instead of hiding it.
import { Check, CircleAlert, Copy } from 'lucide-react';
import { useEntryMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import { IconButton, type IconButtonActionProps } from '../IconButton/IconButton';
import { Tooltip } from '../Tooltip/Tooltip';
import { defaultCopyFieldMessages } from './messages';
import { useCopyToClipboard } from './useCopyToClipboard';

export interface CopyButtonProps extends Omit<
  IconButtonActionProps,
  'icon' | 'aria-label' | 'onPress' | 'onRepeat' | 'repeatDelay' | 'repeatInterval' | 'isPending'
> {
  /** The text to copy. */
  value: string;
  /** What's copied, naming the button "Copy {label}". Without it (or `aria-label`), the button is named "Copy". */
  label?: string;
  /** Overrides the button's name. */
  'aria-label'?: string;
  onCopy?: () => void;
  /** Called when the clipboard refuses the copy (the button also shows and announces the failure). */
  onCopyError?: (error: unknown) => void;
  /** Shows "Copied" beside the button after a copy, as well as announcing it. */
  hasStatusText?: boolean;
  /** Classes for the wrapper around the button and its status text. */
  className?: string;
}

/** An icon button that copies `value` to the clipboard and confirms it. */
export function CopyButton({
  value,
  label,
  'aria-label': ariaLabel,
  onCopy,
  onCopyError,
  hasStatusText = false,
  tone = 'neutral',
  size = 'sm',
  className,
  ...rest
}: CopyButtonProps) {
  const messages = useEntryMessages(defaultCopyFieldMessages);
  const { status, copy } = useCopyToClipboard({ onCopy, onCopyError });
  const name = ariaLabel ?? (label === undefined ? messages.copy : messages.copyNamed({ label }));
  const statusText =
    status === 'copied' ? messages.copied : status === 'failed' ? messages.copyFailedHelp : '';

  return (
    <span className={cn('relative inline-flex shrink-0 items-center gap-1', className)}>
      {hasStatusText && status === 'copied' && (
        <span aria-hidden="true" className="text-xs font-medium text-success-fg">
          {messages.copied}
        </span>
      )}
      <Tooltip content={status === 'copied' ? messages.copied : name}>
        <IconButton
          {...rest}
          icon={status === 'copied' ? Check : status === 'failed' ? CircleAlert : Copy}
          tone={status === 'copied' ? 'success' : status === 'failed' ? 'danger' : tone}
          size={size}
          aria-label={name}
          data-status={status}
          onPress={() => void copy(value)}
        />
      </Tooltip>
      <span className="sr-only" aria-live="polite">
        {statusText}
      </span>
    </span>
  );
}
