// Flowsheet: observations over time (vital signs, lab results, sensor readings, QA measurements) with reference
// ranges. Rows are observations under group headings, columns are times, and the first column sticks while the times
// scroll. It's a read-only ARIA grid: one tab stop, arrow keys between cells, and each cell's tooltip (on focus,
// hover or tap) gives the flag, reference range and note. A row header opens a small trend chart.

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { Button as AriaButton, Focusable, useLocale } from 'react-aria-components';
import { Popover, PopoverTrigger } from '../components/Popover/Popover';
import { Tooltip } from '../components/Tooltip/Tooltip';
import { useTimeZone } from '../provider/context';
import { cn } from '../utils/cn';
import { dateTimeFormat } from '../utils/intl';
import { nextGridCell } from './gridNav';
import { useTableMessages } from './messages';
import { ObservationTrend } from './ObservationTrend';
import {
  criticalText,
  flagName,
  flagSeverity,
  rangeText,
  resolveFlag,
  timeOf,
  valueFormatter,
  type FlagSeverity,
  type Observation,
  type ObservationValue,
} from './reference';
import { ReferenceValue } from './ReferenceValue';

export interface FlowsheetProps {
  observations: readonly Observation[];
  values: readonly ObservationValue[];
  /** Column times; defaults to the distinct value times. */
  columns?: readonly (Date | number | string)[];
  /** Defaults to `newest-first`, so the latest values sit next to the labels (and show first on phones). */
  order?: 'newest-first' | 'oldest-first';
  /** IANA time zone for the column times. Defaults to UIProvider's `timeZone`. */
  timeZone?: string;
  /** Called when an observation's row header is pressed (besides opening its trend chart). */
  onObservationPress?: (id: string) => void;
  /** Row headers open a small trend chart with the reference range as a band. Defaults to true. */
  hasTrend?: boolean;
  /** The tallest the grid grows before it scrolls, as a CSS length. Defaults to no limit. */
  maxHeight?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

interface Group {
  label: string | undefined;
  observations: Observation[];
}

const cellToneClasses: Record<FlagSeverity, string> = {
  normal: 'bg-surface-1',
  abnormal: 'bg-warning-bg',
  critical: 'bg-danger-bg',
};

/**
 * Observations over time with reference ranges: vital signs and lab results, sensor readings, QA measurements. Rows
 * are observations (grouped), columns are times (newest first by default) with a sticky first column. Out-of-range
 * values show a flag letter and a tone, critical values a stronger tone and an icon, and source flags take priority
 * over the ranges. Flags are spelled out for screen readers. It's a read-only grid: Tab enters it, the arrow keys,
 * Home, End, Page Up and Page Down move between cells, and a focused cell shows its reference range and note.
 *
 * Clinical apps carry regulatory obligations. CCUX provides display and accessibility only: validating units,
 * reference ranges and flags stays the app's (and its data source's) job.
 */
export function Flowsheet({
  observations,
  values,
  columns,
  order = 'newest-first',
  timeZone,
  onObservationPress,
  hasTrend = true,
  maxHeight,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
  ref,
}: FlowsheetProps) {
  const messages = useTableMessages();
  const { locale, direction } = useLocale();
  const defaultTimeZone = useTimeZone();
  const zone = timeZone ?? defaultTimeZone;
  const gridRef = useRef<HTMLTableElement>(null);
  const [active, setActive] = useState<{ row: string; col: number } | null>(null);

  const times = useMemo(() => {
    const source = columns ?? values.map((value) => value.at);
    const distinct = [...new Set(source.map(timeOf))].filter((time) => !Number.isNaN(time));
    distinct.sort((a, b) => (order === 'newest-first' ? b - a : a - b));
    return distinct;
  }, [columns, values, order]);

  // The value shown in each cell: the last one given for that observation and time.
  const cells = useMemo(() => {
    const map = new Map<string, ObservationValue>();
    for (const value of values) {
      map.set(`${value.observationId}|${String(timeOf(value.at))}`, value);
    }
    return map;
  }, [values]);

  const groups = useMemo(() => {
    const result: Group[] = [];
    for (const observation of observations) {
      const group = result.find((candidate) => candidate.label === observation.group);
      if (group) {
        group.observations.push(observation);
      } else {
        result.push({ label: observation.group, observations: [observation] });
      }
    }
    return result;
  }, [observations]);
  const rowIds = groups.flatMap((group) => group.observations.map((observation) => observation.id));
  const lastCol = times.length;
  const activeRow = active && rowIds.includes(active.row) ? active.row : rowIds[0];
  const activeCol = active ? Math.min(active.col, lastCol) : 0;

  const dateFormat = dateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: zone,
  });
  const timeFormat = dateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: zone,
  });

  const findTarget = (row: string, col: number) =>
    gridRef.current?.querySelector<HTMLElement>(
      `[data-flow-row="${CSS.escape(row)}"][data-flow-col="${String(col)}"]`,
    ) ?? null;

  // One tab stop: the active cell's target; the rest are reached with the arrow keys.
  useLayoutEffect(() => {
    for (const element of gridRef.current?.querySelectorAll<HTMLElement>('[data-flow-col]') ?? []) {
      element.tabIndex =
        element.dataset.flowRow === activeRow && element.dataset.flowCol === String(activeCol)
          ? 0
          : -1;
    }
  });

  const onKeyDownCapture = (event: KeyboardEvent<HTMLTableElement>) => {
    const target = event.target as HTMLElement;
    if (target.dataset.flowCol === undefined || !event.currentTarget.contains(target)) {
      return;
    }
    const rowIndex = rowIds.indexOf(target.dataset.flowRow ?? '');
    const col = Number(target.dataset.flowCol);
    const next = nextGridCell(event.key, {
      isCtrl: event.ctrlKey || event.metaKey,
      isRtl: direction === 'rtl',
      row: rowIndex,
      col,
      lastRow: rowIds.length - 1,
      lastCol,
    });
    if (!next) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const [nextRowIndex, nextCol] = next;
    const row = rowIds[nextRowIndex];
    if (row !== undefined) {
      setActive({ row, col: nextCol });
      findTarget(row, nextCol)?.focus();
    }
  };

  const navProps = (row: string, col: number) => ({
    'data-flow-row': row,
    'data-flow-col': String(col),
    onFocus: () => {
      if (active?.row !== row || active.col !== col) {
        setActive({ row, col });
      }
    },
  });

  const rowHeader = (observation: Observation) => {
    const format = valueFormatter(locale, observation.unit, observation.formatOptions);
    const range = rangeText(observation.referenceRange, format.withUnit, messages);
    const content = (
      <span className="flex min-w-0 flex-col gap-0.5 text-start">
        <span className="font-medium break-words text-fg">{observation.label}</span>
        {(observation.unit !== undefined || range !== undefined) && (
          <span className="text-xs font-normal break-words text-fg-muted">
            {range ?? observation.unit}
          </span>
        )}
      </span>
    );
    const isPressable = hasTrend || onObservationPress !== undefined;
    if (!isPressable) {
      return content;
    }
    const button = (
      <AriaButton
        {...navProps(observation.id, 0)}
        onPress={() => {
          onObservationPress?.(observation.id);
        }}
        className="-mx-1 flex w-[calc(100%+0.5rem)] cursor-pointer rounded-sm px-1 py-0.5 outline-none data-focus-visible:focus-ring data-hovered:bg-surface-3"
      >
        {content}
      </AriaButton>
    );
    if (!hasTrend) {
      return button;
    }
    return (
      <PopoverTrigger>
        {button}
        <Popover
          aria-label={messages.flowsheetShowTrend({ label: observation.label })}
          placement="end"
          className="w-[min(20rem,calc(100vw-3rem))]"
        >
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-fg">
              {observation.unit === undefined
                ? observation.label
                : messages.flowsheetTrendTitle({
                    label: observation.label,
                    unit: observation.unit,
                  })}
            </p>
            <ObservationTrend observation={observation} values={values} timeZone={zone} />
          </div>
        </Popover>
      </PopoverTrigger>
    );
  };

  const valueCell = (observation: Observation, time: number, col: number) => {
    const value = cells.get(`${observation.id}|${String(time)}`);
    const format = valueFormatter(locale, observation.unit, observation.formatOptions);
    const flag = value
      ? resolveFlag({
          value: value.value,
          referenceRange: observation.referenceRange,
          criticalRange: observation.criticalRange,
          flag: value.flag,
        })
      : undefined;
    const severity = flagSeverity(flag);
    const target = (
      <span
        {...navProps(observation.id, col)}
        // The grid cell itself (its <td> is presentational) and its focus target (roving tabindex set by the effect
        // above), so keyboard users reach every value, and the tooltip describes a cell screen readers announce.
        role="gridcell"
        tabIndex={-1}
        className="relative flex justify-end rounded-sm px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
      >
        <ReferenceValue
          value={value?.value}
          unit={observation.unit}
          isUnitHidden
          referenceRange={observation.referenceRange}
          criticalRange={observation.criticalRange}
          flag={value?.flag}
          note={value?.note}
          formatOptions={observation.formatOptions}
          className="items-end"
        />
      </span>
    );
    const tooltipLines: ReactNode[] = [];
    if (value) {
      if (flag !== undefined && flag !== 'N') {
        tooltipLines.push(flagName(flag, messages));
      }
      const range = rangeText(observation.referenceRange, format.withUnit, messages);
      if (range !== undefined) {
        tooltipLines.push(messages.referenceRange({ range }));
      }
      const critical = criticalText(observation.criticalRange, format.withUnit, messages);
      if (critical !== undefined && severity === 'critical') {
        tooltipLines.push(messages.referenceCriticalLimits({ range: critical }));
      }
      if (value.note !== undefined) {
        tooltipLines.push(messages.referenceNote({ note: value.note }));
      }
    }
    return (
      <td
        key={time}
        // The cell role is on the focusable span inside, so the tooltip's description is announced with it.
        // eslint-disable-next-line jsx-a11y/no-interactive-element-to-noninteractive-role -- see above.
        role="none"
        data-severity={severity}
        className={cn('relative border-s border-border p-0.5 text-end', cellToneClasses[severity])}
      >
        {tooltipLines.length > 0 ? (
          <Tooltip
            content={
              <span className="flex flex-col">
                {tooltipLines.map((line, index) => (
                  <span key={index}>{line}</span>
                ))}
              </span>
            }
          >
            <Focusable>{target}</Focusable>
          </Tooltip>
        ) : (
          target
        )}
      </td>
    );
  };

  return (
    <div
      ref={ref}
      // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the app's maximum height.
      style={maxHeight === undefined ? undefined : { maxHeight }}
      className={cn(
        'relative w-full min-w-0 overflow-auto rounded-card border border-border text-sm text-fg',
        className,
      )}
    >
      <table
        ref={gridRef}
        role="grid"
        aria-readonly="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        onKeyDownCapture={onKeyDownCapture}
        className="w-full border-separate border-spacing-0"
      >
        <thead className="sticky top-0 z-[2]">
          <tr role="row">
            <th
              role="columnheader"
              scope="col"
              className="sticky start-0 z-[1] min-w-36 border-b border-border bg-surface-2 px-3 py-2 text-start text-xs font-semibold text-fg-muted"
            >
              {messages.flowsheetObservation}
            </th>
            {times.map((time) => (
              <th
                key={time}
                role="columnheader"
                scope="col"
                className="min-w-22 border-s border-b border-border bg-surface-2 px-3 py-2 text-end text-xs font-semibold whitespace-nowrap text-fg-muted"
              >
                <time dateTime={new Date(time).toISOString()} className="flex flex-col">
                  <span>{dateFormat.format(time)}</span>
                  <span className="font-normal">{timeFormat.format(time)}</span>
                </time>
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((group, groupIndex) => (
          <tbody key={group.label ?? `group-${String(groupIndex)}`}>
            {group.label !== undefined && (
              <tr role="row">
                <th
                  role="rowheader"
                  scope="rowgroup"
                  colSpan={times.length + 1}
                  className="border-b border-border bg-surface-3 px-0 py-1.5 text-start text-xs font-semibold tracking-wide text-fg uppercase"
                >
                  <span className="sticky start-0 px-3">{group.label}</span>
                </th>
              </tr>
            )}
            {group.observations.map((observation) => (
              <tr key={observation.id} role="row" className="[&>*]:border-b [&>*]:border-border">
                <th
                  role="rowheader"
                  scope="row"
                  {...(hasTrend || onObservationPress !== undefined
                    ? {}
                    : { ...navProps(observation.id, 0), tabIndex: -1 })}
                  className="sticky start-0 z-[1] max-w-56 min-w-36 bg-surface-2 px-3 py-1.5 align-middle font-normal outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
                >
                  {rowHeader(observation)}
                </th>
                {times.map((time, index) => valueCell(observation, time, index + 1))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
