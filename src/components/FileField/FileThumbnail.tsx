// A small, decorative picture of a file for FileField's and DropZone's previews: the image itself for images (from an
// object URL that's revoked on unmount, or the item's `previewSrc`), otherwise the typed icon for its kind. Full
// previews (PDF pages, players, text) are `/media`'s FilePreview; the main entry stays light and never imports it.

import { useState } from 'react';
import { cn } from '../../utils/cn';
import { fileKind } from './fileKind';
import { FileKindIcon } from './FileKindIcon';
import { useObjectUrl } from './useObjectUrl';

const sizeClasses = {
  sm: { box: 'size-10', icon: 'size-5' },
  md: { box: 'size-16', icon: 'size-7' },
} as const;

export interface FileThumbnailProps {
  /** The chosen file. */
  file?: File;
  /** The file's name, when there's no `file` (or to use instead of its name). */
  name?: string;
  /** The MIME type, when there's no `file`. */
  type?: string;
  /** An image URL to show instead of making one from `file`, such as a stored file's thumbnail. */
  src?: string;
  /** Defaults to `sm`. */
  size?: 'sm' | 'md';
  className?: string;
}

/** A file's picture: the image for images, the typed icon otherwise. Hidden from screen readers (the name is shown beside it). */
export function FileThumbnail({
  file,
  name,
  type,
  src,
  size = 'sm',
  className,
}: FileThumbnailProps) {
  const kind = fileKind({ name: name ?? file?.name ?? '', type: type ?? file?.type });
  const isImage = kind === 'image';
  const objectUrl = useObjectUrl(isImage && src === undefined ? file : undefined);
  const url = isImage ? (src ?? objectUrl) : undefined;
  const [failedUrl, setFailedUrl] = useState<string>();
  const sizes = sizeClasses[size];

  return (
    <span
      aria-hidden="true"
      data-kind={kind}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-surface-3 text-fg-muted',
        sizes.box,
        className,
      )}
    >
      {url !== undefined && url !== failedUrl ? (
        <img
          src={url}
          alt=""
          draggable={false}
          onError={() => {
            setFailedUrl(url);
          }}
          className="size-full object-cover"
        />
      ) : (
        <FileKindIcon kind={kind} className={sizes.icon} />
      )}
    </span>
  );
}
