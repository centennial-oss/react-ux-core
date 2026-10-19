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
import { DateRangeRenderer, DateRenderer, DateTimeRenderer, TimeRenderer } from './date';
import { lazyField } from './lazy';
import { MoneyRenderer, NumberRenderer, PercentRenderer } from './number';
import { TextAreaRenderer, TextFieldRenderer } from './text';
import { CheckboxRenderer, SwitchRenderer } from './toggle';

// Types with large inputs that most forms don't use load their renderer the first time a form shows one, with a
// placeholder the input's height meanwhile (`h-9.5`/`h-10` grow to the touch height, as the inputs do).
const TagsRenderer = lazyField(
  () => import('./tags').then((module) => module.TagsRenderer),
  'h-9.5 min-h-hit',
);
const RatingRenderer = lazyField(
  () => import('./rating').then((module) => module.RatingRenderer),
  'h-5 w-30 pointer-coarse:w-40',
);
const OneTimeCodeRenderer = lazyField(
  () => import('./oneTimeCode').then((module) => module.OneTimeCodeRenderer),
  'h-10 min-h-hit w-68 max-w-full',
);
const MaskedRenderer = lazyField(
  () => import('./masked').then((module) => module.MaskedRenderer),
  'h-10 min-h-hit',
);
const TimeRangeRenderer = lazyField(
  () => import('./timeRange').then((module) => module.TimeRangeRenderer),
  'h-10 min-h-hit w-56 max-w-full',
);
const FileRenderer = lazyField(
  () => import('./file').then((module) => module.FileRenderer),
  'h-32',
);
const FilesRenderer = lazyField(
  () => import('./file').then((module) => module.FilesRenderer),
  'h-32',
);

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
  tags: TagsRenderer,
  checkboxGroup: CheckboxGroupRenderer,
  radio: RadioRenderer,
  pillbox: PillboxRenderer,
  checkbox: CheckboxRenderer,
  switch: SwitchRenderer,
  rating: RatingRenderer,
  oneTimeCode: OneTimeCodeRenderer,
  masked: MaskedRenderer,
  date: DateRenderer,
  dateRange: DateRangeRenderer,
  time: TimeRenderer,
  dateTime: DateTimeRenderer,
  timeRange: TimeRangeRenderer,
  file: FileRenderer,
  files: FilesRenderer,
};
