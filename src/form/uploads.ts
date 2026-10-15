// Uploads that run when a form is submitted: per-file progress (shown by file fields) and cancellation.

import type { AnyFormApi } from '@tanstack/react-form';
import { useSyncExternalStore } from 'react';
import type { FileItemStatus } from '../components/FileField/files';

import { isFieldVisible, isInputField } from './fieldIndex';
import type { AnyFieldConfig, AnyInputFieldConfig } from './internalTypes';
import { getAt, normalizePath } from './paths';
import { type FormStrings } from './messages';

/** The upload state of one chosen file while the form submits. */
export interface UploadState {
  status: FileItemStatus;
  progress?: number;
  error?: string;
}

const fileIds = new WeakMap<File, string>();
let nextFileId = 0;

/** A stable id for a chosen file, used as its list key and to track its upload. */
export function fileId(file: File): string {
  let id = fileIds.get(file);
  if (id === undefined) {
    nextFileId += 1;
    id = `file-${String(nextFileId)}`;
    fileIds.set(file, id);
  }
  return id;
}

/** Upload states by file id, with cancellation. */
export interface UploadStore {
  get: (id: string) => UploadState | undefined;
  set: (id: string, state: UploadState | undefined) => void;
  subscribe: (listener: () => void) => () => void;
  /** Starts tracking an upload; returns its abort signal. */
  begin: (id: string) => AbortSignal;
  /** Cancels a running upload. */
  cancel: (id: string) => void;
  version: () => number;
}

export function createUploadStore(): UploadStore {
  const states = new Map<string, UploadState>();
  const controllers = new Map<string, AbortController>();
  const listeners = new Set<() => void>();
  let version = 0;
  const emit = () => {
    version += 1;
    for (const listener of listeners) {
      listener();
    }
  };
  return {
    get: (id) => states.get(id),
    set: (id, state) => {
      if (state === undefined) {
        states.delete(id);
      } else {
        states.set(id, state);
      }
      emit();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    begin: (id) => {
      controllers.get(id)?.abort();
      const controller = new AbortController();
      controllers.set(id, controller);
      return controller.signal;
    },
    cancel: (id) => {
      controllers.get(id)?.abort();
      controllers.delete(id);
    },
    version: () => version,
  };
}

/** Re-renders when any upload state changes. */
export function useUploadVersion(store: UploadStore): number {
  return useSyncExternalStore(store.subscribe, store.version, store.version);
}

/** A field whose upload failed, with the message to show on it. */
export interface UploadFailure {
  path: string;
  message: string;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message !== '' ? error.message : fallback;
}

interface FileFieldRef {
  field: AnyInputFieldConfig;
  path: string;
}

function collectFileFields(
  fields: readonly AnyFieldConfig[],
  values: unknown,
  scope: unknown,
  prefix: string,
  result: FileFieldRef[],
) {
  for (const field of fields) {
    if (!isInputField(field) || !isFieldVisible(field, scope)) {
      continue;
    }
    const name = normalizePath(field.name);
    const path = prefix === '' ? name : `${prefix}.${name}`;
    if (field.type === 'file' || field.type === 'files') {
      result.push({ field, path });
    } else if (field.type === 'array') {
      const items = getAt(values, path);
      if (Array.isArray(items)) {
        items.forEach((item: unknown, index) => {
          collectFileFields(field.fields ?? [], values, item, `${path}[${String(index)}]`, result);
        });
      }
    }
  }
}

interface FileUploadOptions {
  upload?: (
    file: File,
    options: { onProgress: (progress: number) => void; signal: AbortSignal },
  ) => Promise<unknown>;
}

/**
 * Uploads every chosen file in visible file fields, replacing each `File` in the form value with the upload's
 * reference as it finishes (so a retry doesn't upload it again). Returns the fields whose upload failed.
 */
export async function runUploads(
  form: AnyFormApi,
  fields: readonly AnyFieldConfig[],
  store: UploadStore,
  messages: FormStrings,
): Promise<UploadFailure[]> {
  const fileFields: FileFieldRef[] = [];
  const values: unknown = form.state.values;
  collectFileFields(fields, values, values, '', fileFields);

  const results = await Promise.all(
    fileFields.map(async ({ field, path }): Promise<UploadFailure | undefined> => {
      const { upload } = field as AnyInputFieldConfig & FileUploadOptions;
      const current: unknown = getAt(form.state.values, path);
      const entries: unknown[] = Array.isArray(current)
        ? current
        : current == null
          ? []
          : [current];
      const files = entries.filter((entry): entry is File => entry instanceof File);
      if (!upload || files.length === 0) {
        return undefined;
      }
      let failure: UploadFailure | undefined;
      await Promise.all(
        files.map(async (file) => {
          const id = fileId(file);
          const signal = store.begin(id);
          store.set(id, { status: 'uploading', progress: 0 });
          try {
            const reference = await upload(file, {
              signal,
              onProgress: (progress) => {
                if (!signal.aborted) {
                  store.set(id, {
                    status: 'uploading',
                    progress: Math.min(1, Math.max(0, progress)),
                  });
                }
              },
            });
            if (signal.aborted) {
              throw new DOMException('Upload cancelled', 'AbortError');
            }
            store.set(id, undefined);
            const latest: unknown = getAt(form.state.values, path);
            form.setFieldValue(
              path,
              Array.isArray(latest)
                ? latest.map((entry: unknown) => (entry === file ? reference : entry))
                : latest === file
                  ? reference
                  : latest,
              { dontValidate: true, dontUpdateMeta: true },
            );
          } catch (error) {
            const message = isAbort(error)
              ? messages.uploadCancelled
              : messageOf(error, messages.uploadFailed({ name: file.name }));
            store.set(id, { status: 'error', error: message });
            failure ??= { path, message };
          }
        }),
      );
      return failure;
    }),
  );
  return results.filter((result): result is UploadFailure => result !== undefined);
}
