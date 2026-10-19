// The content of the time range picker's popover or sheet: presets first, then relative and absolute entry, and
// Apply. It mounts when the overlay opens, so its draft starts from the current value each time.

import { fromDate, now as zonedNow, type ZonedDateTime } from '@internationalized/date';
import { useContext, useId, useState } from 'react';
import {
  Input,
  ListBox,
  ListBoxItem,
  NumberField,
  OverlayTriggerStateContext,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  useLocale,
} from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { timeRangeStrings } from '../../provider/coreStrings';
import { cn } from '../../utils/cn';
import { hoverSurfaceClasses, selectedSolidClasses } from '../../utils/stateClasses';
import { useIsPhone } from '../../utils/useMediaQuery';
import { Button } from '../Button/Button';
import { DateTimePicker } from '../DatePicker/DateTimePicker';
import { inputClasses, inputGroupClasses } from '../Field/Field';
import { formatTimeAmount, formatTimeUnit, type TimeRangePreset } from './labels';
import {
  isSameTimeRange,
  lastAmount,
  resolveTimeRange,
  type TimeRange,
  type TimeUnit,
} from './resolveTimeRange';

/** Units offered by the relative entry. */
const RELATIVE_UNITS = ['m', 'h', 'd', 'w', 'M'] as const satisfies readonly TimeUnit[];
type RelativeUnit = (typeof RELATIVE_UNITS)[number];

function isRelativeUnit(unit: TimeUnit): unit is RelativeUnit {
  return (RELATIVE_UNITS as readonly TimeUnit[]).includes(unit);
}

const presetItemClasses = [
  'flex min-h-hit cursor-pointer items-center rounded-control px-2 py-1.5 text-sm text-fg outline-none select-none',
  hoverSurfaceClasses,
  'data-focus-visible:focus-ring',
  'data-selected:bg-accent-bg data-selected:font-semibold data-selected:text-accent-fg',
].join(' ');

const tabClasses = [
  'hit-area relative flex h-8 flex-1 cursor-pointer items-center justify-center rounded-[calc(var(--radius-control)-2px)] px-3 text-sm font-medium text-fg-muted outline-none select-none',
  'data-hovered:text-fg data-focus-visible:focus-ring',
  'data-selected:bg-surface-2 data-selected:text-fg data-selected:shadow-raised',
].join(' ');

const unitClasses = [
  'hit-area relative inline-flex h-8 min-w-hit cursor-pointer items-center justify-center rounded-control border border-border-strong px-2.5 text-sm text-fg select-none',
  'data-hovered:bg-surface-3 data-focus-visible:focus-ring',
  'data-selected:border-transparent',
  selectedSolidClasses,
].join(' ');

/** Truncates to the minute, the pickers' granularity. */
function toMinute(date: ZonedDateTime): ZonedDateTime {
  return date.set({ second: 0, millisecond: 0 });
}

export interface TimeRangePanelProps {
  /** The committed range, which seeds the draft. */
  value: TimeRange | null;
  presets: readonly TimeRangePreset[];
  timeZone: string;
  hourCycle?: 12 | 24;
  /** Commits a range; the panel closes itself afterwards. */
  onApply: (value: TimeRange) => void;
}

export function TimeRangePanel({
  value,
  presets,
  timeZone,
  hourCycle,
  onApply,
}: TimeRangePanelProps) {
  const messages = useEntryMessages(timeRangeStrings);
  const { locale } = useLocale();
  const isPhone = useIsPhone();
  const state = useContext(OverlayTriggerStateContext);
  const presetsId = useId();
  const previewId = useId();

  const last = lastAmount(value);
  const [mode, setMode] = useState<'relative' | 'absolute'>(
    value !== null && last === null ? 'absolute' : 'relative',
  );
  const [amount, setAmount] = useState(last?.amount ?? 24);
  const [unit, setUnit] = useState<RelativeUnit>(
    last !== null && isRelativeUnit(last.unit) ? last.unit : 'h',
  );
  // The absolute entry starts from the current range's instants, so switching tabs shows the same range.
  const [initialRange] = useState(() => {
    if (value === null) {
      return null;
    }
    try {
      const { start, end } = resolveTimeRange(value, Date.now(), timeZone);
      return { start: toMinute(fromDate(start, timeZone)), end: toMinute(fromDate(end, timeZone)) };
    } catch {
      return null;
    }
  });
  const [start, setStart] = useState<ZonedDateTime | null>(initialRange?.start ?? null);
  const [end, setEnd] = useState<ZonedDateTime | null>(initialRange?.end ?? null);

  const isAmountValid = Number.isInteger(amount) && amount >= 1;
  const labelAmount = isAmountValid ? amount : 1;
  const isValid =
    mode === 'relative' ? isAmountValid : start !== null && end !== null && start.compare(end) < 0;

  const apply = (range: TimeRange) => {
    onApply(range);
    state?.close();
  };

  const selectedPreset = presets.find((preset) => isSameTimeRange(preset.value, value));

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      {presets.length > 0 && (
        <section className="flex flex-col gap-1 sm:w-44 sm:shrink-0 sm:border-e sm:border-border sm:pe-3">
          <span id={presetsId} className="px-2 text-xs font-medium text-fg-muted">
            {messages.timeRangePresets}
          </span>
          <ListBox
            // In the popover, focus starts on the current preset (or the first), so arrow keys and Enter work at once:
            // focus moving into an opened dialog, not autofocus on page load. A phone sheet moves focus in itself once
            // it has slid in; focusing earlier would interrupt the slide.
            // eslint-disable-next-line jsx-a11y/no-autofocus -- see above
            autoFocus={!isPhone}
            aria-labelledby={presetsId}
            items={presets}
            selectionMode="single"
            selectedKeys={selectedPreset ? [selectedPreset.id] : []}
            onSelectionChange={(keys) => {
              // Pressing the current preset deselects it (an empty set); treat that as choosing it again.
              const key = keys === 'all' ? undefined : ([...keys][0] ?? selectedPreset?.id);
              const preset = presets.find((candidate) => candidate.id === key);
              if (preset) {
                apply(preset.value);
              }
            }}
            className="flex flex-col gap-0.5 outline-none"
          >
            {(preset) => (
              <ListBoxItem id={preset.id} textValue={preset.label} className={presetItemClasses}>
                {preset.label}
              </ListBoxItem>
            )}
          </ListBox>
        </section>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:w-80">
        <Tabs
          selectedKey={mode}
          onSelectionChange={(key) => {
            setMode(key === 'absolute' ? 'absolute' : 'relative');
          }}
          className="flex flex-col gap-3"
        >
          <TabList className="flex rounded-control bg-surface-3 p-0.5">
            <Tab id="relative" className={tabClasses}>
              {messages.timeRangeRelative}
            </Tab>
            <Tab id="absolute" className={tabClasses}>
              {messages.timeRangeAbsolute}
            </Tab>
          </TabList>
          <TabPanel id="relative" className="flex flex-col gap-2 outline-none">
            <p id={previewId} className="text-sm font-medium text-fg">
              {messages.timeRangeLast({
                amount: formatTimeAmount(labelAmount, unit, locale),
              })}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <NumberField
                aria-label={messages.timeRangeAmount}
                aria-describedby={previewId}
                value={amount}
                onChange={setAmount}
                minValue={1}
                maxValue={999_999}
                step={1}
                formatOptions={{ maximumFractionDigits: 0, useGrouping: false }}
                className="w-20"
              >
                <div className={cn(inputGroupClasses, 'h-10')}>
                  <Input className={inputClasses} />
                </div>
              </NumberField>
              <ToggleButtonGroup
                aria-label={messages.timeRangeUnit}
                aria-describedby={previewId}
                selectionMode="single"
                disallowEmptySelection
                selectedKeys={[unit]}
                onSelectionChange={(keys) => {
                  const chosen = RELATIVE_UNITS.find((candidate) => keys.has(candidate));
                  if (chosen) {
                    setUnit(chosen);
                  }
                }}
                className="flex flex-wrap gap-1.5"
              >
                {RELATIVE_UNITS.map((relativeUnit) => (
                  <ToggleButton key={relativeUnit} id={relativeUnit} className={unitClasses}>
                    {formatTimeUnit(relativeUnit, labelAmount, locale)}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </div>
          </TabPanel>
          <TabPanel id="absolute" className="flex flex-col gap-3 outline-none">
            <DateTimePicker
              label={messages.from}
              value={start}
              onChange={setStart}
              maxValue={end}
              timeZone={timeZone}
              hourCycle={hourCycle}
              validationBehavior="aria"
            />
            <div className="flex flex-col items-end gap-1">
              <DateTimePicker
                label={messages.to}
                value={end}
                onChange={setEnd}
                minValue={start}
                timeZone={timeZone}
                hourCycle={hourCycle}
                validationBehavior="aria"
                className="w-full"
              />
              <Button
                variant="link"
                size="sm"
                onPress={() => {
                  setEnd(toMinute(zonedNow(timeZone)));
                }}
              >
                {messages.now}
              </Button>
            </div>
          </TabPanel>
        </Tabs>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onPress={() => {
              state?.close();
            }}
          >
            {messages.cancel}
          </Button>
          <Button
            tone="accent"
            isDisabled={!isValid}
            onPress={() => {
              if (mode === 'relative') {
                apply({ kind: 'relative', from: `-${String(amount)}${unit}`, to: 'now' });
              } else if (start && end) {
                apply({
                  kind: 'absolute',
                  start: start.toAbsoluteString(),
                  end: end.toAbsoluteString(),
                });
              }
            }}
          >
            {messages.apply}
          </Button>
        </div>
      </div>
    </div>
  );
}
