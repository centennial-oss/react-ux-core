// Loose shapes of config entries for ConfigForm's runtime code. Every public field config fits these (functions take
// `never` parameters, which any specific function type satisfies), so the form handles configs without `any`.

import type { ReactNode } from 'react';
import type { Mask, MaskTokens } from '../utils/mask';
import type { FeedbackTone } from '../utils/types';
import type { EmptyAs, FieldColSpan, FieldOption, FieldValidationResult } from './types';

/** Any input field config, including arrays and custom types. */
export interface AnyInputFieldConfig {
  type: string;
  name: string;
  label?: ReactNode;
  description?: ReactNode;
  infoTip?: ReactNode;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  validate?: (
    value: never,
    values: never,
    signal: AbortSignal,
  ) => FieldValidationResult | Promise<FieldValidationResult>;
  debounceMs?: number;
  visibleWhen?: (values: never) => boolean;
  disabledWhen?: (values: never) => boolean;
  dependsOn?: {
    fields: readonly string[];
    onChange: 'reset' | 'reload' | ((values: never) => unknown);
  };
  colSpan?: FieldColSpan;
  emptyAs?: EmptyAs;
  formatValue?: (value: never, values: never) => ReactNode;
  minLength?: number;
  // One-time codes
  codeLength?: number;
  groupSizes?: readonly number[];
  // Masked text
  mask?: Mask;
  tokens?: MaskTokens;
  valueFormat?: string;
  // Choices
  items?: readonly FieldOption[] | ((values: never) => readonly FieldOption[]);
  // Tags
  validateTag?: (tag: string) => FieldValidationResult;
  // Arrays
  fields?: readonly AnyFieldConfig[];
  newItem?: unknown;
  minItems?: number;
  maxItems?: number;
  itemLabel?: (item: never, index: number) => ReactNode;
  addLabel?: string;
  isCollapsible?: boolean;
  columns?: 1 | 2 | 3 | 4;
}

/** Display, separator and banner entries. */
export interface AnyDisplayConfig {
  type: 'display' | 'separator' | 'banner';
  id: string;
  label?: ReactNode;
  title?: ReactNode;
  tone?: FeedbackTone;
  content?: ReactNode | ((values: never) => ReactNode);
  visibleWhen?: (values: never) => boolean;
  colSpan?: FieldColSpan;
}

export type AnyFieldConfig = AnyInputFieldConfig | AnyDisplayConfig;
