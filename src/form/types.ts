// Public types for ConfigForm: the form config (fields, layout, validation, actions), submit results, and the field
// API that built-in and custom renderers receive.

import type { CalendarDate, Time, ZonedDateTime } from '@internationalized/date';
import type { DeepKeys, DeepKeysOfType, DeepValue, StandardSchemaV1 } from '@tanstack/react-form';
import type { ReactNode } from 'react';
import type { Key } from 'react-aria-components';
import type { DateRange } from '../components/DatePicker/DateRangePicker';
import type { MaskValueFormat } from '../components/MaskedField/MaskedField';
import type { OneTimeCodeCharacters } from '../components/OneTimeCodeField/code';
import type { UploadFunction } from '../components/FileField/files';
import type { TimeRange } from '../components/TimeRangePicker/resolveTimeRange';
import type { IconComponent } from '../utils/icon';
import type { Mask, MaskTokens } from '../utils/mask';
import type { FeedbackTone, Tone } from '../utils/types';

/** A path in `V` whose value is a `T` (an optional value matches too), for example `'address.city'`. */
export type FieldPath<V, T> = DeepKeys<V> & DeepKeysOfType<V, T | undefined>;

/** Any path in `V`. Array items use brackets: `'contacts[0].email'`. */
export type AnyFieldPath<V> = DeepKeys<V>;

/** How a field's empty value is submitted: left out, `null`, or an empty string. */
export type EmptyAs = 'omit' | 'null' | 'empty-string';

/** Columns a field spans in a multi-column section, or the full row. */
export type FieldColSpan = 1 | 2 | 3 | 4 | 'full';

/** A validation message, or nothing when the value is valid. */
export type FieldValidationResult = string | null | undefined;

/**
 * Validates one field. It receives the field's value, all current values, and a signal that aborts when a newer
 * validation starts. Return a message, or nothing when valid. It may be async; `debounceMs` delays async calls.
 */
export type FieldValidator<V, T> = (
  value: T,
  values: V,
  signal: AbortSignal,
) => FieldValidationResult | Promise<FieldValidationResult>;

/**
 * Keeps a field consistent with fields it depends on. When any of `fields` changes, the field is reset to empty
 * (`'reset'`), reset and its items reloaded (`'reload'`), or given new values by a function that returns a partial
 * update of the form. The update happens together with the parent's change.
 */
export interface FieldDependency<V> {
  fields: readonly AnyFieldPath<V>[];
  onChange: 'reset' | 'reload' | ((values: V) => DeepPartial<V>);
}

/** A recursive partial of `V`, used for patches and dependent updates. */
export type DeepPartial<V> = V extends readonly unknown[]
  ? V
  : V extends object
    ? { [K in keyof V]?: DeepPartial<V[K]> }
    : V;

/** Keys shared by every input field. */
export interface FieldCommon<V, T> {
  /** The visible label. */
  label: ReactNode;
  /** Help text under the input. */
  description?: ReactNode;
  /** Extra help behind an info button next to the label. */
  infoTip?: ReactNode;
  /** The value must not be empty: an empty string, `null`, an empty list, or an unchecked checkbox fails. */
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  /** Field-level validation, in addition to `isRequired` and the form schema. */
  validate?: FieldValidator<V, T>;
  /** Delay for an async `validate`, in milliseconds. Defaults to 300. */
  debounceMs?: number;
  /** Shows the field only while this returns true. Hidden fields aren't validated or submitted (by default). */
  visibleWhen?: (values: V) => boolean;
  /** Disables the field while this returns true. */
  disabledWhen?: (values: V) => boolean;
  dependsOn?: FieldDependency<V>;
  /** Columns spanned in a multi-column section. Defaults to 1. Phones always use one column. */
  colSpan?: FieldColSpan;
  /** How the field's empty value is submitted. Defaults to the form's `emptyAs`. */
  emptyAs?: EmptyAs;
  /** How view mode shows the value. Defaults to a readable rendering of the value for the field type. */
  formatValue?: (value: T, values: V) => ReactNode;
}

export interface TextFieldConfig<V> extends FieldCommon<V, string> {
  type: 'text' | 'email' | 'phone' | 'url' | 'password';
  name: FieldPath<V, string>;
  placeholder?: string;
  /** Overrides the autofill hint chosen for the type. */
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
  /** Content before the input, such as a currency code. */
  prefix?: ReactNode;
  /** Content after the input, such as a unit. */
  suffix?: ReactNode;
}

export interface TextAreaFieldConfig<V> extends FieldCommon<V, string> {
  type: 'textarea';
  name: FieldPath<V, string>;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  maxLength?: number;
  /** Shows a character counter (with `maxLength`). */
  hasCharacterCount?: boolean;
}

export interface NumberFieldConfig<V> extends FieldCommon<V, number | null> {
  type: 'number';
  name: FieldPath<V, number | null>;
  placeholder?: string;
  minValue?: number;
  maxValue?: number;
  step?: number;
  /** Number formatting (`Intl.NumberFormat` options), such as fraction digits. */
  formatOptions?: Intl.NumberFormatOptions;
  /** A unit shown after the number, such as "kWh". */
  unit?: string;
  hasStepper?: boolean;
}

/**
 * A money amount in `currency`. With `moneyAs: 'decimal'` (the default) the value is a decimal string such as
 * `"12.50"`; with `'minor'` it's an integer in minor units such as `1250`. Never a floating-point amount.
 */
export interface MoneyFieldConfig<V> extends FieldCommon<V, string | number | null> {
  type: 'money';
  name: FieldPath<V, string | number | null>;
  /** ISO 4217 code, such as `USD`. */
  currency: string;
  moneyAs?: 'decimal' | 'minor';
  /** Digits after the decimal point. Defaults to the currency's standard (2 for USD, 0 for JPY). */
  minorUnits?: number;
  /** Limits in major units (dollars, not cents). */
  minValue?: number;
  maxValue?: number;
  placeholder?: string;
}

/**
 * A percentage. With `percentAs: 'fraction'` (the default) 25 % is stored as `0.25`, as `Intl` formats it; with
 * `'whole'` it's stored as `25`.
 */
export interface PercentFieldConfig<V> extends FieldCommon<V, number | null> {
  type: 'percent';
  name: FieldPath<V, number | null>;
  percentAs?: 'fraction' | 'whole';
  /** Limits in the stored form (fractions by default). */
  minValue?: number;
  maxValue?: number;
  /** Digits after the decimal point in the shown percentage. Defaults to 0. */
  maximumFractionDigits?: number;
  placeholder?: string;
}

/** A choice in a select, combo box, multi-select, radio group, checkbox group or pillbox. */
export interface FieldOption {
  id: Key;
  label: string;
  description?: string;
  icon?: IconComponent;
  isDisabled?: boolean;
}

/** Static choices, or choices computed from the current values (for lists that depend on other fields). */
export type FieldOptions<V> = readonly FieldOption[] | ((values: V) => readonly FieldOption[]);

/** Loads choices. It receives the typed text (combo boxes), the current values and an abort signal. */
export type FieldOptionsLoader<V> = (
  query: string,
  values: V,
  signal: AbortSignal,
) => Promise<readonly FieldOption[]>;

interface ChoiceSource<V> {
  /** The choices. Give `items` or `loadItems`. */
  items?: FieldOptions<V>;
  /** Loads the choices; reloaded when a `dependsOn` parent changes with `onChange: 'reload'`. */
  loadItems?: FieldOptionsLoader<V>;
}

export interface SelectFieldConfig<V> extends FieldCommon<V, Key | null>, ChoiceSource<V> {
  type: 'select';
  name: FieldPath<V, Key | null>;
  placeholder?: string;
}

export interface ComboBoxFieldConfig<V> extends FieldCommon<V, Key | null>, ChoiceSource<V> {
  type: 'combobox';
  name: FieldPath<V, Key | null>;
  placeholder?: string;
}

export interface MultiSelectFieldConfig<V> extends FieldCommon<V, readonly Key[]>, ChoiceSource<V> {
  type: 'multiselect';
  name: FieldPath<V, readonly Key[]>;
  placeholder?: string;
}

/** Free-text values as tags (keywords, email addresses), held as a list of strings. */
export interface TagsFieldConfig<V> extends FieldCommon<V, readonly string[]> {
  type: 'tags';
  name: FieldPath<V, readonly string[]>;
  placeholder?: string;
  /** Tags to suggest, filtered as the user types. */
  suggestions?: readonly string[];
  /** With `suggestions`, `false` accepts only tags from the list. Defaults to true. */
  allowsCustomValue?: boolean;
  /** Text that ends a tag as it's typed or pasted, besides Enter. Defaults to `[',']`. */
  delimiters?: readonly string[];
  /** Checks each tag: a message marks the tag invalid and fails the field's validation. */
  validateTag?: (tag: string) => FieldValidationResult;
  /** Allows the same tag more than once. Defaults to false. */
  allowsDuplicates?: boolean;
  /** At least this many tags, once there are any (`isRequired` asks for at least one). */
  minItems?: number;
  /** The most tags; the field refuses more. */
  maxItems?: number;
  /** Tags can be dragged into order. Defaults to false. */
  isReorderable?: boolean;
}

export interface CheckboxGroupFieldConfig<V> extends FieldCommon<V, readonly string[]> {
  type: 'checkboxGroup';
  name: FieldPath<V, readonly string[]>;
  items: FieldOptions<V>;
  orientation?: 'vertical' | 'horizontal';
}

export interface RadioFieldConfig<V> extends FieldCommon<V, string | null> {
  type: 'radio';
  name: FieldPath<V, string | null>;
  items: FieldOptions<V>;
  orientation?: 'vertical' | 'horizontal';
}

export interface PillboxFieldConfig<V> extends FieldCommon<V, string> {
  type: 'pillbox';
  name: FieldPath<V, string>;
  items: FieldOptions<V>;
}

export interface CheckboxFieldConfig<V> extends FieldCommon<V, boolean> {
  type: 'checkbox';
  name: FieldPath<V, boolean>;
}

export interface SwitchFieldConfig<V> extends FieldCommon<V, boolean> {
  type: 'switch';
  name: FieldPath<V, boolean>;
}

/** A star rating: a number of icons (or halves), or `null` for none. View mode shows the stars. */
export interface RatingFieldConfig<V> extends FieldCommon<V, number | null> {
  type: 'rating';
  name: FieldPath<V, number | null>;
  /** The highest rating: the number of icons. Defaults to 5. */
  maxValue?: number;
  /** `0.5` allows half icons. Defaults to 1. */
  step?: 1 | 0.5;
  /** Defaults to a star. */
  icon?: IconComponent;
  /** Defaults to `warning` (gold). */
  tone?: Tone;
  /** Choosing the current rating again clears it. Defaults to true unless `isRequired`. */
  isClearable?: boolean;
}

/** A one-time code (verification code, PIN) as a string; a code shorter than its length fails validation. */
export interface OneTimeCodeFieldConfig<V> extends FieldCommon<V, string> {
  type: 'oneTimeCode';
  name: FieldPath<V, string>;
  /** The number of characters. Defaults to the sum of `groupSizes`, or 6. */
  codeLength?: number;
  /** Cells per visual group, such as `[3, 3]`. */
  groupSizes?: readonly number[];
  /** `digits` (the default), `alphanumeric` (uppercased) or a pattern each character must match. */
  allowedCharacters?: OneTimeCodeCharacters;
  /** Shows dots instead of the characters, here and in view mode. */
  isMasked?: boolean;
}

/**
 * Text in a pattern mask, such as a phone number, postal code or card number (see MaskedField). The value is the
 * typed characters alone, or the formatted text with `valueFormat: 'formatted'`; an incomplete value fails validation.
 * View mode shows the formatted text.
 */
export interface MaskedFieldConfig<V> extends FieldCommon<V, string> {
  type: 'masked';
  name: FieldPath<V, string>;
  /** The mask, such as `(999) 999-9999` or `A9A 9A9`, or a function of the raw value so far that returns one. */
  mask: Mask;
  /** Slot characters of your own, added to or replacing the built-in ones. */
  tokens?: MaskTokens;
  /** `raw` (the default) holds the typed characters alone; `formatted` holds them with the mask's literals. */
  valueFormat?: MaskValueFormat;
  /** Draws the rest of the mask while the field has focus, with this character in each empty slot. */
  placeholderChar?: string;
  placeholder?: string;
  /** An autofill hint, such as `tel-national`, `postal-code` or `cc-number`. */
  autoComplete?: string;
}

/** How date and time fields hold their value: `@internationalized/date` objects, or ISO 8601 strings. */
export type DateValueFormat = 'value' | 'iso';

export interface DateFieldConfig<V> extends FieldCommon<V, CalendarDate | string | null> {
  type: 'date';
  name: FieldPath<V, CalendarDate | string | null>;
  /** `value` (the default) holds a `CalendarDate`; `iso` holds `"2026-03-14"`. */
  valueFormat?: DateValueFormat;
  minValue?: CalendarDate;
  maxValue?: CalendarDate;
}

/** A date range held as ISO strings. */
export interface IsoDateRange {
  start: string;
  end: string;
}

export interface DateRangeFieldConfig<V> extends FieldCommon<V, DateRange | IsoDateRange | null> {
  type: 'dateRange';
  name: FieldPath<V, DateRange | IsoDateRange | null>;
  /** `value` (the default) holds `{ start, end }` as `CalendarDate`s; `iso` holds ISO date strings. */
  valueFormat?: DateValueFormat;
  minValue?: CalendarDate;
  maxValue?: CalendarDate;
  maxRangeDays?: number;
}

export interface TimeFieldConfig<V> extends FieldCommon<V, Time | string | null> {
  type: 'time';
  name: FieldPath<V, Time | string | null>;
  /** `value` (the default) holds a `Time`; `iso` holds `"17:30:00"`. */
  valueFormat?: DateValueFormat;
  granularity?: 'hour' | 'minute' | 'second';
}

export interface DateTimeFieldConfig<V> extends FieldCommon<V, ZonedDateTime | string | null> {
  type: 'dateTime';
  name: FieldPath<V, ZonedDateTime | string | null>;
  /** `value` (the default) holds a `ZonedDateTime`; `iso` holds a UTC instant such as `"2026-03-14T16:30:00Z"`. */
  valueFormat?: DateValueFormat;
  /** Defaults to the provider's time zone. */
  timeZone?: string;
}

export interface TimeRangeFieldConfig<V> extends FieldCommon<V, TimeRange | null> {
  type: 'timeRange';
  name: FieldPath<V, TimeRange | null>;
  timeZone?: string;
}

/** What view mode and the file list show for an uploaded file reference. */
export interface FileReferenceInfo {
  name: string;
  /** Size in bytes, when known. */
  size?: number;
}

interface FileOptions<R> {
  /** Accepted types: MIME types, wildcards (`image/*`) or extensions (`.csv`). */
  accept?: readonly string[];
  /** The largest file accepted, in bytes. */
  maxSize?: number;
  /**
   * Uploads one file when the form is submitted, before the create or update action runs. It resolves with the
   * reference to keep in the form value (`R`, for example a server id).
   */
  upload: UploadFunction<R>;
  /** Name (and size) of an uploaded reference, for the file list and view mode. */
  describeFile: (reference: R) => FileReferenceInfo;
}

/** A single file: a `File` until it's uploaded on submit, then the upload's reference `R`. */
export interface FileFieldConfig<V, R = unknown>
  extends FieldCommon<V, File | R | null>, FileOptions<R> {
  type: 'file';
  name: AnyFieldPath<V>;
}

/** Several files: `File`s until they're uploaded on submit, then the upload references `R`. */
export interface FilesFieldConfig<V, R = unknown>
  extends FieldCommon<V, readonly (File | R)[]>, FileOptions<R> {
  type: 'files';
  name: AnyFieldPath<V>;
  maxFiles?: number;
}

/** Read-only content in the form, such as a computed value or a note. */
export interface DisplayFieldConfig<V> {
  type: 'display';
  /** Identifies the item in layouts and as its React key. */
  id: string;
  label?: ReactNode;
  content: ReactNode | ((values: V) => ReactNode);
  visibleWhen?: (values: V) => boolean;
  colSpan?: FieldColSpan;
}

/** A divider between groups of fields, with an optional heading. */
export interface SeparatorFieldConfig<V> {
  type: 'separator';
  id: string;
  label?: ReactNode;
  visibleWhen?: (values: V) => boolean;
}

/** A message inside the form. */
export interface BannerFieldConfig<V> {
  type: 'banner';
  id: string;
  /** Defaults to `info`. */
  tone?: FeedbackTone;
  title?: ReactNode;
  content: ReactNode | ((values: V) => ReactNode);
  visibleWhen?: (values: V) => boolean;
}

/** The item type of an array value. */
export type ArrayItem<T> = NonNullable<T> extends readonly (infer I)[] ? I : never;

/** A repeating group of fields over an array value. Item fields' names are relative to the item. */
export interface ArrayFieldConfigFor<V, K, I> {
  type: 'array';
  name: K;
  label: ReactNode;
  description?: ReactNode;
  /** The fields of each item; their names are paths within the item. */
  fields: readonly FieldConfig<I>[];
  /** The value of a newly added item. */
  newItem: I | (() => I);
  minItems?: number;
  maxItems?: number;
  /** At least one item. */
  isRequired?: boolean;
  isDisabled?: boolean;
  /** A short summary of an item, shown in its header and when it's collapsed. Defaults to "Item 2". */
  itemLabel?: (item: I, index: number) => ReactNode;
  /** Label of the add button. Defaults to the `addItem` message. */
  addLabel?: string;
  /** Items can be collapsed to their summary. */
  isCollapsible?: boolean;
  /** Columns for each item's fields from tablet width up. Defaults to 1. */
  columns?: 1 | 2 | 3 | 4;
  visibleWhen?: (values: V) => boolean;
  disabledWhen?: (values: V) => boolean;
  colSpan?: FieldColSpan;
  emptyAs?: EmptyAs;
}

/** An array field over any array path of `V`. */
export type ArrayFieldConfig<V> = {
  [K in FieldPath<V, readonly unknown[]>]: ArrayFieldConfigFor<V, K, ArrayItem<DeepValue<V, K>>>;
}[FieldPath<V, readonly unknown[]>];

/** Every built-in field type. */
export type FieldConfig<V> =
  | TextFieldConfig<V>
  | TextAreaFieldConfig<V>
  | NumberFieldConfig<V>
  | MoneyFieldConfig<V>
  | PercentFieldConfig<V>
  | SelectFieldConfig<V>
  | ComboBoxFieldConfig<V>
  | MultiSelectFieldConfig<V>
  | TagsFieldConfig<V>
  | CheckboxGroupFieldConfig<V>
  | RadioFieldConfig<V>
  | PillboxFieldConfig<V>
  | CheckboxFieldConfig<V>
  | SwitchFieldConfig<V>
  | RatingFieldConfig<V>
  | OneTimeCodeFieldConfig<V>
  | MaskedFieldConfig<V>
  | DateFieldConfig<V>
  | DateRangeFieldConfig<V>
  | TimeFieldConfig<V>
  | DateTimeFieldConfig<V>
  | TimeRangeFieldConfig<V>
  | FileFieldConfig<V>
  | FilesFieldConfig<V>
  | DisplayFieldConfig<V>
  | SeparatorFieldConfig<V>
  | BannerFieldConfig<V>
  | ArrayFieldConfig<V>;

/**
 * A field of a type the app registered with `createFieldRegistry`. `options` reach the renderer as they are.
 * List the type names in `FormConfig`'s second type parameter.
 */
export interface CustomFieldConfig<
  V,
  TType extends string = string,
  TOptions = unknown,
> extends FieldCommon<V, unknown> {
  type: TType;
  name: AnyFieldPath<V>;
  options?: TOptions;
}

/** A named group of fields with an optional heading. */
export interface FormSection<V> {
  id: string;
  title?: ReactNode;
  description?: ReactNode;
  /** The section can be collapsed. */
  isCollapsible?: boolean;
  /** With `isCollapsible`, starts expanded. Defaults to true. */
  defaultExpanded?: boolean;
  /** Columns from tablet width up (the form's own width, not the screen's). Defaults to 1. */
  columns?: 1 | 2 | 3 | 4;
  /** The fields in this section, by name (or `id` for display items), in order. */
  fields: readonly (AnyFieldPath<V> | (string & {}))[];
}

/** A successful submit. */
export interface SubmitSuccess {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- `ok: true | false | 'confirm'` is the spec's result shape.
  ok: true;
  /** Shown in a success toast. */
  message?: ReactNode;
  /** Passed to `onSuccess`; the app navigates (the library has no router). */
  redirectTo?: string;
}

/** A failed submit. Field errors are keyed by field name (`'contacts[0].email'` or `'contacts.0.email'`). */
export interface SubmitFailure {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- `ok: true | false | 'confirm'` is the spec's result shape.
  ok: false;
  formError?: ReactNode;
  fieldErrors?: Readonly<Record<string, string>>;
}

/** The server wants the user to acknowledge `warning` and submit again (the action then gets `isConfirmed`). */
export interface SubmitNeedsConfirmation {
  ok: 'confirm';
  warning: ReactNode;
  /** Defaults to the `confirm` message. */
  confirmLabel?: string;
}

export type SubmitResult = SubmitSuccess | SubmitFailure | SubmitNeedsConfirmation;

/** What a create or update action receives besides the values. */
export interface SubmitContext<V> {
  /** Names of fields whose value differs from the defaults. */
  dirtyFields: readonly string[];
  /** Changed and cleared fields only, for PATCH-style APIs (`emptyAs` applied). */
  patch: DeepPartial<V>;
  /** True when resubmitting after a needs-confirmation result. */
  isConfirmed: boolean;
}

export type SubmitAction<V> = (values: V, context: SubmitContext<V>) => Promise<SubmitResult>;

/** Text for the delete confirmation. */
export interface DeleteConfirmation {
  title?: ReactNode;
  body?: ReactNode;
  /** Defaults to the `cannotBeUndone` message. */
  consequence?: ReactNode;
  /** The user must type this to enable Delete. */
  confirmPhrase?: string;
}

interface FormActionLabels {
  /** Overrides the Create or Save label. */
  submitLabel?: string;
}

/** A form that creates a record: one Create button. */
export interface CreateActions<V> extends FormActionLabels {
  create: SubmitAction<V>;
  update?: never;
  delete?: never;
}

/** A form that edits a record: Save, Revert (when changed) and Delete (when unchanged, if given). */
export interface UpdateActions<V> extends FormActionLabels {
  update: SubmitAction<V>;
  create?: never;
  /** Always confirmed first. */
  delete?: () => Promise<SubmitResult>;
  deleteConfirmation?: DeleteConfirmation;
  /** Shows Revert while there are changes. Defaults to true. */
  hasRevert?: boolean;
}

export type FormActions<V> = CreateActions<V> | UpdateActions<V>;

/** A form described as data. */
export interface FormConfig<V, TCustom extends string = never> {
  /** Every field, in order. Names are typed paths in `V`. */
  fields: readonly (FieldConfig<V> | CustomFieldConfig<V, TCustom>)[];
  /** Sections and columns. Defaults to one section with every field in order. */
  layout?: readonly FormSection<V>[];
  /** Whole-form and cross-field validation with any Standard Schema library (Zod, Valibot, ArkType…). */
  schema?: StandardSchemaV1<V, unknown>;
  defaultValues: V;
  /** Create, or update (and delete). A form without actions is view-only. */
  actions?: FormActions<V>;
  /** How empty values are submitted, unless a field says otherwise. Defaults to `null`. */
  emptyAs?: EmptyAs;
  /** Submit the values of hidden fields too. Defaults to false. */
  shouldSubmitHiddenFields?: boolean;
}

/**
 * A callback type checked bivariantly (like a method), so a renderer for a specific value type fits a registry of
 * mixed renderers.
 */
export type BivariantCallback<TArgs extends unknown[]> = {
  callback(...args: TArgs): void;
}['callback'];

/** The field API a renderer receives: the same for built-in and custom renderers. */
export interface FormFieldApi<T = unknown> {
  /** The field's path in the form values (bracket form for array items). */
  name: string;
  value: T;
  onChange: BivariantCallback<[value: T]>;
  onBlur: () => void;
  /** Errors to show now (after the field was left, or a submit attempt). */
  errors: readonly string[];
  /** The first error to show, if any. */
  errorMessage: string | undefined;
  isInvalid: boolean;
  isRequired: boolean;
  isDisabled: boolean;
  isReadOnly: boolean;
  /** An async validation is running. */
  isValidating: boolean;
  /** The value differs from the default. */
  isDirty: boolean;
  /** Increases when the field should reload its items (`dependsOn` with `'reload'`). */
  reloadKey: number;
  /** All current values, for renderers that depend on other fields. */
  getValues: () => unknown;
}

/** Props of a field renderer. */
export interface FieldRendererProps<TConfig = CustomFieldConfig<unknown>, T = unknown> {
  field: FormFieldApi<T>;
  config: TConfig;
}

/**
 * A component that renders one field type. Declared with method syntax so renderers with specific config and value
 * types fit a registry of mixed renderers.
 */
export type FieldRenderer = {
  render(props: FieldRendererProps<never, never>): ReactNode;
}['render'];
