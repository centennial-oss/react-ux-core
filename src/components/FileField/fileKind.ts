// What kind of file something is (an image, a PDF, a spreadsheet…), from its MIME type and name, and the typed icon
// that stands for each kind. FileField's previews use them, and so does `/media`'s FilePreview.

import {
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileBraces,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
} from 'lucide-react';
import type { IconComponent } from '../../utils/icon';

/** A family of files that previews alike. */
export type FileKind =
  | 'image'
  | 'pdf'
  | 'audio'
  | 'video'
  /** Plain text, Markdown, logs. */
  | 'text'
  /** Structured text: JSON, CSV, YAML, XML. */
  | 'data'
  | 'spreadsheet'
  | 'document'
  | 'archive'
  | 'other';

const extensionKinds: Record<string, FileKind> = {
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  avif: 'image',
  svg: 'image',
  bmp: 'image',
  pdf: 'pdf',
  mp3: 'audio',
  m4a: 'audio',
  aac: 'audio',
  wav: 'audio',
  ogg: 'audio',
  oga: 'audio',
  opus: 'audio',
  flac: 'audio',
  mp4: 'video',
  m4v: 'video',
  webm: 'video',
  mov: 'video',
  ogv: 'video',
  txt: 'text',
  md: 'text',
  log: 'text',
  json: 'data',
  csv: 'data',
  tsv: 'data',
  yaml: 'data',
  yml: 'data',
  xml: 'data',
  xls: 'spreadsheet',
  xlsx: 'spreadsheet',
  ods: 'spreadsheet',
  numbers: 'spreadsheet',
  doc: 'document',
  docx: 'document',
  odt: 'document',
  rtf: 'document',
  pages: 'document',
  ppt: 'document',
  pptx: 'document',
  key: 'document',
  zip: 'archive',
  gz: 'archive',
  tgz: 'archive',
  tar: 'archive',
  rar: 'archive',
  '7z': 'archive',
  bz2: 'archive',
};

const mimeKinds: Record<string, FileKind> = {
  'application/pdf': 'pdf',
  'application/json': 'data',
  'application/ld+json': 'data',
  'application/xml': 'data',
  'application/yaml': 'data',
  'application/x-yaml': 'data',
  'text/csv': 'data',
  'text/tab-separated-values': 'data',
  'text/xml': 'data',
  'text/yaml': 'data',
  'application/zip': 'archive',
  'application/x-zip-compressed': 'archive',
  'application/gzip': 'archive',
  'application/x-gzip': 'archive',
  'application/x-tar': 'archive',
  'application/x-7z-compressed': 'archive',
  'application/vnd.rar': 'archive',
  'application/vnd.ms-excel': 'spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
  'application/vnd.oasis.opendocument.spreadsheet': 'spreadsheet',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.oasis.opendocument.text': 'document',
  'application/rtf': 'document',
  'application/vnd.ms-powerpoint': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
};

/** The file's extension, lower-cased, without the dot (`''` when it has none). */
export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * The kind of a file, from its MIME type (`type`) and, when that's empty or generic, its name's extension: PNG and
 * JPEG are `image`, `application/json` and `.csv` are `data`, `.zip` is `archive`, and anything unknown is `other`.
 */
export function fileKind(file: { name: string; type?: string }): FileKind {
  const type = (file.type ?? '').toLowerCase().split(';')[0]?.trim() ?? '';
  const known = mimeKinds[type];
  if (known) {
    return known;
  }
  const family = type.split('/')[0];
  if (family === 'image' || family === 'audio' || family === 'video') {
    return family;
  }
  const byName = extensionKinds[fileExtension(file.name)];
  if (byName) {
    return byName;
  }
  if (family === 'text') {
    return 'text';
  }
  return 'other';
}

export const fileKindIcons: Record<FileKind, IconComponent> = {
  image: FileImage,
  pdf: FileType,
  audio: FileAudio,
  video: FileVideo,
  text: FileText,
  data: FileBraces,
  spreadsheet: FileSpreadsheet,
  document: FileText,
  archive: FileArchive,
  other: FileIcon,
};

/** The typed icon for a kind of file: a picture for images, a zipped file for archives, a plain file otherwise. */
export function fileKindIcon(kind: FileKind): IconComponent {
  return fileKindIcons[kind];
}
