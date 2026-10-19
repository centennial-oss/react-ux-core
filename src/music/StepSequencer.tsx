// StepSequencer (FR-069): a rows × steps grid of toggle cells for drum patterns. Each cell holds a velocity (0 is
// off), drawn as how full the cell is. A press toggles a cell; dragging with a mouse or pen paints the same state
// across cells; on touch a tap toggles and a swipe scrolls. The grid is one tab stop: arrow keys move between cells
// (and to the row names, which audition the row's sound), Space or Enter toggles, and plus or minus change velocity.
// The step that's playing (`currentStep`) is highlighted down the grid.

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from 'react';
import { cn } from '../utils/cn';
import { clamp } from '../utils/math';
import { useControllableState } from '../utils/useControllableState';
import { useMusicMessages } from './messages';

export interface StepSequencerRow {
  id: string;
  /** The row's name, such as "Kick". */
  label: string;
}

/** Velocity (1–127) per step for each row id; 0 is off. */
export type StepPattern = Record<string, number[]>;

export interface StepSequencerProps {
  rows: readonly StepSequencerRow[];
  /** Steps per row. Defaults to 16. */
  stepCount?: number;
  /** The pattern, controlled. Rows missing from it are all off. */
  value?: Readonly<Record<string, readonly number[]>>;
  /** The initial pattern, uncontrolled. */
  defaultValue?: Readonly<Record<string, readonly number[]>>;
  onChange?: (value: StepPattern) => void;
  /** The step that's playing (0-based), highlighted down the grid. */
  currentStep?: number;
  /** Called when a row name is pressed or a step turned on, so the app can play the row's sound. */
  onAudition?: (rowId: string) => void;
  /** Steps per beat, for shading beat groups. Defaults to 4. */
  stepsPerBeat?: number;
  /** Velocity of a step when it's turned on. Defaults to 100. */
  defaultVelocity?: number;
  isDisabled?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const EMPTY_PATTERN: Readonly<Record<string, readonly number[]>> = {};
/** How much plus and minus change a step's velocity. */
const VELOCITY_STEP = 16;

interface Cell {
  row: number;
  /** -1 is the row's name. */
  step: number;
}

/** A drum-machine style grid of steps with velocities. */
export function StepSequencer({
  rows,
  stepCount: steps = 16,
  value,
  defaultValue = EMPTY_PATTERN,
  onChange,
  currentStep,
  onAudition,
  stepsPerBeat = 4,
  defaultVelocity = 100,
  isDisabled = false,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
  ref,
}: StepSequencerProps) {
  const messages = useMusicMessages();
  const instructionsId = useId();
  const velocityId = useId();
  const [pattern, setPattern] = useControllableState<Readonly<Record<string, readonly number[]>>>(
    value,
    defaultValue,
    onChange as ((next: Readonly<Record<string, readonly number[]>>) => void) | undefined,
  );
  const latest = useRef(pattern);
  useLayoutEffect(() => {
    latest.current = pattern;
  });
  const gridRef = useRef<HTMLDivElement>(null);
  const hasNames = onAudition !== undefined;
  const [focus, setFocus] = useState<Cell>({ row: 0, step: 0 });
  const focusRow = Math.min(focus.row, Math.max(0, rows.length - 1));
  const focusStep = Math.min(focus.step, steps - 1);

  const velocityOf = (rowId: string, step: number) => latest.current[rowId]?.[step] ?? 0;
  const setStep = (rowId: string, step: number, velocity: number) => {
    const current = latest.current;
    if ((current[rowId]?.[step] ?? 0) === velocity) {
      return;
    }
    const next: StepPattern = {};
    for (const row of rows) {
      next[row.id] = Array.from({ length: steps }, (_, index) => current[row.id]?.[index] ?? 0);
    }
    const target = next[rowId] ?? Array.from({ length: steps }, () => 0);
    target[step] = velocity;
    next[rowId] = target;
    latest.current = next;
    setPattern(next);
    if (velocity > 0) {
      onAudition?.(rowId);
    }
  };
  const toggle = (rowId: string, step: number) => {
    const velocity = velocityOf(rowId, step) > 0 ? 0 : defaultVelocity;
    setStep(rowId, step, velocity);
    return velocity;
  };

  const moveFocus = (cell: Cell) => {
    const row = clamp(cell.row, 0, rows.length - 1);
    const step = clamp(cell.step, hasNames ? -1 : 0, steps - 1);
    setFocus({ row, step });
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-cell="${String(row)}:${String(step)}"]`)
      ?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, cell: Cell) => {
    const first = hasNames ? -1 : 0;
    const isControl = event.ctrlKey || event.metaKey;
    const moves: Record<string, Cell> = {
      ArrowLeft: { row: cell.row, step: cell.step - 1 },
      ArrowRight: { row: cell.row, step: cell.step + 1 },
      ArrowUp: { row: cell.row - 1, step: cell.step },
      ArrowDown: { row: cell.row + 1, step: cell.step },
      Home: isControl ? { row: 0, step: first } : { row: cell.row, step: first },
      End: isControl
        ? { row: rows.length - 1, step: steps - 1 }
        : { row: cell.row, step: steps - 1 },
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      moveFocus(move);
      return;
    }
    const row = rows[cell.row];
    if (!row || cell.step < 0 || isDisabled) {
      return;
    }
    const change =
      event.key === '+' || event.key === '=' ? 1 : event.key === '-' || event.key === '_' ? -1 : 0;
    if (change !== 0) {
      event.preventDefault();
      const velocity = velocityOf(row.id, cell.step);
      const next = Math.max(
        1,
        Math.min(127, (velocity || defaultVelocity) + change * VELOCITY_STEP),
      );
      setStep(row.id, cell.step, next);
    }
  };

  // Mouse and pen drags paint: the first cell's new state is applied to every cell the pointer passes over.
  const paint = useRef<{ pointerId: number; velocity: number } | null>(null);
  /** Whether the last press was a mouse or pen press, which toggled on press (so its click mustn't toggle again). */
  const isPaintPress = useRef(false);
  const cellAt = (x: number, y: number): { rowId: string; step: number } | null => {
    const element = document.elementFromPoint(x, y);
    const target = element instanceof Element ? element.closest<HTMLElement>('[data-step]') : null;
    if (!target || !gridRef.current?.contains(target)) {
      return null;
    }
    return { rowId: target.dataset.row ?? '', step: Number(target.dataset.step) };
  };
  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, rowId: string, step: number) => {
    isPaintPress.current = event.pointerType !== 'touch';
    if (isDisabled || !isPaintPress.current || event.button !== 0) {
      return;
    }
    paint.current = { pointerId: event.pointerId, velocity: toggle(rowId, step) };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = paint.current;
    if (current?.pointerId !== event.pointerId) {
      return;
    }
    const cell = cellAt(event.clientX, event.clientY);
    if (cell) {
      setStep(cell.rowId, cell.step, current.velocity);
    }
  };
  const endPaint = (event: PointerEvent<HTMLDivElement>) => {
    if (paint.current?.pointerId === event.pointerId) {
      paint.current = null;
    }
  };

  const stepIndexes = Array.from({ length: steps }, (_, index) => index);
  const cellWidth = 'min-w-9 flex-1 pointer-coarse:min-w-11';

  return (
    <div
      ref={ref}
      className={cn(
        'relative min-w-0 overflow-x-auto overscroll-x-contain rounded-card border border-border bg-surface-1',
        className,
      )}
    >
      {/* Pointer handling here paints across the cells inside; every cell is a button. */}
      <div
        ref={gridRef}
        role="grid"
        aria-label={ariaLabelledBy ? undefined : (ariaLabel ?? messages.stepSequencerLabel)}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={instructionsId}
        aria-rowcount={rows.length + 1}
        aria-colcount={steps + 1}
        aria-disabled={isDisabled || undefined}
        className="flex w-full min-w-fit flex-col gap-1 p-2"
        onPointerMove={onPointerMove}
        onPointerUp={endPaint}
        onPointerCancel={endPaint}
      >
        <div role="row" aria-rowindex={1} className="flex gap-1">
          <div
            role="columnheader"
            aria-colindex={1}
            className="sticky left-0 z-10 flex w-20 shrink-0 items-end bg-surface-1 text-xs font-medium text-fg-muted sm:w-24"
          >
            <span className="sr-only">{messages.stepSequencerSounds}</span>
          </div>
          {stepIndexes.map((step) => {
            const isCurrent = step === currentStep;
            return (
              <div
                key={step}
                role="columnheader"
                aria-colindex={step + 2}
                data-current={isCurrent || undefined}
                className={cn(
                  cellWidth,
                  'border-b-2 border-transparent pb-0.5 text-center text-xs text-fg-muted tabular-nums',
                  step % stepsPerBeat === 0 && 'font-medium text-fg',
                  isCurrent && 'border-accent-solid font-semibold text-accent-fg',
                )}
              >
                {step + 1}
              </div>
            );
          })}
        </div>
        {rows.map((row, rowIndex) => (
          <div key={row.id} role="row" aria-rowindex={rowIndex + 2} className="flex gap-1">
            <div
              role="rowheader"
              aria-colindex={1}
              className="sticky left-0 z-10 flex w-20 shrink-0 items-center bg-surface-1 pe-1 sm:w-24"
            >
              {hasNames ? (
                <button
                  type="button"
                  data-cell={`${String(rowIndex)}:-1`}
                  tabIndex={focusRow === rowIndex && focusStep === -1 ? 0 : -1}
                  disabled={isDisabled}
                  aria-label={messages.stepSequencerAudition({ row: row.label })}
                  className="hit-area relative w-full truncate rounded-control px-2 py-1.5 text-start text-sm font-medium text-fg outline-none hover:bg-surface-2 focus-visible:focus-ring disabled:opacity-50"
                  onFocus={() => {
                    setFocus({ row: rowIndex, step: -1 });
                  }}
                  onKeyDown={(event) => {
                    onKeyDown(event, { row: rowIndex, step: -1 });
                  }}
                  onClick={() => {
                    onAudition(row.id);
                  }}
                >
                  {row.label}
                </button>
              ) : (
                <span className="truncate px-2 text-sm font-medium text-fg">{row.label}</span>
              )}
            </div>
            {stepIndexes.map((step) => {
              const velocity = pattern[row.id]?.[step] ?? 0;
              const isOn = velocity > 0;
              const isCurrent = step === currentStep;
              const isBeatStart = step % stepsPerBeat === 0;
              const isEvenBeat = Math.floor(step / stepsPerBeat) % 2 === 0;
              return (
                <div
                  key={step}
                  role="gridcell"
                  aria-colindex={step + 2}
                  className={cn(cellWidth, 'flex')}
                >
                  <button
                    type="button"
                    data-cell={`${String(rowIndex)}:${String(step)}`}
                    data-row={row.id}
                    data-step={step}
                    data-current={isCurrent || undefined}
                    tabIndex={focusRow === rowIndex && focusStep === step ? 0 : -1}
                    disabled={isDisabled}
                    aria-pressed={isOn}
                    aria-label={messages.stepSequencerCell({ row: row.label, step: step + 1 })}
                    aria-describedby={
                      isOn ? `${velocityId}-${String(rowIndex)}-${String(step)}` : undefined
                    }
                    className={cn(
                      'relative flex h-9 w-full cursor-pointer items-end overflow-hidden rounded-control border outline-none pointer-coarse:h-11',
                      'focus-visible:z-10 focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-50',
                      isEvenBeat ? 'border-border bg-surface-2' : 'border-border bg-surface-3',
                      isBeatStart && 'border-border-strong',
                      isCurrent && 'border-accent-solid bg-accent-bg',
                      isOn && 'border-accent-solid',
                    )}
                    onFocus={() => {
                      setFocus({ row: rowIndex, step });
                    }}
                    onKeyDown={(event) => {
                      onKeyDown(event, { row: rowIndex, step });
                    }}
                    onPointerDown={(event) => {
                      onPointerDown(event, row.id, step);
                    }}
                    onClick={(event) => {
                      // Keyboard clicks have no detail; a mouse or pen press already toggled on press.
                      if (event.detail > 0 && isPaintPress.current) {
                        return;
                      }
                      toggle(row.id, step);
                    }}
                  >
                    {isOn && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none w-full rounded-[inherit] bg-accent-solid"
                        // Dynamic geometry: the fill shows the step's velocity.
                        // eslint-disable-next-line no-restricted-syntax -- see above.
                        style={{ height: `${String(Math.round((velocity / 127) * 100))}%` }}
                      />
                    )}
                  </button>
                  {isOn && (
                    <span id={`${velocityId}-${String(rowIndex)}-${String(step)}`} hidden>
                      {messages.stepSequencerVelocity({ velocity })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <span id={instructionsId} hidden>
        {messages.stepSequencerInstructions}
      </span>
    </div>
  );
}
