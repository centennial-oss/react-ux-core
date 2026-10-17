// The file item model, upload function type, and the checks and formatting FileField applies to chosen files.

/** Where a file is in its life: chosen, uploading, uploaded, or failed. */
export type FileItemStatus = 'pending' | 'uploading' | 'done' | 'error';

/**
 * A chosen file and its upload state. `FileField` creates items when files are chosen; with an `upload` function it
 * updates them itself, otherwise the app reports progress and errors by updating the items it holds (controlled
 * `value`).
 */
export interface FileItem<R = unknown> {
  /** Unique within the field; `FileField` makes one for each file it adds. */
  id: string;
  /** The chosen file. Items for files uploaded earlier (for example when editing a record) give `name` instead. */
  file?: File;
  /** Shown instead of the file's own name; required when there's no `file`. */
  name?: string;
  /** Size in bytes, shown instead of the file's own size. Without either, no size is shown. */
  size?: number;
  /** The MIME type of a file without `file` (one uploaded earlier), for its preview icon with `hasPreviews`. */
  type?: string;
  /** With `hasPreviews`: an image URL to show for an item without `file`, such as a stored image's thumbnail. */
  previewSrc?: string;
  status: FileItemStatus;
  /** Upload progress from 0 to 1 while `uploading`. Unset means unknown (an indeterminate bar). */
  progress?: number;
  /** Why the upload failed, shown under the file while `error`. */
  error?: string;
  /** What the upload resolved with (for example a server id), once `done`. */
  result?: R;
}

export interface UploadOptions {
  /** Report progress from 0 to 1. */
  onProgress: (progress: number) => void;
  /** Aborted when the user cancels the upload or removes the field. */
  signal: AbortSignal;
}

/**
 * Uploads one file. The library never uploads anything itself: the app supplies this, resolves with whatever it
 * wants to keep (`result`), and rejects to show an error (the `Error`'s message, or a generic one).
 */
export type UploadFunction<R = unknown> = (file: File, options: UploadOptions) => Promise<R>;

/**
 * Whether `file` matches one of the `accept` entries: a MIME type (`application/pdf`), a wildcard (`image/*`) or a
 * file extension (`.csv`), as in an input's `accept` attribute. An empty list accepts everything.
 */
export function acceptsFile(file: File, accept: readonly string[] | undefined): boolean {
  if (!accept || accept.length === 0) {
    return true;
  }
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept.some((entry) => {
    const pattern = entry.trim().toLowerCase();
    if (pattern.startsWith('.')) {
      return name.endsWith(pattern);
    }
    if (pattern.endsWith('/*')) {
      return type.startsWith(pattern.slice(0, -1));
    }
    return type === pattern;
  });
}

const SIZE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'] as const;

/**
 * A file size for people, in 1024 steps with the locale's unit names from Intl: "5 MB" for 5 × 1024 × 1024 bytes,
 * "1.5 kB" for 1536.
 */
export function formatFileSize(bytes: number, locale: string): string {
  let value = Math.max(0, bytes);
  let index = 0;
  while (value >= 1024 && index < SIZE_UNITS.length - 1) {
    value /= 1024;
    index += 1;
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: SIZE_UNITS[index],
    unitDisplay: 'short',
    maximumFractionDigits: index === 0 || value >= 10 ? 0 : 1,
  }).format(value);
}

/** The message to show for a failed upload: the thrown `Error`'s message, or `fallback`. */
export function uploadErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() !== '' ? error.message : fallback;
}

/** The name to show for an item: its `name`, or its file's name. */
export function fileItemName(item: Pick<FileItem, 'file' | 'name'>): string {
  return item.name ?? item.file?.name ?? '';
}

/** The size to show for an item in bytes, or `undefined` when it isn't known. */
export function fileItemSize(item: Pick<FileItem, 'file' | 'size'>): number | undefined {
  return item.size ?? item.file?.size;
}
