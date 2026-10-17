import { CircleAlert, CircleCheck, File as FileIcon, RotateCcw, X } from 'lucide-react';
import { useId } from 'react';
import { Button as AriaButton, useLocale } from 'react-aria-components';
import { useMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { ProgressBar } from '../ProgressBar/ProgressBar';
import { fileItemName, fileItemSize, formatFileSize, type FileItem } from './files';
import { FileThumbnail } from './FileThumbnail';

const rowButtonClasses = [
  'hit-area inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-control text-fg-muted',
  'data-hovered:bg-surface-3 data-hovered:text-fg data-pressed:bg-surface-4 data-focus-visible:focus-ring',
  'data-disabled:cursor-not-allowed data-disabled:opacity-50',
].join(' ');

/** An icon button in a file row, named by its action followed by the file's name (`aria-labelledby`). */
function RowButton({
  icon: Icon,
  label,
  nameId,
  isDisabled,
  onPress,
}: {
  icon: IconComponent;
  label: string;
  nameId: string;
  isDisabled: boolean;
  onPress: () => void;
}) {
  const id = useId();
  return (
    <AriaButton
      id={id}
      aria-label={label}
      aria-labelledby={`${id} ${nameId}`}
      isDisabled={isDisabled}
      onPress={onPress}
      className={rowButtonClasses}
    >
      <Icon aria-hidden="true" className="size-4" />
    </AriaButton>
  );
}

interface FileRowProps<R> {
  item: FileItem<R>;
  /** Whether the field runs uploads itself (so failed ones can be retried and running ones cancelled). */
  canUpload: boolean;
  isDisabled: boolean;
  /** Shows a thumbnail (the image, or the typed icon) at the start of each row. */
  hasPreviews?: boolean;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

function FileRow<R>({
  item,
  canUpload,
  isDisabled,
  hasPreviews = false,
  onRemove,
  onRetry,
}: FileRowProps<R>) {
  const messages = useMessages();
  const { locale } = useLocale();
  const nameId = useId();
  const { status } = item;
  const name = fileItemName(item);
  const size = fileItemSize(item);

  const statusIcon =
    status === 'done' ? (
      <>
        <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-success-fg" />
        <span className="sr-only">{messages.uploaded}</span>
      </>
    ) : status === 'error' ? (
      <CircleAlert aria-hidden="true" className="size-4 shrink-0 text-danger-fg" />
    ) : hasPreviews ? null : (
      <FileIcon aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
    );

  return (
    <li
      data-status={status}
      className={cn(
        'flex flex-col gap-1.5 rounded-control border bg-surface-2 py-1.5 ps-3 pe-1.5',
        status === 'error' ? 'border-danger-border' : 'border-border',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {hasPreviews && (
          <FileThumbnail
            file={item.file}
            name={name}
            type={item.type}
            src={item.previewSrc}
            className="-ms-1.5"
          />
        )}
        {statusIcon}
        <span id={nameId} className="min-w-0 flex-1 truncate font-medium text-fg">
          {name}
        </span>
        {size !== undefined && (
          <span className="shrink-0 text-xs text-fg-muted tabular-nums">
            {formatFileSize(size, locale)}
          </span>
        )}
        {status === 'error' && canUpload && item.file !== undefined && (
          <RowButton
            icon={RotateCcw}
            label={messages.retry}
            nameId={nameId}
            isDisabled={isDisabled}
            onPress={() => {
              onRetry(item.id);
            }}
          />
        )}
        {/* While uploading, removing cancels the upload (whoever runs it). */}
        {status === 'uploading' ? (
          <RowButton
            icon={X}
            label={messages.cancelUpload}
            nameId={nameId}
            isDisabled={isDisabled}
            onPress={() => {
              onRemove(item.id);
            }}
          />
        ) : (
          <RowButton
            icon={X}
            label={messages.remove}
            nameId={nameId}
            isDisabled={isDisabled}
            onPress={() => {
              onRemove(item.id);
            }}
          />
        )}
      </div>
      {status === 'uploading' && (
        <ProgressBar
          aria-label={messages.uploading({ name })}
          value={item.progress === undefined ? undefined : item.progress * 100}
          isIndeterminate={item.progress === undefined}
          isValueHidden
          size="sm"
          className="pe-1.5"
        />
      )}
      {status === 'error' && (
        <p role="alert" className="pe-1.5 text-xs font-medium text-danger-fg">
          {item.error ?? messages.uploadFailed({ name })}
        </p>
      )}
    </li>
  );
}

export interface FileListProps<R> extends Omit<FileRowProps<R>, 'item'> {
  items: readonly FileItem<R>[];
  className?: string;
}

/** The chosen files: name and size, upload progress, errors, and remove, cancel and retry buttons. */
export function FileList<R>({ items, className, ...rowProps }: FileListProps<R>) {
  return (
    <ul className={cn('flex flex-col gap-1.5 text-sm', className)}>
      {items.map((item) => (
        <FileRow key={item.id} item={item} {...rowProps} />
      ))}
    </ul>
  );
}
