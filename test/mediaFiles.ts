// Files for the `/media` file components' stories and tests, made in code (nothing downloaded): canvas PNGs, a
// hand-written PDF, a WAV tone (also served as an "MP3", which Chromium sniffs and plays), an empty ZIP, JSON and CSV,
// and an in-memory media library with paged search, uploads, edits and deletions.

import type { MediaAsset, MediaAssetPage, MediaAssetQuery } from '../src/media/files';
import { matchesAssetQuery } from '../src/media/files';
import { buildPdf, statementPages, toneWav } from './media';
import { planetImages, starfieldImage } from './mediaImages';

/** The bytes of a `data:` URL. */
function dataUrlBytes(url: string): Uint8Array<ArrayBuffer> {
  const binary = atob(url.slice(url.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/** A PNG File of a star field with a planet. */
export function pngFile(name = 'saturn.png', seed = 7, width = 320, height = 200): File {
  return new File([dataUrlBytes(starfieldImage({ width, height, seed }))], name, {
    type: 'image/png',
  });
}

/** A two-page PDF File (the observatory supply statement). */
export function pdfFile(name = 'statement.pdf'): File {
  return new File([buildPdf(statementPages.slice(0, 2)) as BlobPart], name, {
    type: 'application/pdf',
  });
}

/** A short tone named and typed as an MP3 (WAV bytes inside: encoding MP3 in code isn't practical). */
export function mp3File(name = 'chime.mp3'): File {
  return new File([toneWav({ seconds: 1.5, frequency: 523 })], name, { type: 'audio/mpeg' });
}

/** A short WAV tone. */
export function wavFile(name = 'tone.wav'): File {
  return new File([toneWav({ seconds: 1.5 })], name, { type: 'audio/wav' });
}

/** A valid, empty ZIP archive (just the end-of-central-directory record). */
export function zipFile(name = 'observations.zip'): File {
  const bytes = new Uint8Array(22);
  bytes.set([0x50, 0x4b, 0x05, 0x06]);
  return new File([bytes], name, { type: 'application/zip' });
}

/** A JSON document describing Mars. */
export function jsonFile(name = 'mars.json'): File {
  const text = JSON.stringify(
    { name: 'Mars', moons: ['Phobos', 'Deimos'], dayHours: 24.6, hasRings: false },
    null,
    2,
  );
  return new File([text], name, { type: 'application/json' });
}

/** A CSV of lab readings, `rows` long. */
export function csvFile(name = 'readings.csv', rows = 6): File {
  const lines = ['time,temperature_c,humidity_pct'];
  for (let index = 0; index < rows; index += 1) {
    lines.push(
      `21:${String(index).padStart(2, '0')},${(12.4 - index * 0.1).toFixed(1)},${String(40 + (index % 5))}`,
    );
  }
  return new File([lines.join('\n')], name, { type: 'text/csv' });
}

/** A plain text file. */
export function textFile(name = 'notes.txt', text = 'Dome opened at 21:04. Seeing 0.6″.'): File {
  return new File([text], name, { type: 'text/plain' });
}

/** The planet images as library assets: Mars and Neptune have no alt text, to show the flag. */
export function planetAssets(): MediaAsset[] {
  return planetImages().map((image, index) => ({
    id: image.id,
    name: image.downloadName ?? `${image.id}.png`,
    url: image.src,
    type: 'image/png',
    size: Math.round((image.src.length * 3) / 4),
    width: image.width,
    height: image.height,
    alt: image.id === 'mars' || image.id === 'neptune' ? undefined : image.alt,
    createdAt: `2026-09-${String(10 + index).padStart(2, '0')}T20:00:00Z`,
    tags: index < 4 ? ['inner planets'] : ['outer planets'],
  }));
}

/** A few non-image assets (blob URLs): a PDF statement, a tone and a CSV of readings. */
export function documentAssets(): MediaAsset[] {
  const pdf = pdfFile();
  const wav = wavFile('dome-chime.wav');
  const csv = csvFile();
  return [
    {
      id: 'statement',
      name: pdf.name,
      url: URL.createObjectURL(pdf),
      type: pdf.type,
      size: pdf.size,
      createdAt: '2026-09-20T09:30:00Z',
      tags: ['invoices'],
    },
    {
      id: 'chime',
      name: wav.name,
      url: URL.createObjectURL(wav),
      type: wav.type,
      size: wav.size,
      createdAt: '2026-09-21T09:30:00Z',
    },
    {
      id: 'readings',
      name: csv.name,
      url: URL.createObjectURL(csv),
      type: csv.type,
      size: csv.size,
      createdAt: '2026-09-22T09:30:00Z',
      tags: ['lab'],
    },
  ];
}

export interface AssetStoreOptions {
  /** Assets per page. Defaults to 12. */
  pageSize?: number;
  /** Called before each response; return a promise to delay it (tests control timing this way). */
  delay?: () => Promise<void>;
}

/**
 * An in-memory media library: `loadAssets` pages through matching assets by cursor (an offset), `onUpload` turns
 * Files into assets with object URLs (reporting progress), and `onUpdate`/`onDelete` change the store.
 */
export function createAssetStore(initial: readonly MediaAsset[], options: AssetStoreOptions = {}) {
  const { pageSize = 12, delay = () => Promise.resolve() } = options;
  let assets = [...initial];
  let counter = 0;
  return {
    get assets(): readonly MediaAsset[] {
      return assets;
    },
    loadAssets: async (query: MediaAssetQuery, signal: AbortSignal): Promise<MediaAssetPage> => {
      await delay();
      signal.throwIfAborted();
      const matches = assets.filter((asset) => matchesAssetQuery(asset, query));
      const start = query.cursor === undefined ? 0 : Number(query.cursor);
      const end = start + pageSize;
      return {
        assets: matches.slice(start, end),
        nextCursor: end < matches.length ? String(end) : undefined,
      };
    },
    onUpload: async (
      files: File[],
      { onProgress }: { onProgress: (progress: number) => void; signal: AbortSignal },
    ): Promise<MediaAsset[]> => {
      const added: MediaAsset[] = [];
      for (const [index, file] of files.entries()) {
        await delay();
        counter += 1;
        added.push({
          id: `upload-${String(counter)}`,
          name: file.name,
          url: URL.createObjectURL(file),
          type: file.type,
          size: file.size,
          createdAt: '2026-10-17T12:00:00Z',
        });
        onProgress((index + 1) / files.length);
      }
      assets = [...added, ...assets];
      return added;
    },
    onUpdate: async (asset: MediaAsset): Promise<void> => {
      await delay();
      assets = assets.map((old) => (old.id === asset.id ? asset : old));
    },
    onDelete: async (ids: string[]): Promise<void> => {
      await delay();
      assets = assets.filter((asset) => !ids.includes(asset.id));
    },
  };
}
