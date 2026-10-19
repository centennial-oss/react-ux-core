import { FileField } from '../../components/FileField/FileField';
import type { FileItem } from '../../components/FileField/files';
import { useFormRuntime } from '../runtime';
import type { FieldRendererProps, FileFieldConfig, FilesFieldConfig } from '../types';
import { fileId, useUploadVersion, type UploadStore } from '../uploads';
import { blurWithin } from './shared';

type AnyFileConfig = FileFieldConfig<unknown> | FilesFieldConfig<unknown>;

/** The held value as a list: `File`s waiting for upload and references to files already uploaded. */
function entriesOf(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value as unknown[];
  }
  return value === null || value === undefined ? [] : [value];
}

function toItems(
  entries: readonly unknown[],
  config: AnyFileConfig,
  store: UploadStore,
): FileItem[] {
  return entries.map((entry, index): FileItem => {
    if (entry instanceof File) {
      const id = fileId(entry);
      return { id, file: entry, status: 'pending', ...store.get(id) };
    }
    const info = config.describeFile(entry);
    return {
      id: `uploaded-${String(index)}-${info.name}`,
      name: info.name,
      size: info.size,
      status: 'done',
      result: entry,
    };
  });
}

function FileRendererBase({
  field,
  config,
  isMultiple,
}: FieldRendererProps<AnyFileConfig> & { isMultiple: boolean }) {
  const { uploads, status } = useFormRuntime();
  const isSubmitting = status === 'submitting';
  // Re-render as uploads progress.
  useUploadVersion(uploads);
  const items = toItems(entriesOf(field.value), config, uploads);

  return (
    <div onBlur={blurWithin(field.onBlur)}>
      <FileField
        label={config.label}
        description={config.description}
        infoTip={config.infoTip}
        errorMessage={field.errorMessage}
        isInvalid={field.isInvalid}
        isRequired={field.isRequired}
        // Stays enabled while the form submits, so a running upload can be cancelled; only config disables it.
        isDisabled={field.isDisabled || (field.isReadOnly && !isSubmitting)}
        accept={config.accept}
        maxSize={config.maxSize}
        maxFiles={'maxFiles' in config ? config.maxFiles : undefined}
        allowsMultiple={isMultiple}
        value={items}
        onChange={(next) => {
          // Removing a file while it uploads cancels the upload.
          const kept = new Set(next.map((item) => item.id));
          for (const item of items) {
            if (!kept.has(item.id) && item.status === 'uploading') {
              uploads.cancel(item.id);
            }
          }
          const entries = next.map((item): unknown => item.file ?? item.result);
          field.onChange(isMultiple ? entries : (entries[0] ?? null));
        }}
      />
    </div>
  );
}

/** `file` fields: one `File` until it's uploaded on submit, then the upload's reference. */
export function FileRenderer(props: FieldRendererProps<FileFieldConfig<unknown>>) {
  return <FileRendererBase {...props} isMultiple={false} />;
}

/** `files` fields: `File`s until they're uploaded on submit, then the uploads' references. */
export function FilesRenderer(props: FieldRendererProps<FilesFieldConfig<unknown>>) {
  return <FileRendererBase {...props} isMultiple />;
}
