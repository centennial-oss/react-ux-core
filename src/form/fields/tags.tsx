import { useMemo } from 'react';
import { TagField } from '../../components/TagField/TagField';
import type { FieldRendererProps, TagsFieldConfig } from '../types';
import { blurWithin } from './shared';

function asStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/** `tags` fields: free-text values as tags, with optional suggestions. */
export function TagsRenderer({
  field,
  config,
}: FieldRendererProps<TagsFieldConfig<unknown>, readonly string[]>) {
  const tags = useMemo(() => asStrings(field.value), [field.value]);
  // Tags are marked invalid on the form's timing: only while the field shows errors (once it's been left, or after a
  // submit attempt). The form's own validation checks them with `validateTag` too.
  const validateTag = field.isInvalid ? config.validateTag : undefined;
  // TagField lists every invalid tag with its message; the form's error for the first one would repeat it.
  const isTagProblem =
    validateTag !== undefined &&
    field.errorMessage !== undefined &&
    tags.some((tag) => validateTag(tag) === field.errorMessage);
  return (
    <div onBlur={blurWithin(field.onBlur)}>
      <TagField
        label={config.label}
        description={config.description}
        infoTip={config.infoTip}
        errorMessage={isTagProblem ? undefined : field.errorMessage}
        isInvalid={field.isInvalid}
        isRequired={field.isRequired}
        isDisabled={field.isDisabled}
        isReadOnly={field.isReadOnly}
        value={tags}
        onChange={field.onChange}
        placeholder={config.placeholder}
        suggestions={config.suggestions}
        allowsCustomValue={config.allowsCustomValue}
        delimiters={config.delimiters}
        validateTag={validateTag}
        allowsDuplicates={config.allowsDuplicates}
        maxItems={config.maxItems}
        isReorderable={config.isReorderable}
      />
    </div>
  );
}
