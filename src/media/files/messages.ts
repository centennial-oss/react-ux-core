// The `/media` file components' strings (FilePreview, FilePreviewList, MediaLibrary, AssetPicker) and their English
// defaults. Keys are prefixed (`file…`, `library…`, `assetPicker…`) so they never collide with other entry points'
// keys in the app's `messages` override.
import { useEntryMessages } from '../../provider/context';
import type { CoreMessages } from '../../provider/messages';

export interface MediaFilesMessages {
  /** A thumbnail's name: it opens the file's preview. */
  filePreview: (params: { name: string }) => string;
  /** The download button of a file without a viewer, or in a preview dialog. */
  fileDownload: string;
  /** Names a file chip's remove button in an attachment list. */
  fileRemove: (params: { name: string }) => string;
  /** Names an attachment list when the app gives no name. */
  fileAttachments: string;
  /** The kinds of file, shown under a thumbnail's name and in the media library. */
  fileKindImage: string;
  fileKindPdf: string;
  fileKindAudio: string;
  fileKindVideo: string;
  fileKindText: string;
  fileKindData: string;
  fileKindSpreadsheet: string;
  fileKindDocument: string;
  fileKindArchive: string;
  fileKindOther: string;
  /** A file's kind and size together, for example "PDF · 2.4 MB". */
  fileKindAndSize: (params: { kind: string; size: string }) => string;
  /** Shown instead of a text preview of a file over the size limit; `max` is a formatted size. */
  fileTooLargeToPreview: (params: { max: string }) => string;
  /** Shown under a text preview cut at the size limit; `shown` is a formatted size. */
  filePreviewTruncated: (params: { shown: string }) => string;
  /** Shown when a preview couldn't be loaded. */
  filePreviewError: string;
  /** Shown for a kind of file the library can't preview, above its download button. */
  fileNoPreview: string;
  /** The media library's accessible name when the app gives none. */
  library: string;
  librarySearch: string;
  /** The type filter's label and its choices. */
  libraryTypeFilter: string;
  libraryTypeAll: string;
  libraryTypeImage: string;
  libraryTypeVideo: string;
  libraryTypeAudio: string;
  libraryTypeDocument: string;
  /** The grid/list view switch and its choices. */
  libraryView: string;
  libraryViewGrid: string;
  libraryViewList: string;
  /** Names the grid of files. */
  libraryFiles: string;
  /** Flags an image without alt text. */
  libraryMissingAlt: string;
  /** Shown when the library has no files at all, and what to do about it. */
  libraryEmpty: string;
  libraryEmptyHint: string;
  /** Shown when a search or filter matches nothing. */
  libraryNoMatches: string;
  /** Shown when loading files fails. */
  libraryLoadError: string;
  /** The upload drop zone's text. */
  libraryDropLabel: string;
  /** Names the upload progress bar, and is announced when an upload starts. */
  libraryUploading: (params: { count: number }) => string;
  /** Announced when an upload finishes. */
  libraryUploaded: (params: { count: number }) => string;
  /** Shown and announced when an upload fails. */
  libraryUploadFailed: string;
  /** How many files are selected. */
  librarySelected: (params: { count: number }) => string;
  libraryClearSelection: string;
  /** The delete confirmation's title and consequence. */
  libraryDeleteTitle: (params: { count: number }) => string;
  libraryDeleteConsequence: string;
  /** Announced after files are deleted. */
  libraryDeleted: (params: { count: number }) => string;
  /** The button that chooses the selected files (picking modes). */
  libraryChoose: (params: { count: number }) => string;
  /** Names the details panel, and the button that opens it on narrow screens. */
  libraryDetails: string;
  /** Shown in the details panel while nothing is selected. */
  libraryDetailsEmpty: string;
  /** The details panel's fields. */
  libraryName: string;
  libraryAlt: string;
  libraryAltHelp: string;
  /** The tag field, its hint and the tag list's name. */
  libraryTags: string;
  libraryAddTag: string;
  libraryTagsHint: string;
  /** Read-only facts in the details panel. */
  libraryType: string;
  librarySize: string;
  libraryDimensions: string;
  libraryDimensionsValue: (params: { width: number; height: number }) => string;
  libraryAdded: string;
  /** Announced after details are saved, and shown when saving fails. */
  librarySaved: string;
  librarySaveFailed: string;
  /** The AssetPicker's buttons: choose (nothing chosen yet), change and the dialog's title fallback. */
  assetPickerChoose: string;
  assetPickerChange: string;
  /** Shown in the AssetPicker's frame when nothing is chosen. */
  assetPickerEmpty: string;
  /** The picker dialog's title when the field has no text label. */
  assetPickerDialog: string;
}

const files = (count: number) => (count === 1 ? '1 file' : `${String(count)} files`);

export const defaultMediaFilesMessages: MediaFilesMessages = {
  filePreview: ({ name }) => `Preview ${name}`,
  fileDownload: 'Download',
  fileRemove: ({ name }) => `Remove ${name}`,
  fileAttachments: 'Attachments',
  fileKindImage: 'Image',
  fileKindPdf: 'PDF',
  fileKindAudio: 'Audio',
  fileKindVideo: 'Video',
  fileKindText: 'Text',
  fileKindData: 'Data',
  fileKindSpreadsheet: 'Spreadsheet',
  fileKindDocument: 'Document',
  fileKindArchive: 'Archive',
  fileKindOther: 'File',
  fileKindAndSize: ({ kind, size }) => `${kind} · ${size}`,
  fileTooLargeToPreview: ({ max }) => `This file is too large to preview here (over ${max}).`,
  filePreviewTruncated: ({ shown }) => `Showing the first ${shown}.`,
  filePreviewError: 'Couldn’t load a preview of this file.',
  fileNoPreview: 'There’s no preview for this kind of file.',
  library: 'Media library',
  librarySearch: 'Search files',
  libraryTypeFilter: 'Type',
  libraryTypeAll: 'All types',
  libraryTypeImage: 'Images',
  libraryTypeVideo: 'Videos',
  libraryTypeAudio: 'Audio',
  libraryTypeDocument: 'Documents',
  libraryView: 'View',
  libraryViewGrid: 'Grid',
  libraryViewList: 'List',
  libraryFiles: 'Files',
  libraryMissingAlt: 'Missing alt text',
  libraryEmpty: 'No files yet',
  libraryEmptyHint: 'Upload files to add them to the library.',
  libraryNoMatches: 'No files match.',
  libraryLoadError: 'Couldn’t load the files',
  libraryDropLabel: 'Drop files here to upload',
  libraryUploading: ({ count }) => `Uploading ${files(count)}`,
  libraryUploaded: ({ count }) => `Uploaded ${files(count)}`,
  libraryUploadFailed: 'The upload failed.',
  librarySelected: ({ count }) => `${String(count)} selected`,
  libraryClearSelection: 'Clear selection',
  libraryDeleteTitle: ({ count }) => `Delete ${files(count)}?`,
  libraryDeleteConsequence: 'They’ll be removed from the library. This can’t be undone.',
  libraryDeleted: ({ count }) => `Deleted ${files(count)}`,
  libraryChoose: ({ count }) => (count > 1 ? `Choose ${files(count)}` : 'Choose'),
  libraryDetails: 'Details',
  libraryDetailsEmpty: 'Select a file to see and edit its details.',
  libraryName: 'Name',
  libraryAlt: 'Alt text',
  libraryAltHelp: 'Describes the image for people who can’t see it.',
  libraryTags: 'Tags',
  libraryAddTag: 'Add a tag',
  libraryTagsHint: 'Press Enter to add a tag.',
  libraryType: 'Type',
  librarySize: 'Size',
  libraryDimensions: 'Dimensions',
  libraryDimensionsValue: ({ width, height }) => `${String(width)} × ${String(height)}`,
  libraryAdded: 'Added',
  librarySaved: 'Changes saved',
  librarySaveFailed: 'Couldn’t save the changes.',
  assetPickerChoose: 'Choose',
  assetPickerChange: 'Change',
  assetPickerEmpty: 'Nothing chosen',
  assetPickerDialog: 'Choose a file',
};

/** The strings `/media` file components read: the core strings and their own. */
export type MediaFilesStrings = CoreMessages & MediaFilesMessages;

/** The `/media` file components' strings, with the app's overrides from `UIProvider`. */
export function useMediaFilesMessages(): MediaFilesStrings {
  return useEntryMessages(defaultMediaFilesMessages);
}
