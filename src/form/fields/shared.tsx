// Helpers shared by the built-in field renderers.

import { useEffect, useState, type FocusEvent, type ReactNode } from 'react';
import { InfoTip } from '../../components/InfoTip/InfoTip';
import type { FieldOption, FieldOptions, FieldOptionsLoader, FormFieldApi } from '../types';

interface FrameConfig {
  label?: ReactNode;
  description?: ReactNode;
  infoTip?: ReactNode;
}

/** Props every framed input takes from the field API and its config. Validation is the form's, shown via ARIA. */
export function frameProps(field: FormFieldApi, config: FrameConfig) {
  return {
    name: field.name,
    label: config.label,
    description: config.description,
    infoTip: config.infoTip,
    isRequired: field.isRequired,
    isDisabled: field.isDisabled,
    isReadOnly: field.isReadOnly,
    isInvalid: field.isInvalid,
    errorMessage: field.errorMessage,
    validationBehavior: 'aria' as const,
    onBlur: field.onBlur,
  };
}

/** A blur handler for a wrapper: calls `onBlur` when focus leaves everything inside it. */
export function blurWithin(onBlur: () => void) {
  return (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      onBlur();
    }
  };
}

/** The label row for inputs that label themselves through `aria-labelledby`. */
export function FieldHeading({
  id,
  label,
  infoTip,
  isRequired,
}: {
  id: string;
  label: ReactNode;
  infoTip?: ReactNode;
  isRequired: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <span id={id} className="font-medium text-fg">
        {label}
        {isRequired && (
          <span aria-hidden="true" className="ms-0.5 text-danger-fg">
            *
          </span>
        )}
      </span>
      {infoTip !== undefined && <InfoTip>{infoTip}</InfoTip>}
    </div>
  );
}

/** Description and error text under inputs that don't render their own. */
export function FieldNotes({
  description,
  descriptionId,
  errorMessage,
  errorId,
}: {
  description?: ReactNode;
  descriptionId: string;
  errorMessage?: string;
  errorId: string;
}) {
  return (
    <>
      {description !== undefined && (
        <p id={descriptionId} className="text-xs text-fg-muted">
          {description}
        </p>
      )}
      {errorMessage !== undefined && (
        <p id={errorId} className="text-xs font-medium text-danger-fg">
          {errorMessage}
        </p>
      )}
    </>
  );
}

/** Ids for `aria-describedby`, skipping parts that aren't shown. */
export function describedBy(parts: readonly (string | false | undefined)[]): string | undefined {
  const ids = parts.filter((part): part is string => typeof part === 'string' && part !== '');
  return ids.length > 0 ? ids.join(' ') : undefined;
}

/** Whether two option lists are the same (by id, label and disabled state). */
export function sameOptions(
  a: readonly FieldOption[] | undefined,
  b: readonly FieldOption[] | undefined,
) {
  if (a === b) {
    return true;
  }
  if (a === undefined || b === undefined) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  return a.every(
    (option, index) =>
      option.id === b[index]?.id &&
      option.label === b[index].label &&
      option.isDisabled === b[index].isDisabled,
  );
}

/** Static options (value-dependent ones are resolved by the form before the renderer runs). */
export function staticOptions(items: FieldOptions<unknown> | undefined): readonly FieldOption[] {
  return typeof items === 'function' ? [] : (items ?? []);
}

/**
 * Options for choice fields without typing: the static items, or the loaded ones. Loads when the field mounts and
 * again when its `reloadKey` changes (a `dependsOn` reload).
 */
export function useLoadedOptions(
  field: FormFieldApi,
  items: FieldOptions<unknown> | undefined,
  loadItems: FieldOptionsLoader<unknown> | undefined,
): { options: readonly FieldOption[]; isLoading: boolean; hasError: boolean } {
  const [loaded, setLoaded] = useState<{
    key: number;
    options: readonly FieldOption[];
    hasError: boolean;
  } | null>(null);
  const { reloadKey, getValues } = field;

  useEffect(() => {
    if (!loadItems) {
      return;
    }
    const controller = new AbortController();
    loadItems('', getValues(), controller.signal).then(
      (options) => {
        if (!controller.signal.aborted) {
          setLoaded({ key: reloadKey, options, hasError: false });
        }
      },
      () => {
        if (!controller.signal.aborted) {
          setLoaded({ key: reloadKey, options: [], hasError: true });
        }
      },
    );
    return () => {
      controller.abort();
    };
  }, [loadItems, reloadKey, getValues]);

  if (!loadItems) {
    return { options: staticOptions(items), isLoading: false, hasError: false };
  }
  const isCurrent = loaded?.key === reloadKey;
  return {
    options: isCurrent ? loaded.options : [],
    isLoading: !isCurrent,
    hasError: isCurrent && loaded.hasError,
  };
}
