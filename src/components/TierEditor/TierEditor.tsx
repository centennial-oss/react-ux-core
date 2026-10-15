import { Plus, Trash2 } from 'lucide-react';
import { useId, type Ref } from 'react';
import { useLocale } from 'react-aria-components';
import { useMessages } from '../../provider/context';
import type { CoreMessages } from '../../provider/messages';
import { cn } from '../../utils/cn';
import { mergeRefs } from '../../utils/mergeRefs';
import { useControllableState } from '../../utils/useControllableState';
import { useElementWidth } from '../../utils/useElementWidth';
import { Button } from '../Button/Button';
import type { FieldBaseProps } from '../Field/Field';
import { IconButton } from '../IconButton/IconButton';
import { NumberField } from '../NumberField/NumberField';
import { useRowValue, type RowValueProps } from '../RowEditor/rowValue';
import { appendTier, validateTiers, type Tier, type TierIssue, type Tiers } from './tiers';

interface TierEditorBaseProps<V> extends Omit<FieldBaseProps, 'labelPosition' | 'infoTip'> {
  value?: Tiers<V>;
  defaultValue?: Tiers<V>;
  onChange?: (value: Tiers<V>) => void;
  /** Lets the last tier be open-ended (no upper bound). Defaults to true. */
  allowsOpenEnd?: boolean;
  /** Where the first tier starts when the list is empty. Defaults to 0. */
  firstFrom?: number;
  /** `Intl.NumberFormat` options for the bounds. */
  boundFormatOptions?: Intl.NumberFormatOptions;
  /** The bounds' unit ("kWh"). */
  boundUnit?: string;
  /** The value column's heading. Defaults to the `value` message. */
  valueLabel?: string;
  isInvalid?: boolean;
  isDisabled?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

export type TierEditorProps<V = number> = TierEditorBaseProps<V> & RowValueProps<V>;

function issueText(
  issue: TierIssue,
  messages: CoreMessages,
  format: (value: number) => string,
): string {
  switch (issue.kind) {
    case 'endNotAfterStart':
    case 'openNotAllowed':
      return messages.tierEndAfterStart;
    case 'notContiguous':
      return messages.tierShouldStartAt({ value: format(issue.expectedFrom) });
    case 'openNotLast':
      return messages.tierOnlyLastOpen;
  }
}

/**
 * An editor for contiguous numeric tiers (`from → to → value`), for example usage bands with a price per unit. Each
 * tier should start where the previous one ends; the last can be open-ended. Adding a tier starts it at the last
 * tier's upper bound. Wide containers show a table; narrow ones a card per tier.
 */
export function TierEditor<V = number>(props: TierEditorProps<V>) {
  const {
    label,
    description,
    errorMessage,
    value,
    defaultValue = [],
    onChange,
    allowsOpenEnd = true,
    firstFrom = 0,
    boundFormatOptions,
    boundUnit,
    valueLabel,
    isInvalid = false,
    isDisabled = false,
    className,
    ref,
  } = props;
  const messages = useMessages();
  const { locale } = useLocale();
  const labelId = useId();
  const issuesId = useId();
  const [tiers, setTiers] = useControllableState<Tiers<V>>(value, defaultValue, onChange);
  const [widthRef, width] = useElementWidth();
  const isWide = (width ?? 0) >= 640;
  const fieldLabel = (text: string) => (isWide ? { 'aria-label': text } : { label: text });
  const { newRowValue, renderField } = useRowValue<V>(props);
  const boundFormat = new Intl.NumberFormat(locale, boundFormatOptions);
  const formatBound = (bound: number) =>
    `${boundFormat.format(bound)}${boundUnit === undefined ? '' : ` ${boundUnit}`}`;
  const validation = validateTiers(tiers, { allowsOpenEnd });
  const columnLabel = valueLabel ?? messages.value;

  const update = (index: number, patch: Partial<Tier<V>>) => {
    setTiers(tiers.map((tier, at) => (at === index ? { ...tier, ...patch } : tier)));
  };
  const columns = 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_2.75rem]';
  const showAppError =
    isInvalid && errorMessage !== undefined && typeof errorMessage !== 'function';

  return (
    <div
      ref={mergeRefs(ref, widthRef)}
      role="group"
      aria-labelledby={label !== undefined ? labelId : undefined}
      aria-describedby={showAppError ? issuesId : undefined}
      className={cn('flex min-w-0 flex-col gap-3 text-sm text-fg', className)}
    >
      {label !== undefined && (
        <span id={labelId} className="font-medium">
          {label}
        </span>
      )}
      {description !== undefined && (
        <span className="-mt-2 text-xs text-fg-muted">{description}</span>
      )}
      {isWide && (
        <div
          aria-hidden="true"
          className={cn('grid gap-3 px-1 text-xs font-medium text-fg-muted', columns)}
        >
          <span>{messages.from}</span>
          <span>{messages.to}</span>
          <span>{columnLabel}</span>
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {tiers.map((tier, index) => {
          const issues = validation.rows.get(index) ?? [];
          const rangeText =
            tier.to === null
              ? messages.openRange({ from: formatBound(tier.from) })
              : messages.range({ from: formatBound(tier.from), to: formatBound(tier.to) });
          const issueId = `${issuesId}-${String(index)}`;
          return (
            <li key={index}>
              <div
                role="group"
                aria-label={rangeText}
                aria-describedby={issues.length > 0 ? issueId : undefined}
                className={cn(
                  'grid',
                  isWide
                    ? cn(columns, 'items-start gap-3 p-1')
                    : 'grid-cols-2 gap-2 rounded-card border border-border p-3',
                  !isWide && issues.length > 0 && 'border-danger-border',
                )}
              >
                <NumberField
                  {...fieldLabel(messages.from)}
                  value={tier.from}
                  onChange={(next) => {
                    update(index, { from: next ?? 0 });
                  }}
                  formatOptions={boundFormatOptions}
                  suffix={boundUnit}
                  isInvalid={issues.some((issue) => issue.kind === 'notContiguous')}
                  isDisabled={isDisabled}
                />
                <NumberField
                  {...fieldLabel(messages.to)}
                  value={tier.to}
                  // Empty is open-ended: no upper bound.
                  placeholder={messages.noUpperLimit}
                  onChange={(next) => {
                    update(index, { to: next });
                  }}
                  formatOptions={boundFormatOptions}
                  suffix={boundUnit}
                  isInvalid={issues.some((issue) => issue.kind !== 'notContiguous')}
                  isDisabled={isDisabled}
                />
                <div className={isWide ? undefined : 'col-span-2'}>
                  {renderField({
                    ...fieldLabel(columnLabel),
                    value: tier.value,
                    onChange: (next) => {
                      update(index, { value: next });
                    },
                    isDisabled,
                  })}
                </div>
                <IconButton
                  icon={Trash2}
                  aria-label={messages.removeRow({ range: rangeText })}
                  onPress={() => {
                    setTiers(tiers.filter((_, at) => at !== index));
                  }}
                  isDisabled={isDisabled}
                  className={isWide ? 'mt-0.5' : 'col-span-2 justify-self-end'}
                />
                {issues.length > 0 && (
                  <ul
                    id={issueId}
                    className="col-span-full flex flex-col text-xs font-medium text-danger-fg"
                  >
                    {issues.map((issue, at) => (
                      <li key={at}>{issueText(issue, messages, formatBound)}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <Button
        variant="outline"
        size="sm"
        icon={Plus}
        onPress={() => {
          setTiers(appendTier(tiers, newRowValue, firstFrom));
        }}
        isDisabled={isDisabled}
        className="self-start"
      >
        {messages.addTier}
      </Button>
      {showAppError && (
        <p id={issuesId} className="text-xs font-medium text-danger-fg">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
