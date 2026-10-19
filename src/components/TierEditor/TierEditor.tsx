import { useId, type Ref } from 'react';
import { useLocale } from 'react-aria-components';
import { useEntryMessages } from '../../provider/context';
import { rangeEditorStrings, type CommonMessages } from '../../provider/coreStrings';
import { numberFormat } from '../../utils/intl';
import { mergeRefs } from '../../utils/mergeRefs';
import { useControllableState } from '../../utils/useControllableState';
import type { FieldBaseProps } from '../Field/Field';
import { PlainFieldError, shownError } from '../Field/PlainField';
import { NumberField } from '../NumberField/NumberField';
import { useRowLayout } from '../RowEditor/rowLayout';
import {
  AddRowButton,
  RemoveRowButton,
  RowCard,
  RowHeadings,
  RowShell,
} from '../RowEditor/RowShell';
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
  messages: CommonMessages & typeof rangeEditorStrings,
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
  const messages = useEntryMessages(rangeEditorStrings);
  const { locale } = useLocale();
  const issuesId = useId();
  const [tiers, setTiers] = useControllableState<Tiers<V>>(value, defaultValue, onChange);
  const { ref: widthRef, isWide, fieldLabel } = useRowLayout();
  const { newRowValue, renderField } = useRowValue<V>(props);
  const boundFormat = numberFormat(locale, boundFormatOptions);
  const formatBound = (bound: number) =>
    `${boundFormat.format(bound)}${boundUnit === undefined ? '' : ` ${boundUnit}`}`;
  const validation = validateTiers(tiers, { allowsOpenEnd });
  const columnLabel = valueLabel ?? messages.value;

  const update = (index: number, patch: Partial<Tier<V>>) => {
    setTiers(tiers.map((tier, at) => (at === index ? { ...tier, ...patch } : tier)));
  };
  const columns = 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_2.75rem]';
  const appError = shownError(isInvalid, errorMessage);

  return (
    <RowShell
      ref={mergeRefs(ref, widthRef)}
      label={label}
      description={description}
      aria-describedby={appError !== undefined ? issuesId : undefined}
      className={className}
    >
      {isWide && (
        <RowHeadings columns={columns} headings={[messages.from, messages.to, columnLabel]} />
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
              <RowCard
                isWide={isWide}
                columns={columns}
                cardColumns="grid-cols-2"
                aria-label={rangeText}
                issueId={issueId}
                issues={issues.map((issue) => issueText(issue, messages, formatBound))}
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
                <RemoveRowButton
                  isWide={isWide}
                  aria-label={messages.removeRow({ range: rangeText })}
                  onPress={() => {
                    setTiers(tiers.filter((_, at) => at !== index));
                  }}
                  isDisabled={isDisabled}
                />
              </RowCard>
            </li>
          );
        })}
      </ul>
      <AddRowButton
        onPress={() => {
          setTiers(appendTier(tiers, newRowValue, firstFrom));
        }}
        isDisabled={isDisabled}
        className="self-start"
      >
        {messages.addTier}
      </AddRowButton>
      <PlainFieldError id={issuesId}>{appError}</PlainFieldError>
    </RowShell>
  );
}
