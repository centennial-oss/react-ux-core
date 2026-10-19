// The media library's data model: assets, the app's paged search, uploads, and the type filter's families.

import { fileKind } from '../../components/FileField/fileKind';

/** A stored file in the media library. */
export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  /** The MIME type, such as `image/png`. */
  type: string;
  /** Size in bytes. */
  size?: number;
  /** An image's pixel size. */
  width?: number;
  height?: number;
  /** An image's alt text. Images without it are flagged. */
  alt?: string;
  /** When it was added, as an ISO 8601 string. */
  createdAt?: string;
  tags?: readonly string[];
  /** A smaller image for tiles, such as a CDN thumbnail. Defaults to `url` for images. */
  thumbnailUrl?: string;
}

/** The type filter's families. `document` covers PDFs, text, data, spreadsheets and office documents. */
export type MediaAssetType = 'image' | 'video' | 'audio' | 'document';

/** One request for a page of assets. */
export interface MediaAssetQuery {
  /** What the user typed (may be empty). */
  search: string;
  /** The type filter, when one is chosen. */
  type?: MediaAssetType;
  /** The `nextCursor` of the previous page, for the next one; unset for the first page. */
  cursor?: string;
}

/** A page of assets, and the cursor of the next page when there is one. */
export interface MediaAssetPage {
  assets: readonly MediaAsset[];
  nextCursor?: string;
}

/** Reports an upload's progress and carries its cancellation. */
export interface MediaUploadOptions {
  /** Reports progress from 0 to 1 for the whole batch. */
  onProgress: (progress: number) => void;
  /** Aborted when the library unmounts. */
  signal: AbortSignal;
}

/** The family a file belongs to for the type filter, or `undefined` (archives and unknown files). */
export function mediaAssetType(file: { name: string; type?: string }): MediaAssetType | undefined {
  const kind = fileKind(file);
  switch (kind) {
    case 'image':
    case 'video':
    case 'audio':
      return kind;
    case 'pdf':
    case 'text':
    case 'data':
    case 'spreadsheet':
    case 'document':
      return 'document';
    default:
      return undefined;
  }
}

/**
 * Whether an asset matches a query's search (its name, alt text or a tag contains the text, ignoring case) and type,
 * for apps whose `loadAssets` filters in the browser.
 */
export function matchesAssetQuery(
  asset: MediaAsset,
  query: Pick<MediaAssetQuery, 'search' | 'type'>,
): boolean {
  if (query.type !== undefined && mediaAssetType(asset) !== query.type) {
    return false;
  }
  const search = query.search.trim().toLowerCase();
  if (search === '') {
    return true;
  }
  return [asset.name, asset.alt ?? '', ...(asset.tags ?? [])].some((text) =>
    text.toLowerCase().includes(search),
  );
}

/** Whether an asset is an image without alt text. */
export function isMissingAlt(asset: MediaAsset): boolean {
  return fileKind(asset) === 'image' && (asset.alt ?? '').trim() === '';
}
