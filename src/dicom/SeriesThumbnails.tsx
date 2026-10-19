// Series thumbnails: a single-choice group of buttons, each with the series' middle image, its label and image count.
// The strip scrolls sideways inside itself when there are more series than fit.

import { useEffect, useRef, useState } from 'react';
import { ToggleButton, ToggleButtonGroup } from 'react-aria-components';
import { hoverSurfaceClasses } from '../utils/stateClasses';
import { frameToCanvas } from './draw';
import type { DicomImageCache } from './loader';
import type { DicomStrings } from './messages';
import { defaultWindow } from './windowLevel';

/** A series the viewer can switch to: its image ids, in stack order. */
export interface DicomSeries {
  id: string;
  /** Shown under the thumbnail and in the status line, such as "Axial 5 mm". */
  label: string;
  imageIds: readonly string[];
}

const thumbClasses = [
  'flex w-24 shrink-0 cursor-pointer flex-col items-stretch gap-1 rounded-control border border-border bg-surface-2 p-1 text-start outline-none',
  hoverSurfaceClasses,
  'data-focus-visible:focus-ring',
  'data-selected:border-accent-solid data-selected:ring-2 data-selected:ring-accent-solid',
].join(' ');

function Thumbnail({ series, cache }: { series: DicomSeries; cache: DicomImageCache }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const imageId = series.imageIds[Math.floor(series.imageIds.length / 2)];

  useEffect(() => {
    if (imageId === undefined) {
      return;
    }
    let isCurrent = true;
    cache.load(imageId).then(
      (image) => {
        const canvas = canvasRef.current;
        if (!isCurrent || !canvas) {
          return;
        }
        const frame = frameToCanvas(image, defaultWindow(image), false);
        const context = canvas.getContext('2d');
        if (frame && context) {
          // Fit the frame in the square thumbnail, on black.
          const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
          const width = image.width * scale;
          const height = image.height * scale;
          context.fillStyle = '#000000';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(
            frame,
            (canvas.width - width) / 2,
            (canvas.height - height) / 2,
            width,
            height,
          );
        }
        setStatus('ready');
      },
      () => {
        if (isCurrent) {
          setStatus('error');
        }
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [cache, imageId]);

  return (
    <canvas
      ref={canvasRef}
      width={176}
      height={176}
      aria-hidden="true"
      data-dicom-status={status}
      className="aspect-square w-full rounded-control bg-surface-4"
    />
  );
}

export interface SeriesThumbnailsProps {
  series: readonly DicomSeries[];
  seriesId: string;
  onSeriesChange: (id: string) => void;
  cache: DicomImageCache;
  messages: DicomStrings;
}

export function SeriesThumbnails({
  series,
  seriesId,
  onSeriesChange,
  cache,
  messages,
}: SeriesThumbnailsProps) {
  return (
    <div className="relative min-w-0 overflow-x-auto p-1">
      <ToggleButtonGroup
        aria-label={messages.dicomSeries}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[seriesId]}
        onSelectionChange={(keys) => {
          const key = keys.values().next().value;
          if (key !== undefined) {
            onSeriesChange(String(key));
          }
        }}
        className="flex gap-2"
      >
        {series.map((entry) => (
          <ToggleButton key={entry.id} id={entry.id} className={thumbClasses}>
            <Thumbnail series={entry} cache={cache} />
            <span className="truncate text-xs font-medium text-fg">{entry.label}</span>
            <span className="text-xs text-fg-muted">
              {messages.dicomSeriesImageCount({ count: entry.imageIds.length })}
            </span>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}
