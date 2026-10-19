// Type tests: compiled by `make typecheck`, not run.
import { FileField } from './FileField';
import type { FileItem } from './files';

interface StoredFile {
  key: string;
}

export const inferredResult = (
  <FileField
    label="Attachments"
    upload={() => Promise.resolve<StoredFile>({ key: 'abc' })}
    onChange={(items) => {
      // The item's result type follows what `upload` resolves with.
      const keys: (string | undefined)[] = items.map((item) => item.result?.key);
      return keys;
    }}
  />
);

export const wrongResult = (
  <FileField<StoredFile>
    label="Attachments"
    upload={() => Promise.resolve({ key: 'abc' })}
    // @ts-expect-error results are StoredFile, not numbers
    onChange={(items: FileItem<number>[]) => items}
  />
);

export const noUpload = (
  <FileField
    label="Attachments"
    defaultValue={[]}
    onChange={(items) => items.map((item) => item.status)}
  />
);

export const badStatus: FileItem = {
  id: 'a',
  file: new File([], 'a.txt'),
  // @ts-expect-error not a status
  status: 'queued',
};
