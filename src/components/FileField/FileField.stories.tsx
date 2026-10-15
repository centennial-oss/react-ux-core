import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { FileField } from './FileField';
import type { FileItem, UploadFunction } from './files';

const meta = {
  title: 'Inputs/FileField',
  component: FileField,
  args: { label: 'Attachments', description: 'PDF or images, up to 5 MB each' },
} satisfies Meta<typeof FileField>;
export default meta;
type Story = StoryObj<typeof meta>;

function makeFile(name: string, size: number, type = 'application/pdf') {
  return new File([new Uint8Array(size)], name, { type });
}

/** A pretend upload: progress over about two seconds, failing for names that contain "fail". */
const fakeUpload: UploadFunction<string> = (file, { onProgress, signal }) =>
  new Promise((resolve, reject) => {
    let progress = 0;
    const tick = () => {
      if (signal.aborted) {
        reject(new DOMException('Cancelled', 'AbortError'));
        return;
      }
      progress += 0.1;
      onProgress(progress);
      if (progress < 1) {
        setTimeout(tick, 200);
      } else if (file.name.includes('fail')) {
        reject(new Error(`The server rejected ${file.name}`));
      } else {
        resolve(`stored/${file.name}`);
      }
    };
    setTimeout(tick, 200);
  });

/** Uploads as files are added; name a file with "fail" in it to see an error and Retry. */
export const Playground: Story = {
  tags: ['!visual'],
  args: {
    allowsMultiple: true,
    accept: ['application/pdf', 'image/*'],
    maxSize: 5 * 1024 * 1024,
    maxFiles: 4,
    upload: fakeUpload,
  },
};

/** Every row state: chosen, uploading, uploaded, and failed (with Retry because the field runs the upload). */
export const UploadStates: Story = {
  render: () => (
    <FileField
      label="Attachments"
      description="PDF or images, up to 5 MB each"
      allowsMultiple
      upload={fakeUpload}
      className="max-w-lg"
      defaultValue={[
        { id: '1', file: makeFile('site-survey.pdf', 482_000), status: 'pending' },
        {
          id: '2',
          file: makeFile('roof-photo.jpg', 2_400_000, 'image/jpeg'),
          status: 'uploading',
          progress: 0.4,
        },
        { id: '3', file: makeFile('contract-signed.pdf', 1_210_000), status: 'done' },
        {
          id: '4',
          file: makeFile('meter-readings.pdf', 96_000),
          status: 'error',
          error: 'The server rejected meter-readings.pdf',
        },
      ]}
    />
  ),
};

/** The app runs the uploads and reports progress by updating the items (controlled `value`). */
export const AppReportedProgress: Story = {
  tags: ['!visual'],
  render: function AppReported() {
    const [items, setItems] = useState<FileItem[]>([
      {
        id: 'a',
        file: makeFile('quarterly-report-with-a-very-long-name-final-v2.pdf', 3_100_000),
        status: 'uploading',
        progress: 0.7,
      },
      { id: 'b', file: makeFile('notes.pdf', 12_000), status: 'error', error: 'Virus scan failed' },
    ]);
    return (
      <FileField
        label="Reports"
        allowsMultiple
        value={items}
        onChange={setItems}
        className="max-w-lg"
      />
    );
  },
};

export const States: Story = {
  render: () => (
    <div className="flex max-w-lg flex-col gap-6">
      <FileField
        label="Signed contract"
        description="One PDF"
        accept={['application/pdf']}
        isRequired
      />
      <FileField
        label="Proof of address"
        isInvalid
        errorMessage="Attach a document dated in the last 3 months"
      />
      <FileField label="Archived files" isDisabled />
      <FileField
        label="Side label"
        labelPosition="side"
        dropLabel="Drop a CSV here"
        accept={['.csv']}
      />
    </div>
  ),
};
