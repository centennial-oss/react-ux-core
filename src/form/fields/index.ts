// Built-in field renderers by type.

import type { FieldRenderer } from '../types';
import {
  CheckboxGroupRenderer,
  ComboBoxRenderer,
  MultiSelectRenderer,
  RadioRenderer,
  PillboxRenderer,
  SelectRenderer,
} from './choice';
import {
  DateRangeRenderer,
  DateRenderer,
  DateTimeRenderer,
  TimeRangeRenderer,
  TimeRenderer,
} from './date';
import { FileRenderer, FilesRenderer } from './file';
import { MoneyRenderer, NumberRenderer, PercentRenderer } from './number';
import { TextAreaRenderer, TextFieldRenderer } from './text';
import { CheckboxRenderer, SwitchRenderer } from './toggle';

/** The renderers for every built-in field type. Spread it into `createFieldRegistry` to extend or replace them. */
export const builtInFields: Readonly<Record<string, FieldRenderer>> = {
  text: TextFieldRenderer,
  email: TextFieldRenderer,
  phone: TextFieldRenderer,
  url: TextFieldRenderer,
  password: TextFieldRenderer,
  textarea: TextAreaRenderer,
  number: NumberRenderer,
  money: MoneyRenderer,
  percent: PercentRenderer,
  select: SelectRenderer,
  combobox: ComboBoxRenderer,
  multiselect: MultiSelectRenderer,
  checkboxGroup: CheckboxGroupRenderer,
  radio: RadioRenderer,
  pillbox: PillboxRenderer,
  checkbox: CheckboxRenderer,
  switch: SwitchRenderer,
  date: DateRenderer,
  dateRange: DateRangeRenderer,
  time: TimeRenderer,
  dateTime: DateTimeRenderer,
  timeRange: TimeRangeRenderer,
  file: FileRenderer,
  files: FilesRenderer,
};
