// FilePreviewList: a wrapping strip of file previews, such as a message's attachments or the files waiting in a
// composer, each optionally with a remove button.

import { X } from 'lucide-react';
import type { Ref } from 'react';
import { IconButton } from '../../components/IconButton/IconButton';
import { cn } from '../../utils/cn';
import type { PreviewFile } from './fileSource';
import { FilePreview } from './FilePreview';
import { useMediaFilesMessages } from './messages';

export interface FilePreviewListProps {
  files: readonly PreviewFile[];
  /** `thumbnail` cards or compact `dialog` chips; both open the viewer on press. Defaults to `thumbnail`. */
  presentation?: 'thumbnail' | 'dialog';
  /** The thumbnail cards' size. Defaults to `sm`. */
  size?: 'sm' | 'md';
  /** Shows a remove button on each file ("Remove {name}"), called with its index. */
  onRemove?: (index: number) => void;
  /** Called with a file's index when its preview is pressed, instead of opening the viewer dialog. */
  onPreview?: (index: number) => void;
  /** pdf.js's worker URL, as for PdfViewer. */
  workerSrc?: string;
  /** Names the list. Defaults to the `fileAttachments` message. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  ref?: Ref<HTMLUListElement>;
}

/** Files as a wrapping list of previews (cards or chips), each opening its viewer, with optional remove buttons. */
export function FilePreviewList({
  files,
  presentation = 'thumbnail',
  size = 'sm',
  onRemove,
  onPreview,
  workerSrc,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
  ref,
}: FilePreviewListProps) {
  const messages = useMediaFilesMessages();
  return (
    <ul
      ref={ref}
      aria-label={ariaLabelledBy ? undefined : (ariaLabel ?? messages.fileAttachments)}
      aria-labelledby={ariaLabelledBy}
      className={cn('flex min-w-0 flex-wrap items-start gap-2', className)}
    >
      {files.map((file, index) => (
        <li key={`${file.name}-${String(index)}`} className="relative flex max-w-full min-w-0">
          <FilePreview
            file={file}
            presentation={presentation}
            size={size}
            workerSrc={workerSrc}
            onPress={
              onPreview
                ? () => {
                    onPreview(index);
                  }
                : undefined
            }
            className={cn('max-w-full', onRemove && presentation === 'dialog' && 'pe-8')}
          />
          {onRemove && (
            <IconButton
              icon={X}
              size="sm"
              variant="outline"
              aria-label={messages.fileRemove({ name: file.name })}
              onPress={() => {
                onRemove(index);
              }}
              className={cn(
                'absolute end-1 z-20 size-6 bg-surface-1 shadow-raised',
                presentation === 'dialog' ? 'top-1/2 -translate-y-1/2' : 'top-1',
              )}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
