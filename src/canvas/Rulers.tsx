// Rulers along the canvas's top and left edges, in world units, with ticks at a "nice" step that stays about 64 px
// apart at any zoom. They're decorative (hidden from assistive technology): positions are announced by items.
import { useNumberFormat } from '../utils/intl';
import { useCanvas } from './context';
import { niceStep } from './geometry';

/** Tick values from `start` across `length` screen pixels. */
function ticks(start: number, length: number, step: number, zoom: number): number[] {
  const first = Math.ceil(start / step);
  const values: number[] = [];
  for (let index = first; (index * step - start) * zoom <= length && values.length < 200; index++) {
    // `|| 0` turns -0 into 0, so the origin isn't labelled "-0".
    values.push(index * step || 0);
  }
  return values;
}

export function Rulers({ unit }: { unit: string }) {
  const { viewport, size } = useCanvas();
  const format = useNumberFormat({ maximumFractionDigits: 2 });
  const step = niceStep(64 / viewport.zoom);
  const columns = ticks(viewport.x, size.width, step, viewport.zoom);
  const rows = ticks(viewport.y, size.height, step, viewport.zoom);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute top-0 left-0 flex size-6 items-center justify-center overflow-hidden border-r border-b border-border bg-surface-2 text-[10px] text-fg-muted">
        {unit}
      </div>
      <svg className="absolute top-0 left-6 h-6 w-[calc(100%-1.5rem)] border-b border-border bg-surface-2 text-fg-muted">
        {columns.map((value) => {
          const x = (value - viewport.x) * viewport.zoom;
          return (
            <g key={value}>
              <line x1={x} x2={x} y1={14} y2={24} className="stroke-border-strong" />
              <text x={x + 3} y={11} className="fill-current text-[10px]">
                {format.format(value)}
              </text>
            </g>
          );
        })}
      </svg>
      <svg className="absolute top-6 left-0 h-[calc(100%-1.5rem)] w-6 border-r border-border bg-surface-2 text-fg-muted">
        {rows.map((value) => {
          const y = (value - viewport.y) * viewport.zoom;
          return (
            <g key={value}>
              <line x1={14} x2={24} y1={y} y2={y} className="stroke-border-strong" />
              <text
                x={11}
                y={y + 3}
                textAnchor="end"
                transform={`rotate(-90 11 ${String(y + 3)})`}
                className="fill-current text-[10px]"
              >
                {format.format(value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
