import { Rating } from '../../components/Rating/Rating';
import type { FieldRendererProps, RatingFieldConfig } from '../types';
import { frameProps } from './shared';

/** `rating` fields: a number of icons (or halves), or `null` for none. */
export function RatingRenderer({
  field,
  config,
}: FieldRendererProps<RatingFieldConfig<unknown>, number | null>) {
  // Rating wires its own ARIA rather than React Aria's validation.
  const { validationBehavior: _validationBehavior, ...frame } = frameProps(field, config);
  return (
    <Rating
      {...frame}
      value={typeof field.value === 'number' ? field.value : null}
      onChange={field.onChange}
      maxValue={config.maxValue}
      step={config.step}
      icon={config.icon}
      tone={config.tone}
      isClearable={config.isClearable ?? !field.isRequired}
    />
  );
}
