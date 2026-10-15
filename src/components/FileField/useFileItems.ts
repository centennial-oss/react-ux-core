import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useLocale } from 'react-aria-components';
import { useMessages } from '../../provider/context';
import { useControllableState } from '../../utils/useControllableState';
import {
  acceptsFile,
  formatFileSize,
  uploadErrorMessage,
  type FileItem,
  type UploadFunction,
} from './files';

export interface UseFileItemsOptions<R> {
  value?: FileItem<R>[];
  defaultValue?: FileItem<R>[];
  onChange?: (items: FileItem<R>[]) => void;
  accept?: readonly string[];
  maxSize?: number;
  maxFiles?: number;
  allowsMultiple: boolean;
  upload?: UploadFunction<R>;
}

export interface FileItemsState<R> {
  items: FileItem<R>[];
  /** CoreMessages for files that weren't added (wrong type, too large, too many), until the next change. */
  rejections: string[];
  /** Checks and adds chosen or dropped files, and starts their uploads. */
  addFiles: (files: readonly File[]) => void;
  /** Removes a file, cancelling its upload if one is running. */
  remove: (id: string) => void;
  /** Uploads a failed file again. */
  retry: (id: string) => void;
}

/**
 * The state behind FileField: the items (controlled or uncontrolled), validation of new files, and uploads through
 * the app's `upload` function with an AbortController each. Async upload callbacks always apply to the latest items,
 * and nothing is reported after unmount (in-flight uploads are aborted).
 */
export function useFileItems<R>({
  value,
  defaultValue,
  onChange,
  accept,
  maxSize,
  maxFiles,
  allowsMultiple,
  upload,
}: UseFileItemsOptions<R>): FileItemsState<R> {
  const messages = useMessages();
  const { locale } = useLocale();
  const [items, setItems] = useControllableState(value, defaultValue ?? [], onChange);
  const [rejections, setRejections] = useState<string[]>([]);
  const baseId = useId();
  const counter = useRef(0);
  const controllers = useRef(new Map<string, AbortController>());

  // Upload callbacks arrive later; they read the latest items, setter, upload function and messages from here.
  const latest = useRef({ items, setItems, upload, messages });
  useLayoutEffect(() => {
    latest.current = { items, setItems, upload, messages };
  });

  const update = useCallback((change: (current: FileItem<R>[]) => FileItem<R>[]) => {
    const next = change(latest.current.items);
    latest.current.items = next;
    latest.current.setItems(next);
  }, []);

  const patch = useCallback(
    (id: string, fields: Partial<FileItem<R>>) => {
      update((current) =>
        current.some((item) => item.id === id)
          ? current.map((item) => (item.id === id ? { ...item, ...fields } : item))
          : current,
      );
    },
    [update],
  );

  const abort = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
  }, []);

  /** Runs the app's upload for an item already marked `uploading`. */
  const startUpload = useCallback(
    (item: FileItem<R>) => {
      const run = latest.current.upload;
      const { file } = item;
      if (!run || !file) {
        return;
      }
      abort(item.id);
      const controller = new AbortController();
      controllers.current.set(item.id, controller);
      const isCurrent = () =>
        !controller.signal.aborted && controllers.current.get(item.id) === controller;
      run(file, {
        signal: controller.signal,
        onProgress: (progress) => {
          if (isCurrent()) {
            patch(item.id, { progress: Math.min(1, Math.max(0, progress)) });
          }
        },
      }).then(
        (result) => {
          if (isCurrent()) {
            controllers.current.delete(item.id);
            patch(item.id, { status: 'done', progress: 1, error: undefined, result });
          }
        },
        (error: unknown) => {
          if (isCurrent()) {
            controllers.current.delete(item.id);
            patch(item.id, {
              status: 'error',
              error: uploadErrorMessage(
                error,
                latest.current.messages.uploadFailed({ name: file.name }),
              ),
            });
          }
        },
      );
    },
    [abort, patch],
  );

  // Abort whatever is still uploading when the field goes away.
  useEffect(() => {
    const running = controllers.current;
    return () => {
      for (const controller of running.values()) {
        controller.abort();
      }
      running.clear();
    };
  }, []);

  const addFiles = useCallback(
    (files: readonly File[]) => {
      const nextRejections: string[] = [];
      const accepted: File[] = [];
      for (const file of files) {
        if (!acceptsFile(file, accept)) {
          nextRejections.push(messages.fileTypeNotAccepted({ name: file.name }));
        } else if (maxSize !== undefined && file.size > maxSize) {
          nextRejections.push(
            messages.fileTooLarge({ name: file.name, max: formatFileSize(maxSize, locale) }),
          );
        } else {
          accepted.push(file);
        }
      }

      // A single-file field replaces its file; a multiple one appends up to maxFiles.
      const current = latest.current.items;
      const kept = allowsMultiple ? current : [];
      const limit = allowsMultiple ? maxFiles : 1;
      const room = limit === undefined ? accepted.length : Math.max(0, limit - kept.length);
      if (accepted.length > room && limit !== undefined) {
        nextRejections.push(messages.tooManyFiles({ max: limit }));
      }
      const added = accepted.slice(0, room).map<FileItem<R>>((file) => {
        counter.current += 1;
        return {
          id: `${baseId}-${String(counter.current)}`,
          file,
          status: upload ? 'uploading' : 'pending',
          ...(upload && { progress: 0 }),
        };
      });

      setRejections(nextRejections);
      if (added.length === 0) {
        return;
      }
      if (!allowsMultiple) {
        for (const item of current) {
          abort(item.id);
        }
      }
      update(() => [...kept, ...added]);
      for (const item of added) {
        startUpload(item);
      }
    },
    [
      accept,
      maxSize,
      maxFiles,
      allowsMultiple,
      upload,
      messages,
      locale,
      baseId,
      abort,
      update,
      startUpload,
    ],
  );

  const remove = useCallback(
    (id: string) => {
      abort(id);
      setRejections([]);
      update((current) => current.filter((item) => item.id !== id));
    },
    [abort, update],
  );

  const retry = useCallback(
    (id: string) => {
      const item = latest.current.items.find((candidate) => candidate.id === id);
      if (!item) {
        return;
      }
      const restarted: FileItem<R> = {
        ...item,
        status: 'uploading',
        progress: 0,
        error: undefined,
      };
      patch(id, restarted);
      startUpload(restarted);
    },
    [patch, startUpload],
  );

  return { items, rejections, addFiles, remove, retry };
}
