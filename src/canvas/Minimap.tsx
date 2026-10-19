// The minimap: the whole content in a small box in the bottom-right corner, with the visible area outlined. Pressing
// or dragging in it centres the view there. It's a pointer shortcut only (hidden from assistive technology); the
// keyboard pans the canvas directly. The items are drawn as one path in a memoized layer, so panning redraws only the
// outline.
import { memo, useRef, type PointerEvent } from 'react';
import { capturePointer } from '../utils/pointer';
import { useCanvas } from './context';
import { visibleRect, type CanvasRect } from './geometry';

const WIDTH = 144;
const HEIGHT = 96;
const PADDING = 6;

interface Frame {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const MinimapItems = memo(function MinimapItems({
  rects,
  scale,
  offsetX,
  offsetY,
}: { rects: readonly CanvasRect[] } & Frame) {
  const path = rects
    .map((rect) => {
      const x = (rect.x * scale + offsetX).toFixed(1);
      const y = (rect.y * scale + offsetY).toFixed(1);
      const width = Math.max(1, rect.width * scale).toFixed(1);
      const height = Math.max(1, rect.height * scale).toFixed(1);
      return `M${x} ${y}h${width}v${height}h-${width}z`;
    })
    .join('');
  return <path d={path} className="fill-fg-muted opacity-60" />;
});

export function Minimap({
  rects,
  bounds,
}: {
  rects: readonly CanvasRect[];
  bounds: CanvasRect | null;
}) {
  const { viewport, size, setViewport } = useCanvas();
  const isDragging = useRef(false);
  if (!bounds || size.width === 0) {
    return null;
  }
  const visible = visibleRect(viewport, size);
  const fits =
    visible.x <= bounds.x &&
    visible.y <= bounds.y &&
    visible.x + visible.width >= bounds.x + bounds.width &&
    visible.y + visible.height >= bounds.y + bounds.height;
  if (fits) {
    return null;
  }
  const scale = Math.min(
    (WIDTH - PADDING * 2) / Math.max(bounds.width, 1),
    (HEIGHT - PADDING * 2) / Math.max(bounds.height, 1),
  );
  const offsetX = (WIDTH - bounds.width * scale) / 2 - bounds.x * scale;
  const offsetY = (HEIGHT - bounds.height * scale) / 2 - bounds.y * scale;

  const centreAt = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const worldX = (event.clientX - rect.left - offsetX) / scale;
    const worldY = (event.clientY - rect.top - offsetY) / scale;
    setViewport({
      x: worldX - size.width / 2 / viewport.zoom,
      y: worldY - size.height / 2 / viewport.zoom,
      zoom: viewport.zoom,
    });
  };

  return (
    <div
      aria-hidden="true"
      data-canvas-minimap=""
      className="absolute right-2 bottom-2 z-10 overflow-hidden rounded-control border border-border bg-surface-2 shadow-raised"
    >
      <svg
        width={WIDTH}
        height={HEIGHT}
        className="block touch-none"
        onPointerDown={(event) => {
          isDragging.current = true;
          capturePointer(event.currentTarget, event.pointerId);
          centreAt(event);
        }}
        onPointerMove={(event) => {
          if (isDragging.current) {
            centreAt(event);
          }
        }}
        onPointerUp={() => {
          isDragging.current = false;
        }}
        onPointerCancel={() => {
          isDragging.current = false;
        }}
      >
        <MinimapItems rects={rects} scale={scale} offsetX={offsetX} offsetY={offsetY} />
        <rect
          x={visible.x * scale + offsetX}
          y={visible.y * scale + offsetY}
          width={visible.width * scale}
          height={visible.height * scale}
          className="fill-accent-bg/30 stroke-accent-solid"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}
