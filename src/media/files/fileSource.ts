// What FilePreview needs to know about a file, whether it's a local File (chosen, dropped or pasted, before upload) or
// a remote one: its name, type, size and kind, a URL for it (an object URL for local files, revoked on unmount), and
// its text for text previews, read up to a size limit.

import { useEffect, useState } from 'react';
import { fileKind, type FileKind } from '../../components/FileField/fileKind';
import { useObjectUrl } from '../../components/FileField/useObjectUrl';
import type { CodeLanguage } from '../../code/tokenize';
import type { MediaFilesStrings } from './messages';

/** A file stored somewhere else, such as an uploaded attachment. */
export interface RemoteFile {
  name: string;
  /** Where it's served (same origin or CORS-enabled, for PDF and text previews). */
  url: string;
  /** The MIME type, such as `image/png`. When empty, the name's extension decides the kind. */
  type: string;
  /** Size in bytes, if known. */
  size?: number;
}

/** A File (before upload) or a remote file. */
export type PreviewFile = File | RemoteFile;

/** Whether `file` is a local File (or Blob) rather than a remote file. */
export function isLocalFile(file: PreviewFile): file is File {
  return typeof Blob !== 'undefined' && file instanceof Blob;
}

/** The file's kind (from its MIME type and name). */
export function previewFileKind(file: PreviewFile): FileKind {
  return fileKind({ name: file.name, type: file.type });
}

/** A URL for the file: an object URL for a local File (revoked when it changes or on unmount), or its `url`. */
export function useFileUrl(file: PreviewFile): string | undefined {
  const local = isLocalFile(file) ? file : undefined;
  const objectUrl = useObjectUrl(local);
  return isLocalFile(file) ? objectUrl : file.url;
}

const kindKeys = {
  image: 'fileKindImage',
  pdf: 'fileKindPdf',
  audio: 'fileKindAudio',
  video: 'fileKindVideo',
  text: 'fileKindText',
  data: 'fileKindData',
  spreadsheet: 'fileKindSpreadsheet',
  document: 'fileKindDocument',
  archive: 'fileKindArchive',
  other: 'fileKindOther',
} as const satisfies Record<FileKind, keyof MediaFilesStrings>;

/** The kind of file in words ("Image", "PDF", "Archive"). */
export function fileKindLabel(kind: FileKind, messages: MediaFilesStrings): string {
  return messages[kindKeys[kind]];
}

/** The CodeBlock language for a text file's preview: JSON and YAML get colours, everything else is plain text. */
export function codeLanguageFor(file: { name: string; type: string }): CodeLanguage {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (type.includes('json') || name.endsWith('.json')) {
    return 'json';
  }
  if (type.includes('yaml') || name.endsWith('.yaml') || name.endsWith('.yml')) {
    return 'yaml';
  }
  return 'text';
}

/** A text preview's state: loading, the text (cut at the limit), or a failure. */
export type FileTextState =
  | { status: 'loading' }
  | { status: 'ready'; text: string; isTruncated: boolean }
  | { status: 'error' };

/** What identifies a file's content: the File itself, or a remote file's URL (so inline objects don't reload). */
export function fileSourceKey(file: PreviewFile): Blob | string {
  return isLocalFile(file) ? file : file.url;
}

/**
 * Reads up to `maxBytes` of the file's text (a local File directly, a remote one with `fetch`), aborting when the file
 * changes or the component unmounts. Longer files are cut at the limit (`isTruncated`).
 */
export function useFileText(
  file: PreviewFile,
  maxBytes: number,
  isEnabled: boolean,
): FileTextState {
  const source = fileSourceKey(file);
  const [state, setState] = useState<{ source: Blob | string | null; result: FileTextState }>({
    source: null,
    result: { status: 'loading' },
  });
  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    const controller = new AbortController();
    void (async () => {
      try {
        const blob =
          typeof source === 'string'
            ? await fetch(source, { signal: controller.signal }).then((response) => {
                if (!response.ok) {
                  throw new Error(String(response.status));
                }
                return response.blob();
              })
            : source;
        const text = await blob.slice(0, maxBytes).text();
        if (!controller.signal.aborted) {
          setState({
            source,
            result: { status: 'ready', text, isTruncated: blob.size > maxBytes },
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          setState({ source, result: { status: 'error' } });
        }
      }
    })();
    return () => {
      controller.abort();
    };
  }, [source, maxBytes, isEnabled]);
  // A result for an earlier file is never shown for a new one.
  return state.source === source ? state.result : { status: 'loading' };
}
