// Validation on top of TanStack Form: built-in checks (required by value type, email, URL, lengths, item counts), the
// timing rules (through TanStack's `validationLogic`), field validators that accept sync or async `validate`
// functions, and the form schema with hidden fields left out.

import type {
  StandardSchemaV1,
  StandardSchemaV1Issue,
  ValidationLogicFn,
  ValidationLogicValidatorsFn,
} from '@tanstack/react-form';

import { resolveCodeLength } from '../components/OneTimeCodeField/code';
import { maskedFieldValue } from './fields/convert';
import { findField, isInputField } from './fieldIndex';
import type { AnyFieldConfig, AnyInputFieldConfig } from './internalTypes';
import type { FieldValidationResult } from './types';
import { isEmptyValue, isMissingValue } from './values';
import { type FormStrings } from './messages';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

function isWebAddress(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** The first built-in problem with a value: required, then format, length and item-count checks. */
export function builtInError(
  field: AnyInputFieldConfig,
  value: unknown,
  messages: FormStrings,
): string | undefined {
  if (field.isRequired === true && isMissingValue(field, value)) {
    return messages.required;
  }
  if (Array.isArray(value)) {
    if (field.minItems !== undefined && value.length < field.minItems && value.length > 0) {
      return messages.tooFewItems({ min: field.minItems });
    }
    if (field.maxItems !== undefined && value.length > field.maxItems) {
      return messages.tooManyItems({ max: field.maxItems });
    }
    if (field.type === 'array' && field.minItems !== undefined && value.length < field.minItems) {
      return messages.tooFewItems({ min: field.minItems });
    }
    // A tags field fails with its first invalid tag's message.
    if (field.validateTag) {
      for (const item of value) {
        const problem = typeof item === 'string' ? field.validateTag(item) : undefined;
        if (problem !== undefined && problem !== null && problem !== '') {
          return problem;
        }
      }
    }
    return undefined;
  }
  if (typeof value !== 'string' || isEmptyValue(value)) {
    return undefined;
  }
  const text = value.trim();
  if (field.type === 'email' && !EMAIL_PATTERN.test(text)) {
    return messages.invalidEmail;
  }
  if (field.type === 'url' && !isWebAddress(text)) {
    return messages.invalidUrl;
  }
  // A masked value must fill its mask.
  if (field.type === 'masked' && maskedFieldValue(field, value)?.isComplete === false) {
    return messages.maskedFieldIncomplete;
  }
  // A one-time code must be complete.
  const minLength =
    field.type === 'oneTimeCode'
      ? resolveCodeLength(field.codeLength, field.groupSizes)
      : field.minLength;
  if (minLength !== undefined && text.length < minLength) {
    return messages.tooShort({ min: minLength });
  }
  return undefined;
}

/**
 * When validators run. Sync validators run on every change, blur and submit, so errors are always current; ConfigForm
 * shows them only once the field has been left or a submit attempted. Async validators skip changes until then, so
 * typing in a fresh field doesn't start server requests. A change also clears the field's server error.
 *
 * Submit-time results go under TanStack's `submit` cause (not debounced), separate from the `dynamic` cause used on
 * change and blur. TanStack cancels a pending debounced validation when another starts for the same cause, and the
 * cancelled one never settles; a blur arriving during a submit (after a click on Save) would otherwise stall it.
 * The next change clears the submit-time errors.
 */
export const configFormValidationLogic: ValidationLogicFn = (props): unknown => {
  const { validators, event, form } = props;
  const run = (list: (ValidationLogicValidatorsFn | undefined)[]): unknown =>
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression -- TanStack uses the returned list.
    props.runValidation({ validators: list, form });
  if (!validators) {
    return run([]);
  }
  // TanStack types its validator map with `any`; pass the function through without widening anything to `any`.
  const fn: unknown = event.async ? validators.onDynamicAsync : validators.onDynamic;
  const noop = (() => undefined) as never;
  const dynamic: ValidationLogicValidatorsFn = { fn: fn as never, cause: 'dynamic' };
  const atSubmit: ValidationLogicValidatorsFn = { fn: fn as never, cause: 'submit' };
  switch (event.type) {
    case 'change': {
      if (event.async) {
        const meta = event.fieldName === undefined ? undefined : form.getFieldMeta(event.fieldName);
        const hasBeenShown = meta?.isBlurred === true || form.state.submissionAttempts > 0;
        return run(hasBeenShown ? [dynamic] : []);
      }
      return run([dynamic, { fn: noop, cause: 'submit' }, { fn: noop, cause: 'server' }]);
    }
    case 'blur':
      return run([dynamic]);
    case 'submit':
      return run([atSubmit]);
    default:
      return run([]);
  }
};

function toMessage(result: FieldValidationResult): string | undefined {
  return result === null || result === '' ? undefined : result;
}

function isPromise<T>(value: unknown): value is Promise<T> {
  return value instanceof Promise;
}

/** The validators TanStack Form runs for one field. */
export interface FieldValidators {
  onDynamic: (props: { value: unknown }) => string | undefined;
  onDynamicAsync?: (props: { value: unknown; signal: AbortSignal }) => Promise<string | undefined>;
  onDynamicAsyncDebounceMs?: number;
}

/**
 * Builds a field's validators. Built-in checks and a sync `validate` run in the sync validator. A `validate` that
 * returns a promise is detected on its first call (whose promise the async validator then reuses) and from then on
 * runs only in the async validator, debounced by `debounceMs`.
 */
export function createFieldValidators(
  field: AnyInputFieldConfig,
  getScopeValues: () => unknown,
  getMessages: () => FormStrings,
): FieldValidators {
  const { validate } = field;
  let isAsync = false;
  let pending: { value: unknown; promise: Promise<FieldValidationResult> } | undefined;

  const onDynamic = ({ value }: { value: unknown }): string | undefined => {
    const builtIn = builtInError(field, value, getMessages());
    if (builtIn !== undefined || !validate || isAsync) {
      return builtIn;
    }
    const controller = new AbortController();
    const result = validate(value as never, getScopeValues() as never, controller.signal);
    if (isPromise<FieldValidationResult>(result)) {
      isAsync = true;
      pending = { value, promise: result };
      result.catch(() => undefined);
      return undefined;
    }
    return toMessage(result);
  };

  if (!validate) {
    return { onDynamic };
  }

  return {
    onDynamic,
    onDynamicAsync: async ({ value, signal }) => {
      if (!isAsync) {
        return undefined;
      }
      if (builtInError(field, value, getMessages()) !== undefined) {
        return undefined;
      }
      const reused = pending !== undefined && Object.is(pending.value, value) ? pending : undefined;
      pending = undefined;
      const result = await (reused?.promise ??
        validate(value as never, getScopeValues() as never, signal));
      return toMessage(result);
    },
    onDynamicAsyncDebounceMs: field.debounceMs ?? 300,
  };
}

/** Form-level errors from the schema: a message for the form (root issues) and one per field path. */
export interface SchemaErrors {
  form?: string;
  fields: Record<string, string>;
}

function issuePath(issue: StandardSchemaV1Issue, values: unknown): string {
  let path = '';
  let current: unknown = values;
  for (const raw of issue.path ?? []) {
    const segment = typeof raw === 'object' ? raw.key : raw;
    if (Array.isArray(current) && !Number.isNaN(Number(segment))) {
      path += `[${String(Number(segment))}]`;
    } else {
      path += (path === '' ? '' : '.') + String(segment);
    }
    current =
      typeof current === 'object' && current !== null
        ? (current as Record<PropertyKey, unknown>)[segment]
        : undefined;
  }
  return path;
}

/**
 * Turns schema issues into form errors, leaving out hidden fields. Issues for paths that no field shows go to the
 * form message, so nothing is swallowed.
 */
export function schemaIssuesToErrors(
  issues: readonly StandardSchemaV1Issue[],
  values: unknown,
  fields: readonly AnyFieldConfig[],
): SchemaErrors | undefined {
  const errors: SchemaErrors = { fields: {} };
  const unplaced: string[] = [];
  for (const issue of issues) {
    const path = issuePath(issue, values);
    const match = path === '' ? undefined : findField(fields, path, values);
    if (!match) {
      unplaced.push(issue.message);
      continue;
    }
    if (!match.isVisible) {
      continue;
    }
    errors.fields[match.path] ??= issue.message;
  }
  if (unplaced.length > 0) {
    errors.form = unplaced.join(' ');
  }
  return errors.form === undefined && Object.keys(errors.fields).length === 0 ? undefined : errors;
}

/**
 * The form validators for a schema: sync, or async when the schema validates asynchronously.
 *
 * TanStack runs the form's async validator after a field's own checks pass (on a blur, say) and writes its result
 * under the same error key as the sync one, so for a sync schema it must return the same errors rather than none:
 * "none" would clear another field's schema error, such as "Passwords don't match" when a valid field is left.
 */
export function createSchemaValidators(
  schema: StandardSchemaV1<unknown, unknown>,
  getFields: () => readonly AnyFieldConfig[],
) {
  let isAsync = false;
  const errorsFor = (value: unknown, issues: readonly StandardSchemaV1Issue[] | undefined) =>
    issues ? schemaIssuesToErrors(issues, value, getFields()) : undefined;
  const validateSync = (value: unknown) => {
    const result = schema['~standard'].validate(value);
    if (isPromise(result)) {
      isAsync = true;
      result.catch(() => undefined);
      return undefined;
    }
    return errorsFor(value, result.issues);
  };
  return {
    onDynamic: ({ value }: { value: unknown }) => (isAsync ? undefined : validateSync(value)),
    onDynamicAsync: async ({ value }: { value: unknown }) => {
      if (!isAsync) {
        return validateSync(value);
      }
      const result = await schema['~standard'].validate(value);
      return errorsFor(value, result.issues);
    },
  };
}

/** Whether an entry list has any input fields (used to skip empty sections). */
export function hasInputFields(fields: readonly AnyFieldConfig[]): boolean {
  return fields.some(isInputField);
}
