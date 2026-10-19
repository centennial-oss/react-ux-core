// FilePreview (FR-039): shows any file, local (a File before upload) or remote, with the viewer its type calls for:
// images in ImageViewer, PDFs in PdfViewer (the first page as a thumbnail), audio in AudioPlayer, video in
// VideoPlayer, and JSON, CSV and other text in CodeBlock up to a size limit. Anything else gets its typed icon, its
// size and a download button. Three presentations: `thumbnail` (a card that opens the viewer in a dialog), `inline`
// (the viewer itself) and `dialog` (a compact file chip that opens the viewer). Local files are shown through object
// URLs, revoked on unmount.

import { Download, Play } from 'lucide-react';
import { useState, type Ref } from 'react';
import { Button as AriaButton, useLocale } from 'react-aria-components';
import { Button } from '../../components/Button/Button';
import { Dialog } from '../../components/Dialog/Dialog';
import type { FileKind } from '../../components/FileField/fileKind';
import { FileKindIcon } from '../../components/FileField/FileKindIcon';
import { formatFileSize } from '../../components/FileField/files';
import { Skeleton } from '../../components/Skeleton/Skeleton';
import { CodeBlock } from '../../code/CodeBlock';
import { cn } from '../../utils/cn';
import { saveUrl } from '../../utils/download';
import { ImageViewer } from '../image/ImageViewer';
import { AudioPlayer } from '../player/AudioPlayer';
import { PdfViewer } from '../player/PdfViewer';
import { VideoPlayer } from '../player/VideoPlayer';
import {
  codeLanguageFor,
  fileKindLabel,
  isLocalFile,
  previewFileKind,
  useFileText,
  useFileUrl,
  type PreviewFile,
} from './fileSource';
import { useMediaFilesMessages, type MediaFilesStrings } from './messages';
import { PdfFirstPage } from './PdfFirstPage';

/** Text files preview up to this many bytes by default (256 KB). */
const DEFAULT_MAX_TEXT_SIZE = 256 * 1024;

export interface FilePreviewProps {
  /** A File (before upload) or a remote file. */
  file: PreviewFile;
  /**
   * `thumbnail` (a card with the image, the PDF's first page or the file's icon, which opens the viewer in a dialog),
   * `inline` (the viewer itself), or `dialog` (a compact chip with the file's icon, name and size that opens the
   * viewer). Audio thumbnails are a card with an inline player instead. Defaults to `thumbnail`.
   */
  presentation?: 'thumbnail' | 'inline' | 'dialog';
  /** An image's alt text. Defaults to the file's name. */
  alt?: string;
  /** Text files (JSON, CSV, plain text) preview up to this many bytes; longer ones are cut. Defaults to 256 KB. */
  maxTextSize?: number;
  /** The thumbnail card's size. Defaults to `md`. */
  size?: 'sm' | 'md';
  /** Called when the thumbnail or chip is pressed, instead of opening the viewer dialog. */
  onPress?: () => void;
  /** The inline viewer's height, as a CSS length. Defaults to each viewer's own. */
  height?: string;
  /** pdf.js's worker URL, as for PdfViewer. */
  workerSrc?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** The file's kind and, when known, its size, in words ("PDF · 2.4 MB"). */
function useKindAndSize(file: PreviewFile, kind: FileKind, messages: MediaFilesStrings): string {
  const { locale } = useLocale();
  const label = fileKindLabel(kind, messages);
  return file.size === undefined
    ? label
    : messages.fileKindAndSize({ kind: label, size: formatFileSize(file.size, locale) });
}

const isTextKind = (kind: FileKind) => kind === 'text' || kind === 'data';

interface ViewerProps {
  file: PreviewFile;
  url: string | undefined;
  kind: FileKind;
  alt: string | undefined;
  maxTextSize: number;
  height: string | undefined;
  workerSrc: string | undefined;
  /** Whether it's in a dialog (viewers fill more of it). */
  isInDialog?: boolean;
}

/** A text file in a CodeBlock, cut at the size limit. */
function TextViewer({
  file,
  maxTextSize,
  height,
}: Pick<ViewerProps, 'file' | 'maxTextSize' | 'height'>) {
  const messages = useMediaFilesMessages();
  const { locale } = useLocale();
  const text = useFileText(file, maxTextSize, true);
  if (text.status === 'loading') {
    return <Skeleton shape="rect" height={160} className="w-full" />;
  }
  if (text.status === 'error') {
    return <NoPreview file={file} message={messages.filePreviewError} />;
  }
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <CodeBlock
        code={text.text}
        language={codeLanguageFor(file)}
        title={file.name}
        maxHeight={height ?? '24rem'}
      />
      {text.isTruncated && (
        <p className="text-xs text-fg-muted">
          {messages.filePreviewTruncated({ shown: formatFileSize(maxTextSize, locale) })}
        </p>
      )}
    </div>
  );
}

/** A file without a viewer: its icon, name, kind and size, a note and a download button. */
function NoPreview({ file, message }: { file: PreviewFile; message?: string }) {
  const messages = useMediaFilesMessages();
  const kind = previewFileKind(file);
  const url = useFileUrl(file);
  const details = useKindAndSize(file, kind, messages);
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 rounded-card border border-border bg-surface-1 p-4 text-center text-sm">
      <FileKindIcon kind={kind} className="size-10 text-fg-muted" />
      <p className="max-w-full font-medium break-words text-fg">{file.name}</p>
      <p className="text-xs text-fg-muted">{details}</p>
      <p className="text-fg-muted">{message ?? messages.fileNoPreview}</p>
      <Button
        variant="outline"
        size="sm"
        icon={Download}
        isDisabled={url === undefined}
        onPress={() => {
          if (url !== undefined) {
            // A cross-origin file ignores `download`, so it opens in a new tab instead.
            saveUrl(url, file.name, { isNewTab: true });
          }
        }}
      >
        {messages.fileDownload}
      </Button>
    </div>
  );
}

/** The viewer for the file's kind. */
function FileViewer({
  file,
  url,
  kind,
  alt,
  maxTextSize,
  height,
  workerSrc,
  isInDialog,
}: ViewerProps) {
  if (isTextKind(kind)) {
    return <TextViewer file={file} maxTextSize={maxTextSize} height={height} />;
  }
  if (kind !== 'pdf' && url === undefined) {
    return <Skeleton shape="rect" height={160} className="w-full" />;
  }
  switch (kind) {
    case 'image':
      return (
        <ImageViewer
          image={{ id: file.name, src: url ?? '', alt: alt ?? file.name, downloadName: file.name }}
          height={height ?? (isInDialog ? 'min(32rem, 70dvh)' : undefined)}
        />
      );
    case 'pdf':
      return (
        <PdfViewer
          source={isLocalFile(file) ? file : file.url}
          title={file.name}
          height={height ?? (isInDialog ? 'min(40rem, 75dvh)' : undefined)}
          workerSrc={workerSrc}
        />
      );
    case 'audio':
      return (
        <AudioPlayer
          variant="compact"
          track={{ id: file.name, src: url ?? '', title: file.name, type: file.type || undefined }}
        />
      );
    case 'video':
      return <VideoPlayer src={url ?? ''} title={file.name} />;
    default:
      return <NoPreview file={file} />;
  }
}

const cardSizeClasses = {
  sm: 'w-28',
  md: 'w-40',
} as const;

/** The picture at the top of a thumbnail card. */
function ThumbnailMedia({
  file,
  url,
  kind,
  size,
  workerSrc,
}: {
  file: PreviewFile;
  url: string | undefined;
  kind: FileKind;
  size: 'sm' | 'md';
  workerSrc: string | undefined;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const icon = (
    <span className="flex size-full items-center justify-center text-fg-muted">
      <FileKindIcon kind={kind} className={size === 'sm' ? 'size-8' : 'size-10'} />
    </span>
  );
  if (kind === 'image' && url !== undefined && url !== failedUrl) {
    return (
      <img
        src={url}
        alt=""
        draggable={false}
        onError={() => {
          setFailedUrl(url);
        }}
        className="size-full object-cover"
      />
    );
  }
  if (kind === 'pdf') {
    return (
      <PdfFirstPage
        source={isLocalFile(file) ? file : file.url}
        width={size === 'sm' ? 112 : 160}
        fallback={icon}
        workerSrc={workerSrc}
        className="size-full"
      />
    );
  }
  if (kind === 'video' && url !== undefined) {
    return (
      <span className="relative block size-full bg-surface-4">
        {/* A silent, decorative still of the first frame; the player in the dialog has the controls. */}
        <video
          src={`${url}#t=0.1`}
          preload="metadata"
          muted
          playsInline
          tabIndex={-1}
          aria-hidden="true"
          className="size-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-9 items-center justify-center rounded-full bg-neutral-solid text-neutral-on-solid shadow-raised">
            <Play aria-hidden="true" className="size-4 fill-current" />
          </span>
        </span>
      </span>
    );
  }
  return icon;
}

const cardClasses =
  'relative flex shrink-0 flex-col overflow-hidden rounded-card border border-border bg-surface-1 text-start text-fg';

/** The card or chip around an overlay button: the focus ring goes round the whole card. */
const focusWithinClasses = 'has-[[data-focus-visible]]:focus-ring';

/**
 * The button's ::after covers its whole card (the nearest positioned ancestor), so pressing the name or details
 * presses the button too, while that text stays outside the button (its name is "Preview {name}").
 */
const overlayButtonClasses = [
  'cursor-pointer outline-none',
  'after:absolute after:inset-0 after:z-10 after:bg-fg after:opacity-0',
  'data-hovered:after:opacity-[0.06] data-pressed:after:opacity-[0.12]',
].join(' ');

/** A file's preview: a thumbnail card, the viewer itself, or a chip that opens the viewer, chosen by its MIME type. */
export function FilePreview({
  file,
  presentation = 'thumbnail',
  alt,
  maxTextSize = DEFAULT_MAX_TEXT_SIZE,
  size = 'md',
  onPress,
  height,
  workerSrc,
  className,
  ref,
}: FilePreviewProps) {
  const messages = useMediaFilesMessages();
  const kind = previewFileKind(file);
  const url = useFileUrl(file);
  const details = useKindAndSize(file, kind, messages);
  const [isOpen, setOpen] = useState(false);
  const viewerProps: ViewerProps = { file, url, kind, alt, maxTextSize, height, workerSrc };

  if (presentation === 'inline') {
    return (
      <div ref={ref} data-kind={kind} className={cn('min-w-0', className)}>
        <FileViewer {...viewerProps} />
      </div>
    );
  }

  const press = () => {
    if (onPress) {
      onPress();
    } else {
      setOpen(true);
    }
  };
  const dialog = (
    <Dialog title={file.name} size="xl" isOpen={isOpen} onOpenChange={setOpen}>
      <FileViewer {...viewerProps} isInDialog />
    </Dialog>
  );
  const nameLines = (
    <>
      <span className="block truncate text-sm font-medium">{file.name}</span>
      <span className="block truncate text-xs text-fg-muted">{details}</span>
    </>
  );
  if (presentation === 'dialog') {
    return (
      <div
        ref={ref}
        data-kind={kind}
        className={cn('inline-flex max-w-full items-start self-start', className)}
      >
        <div
          className={cn(
            'relative flex max-w-full min-w-0 items-center gap-2 overflow-hidden rounded-control border border-border bg-surface-1 py-1.5 ps-2 pe-3 text-start text-fg',
            focusWithinClasses,
          )}
        >
          <AriaButton
            aria-label={messages.filePreview({ name: file.name })}
            aria-haspopup={onPress ? undefined : 'dialog'}
            onPress={press}
            className={cn('flex shrink-0', overlayButtonClasses)}
          >
            <FileKindIcon kind={kind} className="size-5 text-fg-muted" />
          </AriaButton>
          <span className="min-w-0">{nameLines}</span>
        </div>
        {dialog}
      </div>
    );
  }

  // Thumbnail. Audio plays right in the card: the inline player's play button is its preview.
  if (kind === 'audio') {
    return (
      <div
        ref={ref}
        data-kind={kind}
        className={cn(
          cardClasses,
          'gap-2 self-start p-2',
          size === 'sm' ? 'w-44' : 'w-56',
          className,
        )}
      >
        <span className="min-w-0 px-1">{nameLines}</span>
        {url === undefined ? (
          <Skeleton shape="rect" height={32} className="w-full" />
        ) : (
          <AudioPlayer
            variant="inline"
            track={{ id: file.name, src: url, title: file.name, type: file.type || undefined }}
          />
        )}
      </div>
    );
  }

  return (
    <div ref={ref} data-kind={kind} className={cn('inline-flex items-start self-start', className)}>
      <div className={cn(cardClasses, focusWithinClasses, cardSizeClasses[size])}>
        <AriaButton
          aria-label={messages.filePreview({ name: file.name })}
          aria-haspopup={onPress ? undefined : 'dialog'}
          onPress={press}
          className={cn(
            'block aspect-[4/3] min-h-0 w-full overflow-hidden border-b border-border bg-surface-3',
            overlayButtonClasses,
          )}
        >
          <span className="block size-full overflow-hidden">
            <ThumbnailMedia file={file} url={url} kind={kind} size={size} workerSrc={workerSrc} />
          </span>
        </AriaButton>
        <span className="block min-w-0 p-2">{nameLines}</span>
      </div>
      {dialog}
    </div>
  );
}
