// The media library's details panel: a preview of the selected asset, its name, alt text (images, flagged while
// empty) and tags to edit, and read-only facts (type, size, dimensions, when it was added). Changes are saved with
// the app's `onUpdate`.

import { TriangleAlert } from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';
import { useLocale } from 'react-aria-components';
import { Button } from '../../components/Button/Button';
import { ButtonGroup } from '../../components/ButtonGroup/ButtonGroup';
import { Chip } from '../../components/Chip/Chip';
import { DescriptionList } from '../../components/DescriptionList/DescriptionList';
import { fileKind } from '../../components/FileField/fileKind';
import { formatFileSize, uploadErrorMessage } from '../../components/FileField/files';
import { TextArea } from '../../components/TextArea/TextArea';
import { TextField } from '../../components/TextField/TextField';
import { useTimeZone } from '../../provider/context';
import { sameItems } from '../../utils/collections';
import type { MediaAsset } from './assets';
import { fileKindLabel } from './fileSource';
import { FilePreview } from './FilePreview';
import { useMediaFilesMessages } from './messages';

export interface AssetDetailsProps {
  asset: MediaAsset;
  /** Saves the edited asset; without it the details are read-only. */
  onUpdate?: (asset: MediaAsset) => Promise<void>;
  /** Called with the saved asset after `onUpdate` resolves. */
  onSaved: (asset: MediaAsset) => void;
  workerSrc?: string;
}

/** The selected asset's preview, editable fields and facts. Remount it (`key`) for another asset. */
export function AssetDetails({ asset, onUpdate, onSaved, workerSrc }: AssetDetailsProps) {
  const messages = useMediaFilesMessages();
  const { locale } = useLocale();
  const timeZone = useTimeZone();
  const [name, setName] = useState(asset.name);
  const [alt, setAlt] = useState(asset.alt ?? '');
  const [tags, setTags] = useState<readonly string[]>(asset.tags ?? []);
  const [tagDraft, setTagDraft] = useState('');
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const nameRef = useRef<HTMLInputElement>(null);
  const isImage = fileKind(asset) === 'image';
  const isReadOnly = onUpdate === undefined;
  const isDirty =
    name.trim() !== asset.name ||
    alt.trim() !== (asset.alt ?? '') ||
    !sameItems(tags, asset.tags ?? []);

  const addTag = () => {
    const tag = tagDraft.trim();
    if (tag !== '' && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagDraft('');
  };

  const save = async () => {
    if (!onUpdate || !isDirty) {
      return;
    }
    const next: MediaAsset = {
      ...asset,
      name: name.trim() === '' ? asset.name : name.trim(),
      ...(isImage ? { alt: alt.trim() } : {}),
      tags,
    };
    setSaving(true);
    setError(undefined);
    try {
      await onUpdate(next);
      onSaved(next);
    } catch (caught: unknown) {
      setError(uploadErrorMessage(caught, messages.librarySaveFailed));
    } finally {
      setSaving(false);
    }
  };

  const dateText =
    asset.createdAt === undefined || Number.isNaN(Date.parse(asset.createdAt))
      ? undefined
      : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone }).format(
          new Date(asset.createdAt),
        );

  return (
    <div
      role="group"
      aria-label={messages.libraryDetails}
      className="flex min-w-0 flex-col gap-3 p-4"
    >
      <FilePreview
        file={{ name: asset.name, url: asset.url, type: asset.type, size: asset.size }}
        alt={isImage ? alt || undefined : undefined}
        workerSrc={workerSrc}
        className="self-start"
      />
      <TextField
        label={messages.libraryName}
        inputRef={nameRef}
        value={name}
        onChange={setName}
        isReadOnly={isReadOnly}
        isDisabled={isSaving}
      />
      {isImage && (
        <div className="flex flex-col gap-1">
          <TextArea
            label={messages.libraryAlt}
            description={messages.libraryAltHelp}
            value={alt}
            onChange={setAlt}
            minRows={2}
            isReadOnly={isReadOnly}
            isDisabled={isSaving}
          />
          {alt.trim() === '' && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-warning-fg">
              <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
              {messages.libraryMissingAlt}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-col gap-2">
        {tags.length > 0 && (
          <ul aria-label={messages.libraryTags} className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <li key={tag} className="inline-flex max-w-full">
                <Chip
                  size="sm"
                  isDisabled={isSaving}
                  onRemove={
                    isReadOnly
                      ? undefined
                      : () => {
                          setTags(tags.filter((other) => other !== tag));
                        }
                  }
                >
                  {tag}
                </Chip>
              </li>
            ))}
          </ul>
        )}
        {!isReadOnly && (
          <TextField
            label={messages.libraryAddTag}
            description={messages.libraryTagsHint}
            value={tagDraft}
            onChange={setTagDraft}
            isDisabled={isSaving}
            size="sm"
            onKeyDown={(event: KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                addTag();
              }
            }}
          />
        )}
      </div>
      <DescriptionList
        columns={1}
        items={[
          {
            id: 'type',
            label: messages.libraryType,
            value: fileKindLabel(fileKind(asset), messages),
          },
          {
            id: 'size',
            label: messages.librarySize,
            value: asset.size === undefined ? undefined : formatFileSize(asset.size, locale),
          },
          ...(asset.width !== undefined && asset.height !== undefined
            ? [
                {
                  id: 'dimensions',
                  label: messages.libraryDimensions,
                  value: messages.libraryDimensionsValue({
                    width: asset.width,
                    height: asset.height,
                  }),
                },
              ]
            : []),
          { id: 'added', label: messages.libraryAdded, value: dateText },
        ]}
      />
      {error !== undefined && (
        <p role="alert" className="text-sm font-medium text-danger-fg">
          {error}
        </p>
      )}
      {!isReadOnly && (
        <ButtonGroup layout="end">
          <Button
            variant="ghost"
            isDisabled={!isDirty || isSaving}
            onPress={() => {
              setName(asset.name);
              setAlt(asset.alt ?? '');
              setTags(asset.tags ?? []);
              setError(undefined);
              // This button disables itself; keep focus in the panel.
              nameRef.current?.focus();
            }}
          >
            {messages.revert}
          </Button>
          <Button
            tone="accent"
            // Never disabled (pressing it with nothing changed does nothing), so focus stays on it after saving.
            isPending={isSaving}
            onPress={() => {
              void save();
            }}
          >
            {messages.save}
          </Button>
        </ButtonGroup>
      )}
    </div>
  );
}
