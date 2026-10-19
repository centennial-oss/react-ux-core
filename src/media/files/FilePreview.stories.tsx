import type { Meta, StoryObj } from '@storybook/react-vite';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useState } from 'react';
import {
  csvFile,
  jsonFile,
  mp3File,
  pdfFile,
  pngFile,
  textFile,
  zipFile,
} from '../../../test/mediaFiles';
import { starfieldImage } from '../../../test/mediaImages';
import { FilePreview } from './FilePreview';
import { FilePreviewList } from './FilePreviewList';
import type { PreviewFile } from './fileSource';

// Files made in the browser stand in for uploads. `workerSrc` points pdf.js at its worker as Vite serves it. PDF pages render asynchronously and audio isn't deterministic, so
// stories with them are left out of the visual suite.
const png = pngFile('saturn.png', 7);
const pdf = pdfFile('supply-statement.pdf');
const mp3 = mp3File('dome-chime.mp3');
const zip = zipFile('raw-frames.zip');
const json = jsonFile('mars.json');
const csv = csvFile('lab-readings.csv', 12);
/** A remote image (a data URL here, so it renders without a request). */
const remoteImage: PreviewFile = {
  name: 'andromeda.png',
  url: starfieldImage({ width: 480, height: 300, seed: 21 }),
  type: 'image/png',
  size: 412_000,
};
const remoteZip: PreviewFile = {
  name: 'archive-2026.zip',
  url: 'media/archive-2026.zip',
  type: 'application/zip',
  size: 48_200_000,
};

const meta = {
  title: 'Media/FilePreview',
  component: FilePreview,
  parameters: { layout: 'padded' },
  args: { file: remoteImage },
} satisfies Meta<typeof FilePreview>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A thumbnail card: press it to open the image viewer in a dialog named by the file. */
export const Thumbnail: Story = {};

/**
 * A PNG, a PDF, an MP3 and a ZIP: an image thumbnail, the PDF's first page, a play button (audio plays in the card)
 * and the archive's icon. JSON and CSV show their icon and open as text.
 */
export const Thumbnails: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="flex flex-wrap items-start gap-3">
      {[png, pdf, mp3, zip, json, csv].map((file) => (
        <FilePreview key={file.name} file={file} workerSrc={workerSrc} />
      ))}
    </div>
  ),
};

/** Thumbnails that render without waiting on anything: a remote image, an archive and a JSON file, in both sizes. */
export const ThumbnailSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-3">
        <FilePreview file={remoteImage} />
        <FilePreview file={remoteZip} />
        <FilePreview
          file={{
            name: 'notes.json',
            url: 'media/notes.json',
            type: 'application/json',
            size: 1_200,
          }}
        />
      </div>
      <div className="flex flex-wrap items-start gap-3">
        <FilePreview file={remoteImage} size="sm" />
        <FilePreview file={remoteZip} size="sm" />
      </div>
    </div>
  ),
};

/** `dialog`: compact chips with the file's icon, name and size, each opening its viewer. */
export const DialogChips: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <FilePreview file={remoteImage} presentation="dialog" />
      <FilePreview file={remoteZip} presentation="dialog" />
      <FilePreview file={json} presentation="dialog" />
    </div>
  ),
};

/** `inline` JSON and CSV in a CodeBlock (JSON with colours). */
export const InlineText: Story = {
  render: () => (
    <div className="flex max-w-2xl flex-col gap-4">
      <FilePreview file={json} presentation="inline" />
      <FilePreview file={csv} presentation="inline" height="12rem" />
    </div>
  ),
};

/** Text past `maxTextSize` is cut, with a note saying how much is shown. */
export const TruncatedText: Story = {
  render: () => (
    <div className="max-w-2xl">
      <FilePreview file={csvFile('night-log.csv', 400)} presentation="inline" maxTextSize={512} />
    </div>
  ),
};

/** An inline image in the zoomable ImageViewer. */
export const InlineImage: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="max-w-2xl">
      <FilePreview file={png} presentation="inline" height="20rem" />
    </div>
  ),
};

/** An inline PDF in PdfViewer. */
export const InlinePdf: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="max-w-3xl">
      <FilePreview file={pdf} presentation="inline" height="28rem" workerSrc={workerSrc} />
    </div>
  ),
};

/** Inline audio in a compact AudioPlayer. */
export const InlineAudio: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="max-w-md">
      <FilePreview file={mp3} presentation="inline" />
    </div>
  ),
};

/** A file without a viewer: its icon, name, kind, size and a download button. */
export const NoPreview: Story = {
  render: () => (
    <div className="max-w-sm">
      <FilePreview file={remoteZip} presentation="inline" />
    </div>
  ),
};

/** An attachment strip, such as a message's files, with remove buttons for a draft. */
export const AttachmentList: Story = {
  tags: ['!visual'],
  render: function AttachmentListStory() {
    const [files, setFiles] = useState<PreviewFile[]>([png, pdf, mp3, zip, textFile()]);
    return (
      <FilePreviewList
        files={files}
        workerSrc={workerSrc}
        onRemove={(index) => {
          setFiles((current) => current.filter((_, at) => at !== index));
        }}
      />
    );
  },
};

/** The same strip as compact chips. */
export const AttachmentChips: Story = {
  render: () => (
    <FilePreviewList
      files={[remoteImage, remoteZip, json]}
      presentation="dialog"
      onRemove={() => undefined}
      className="max-w-lg"
    />
  ),
};
