// Inserting an image, and editing an image's alt text. Alt text is required: the Insert button won't add an image
// without it. With `uploadImage`, the image is a file (chosen here, or pasted or dropped into the editor) that the
// app stores; without it, it's an address.
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FolderOpen } from 'lucide-react';
import {
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $setSelection,
  type BaseSelection,
  type NodeKey,
} from 'lexical';
import { useEffect, useRef, useState } from 'react';
import { FileTrigger } from 'react-aria-components';
import { Button } from '../components/Button/Button';
import { ButtonGroup } from '../components/ButtonGroup/ButtonGroup';
import { Dialog } from '../components/Dialog/Dialog';
import { Spinner } from '../components/Spinner/Spinner';
import { TextField } from '../components/TextField/TextField';
import type { EditorStrings } from './messages';
import { $createImageNode, $isImageNode } from './nodes/ImageNode';
import { isSafeImageSrc } from './sanitize';

/** Stores an image file and returns its URL (and optionally a suggested alt text). */
export type EditorImageUploader = (file: File) => Promise<{ src: string; alt?: string }>;

/** What the dialog is for: a new image (optionally from a pasted or dropped file) or an existing one's alt text. */
export type ImageRequest =
  | { kind: 'insert'; file?: File; selection: BaseSelection | null }
  | { kind: 'edit'; nodeKey: NodeKey; src: string; alt: string };

export interface ImageDialogProps {
  request: ImageRequest | null;
  onClose: () => void;
  uploadImage?: EditorImageUploader;
  messages: EditorStrings;
}

export function ImageDialog({ request, onClose, uploadImage, messages }: ImageDialogProps) {
  return (
    <Dialog
      isOpen={request !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
      title={request?.kind === 'edit' ? messages.editorImageEditTitle : messages.editorImageTitle}
      size="sm"
    >
      {request !== null && (
        <ImageForm
          request={request}
          onClose={onClose}
          uploadImage={uploadImage}
          messages={messages}
        />
      )}
    </Dialog>
  );
}

type UploadState = 'idle' | 'uploading' | 'failed';

function ImageForm({
  request,
  onClose,
  uploadImage,
  messages,
}: {
  request: ImageRequest;
  onClose: () => void;
  uploadImage?: EditorImageUploader;
  messages: EditorStrings;
}) {
  const [editor] = useLexicalComposerContext();
  const pendingFile = request.kind === 'insert' ? request.file : undefined;
  const [src, setSrc] = useState(request.kind === 'edit' ? request.src : '');
  const [alt, setAlt] = useState(request.kind === 'edit' ? request.alt : '');
  const [upload, setUpload] = useState<UploadState>(
    pendingFile !== undefined && uploadImage !== undefined ? 'uploading' : 'idle',
  );
  const [errors, setErrors] = useState({ src: false, alt: false });
  const startedRef = useRef(false);
  const isMountedRef = useRef(true);

  const send = (file: File) => {
    if (uploadImage === undefined) {
      return;
    }
    uploadImage(file).then(
      (result) => {
        if (isMountedRef.current) {
          setSrc(result.src);
          setAlt((current) => (current === '' ? (result.alt ?? '') : current));
          setUpload('idle');
        }
      },
      () => {
        if (isMountedRef.current) {
          setUpload('failed');
        }
      },
    );
  };

  // A pasted or dropped file uploads as the dialog opens.
  useEffect(() => {
    isMountedRef.current = true;
    if (pendingFile !== undefined && !startedRef.current) {
      startedRef.current = true;
      send(pendingFile);
    }
    return () => {
      isMountedRef.current = false;
    };
    // `send` only reads props that can't change while the dialog is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFile]);

  const confirm = () => {
    const nextErrors = {
      src: request.kind === 'insert' && !isSafeImageSrc(src),
      alt: alt.trim() === '',
    };
    setErrors(nextErrors);
    if (nextErrors.src || nextErrors.alt || upload === 'uploading') {
      return;
    }
    editor.update(() => {
      if (request.kind === 'edit') {
        const node = $getNodeByKey(request.nodeKey);
        if ($isImageNode(node)) {
          node.setAlt(alt.trim());
        }
        return;
      }
      if (request.selection !== null) {
        $setSelection(request.selection.clone());
      }
      const selection = $getSelection() ?? $getRoot().selectEnd();
      selection.insertNodes([$createImageNode({ src: src.trim(), alt: alt.trim() })]);
    });
    onClose();
    editor.focus();
  };

  const canChooseFile = request.kind === 'insert' && uploadImage !== undefined;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        confirm();
      }}
    >
      {canChooseFile && (
        <div className="flex flex-col items-start gap-2">
          <FileTrigger
            acceptedFileTypes={['image/*']}
            onSelect={(files) => {
              const file = files?.[0];
              if (file !== undefined) {
                setUpload('uploading');
                setErrors((current) => ({ ...current, src: false }));
                send(file);
              }
            }}
          >
            <Button variant="outline" icon={FolderOpen} isDisabled={upload === 'uploading'}>
              {messages.editorImageChoose}
            </Button>
          </FileTrigger>
          {upload === 'uploading' && (
            <span className="flex items-center gap-2 text-xs text-fg-muted">
              <Spinner size="sm" label={messages.editorImageUploading} />
              <span aria-hidden="true">{messages.editorImageUploading}</span>
            </span>
          )}
          {upload === 'failed' && (
            <p role="alert" className="text-xs font-medium text-danger-fg">
              {messages.editorImageUploadFailed}
            </p>
          )}
          {errors.src && upload !== 'failed' && (
            <p role="alert" className="text-xs font-medium text-danger-fg">
              {messages.editorImageUrlRequired}
            </p>
          )}
        </div>
      )}
      {request.kind === 'insert' && !canChooseFile && (
        <TextField
          type="url"
          label={messages.editorImageUrl}
          value={src}
          onChange={(next) => {
            setSrc(next);
            setErrors((current) => ({ ...current, src: false }));
          }}
          isRequired
          validationBehavior="aria"
          isInvalid={errors.src}
          errorMessage={messages.editorImageUrlRequired}
          // The dialog opens to enter an image, so its first field takes focus.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
      )}
      {src !== '' && isSafeImageSrc(src) && (
        <img
          src={src}
          alt=""
          className="max-h-48 max-w-full self-start rounded-control border border-border object-contain"
        />
      )}
      <TextField
        label={messages.editorImageAlt}
        description={messages.editorImageAltDescription}
        value={alt}
        onChange={(next) => {
          setAlt(next);
          setErrors((current) => ({ ...current, alt: false }));
        }}
        isRequired
        validationBehavior="aria"
        isInvalid={errors.alt}
        errorMessage={messages.editorImageAltRequired}
        // Editing alt text: the field is the dialog's purpose.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={request.kind === 'edit'}
      />
      <ButtonGroup>
        <Button variant="outline" onPress={onClose}>
          {messages.cancel}
        </Button>
        <Button type="submit" tone="accent" isDisabled={upload === 'uploading'}>
          {request.kind === 'edit' ? messages.save : messages.editorImageInsert}
        </Button>
      </ButtonGroup>
    </form>
  );
}
