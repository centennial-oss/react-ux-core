import { Upload } from 'lucide-react';
import { useState, type ReactNode, type Ref } from 'react';
import {
  DropZone as AriaDropZone,
  isFileDropItem,
  Text,
  type DropZoneProps as AriaDropZoneProps,
} from 'react-aria-components';
import { useMessages } from '../../provider/context';
import { cn } from '../../utils/cn';
import type { IconComponent } from '../../utils/icon';
import { FileThumbnail } from './FileThumbnail';

export interface DropZoneProps extends Omit<
  AriaDropZoneProps,
  'className' | 'style' | 'children' | 'render' | 'onDrop' | 'getDropOperation' | 'isDisabled'
> {
  /** Called with the files dropped on the zone, or pasted while it has focus. Other dropped content is ignored. */
  onDrop?: (files: File[]) => void;
  /** The zone's text, which also names it for screen readers. Defaults to "Drop files here" (`messages.dropFiles`). */
  label?: ReactNode;
  /** Defaults to an upload icon. */
  icon?: IconComponent;
  /** More content inside the zone, such as a button that opens the file chooser. */
  children?: ReactNode;
  /**
   * Shows thumbnails of the files most recently dropped or pasted (or of `files`): the image itself for images, an
   * icon for other kinds, each with its name. For full previews, use `/media`'s `FilePreview`.
   */
  hasPreviews?: boolean;
  /** With `hasPreviews`, the files to show instead of the last ones dropped, such as the app's chosen files. */
  files?: readonly File[];
  isDisabled?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A target for dragging and dropping files, built on React Aria's DropZone: it highlights while files are dragged
 * over it, and keyboard and screen reader users can focus it and paste files. It does no checking or uploading;
 * `FileField` adds a file chooser, validation, a file list and uploads.
 */
export function DropZone({
  onDrop,
  label,
  icon: Icon = Upload,
  children,
  hasPreviews = false,
  files,
  isDisabled = false,
  className,
  ...rest
}: DropZoneProps) {
  const messages = useMessages();
  const [dropped, setDropped] = useState<readonly File[]>([]);
  const previews = hasPreviews ? (files ?? dropped) : [];

  return (
    <AriaDropZone
      {...rest}
      isDisabled={isDisabled}
      getDropOperation={() => (isDisabled ? 'cancel' : 'copy')}
      onDrop={(event) => {
        const fileItems = event.items.filter(isFileDropItem);
        if (fileItems.length === 0 || (!onDrop && !hasPreviews)) {
          return;
        }
        void Promise.all(fileItems.map((item) => item.getFile())).then((droppedFiles) => {
          if (hasPreviews) {
            setDropped(droppedFiles);
          }
          onDrop?.(droppedFiles);
        });
      }}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-border-strong bg-surface-1 p-4 text-center text-sm text-fg-muted',
        'transition-[background-color,border-color] duration-(--duration-fast) ease-standard',
        'data-drop-target:border-accent-solid data-drop-target:bg-accent-bg data-drop-target:text-accent-fg',
        'data-focus-visible:focus-ring data-disabled:opacity-50',
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-6" />
      <Text slot="label">{label ?? messages.dropFiles}</Text>
      {children}
      {previews.length > 0 && (
        <ul className="flex max-w-full flex-wrap justify-center gap-2 pt-1">
          {previews.map((file, index) => (
            <li
              key={`${file.name}-${String(index)}`}
              className="flex w-20 flex-col items-center gap-1 text-xs text-fg"
            >
              <FileThumbnail file={file} size="md" />
              <span className="w-full truncate">{file.name}</span>
            </li>
          ))}
        </ul>
      )}
    </AriaDropZone>
  );
}
