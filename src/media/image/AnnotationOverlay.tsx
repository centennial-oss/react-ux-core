// The shapes, number markers and handles ImageAnnotator draws over the image, inside ImageViewer's transformed
// layer: they zoom and pan with the image, while markers and handles keep their size and stay upright.
import type { CSSProperties } from 'react';
import { cn } from '../../utils/cn';
import { toneSolidClasses } from '../../utils/toneClasses';
import type { Tone } from '../../utils/types';
import { annotationAnchor, svgPoints, type RectCorner } from './geometry';
import type { Annotation, AnnotationPoint } from './types';

const shapeClasses: Record<Tone, string> = {
  neutral: 'fill-neutral-solid/15 stroke-neutral-solid',
  accent: 'fill-accent-solid/15 stroke-accent-solid',
  success: 'fill-success-solid/15 stroke-success-solid',
  warning: 'fill-warning-solid/20 stroke-warning-solid',
  danger: 'fill-danger-solid/15 stroke-danger-solid',
};

/** Centres an element on its point, then undoes the layer's zoom and rotation so it keeps its size and stays upright. */
const uprightClasses =
  'absolute [translate:-50%_-50%] [rotate:calc(var(--rux-image-rotation)*-1deg)] [scale:calc(1/var(--rux-image-scale))]';

/** Positions an element at an image point, in percentages of the layer. */
function at(point: AnnotationPoint): CSSProperties {
  return { left: `${point.x * 100}%`, top: `${point.y * 100}%` };
}

const corners: readonly { corner: RectCorner; x: 0 | 1; y: 0 | 1 }[] = [
  { corner: 'nw', x: 0, y: 0 },
  { corner: 'ne', x: 1, y: 0 },
  { corner: 'sw', x: 0, y: 1 },
  { corner: 'se', x: 1, y: 1 },
];

const handleClasses = cn(
  uprightClasses,
  'hit-area size-3.5 rounded-sm border-2 border-fg bg-surface-2 shadow-overlay',
);

export interface AnnotationOverlayProps {
  annotations: readonly Annotation[];
  /** Each annotation's number in the list. */
  numbers: ReadonlyMap<string, number>;
  selectedId: string | null;
  /** Points of a polygon being drawn. */
  draft: readonly AnnotationPoint[] | null;
  isReadOnly: boolean;
}

export function AnnotationOverlay({
  annotations,
  numbers,
  selectedId,
  draft,
  isReadOnly,
}: AnnotationOverlayProps) {
  const selected = annotations.find((annotation) => annotation.id === selectedId);
  const hasHandles = !isReadOnly && selected !== undefined && draft === null;
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <svg
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 size-full overflow-visible"
      >
        {annotations.map((annotation) => {
          if (annotation.kind === 'pin') {
            return null;
          }
          const isSelected = annotation.id === selectedId;
          const classes = cn(
            'pointer-events-auto cursor-pointer',
            shapeClasses[annotation.tone ?? 'accent'],
          );
          const strokeWidth = isSelected ? 3.5 : 2;
          return annotation.kind === 'rect' ? (
            <rect
              key={annotation.id}
              data-annotation-id={annotation.id}
              x={annotation.x}
              y={annotation.y}
              width={annotation.width}
              height={annotation.height}
              vectorEffect="non-scaling-stroke"
              strokeWidth={strokeWidth}
              className={classes}
            />
          ) : (
            <polygon
              key={annotation.id}
              data-annotation-id={annotation.id}
              points={svgPoints(annotation.points)}
              vectorEffect="non-scaling-stroke"
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              className={classes}
            />
          );
        })}
        {draft !== null && draft.length > 1 && (
          <polyline
            points={svgPoints(draft)}
            vectorEffect="non-scaling-stroke"
            strokeWidth={2}
            strokeLinejoin="round"
            className="fill-none stroke-accent-solid"
          />
        )}
      </svg>
      {annotations.map((annotation) => {
        const isSelected = annotation.id === selectedId;
        return (
          <span
            key={annotation.id}
            data-annotation-id={annotation.id}
            data-annotation-marker=""
            className={cn(
              uprightClasses,
              'hit-area flex size-7 cursor-pointer items-center justify-center rounded-full text-xs font-semibold shadow-overlay ring-2 ring-surface-2 select-none',
              toneSolidClasses[annotation.tone ?? 'accent'],
              isSelected && 'outline-2 outline-offset-2 outline-fg',
            )}
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the marker sits on its image point.
            style={at(annotationAnchor(annotation))}
          >
            {numbers.get(annotation.id)}
          </span>
        );
      })}
      {hasHandles &&
        selected.kind === 'rect' &&
        corners.map(({ corner, x, y }) => (
          <span
            key={corner}
            data-annotation-id={selected.id}
            data-annotation-handle={corner}
            className={cn(
              handleClasses,
              corner === 'nw' || corner === 'se' ? 'cursor-nwse-resize' : 'cursor-nesw-resize',
            )}
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the handle sits on its corner.
            style={at({ x: selected.x + selected.width * x, y: selected.y + selected.height * y })}
          />
        ))}
      {hasHandles &&
        selected.kind === 'polygon' &&
        selected.points.map((point, index) => (
          <span
            // A polygon's points have no ids; their order identifies them.
            key={index}
            data-annotation-id={selected.id}
            data-annotation-handle={`vertex-${index}`}
            className={cn(handleClasses, 'cursor-move rounded-full')}
            // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the handle sits on its point.
            style={at(point)}
          />
        ))}
      {draft?.map((point, index) => (
        <span
          // Draft points have no ids; their order identifies them.
          key={index}
          data-annotation-handle={index === 0 ? 'draft-start' : undefined}
          className={cn(
            handleClasses,
            'rounded-full',
            index === 0 && draft.length >= 3 && 'size-5 cursor-pointer border-accent-solid',
          )}
          // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the point sits where it was placed.
          style={at(point)}
        />
      ))}
    </div>
  );
}
