import type { Meta, StoryObj } from '@storybook/react-vite';
import { buildPdf, statementPages } from '../../../test/media';
import { PdfViewer } from './PdfViewer';

// PDFs built in the browser stand in for real documents. pdf.js renders asynchronously, so these stories are left
// out of the visual suite.
const statement = new Blob([buildPdf(statementPages) as BlobPart], { type: 'application/pdf' });
const scan = new Blob([buildPdf([[], [], []], { isScanned: true }) as BlobPart], {
  type: 'application/pdf',
});
const locked = new Blob([buildPdf(statementPages.slice(0, 2), { password: 'orbit' }) as BlobPart], {
  type: 'application/pdf',
});

const meta = {
  title: 'Media/PdfViewer',
  component: PdfViewer,
  tags: ['!visual'],
  parameters: { layout: 'padded' },
  args: { source: statement, title: 'Observatory Supply Co. statement' },
} satisfies Meta<typeof PdfViewer>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A five-page statement at fit width: page n of N, zoom, search (try "INV-01044"), download, print, and the
 * thumbnails sidebar (a drawer on narrow screens). Pages render only near the viewport.
 */
export const Statement: Story = {};

/** Opens at page 3, fitting the whole page. */
export const FitPage: Story = {
  args: { defaultPage: 3, defaultZoom: 'fit-page' },
};

/** Just the document: no thumbnails, search, download or print. */
export const Minimal: Story = {
  args: {
    hasThumbnails: false,
    hasSearch: false,
    hasDownload: false,
    hasPrint: false,
    height: '28rem',
  },
};

/** A scan without a text layer: an info tip says its text can't be selected, searched or read aloud. */
export const ScannedDocument: Story = {
  args: { source: scan, title: 'Scanned delivery note' },
};

/** A protected document asks for its password ("orbit"). */
export const PasswordProtected: Story = {
  args: { source: locked, title: 'Protected statement' },
};

/** A document that can't be loaded: an error with "Download instead". */
export const LoadError: Story = {
  args: { source: 'media/missing-statement.pdf', title: 'Missing statement' },
};

/** A real document from `.storybook/public/media/statement.pdf` (a 40-page statement), when it's there. */
export const RealDocument: Story = {
  args: { source: 'media/statement.pdf', title: 'Statement (40 pages)' },
};
