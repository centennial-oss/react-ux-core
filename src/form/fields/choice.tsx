import { useId } from 'react';
import type { Key } from 'react-aria-components';
import { Checkbox } from '../../components/Checkbox/Checkbox';
import { CheckboxGroup } from '../../components/Checkbox/CheckboxGroup';
import { ComboBox } from '../../components/ComboBox/ComboBox';
import { Option } from '../../components/ListBox/ListBoxParts';
import { MultiSelect } from '../../components/MultiSelect/MultiSelect';
import { Radio, RadioGroup } from '../../components/RadioGroup/RadioGroup';
import { Pillbox } from '../../components/Pillbox/Pillbox';
import { Select } from '../../components/Select/Select';

import type {
  CheckboxGroupFieldConfig,
  ComboBoxFieldConfig,
  FieldOption,
  FieldRendererProps,
  MultiSelectFieldConfig,
  RadioFieldConfig,
  PillboxFieldConfig,
  SelectFieldConfig,
} from '../types';
import {
  blurWithin,
  describedBy,
  FieldHeading,
  FieldNotes,
  frameProps,
  staticOptions,
  useLoadedOptions,
} from './shared';
import { useFormMessages } from '../messages';

function renderOption(option: FieldOption) {
  return (
    <Option
      id={option.id}
      textValue={option.label}
      icon={option.icon}
      description={option.description}
      isDisabled={option.isDisabled}
    >
      {option.label}
    </Option>
  );
}

function asKey(value: unknown): Key | null {
  return typeof value === 'string' || typeof value === 'number' ? value : null;
}

function asKeys(value: unknown): Key[] {
  return Array.isArray(value)
    ? value.filter((key): key is Key => typeof key === 'string' || typeof key === 'number')
    : [];
}

/** `select` fields: one choice from static or loaded items. */
export function SelectRenderer({
  field,
  config,
}: FieldRendererProps<SelectFieldConfig<unknown>, Key | null>) {
  const messages = useFormMessages();
  const { options, isLoading } = useLoadedOptions(field, config.items, config.loadItems);
  return (
    <Select
      {...frameProps(field, config)}
      items={options}
      value={asKey(field.value)}
      onChange={field.onChange}
      placeholder={isLoading ? messages.loading : config.placeholder}
      isDisabled={field.isDisabled || isLoading}
    >
      {renderOption}
    </Select>
  );
}

/** `combobox` fields: one choice, filtered as the user types; `loadItems` gets the typed text. */
export function ComboBoxRenderer({
  field,
  config,
}: FieldRendererProps<ComboBoxFieldConfig<unknown>, Key | null>) {
  const { loadItems } = config;
  const { getValues } = field;
  return (
    <ComboBox
      // A reload starts a fresh search.
      key={field.reloadKey}
      {...frameProps(field, config)}
      items={loadItems ? undefined : staticOptions(config.items)}
      loadItems={
        loadItems && ((query: string, signal: AbortSignal) => loadItems(query, getValues(), signal))
      }
      value={asKey(field.value)}
      onChange={field.onChange}
      placeholder={config.placeholder}
    >
      {renderOption}
    </ComboBox>
  );
}

/** `multiselect` fields: several choices as chips, filtered as the user types. */
export function MultiSelectRenderer({
  field,
  config,
}: FieldRendererProps<MultiSelectFieldConfig<unknown>, readonly Key[]>) {
  const { loadItems } = config;
  const { getValues } = field;
  return (
    <div onBlur={blurWithin(field.onBlur)}>
      <MultiSelect
        key={field.reloadKey}
        label={config.label}
        description={config.description}
        infoTip={config.infoTip}
        errorMessage={field.errorMessage}
        isInvalid={field.isInvalid}
        isRequired={field.isRequired}
        isDisabled={field.isDisabled || field.isReadOnly}
        items={loadItems ? undefined : staticOptions(config.items)}
        loadItems={
          loadItems &&
          ((query: string, signal: AbortSignal) => loadItems(query, getValues(), signal))
        }
        getItemLabel={(option) => option.label}
        value={asKeys(field.value)}
        onChange={field.onChange}
        placeholder={config.placeholder}
      >
        {renderOption}
      </MultiSelect>
    </div>
  );
}

/** `radio` fields: one choice from a short list, all visible. */
export function RadioRenderer({
  field,
  config,
}: FieldRendererProps<RadioFieldConfig<unknown>, string | null>) {
  const value = asKey(field.value);
  return (
    <RadioGroup
      {...frameProps(field, config)}
      value={value === null ? null : String(value)}
      onChange={field.onChange}
      orientation={config.orientation}
    >
      {staticOptions(config.items).map((option) => (
        <Radio
          key={option.id}
          value={String(option.id)}
          description={option.description}
          isDisabled={option.isDisabled}
        >
          {option.label}
        </Radio>
      ))}
    </RadioGroup>
  );
}

/** `checkboxGroup` fields: several choices from a short list, all visible. */
export function CheckboxGroupRenderer({
  field,
  config,
}: FieldRendererProps<CheckboxGroupFieldConfig<unknown>, readonly string[]>) {
  return (
    <CheckboxGroup
      {...frameProps(field, config)}
      value={asKeys(field.value).map(String)}
      onChange={field.onChange}
      orientation={config.orientation}
    >
      {staticOptions(config.items).map((option) => (
        <Checkbox
          key={option.id}
          value={String(option.id)}
          description={option.description}
          isDisabled={option.isDisabled}
        >
          {option.label}
        </Checkbox>
      ))}
    </CheckboxGroup>
  );
}

/** `pillbox` fields: one choice from a few options, as joined buttons. */
export function PillboxRenderer({
  field,
  config,
}: FieldRendererProps<PillboxFieldConfig<unknown>, string>) {
  const labelId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const options = staticOptions(config.items).map((option) => ({
    id: String(option.id),
    label: option.label,
    icon: option.icon,
    isDisabled: option.isDisabled,
  }));
  const value = asKey(field.value);
  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-sm" onBlur={blurWithin(field.onBlur)}>
      <FieldHeading
        id={labelId}
        label={config.label}
        infoTip={config.infoTip}
        isRequired={field.isRequired}
      />
      <Pillbox
        aria-labelledby={labelId}
        aria-describedby={describedBy([
          config.description !== undefined && descriptionId,
          field.errorMessage !== undefined && errorId,
        ])}
        options={options}
        value={value === null ? (options[0]?.id ?? '') : String(value)}
        onChange={field.onChange}
        isDisabled={field.isDisabled || field.isReadOnly}
      />
      <FieldNotes
        description={config.description}
        descriptionId={descriptionId}
        errorMessage={field.errorMessage}
        errorId={errorId}
      />
    </div>
  );
}
